import { Link } from "react-router-dom";
import { categories } from "@/data/products";

const Categories = () => {
  return (
    <section className="py-12 container mx-auto px-4">
      <h2 className="font-fredoka text-3xl font-bold text-center mb-10 text-foreground">
        Navegue por Categorias
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {categories.map((category) => (
          <Link
            to={`/products?category=${category.name}`}
            key={category.id}
            className="group cursor-pointer block"
          >
            <div className="aspect-[4/5] rounded-3xl overflow-hidden mb-4 relative">
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10" />
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            <h3 className="font-fredoka text-xl font-bold text-center group-hover:text-primary transition-colors">
              {category.name}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Categories;
