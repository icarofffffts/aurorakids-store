import { Star, Quote, Loader2 } from "lucide-react";
import { usePublicReviews, useReviewStats } from "@/hooks/useReviews";

const fallbackReviews = [
    {
        id: "1",
        customer_name: "Maria Silva",
        rating: 5,
        comment: "Qualidade incrivel! Minha filha adora as roupas e o tecido e super macio. Ja e a terceira compra e sempre me surpreendo positivamente.",
        product_name: "Vestido Floral Rosa",
    },
    {
        id: "2",
        customer_name: "Joao Santos",
        rating: 5,
        comment: "Comprei para meu filho de 5 anos e ele nao quer mais tirar! As cores sao vibrantes e nao desbotam nas lavagens.",
        product_name: "Conjunto Jeans Cool",
    },
    {
        id: "3",
        customer_name: "Ana Costa",
        rating: 5,
        comment: "Entrega super rapida e embalagem caprichada. O macacao do bebe e perfeito, bem confortavel e facil de vestir.",
        product_name: "Macacao Soft Baby",
    },
];

const Reviews = () => {
    const { data: reviews, isLoading: loadingReviews } = usePublicReviews(undefined, 6);
    const { data: stats, isLoading: loadingStats } = useReviewStats();

    const displayReviews = reviews && reviews.length > 0 ? reviews : fallbackReviews;
    const averageRating = stats?.average_rating ?? 4.9;
    const totalReviews = stats?.total_reviews ?? 5000;

    const formatTotal = (n: number) => {
        if (n >= 1000) return `+${Math.floor(n / 1000)}.${Math.floor((n % 1000) / 100)}00`;
        return n.toString();
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="font-fredoka text-3xl md:text-4xl font-bold text-foreground mb-4">
                        O Que Dizem os Pais
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Feedback real de familias que confiam na DeLu Kids
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                        {loadingStats ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                            <>
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-5 w-5 ${
                                                i < Math.round(averageRating)
                                                    ? "fill-sunny text-sunny"
                                                    : "fill-muted text-muted"
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="font-bold text-foreground">{averageRating.toFixed(1)}</span>
                                <span className="text-muted-foreground">
                                    {"\u2022"} {formatTotal(totalReviews)} avaliacoes
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {loadingReviews ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6">
                        {displayReviews.slice(0, 3).map((review, index) => (
                            <div
                                key={review.id}
                                className="bg-card rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <Quote className="absolute top-4 right-4 h-8 w-8 text-muted/50" />

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                                        {getInitials(review.customer_name)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-foreground">{review.customer_name}</h4>
                                        <div className="flex">
                                            {[...Array(review.rating)].map((_, i) => (
                                                <Star key={i} className="h-4 w-4 fill-sunny text-sunny" />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-muted-foreground mb-4 leading-relaxed">"{review.comment}"</p>

                                {review.product_name && (
                                    <p className="text-sm font-medium text-primary">Comprou: {review.product_name}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Feedback CTA */}
                <div className="mt-12 bg-gradient-to-r from-coral-light via-sunny-light to-mint-light rounded-3xl p-8 text-center">
                    <h3 className="font-fredoka text-2xl font-bold text-foreground mb-2">
                        Gostou da sua compra?
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        Apos receber seu pedido, voce recebera um link exclusivo para avaliar!
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Reviews;
