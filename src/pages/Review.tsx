import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, CheckCircle2, AlertCircle, Loader2, Package } from "lucide-react";
import { useReviewToken, useSubmitReviewByToken, SubmitReviewData } from "@/hooks/useReviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const Review = () => {
    const { token } = useParams<{ token: string }>();
    const { data: tokenData, isLoading, error } = useReviewToken(token || "");
    const submitMutation = useSubmitReviewByToken();

    const [reviews, setReviews] = useState<Record<number, { rating: number; title: string; comment: string }>>({});
    const [submitted, setSubmitted] = useState(false);

    const handleRating = (productId: number, rating: number) => {
        setReviews((prev) => ({
            ...prev,
            [productId]: { ...prev[productId], rating, title: prev[productId]?.title || "", comment: prev[productId]?.comment || "" },
        }));
    };

    const handleChange = (productId: number, field: "title" | "comment", value: string) => {
        setReviews((prev) => ({
            ...prev,
            [productId]: { ...prev[productId], [field]: value, rating: prev[productId]?.rating || 0 },
        }));
    };

    const handleSubmit = async () => {
        if (!token) return;

        const reviewsToSubmit: SubmitReviewData[] = Object.entries(reviews)
            .filter(([, r]) => r.rating > 0 && r.comment.trim())
            .map(([productId, r]) => ({
                product_id: parseInt(productId),
                rating: r.rating,
                title: r.title || undefined,
                comment: r.comment,
            }));

        if (reviewsToSubmit.length === 0) return;

        try {
            await submitMutation.mutateAsync({ token, reviews: reviewsToSubmit });
            setSubmitted(true);
        } catch {
            // Error handled by mutation
        }
    };

    const canSubmit = Object.values(reviews).some((r) => r.rating > 0 && r.comment.trim());

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !tokenData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Link Invalido ou Expirado</h1>
                    <p className="text-slate-600 mb-6">
                        Este link de avaliacao nao e mais valido. Ele pode ter expirado ou ja foi utilizado.
                    </p>
                    <Link to="/">
                        <Button>Voltar para a Loja</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Obrigado pela sua Avaliacao!</h1>
                    <p className="text-slate-600 mb-6">
                        Sua opiniao e muito importante para nos e ajuda outras familias a escolherem os melhores
                        produtos para seus filhos.
                    </p>
                    <Link to="/">
                        <Button>Continuar Comprando</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block mb-4">
                        <img src="/logo.png" alt="DeLu Kids" className="h-16 mx-auto" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Avalie sua Compra</h1>
                    <p className="text-slate-600">
                        Ola, {tokenData.customer_name.split(" ")[0]}! Conte-nos o que achou dos produtos.
                    </p>
                </div>

                {/* Products to Review */}
                <div className="space-y-6">
                    {tokenData.products.map((product) => (
                        <div key={product.id} className="bg-white rounded-2xl shadow-sm p-6">
                            <div className="flex items-center gap-4 mb-4">
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-20 h-20 object-cover rounded-xl"
                                    />
                                ) : (
                                    <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center">
                                        <Package className="h-8 w-8 text-slate-400" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-slate-800">{product.name}</h3>
                                    <p className="text-sm text-slate-500">Clique nas estrelas para avaliar</p>
                                </div>
                            </div>

                            {/* Star Rating */}
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-sm text-slate-600 mr-2">Nota:</span>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRating(product.id, star)}
                                        className="transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`h-8 w-8 ${
                                                star <= (reviews[product.id]?.rating || 0)
                                                    ? "fill-yellow-400 text-yellow-400"
                                                    : "text-slate-300"
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>

                            {/* Title (optional) */}
                            <Input
                                placeholder="Titulo da avaliacao (opcional)"
                                value={reviews[product.id]?.title || ""}
                                onChange={(e) => handleChange(product.id, "title", e.target.value)}
                                className="mb-3"
                            />

                            {/* Comment */}
                            <Textarea
                                placeholder="Conte sua experiencia com o produto..."
                                value={reviews[product.id]?.comment || ""}
                                onChange={(e) => handleChange(product.id, "comment", e.target.value)}
                                rows={3}
                            />
                        </div>
                    ))}
                </div>

                {/* Submit Button */}
                <div className="mt-8 text-center">
                    <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit || submitMutation.isPending}
                        size="lg"
                        className="px-8"
                    >
                        {submitMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            "Enviar Avaliacao"
                        )}
                    </Button>
                    {submitMutation.error && (
                        <p className="text-red-500 text-sm mt-2">{submitMutation.error.message}</p>
                    )}
                </div>

                {/* Footer note */}
                <p className="text-center text-xs text-slate-400 mt-8">
                    Suas avaliacoes ajudam outras familias e nos permitem melhorar nossos produtos.
                </p>
            </div>
        </div>
    );
};

export default Review;
