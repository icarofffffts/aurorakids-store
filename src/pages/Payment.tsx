import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

type OrderState = { orderId: string; total: number; customerName?: string } | undefined;

const WHATSAPP_NUMBER = "5531995398002";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const orderData = location.state as OrderState;
  const isValidOrder = Boolean(orderData && orderData.orderId && typeof orderData.total === "number");

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá! 😊 Fiz um pedido na DeLu Kids.\n\n` +
      `📦 Pedido: #${orderData!.orderId.slice(0, 8)}\n` +
      `💰 Total: R$ ${orderData!.total.toFixed(2)}\n` +
      `👤 Nome: ${orderData!.customerName || "Cliente"}\n\n` +
      `Gostaria de combinar o pagamento!`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderData!.orderId.slice(0, 8));
    toast.success("Número do pedido copiado!");
  };

  if (!isValidOrder || !orderData) {
    return (
      <div className="min-h-screen flex flex-col font-nunito bg-slate-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Ops! Nenhum pedido encontrado.</h2>
          <p className="text-slate-500 mb-6">Parece que você acessou esta página diretamente ou recarregou.</p>
          <Button onClick={() => navigate("/")}>Voltar para Loja</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-nunito flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8 animate-fade-in">

          {/* Success Header */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Pedido Confirmado! 🎉</h1>
            <p className="text-slate-500">Agora é só combinar o pagamento pelo WhatsApp</p>
          </div>

          {/* Order Summary */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Pedido</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 font-mono">#{orderData.orderId.slice(0, 8)}</span>
                <button
                  onClick={handleCopyOrderId}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Copiar"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            {orderData.customerName && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Cliente</span>
                <span className="font-bold text-slate-900">{orderData.customerName}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg pt-2 border-t border-slate-200">
              <span className="text-slate-600 font-bold">Total</span>
              <span className="font-bold text-green-600 text-xl">R$ {orderData.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-green-50 p-5 rounded-2xl border border-green-100 space-y-3">
            <h3 className="font-bold text-green-800 text-sm">📋 Próximos passos:</h3>
            <ol className="text-sm text-green-700 space-y-2 list-decimal list-inside">
              <li>Clique no botão abaixo para abrir o WhatsApp</li>
              <li>A mensagem com os dados do pedido já estará pronta</li>
              <li>Combine a forma de pagamento com nossa equipe</li>
              <li>Pronto! Seu pedido será processado após confirmação</li>
            </ol>
          </div>

          {/* WhatsApp CTA */}
          <Button
            onClick={handleWhatsApp}
            className="w-full h-14 text-lg font-bold rounded-xl shadow-xl shadow-green-500/20 bg-green-500 hover:bg-green-600 transition-all gap-3"
          >
            <MessageCircle className="h-6 w-6" />
            Combinar Pagamento via WhatsApp
          </Button>

          {/* Back Link */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/account")}
              className="text-slate-500 hover:text-slate-700 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Ver Meus Pedidos
            </Button>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Payment;
