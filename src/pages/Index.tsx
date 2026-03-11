import BannerCarousel from "@/components/home/BannerCarousel";
import FeaturedProducts from "@/components/shop/FeaturedProducts";
import Categories from "@/components/shop/Categories";
import Reviews from "@/components/shop/Reviews";
import Newsletter from "@/components/home/Newsletter";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CampaignPopup from "@/components/marketing/CampaignPopup";

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-nunito flex flex-col">
      <Header />
      <CampaignPopup />
      <main className="flex-1">
        <BannerCarousel />
        <Categories />
        <FeaturedProducts />
        <Reviews />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
