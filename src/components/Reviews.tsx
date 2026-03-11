import { Star, Quote } from "lucide-react";

const reviews = [
  {
    id: 1,
    name: "Maria Silva",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop",
    rating: 5,
    text: "Qualidade incrível! Minha filha adora as roupas e o tecido é super macio. Já é a terceira compra e sempre me surpreendo positivamente.",
    product: "Vestido Floral Rosa",
  },
  {
    id: 2,
    name: "João Santos",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&auto=format&fit=crop",
    rating: 5,
    text: "Comprei para meu filho de 5 anos e ele não quer mais tirar! As cores são vibrantes e não desbotam nas lavagens.",
    product: "Conjunto Jeans Cool",
  },
  {
    id: 3,
    name: "Ana Costa",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100&auto=format&fit=crop",
    rating: 5,
    text: "Entrega super rápida e embalagem caprichada. O macacão do bebê é perfeito, bem confortável e fácil de vestir.",
    product: "Macacão Soft Baby",
  },
];

const Reviews = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-fredoka text-3xl md:text-4xl font-bold text-foreground mb-4">
            O Que Dizem os Pais
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Feedback real de famílias que confiam na KidStyler
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-sunny text-sunny" />
              ))}
            </div>
            <span className="font-bold text-foreground">4.9</span>
            <span className="text-muted-foreground">• +5.000 avaliações</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((review, index) => (
            <div
              key={review.id}
              className="bg-card rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Quote className="absolute top-4 right-4 h-8 w-8 text-muted/50" />

              <div className="flex items-center gap-3 mb-4">
                <img
                  src={review.avatar}
                  alt={review.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                />
                <div>
                  <h4 className="font-semibold text-foreground">{review.name}</h4>
                  <div className="flex">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-sunny text-sunny" />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mb-4 leading-relaxed">
                "{review.text}"
              </p>

              <p className="text-sm font-medium text-primary">
                Comprou: {review.product}
              </p>
            </div>
          ))}
        </div>

        {/* Feedback CTA */}
        <div className="mt-12 bg-gradient-to-r from-coral-light via-sunny-light to-mint-light rounded-3xl p-8 text-center">
          <h3 className="font-fredoka text-2xl font-bold text-foreground mb-2">
            Gostou da sua compra?
          </h3>
          <p className="text-muted-foreground mb-4">
            Deixe seu feedback e ajude outras famílias a escolher!
          </p>
          <button className="bg-foreground text-background px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity">
            Avaliar Minha Compra
          </button>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
