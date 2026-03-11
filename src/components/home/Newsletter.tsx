import { Mail, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const Newsletter = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-coral-light rounded-full mb-6">
            <Gift className="h-8 w-8 text-primary" />
          </div>

          <h2 className="font-fredoka text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ganhe 10% na Primeira Compra
          </h2>

          <p className="text-muted-foreground mb-8">
            Assine nossa newsletter e receba ofertas exclusivas, novidades e dicas de moda infantil direto no seu e-mail.
          </p>

          <form
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email) return;
              try {
                const response = await fetch("/api/public/newsletter/subscribe", {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
                });
                if (!response.ok) {
                  throw new Error(await response.text());
                }
                toast.success("Inscrito com sucesso! Cheque seu e-mail.");
                setEmail("");
              } catch (err) {
                console.error("Newsletter error", err);
                toast.error("Erro ao se inscrever. Tente novamente.");
              }
            }}
          >
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <Button type="submit" size="lg">
              Quero Desconto!
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4">
            Ao se inscrever, você concorda com nossa política de privacidade. Cancele quando quiser.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
