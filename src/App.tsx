import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProductDetails from "./pages/ProductDetails";
import Checkout from "./pages/Checkout";
import Products from "./pages/Products";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Payment from "./pages/Payment";
import Account from "./pages/Account";
import Review from "./pages/Review";
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
import RequireAdmin from "./components/admin/RequireAdmin";
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));
const AdminMarketing = lazy(() => import("./pages/admin/Marketing"));
const AdminBanners = lazy(() => import("./pages/admin/Banners"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminReviews = lazy(() => import("./pages/admin/Reviews"));
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { OrderProvider } from "./context/OrderContext";
import CartDrawer from "./components/layout/CartDrawer";
import MobileNav from "./components/layout/MobileNav";
import WhatsAppButton from "./components/common/WhatsAppButton";

import ErrorBoundary from "./components/common/ErrorBoundary";

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-slate-50 font-nunito flex items-center justify-center p-6">
    <div className="flex items-center gap-3 text-slate-600">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      <span className="font-medium">Carregando...</span>
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrderProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/product/:id" element={<ProductDetails />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/payment" element={<Payment />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/review/:token" element={<Review />} />

                    {/* Admin Routes */}
                    <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                      <Route index element={<AdminDashboard />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="customers" element={<AdminCustomers />} />
                      <Route path="banners" element={<AdminBanners />} />
                      <Route path="marketing" element={<AdminMarketing />} />
                      <Route path="reviews" element={<AdminReviews />} />
                      <Route path="settings" element={<AdminSettings />} />
                    </Route>

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <CartDrawer />
                <MobileNav />
                <WhatsAppButton />
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </OrderProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
