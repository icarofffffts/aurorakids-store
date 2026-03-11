    import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    cpf: string;
    phone: string;
    address_zip: string;
    address_street: string;
    address_number: string;
    address_complement: string;
    address_district: string;
    address_city: string;
    address_state: string;
    avatar_url?: string;
    role?: string;
}

interface AuthContextType {
    user: UserProfile | null;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<UserProfile>) => Promise<void>;
    uploadAvatar: (file: File) => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type Thenable<T> = {
    then: (onfulfilled: (value: T) => unknown, onrejected?: (reason: unknown) => unknown) => unknown;
};

function withTimeout<T>(promise: Promise<T> | Thenable<T>, ms: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const p = Promise.resolve(promise as PromiseLike<T>);
    return Promise.race([
        p,
        new Promise<T>((_, reject) => {
            timer = setTimeout(() => reject(new Error(message)), ms);
        }),
    ]).finally(() => {
        if (timer) clearTimeout(timer);
    });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasSession, setHasSession] = useState(false);

    const shouldTryProxyLogin = (message: string) => {
        const m = message.toLowerCase();
        return (
            m.includes('timeout') ||
            m.includes('failed to fetch') ||
            m.includes('network') ||
            m.includes('load failed') ||
            m.includes('cors')
        );
    };



    // Helper to fetch profile from DB
    const fetchProfile = useCallback(async (userId: string, email: string, metadataName?: string) => {
        try {
            const { data, error } = await withTimeout(
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single(),
                8000,
                'Timeout ao carregar perfil.'
            );

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching profile:", error);
            }

            if (data) {
                setUser(data);
            } else {
                // Create the profile row using only columns that exist in the base schema.
                // Optional fields like avatar_url/role may not exist depending on DB migrations.
                const profileInsert = {
                    id: userId,
                    email: email,
                    name: metadataName || email.split('@')[0],
                    cpf: "",
                    phone: "",
                    address_zip: "",
                    address_street: "",
                    address_number: "",
                    address_complement: "",
                    address_district: "",
                    address_city: "",
                    address_state: "",
                };

                const { error: insertError } = await withTimeout(
                    supabase.from('profiles').insert(profileInsert),
                    8000,
                    'Timeout ao criar perfil.'
                );

                if (insertError) {
                    console.warn("Failed to auto-create profile row:", insertError);
                }

                // Keep app usable even if insert failed; updateProfile() will upsert later.
                setUser({ ...profileInsert, avatar_url: "", role: "customer" });
            }
        } catch (err) {
            console.error("Unexpected error in fetchProfile", err);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        // Failsafe to avoid blank screen if auth hangs
        const failsafe = setTimeout(() => {
            if (mounted) {
                console.warn("AuthProvider: loading timeout, continuing without session.");
                setLoading(false);
            }
        }, 8000);

        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user) {
                    setHasSession(true);
                    // Don't block render/auth init on profile fetch.
                    void fetchProfile(session.user.id, session.user.email!, session.user.user_metadata.name);
                } else {
                    setHasSession(false);
                }
            } catch (error) {
                console.error("Session check failed", error);
                setHasSession(false);
            } finally {
                if (mounted) setLoading(false);
                clearTimeout(failsafe);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setHasSession(true);
                // Critical: avoid awaiting here; auth sign-in waits for subscribers.
                void fetchProfile(session.user.id, session.user.email!, session.user.user_metadata.name);
            } else {
                setUser(null);
                setHasSession(false);
            }
            if (mounted) setLoading(false);
        });

        return () => {
            mounted = false;
            clearTimeout(failsafe);
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const login = async (email: string, password: string) => {
        try {
            try {
                const { data, error } = await withTimeout(
                    supabase.auth.signInWithPassword({ email, password }),
                    12000,
                    "Timeout ao conectar no login. Verifique sua internet e tente novamente."
                );

                if (error) throw error;
                if (!data?.session) {
                    throw new Error('Login nao foi concluido. Verifique email/senha e confirmacao de email.');
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);

                // Fallback to same-origin proxy if browser can't reach Supabase
                if (shouldTryProxyLogin(message)) {
                    const response = await withTimeout(
                        fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password }),
                        }),
                        15000,
                        'Timeout no proxy de login.'
                    );

                    const raw = await response.text();
                    let data: { access_token?: string; refresh_token?: string; error?: string; error_description?: string };
                    try {
                        data = JSON.parse(raw) as { access_token?: string; refresh_token?: string; error?: string; error_description?: string };
                    } catch {
                        data = { error_description: raw };
                    }

                    if (!response.ok) {
                        const errMsg = data?.error_description || data?.error || 'Falha ao fazer login.';
                        throw new Error(errMsg);
                    }

                    if (!data?.access_token || !data?.refresh_token) {
                        throw new Error('Login proxy retornou tokens inválidos.');
                    }

                    const { data: sessionData, error: setError } = await withTimeout(
                        supabase.auth.setSession({
                            access_token: data.access_token,
                            refresh_token: data.refresh_token,
                        }),
                        12000,
                        'Timeout ao aplicar a sessao de login no navegador.'
                    );
                    if (setError) throw setError;
                    if (!sessionData?.session) {
                        throw new Error('Login nao foi concluido. Tente novamente.');
                    }
                } else {
                    throw err;
                }
            }

            toast.success("Login realizado com sucesso!");
        } catch (error) {
            console.error("Login Error:", error);
            toast.error((error as Error).message || "Erro ao realizar login.");
            throw error;
        }
    };

    const register = async (name: string, email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name }
                }
            });

            if (error) throw error;
            const needsEmailConfirmation = !data?.session;
            if (needsEmailConfirmation) {
                toast.success("Cadastro realizado! Verifique seu e-mail para confirmar.");
            } else {
                toast.success("Cadastro realizado com sucesso!");
            }
            return { needsEmailConfirmation };
        } catch (error) {
            console.error("Register Error:", error);
            toast.error((error as Error).message || "Erro ao realizar cadastro.");
            throw error;
        }
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Erro ao sair.");
        } else {
            setUser(null);
            setHasSession(false);
            toast.info("Você saiu da sua conta.");
        }
    };

    const stripUndefined = (obj: Record<string, unknown>) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            if (v !== undefined) out[k] = v;
        }
        return out;
    };

    const updateProfile = async (data: Partial<UserProfile>) => {
        if (!user) throw new Error("Usuário não autenticado");
        try {
            // Never allow client to change role.
            const { role: _role, ...rest } = data as Partial<UserProfile> & { role?: unknown };

            const basePayload = stripUndefined({
                id: user.id,
                email: user.email,
                ...rest,
            });

            const attempt = async (payload: Record<string, unknown>) => {
                const { error } = await supabase
                    .from('profiles')
                    .upsert(payload, { onConflict: 'id' });
                if (error) throw error;
            };

            try {
                await attempt(basePayload);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (message.includes('avatar_url') && 'avatar_url' in basePayload) {
                    const { avatar_url: _a, ...retry } = basePayload;
                    await attempt(retry);
                } else {
                    throw err;
                }
            }

            setUser(prev => prev ? { ...prev, ...rest } : null);
            toast.success("Perfil atualizado com sucesso!");
        } catch (error) {
            console.error("Update Profile Error:", error);
            toast.error((error as Error).message || "Erro ao atualizar perfil.");
            throw error;
        }
    };

    const uploadAvatar = async (file: File) => {
        if (!user) return;
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            await updateProfile({ avatar_url: publicUrl });
        } catch (error) {
            console.error("Error uploading avatar:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateProfile, uploadAvatar, isAuthenticated: hasSession, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
