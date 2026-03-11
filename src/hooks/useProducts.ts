import { useQuery } from "@tanstack/react-query";
import { getProducts, getProductById } from "@/services/productService";
import { Product } from "@/data/products";

export const useProducts = () => {
    return useQuery<Product[], Error>({
        queryKey: ['products'],
        queryFn: getProducts,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1, // Don't retry indefinitely
        refetchOnWindowFocus: false, // Prevent reload spam
    });
};

export const useProduct = (id: number) => {
    return useQuery({
        queryKey: ['product', id],
        queryFn: () => getProductById(id),
        enabled: !!id,
    });
};
