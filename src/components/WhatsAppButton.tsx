import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => {
    const phoneNumber = "5511999999999"; // TODO: Configure
    const message = "Olá! Vim pelo site da DeLu Kids.";

    return (
        <a
            href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 hover:-translate-y-1 animate-bounce duration-3000"
            aria-label="Fale conosco no WhatsApp"
        >
            <MessageCircle className="h-8 w-8 fill-current" />
        </a>
    );
};

export default WhatsAppButton;
