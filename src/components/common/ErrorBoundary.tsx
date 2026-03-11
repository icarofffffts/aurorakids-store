import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center font-nunito">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md w-full">
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Ops! Algo deu errado. 😕</h1>
                        <p className="text-slate-500 mb-6">
                            Ocorreu um erro inesperado. Tente recarregar a página.
                        </p>
                        {this.state.error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-mono mb-6 text-left overflow-auto max-h-32">
                                {this.state.error.toString()}
                            </div>
                        )}
                        <div className="space-y-3">
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full bg-slate-900 hover:bg-slate-800"
                            >
                                Recarregar Página
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = "/"}
                                className="w-full"
                            >
                                Voltar para o Início
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
