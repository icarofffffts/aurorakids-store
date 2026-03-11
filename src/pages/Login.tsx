import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        setSubmitting(true);
        setErrorMessage(null);

        const uiFailsafe = window.setTimeout(() => {
            if (!mountedRef.current) return;
            setSubmitting(false);
            setErrorMessage("Login demorou muito para responder. Tente novamente.");
        }, 30000);

        try {
            await login(email, password);

            // Redirect to the page user came from, or default to account
            const from = location.state?.from || "/account";
            navigate(from, { replace: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Falha ao fazer login.";
            if (mountedRef.current) setErrorMessage(message);
            console.error("Login page error:", error);
        } finally {
            window.clearTimeout(uiFailsafe);
            if (mountedRef.current) setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-nunito flex flex-col">
            <Header />
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h1 className="text-3xl font-fredoka font-bold text-center mb-2 text-slate-900">
                        Bem-vindo de volta! 👋
                    </h1>
                    <p className="text-center text-slate-500 mb-8">
                        Entre para acompanhar seus pedidos
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">E-mail</label>
                            <Input
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Senha</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-bold rounded-xl mt-4">
                            {submitting ? "Entrando..." : "Entrar"}
                        </Button>
                    </form>

                    {errorMessage && (
                        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                            {errorMessage}
                        </div>
                    )}

                    <div className="mt-6 text-center text-sm text-slate-500">
                        Não tem uma conta?{" "}
                        <Link to="/register" className="text-primary font-bold hover:underline">
                            Cadastre-se aqui
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Login;
