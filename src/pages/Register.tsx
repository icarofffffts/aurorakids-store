import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !name) return;

        try {
            const result = await register(name, email, password);
            if (result.needsEmailConfirmation) {
                navigate("/login", { state: { from: "/account" } });
            } else {
                navigate("/account");
            }
        } catch (error) {
            // Error handled by toast
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-nunito flex flex-col">
            <Header />
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h1 className="text-3xl font-fredoka font-bold text-center mb-2 text-slate-900">
                        Crie sua conta 🚀
                    </h1>
                    <p className="text-center text-slate-500 mb-8">
                        Preencha seus dados para começar
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Nome Completo</label>
                            <Input
                                type="text"
                                placeholder="Seu nome"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
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

                        <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl mt-4">
                            Criar Conta
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        Já tem cadastro?{" "}
                        <Link to="/login" className="text-primary font-bold hover:underline">
                            Faça login
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Register;
