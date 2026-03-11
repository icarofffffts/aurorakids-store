export interface Product {
    id: number;
    name: string;
    price: number;
    image: string;
    category: string;
    description: string;
    sizes?: string[];
    colors?: string[];
    ratings?: number;
    reviews?: number;
    isNew?: boolean;
    stock_quantity?: number;
    low_stock_threshold?: number;
}

export const products: Product[] = [
    // Meninas
    {
        id: 1,
        name: "Vestido Floral Verão",
        price: 89.90,
        image: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?q=80&w=600&auto=format&fit=crop",
        category: "Meninas",
        description: "Vestido leve e confortável com estampa floral exclusiva. Perfeito para festas e passeios no parque.",
        sizes: ["2", "4", "6", "8"],
        colors: ["Rosa", "Amarelo", "Branco"],
        isNew: true
    },
    {
        id: 5,
        name: "Conjunto Rosa Pastel",
        price: 99.90,
        image: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=600&auto=format&fit=crop",
        category: "Meninas",
        description: "Conjunto delicado em algodão egípcio, ideal para dias amenos.",
        sizes: ["4", "6", "8", "10"],
        colors: ["Rosa", "Lilás"],
        isNew: true
    },
    {
        id: 6,
        name: "Jardineira Jeans Kids",
        price: 119.90,
        image: "https://images.unsplash.com/photo-1560506840-ec148e82a604?q=80&w=600&auto=format&fit=crop",
        category: "Meninas",
        description: "Jardineira clássica super resistente para brincar à vontade.",
        sizes: ["2", "4", "6", "8", "10"],
        colors: ["Jeans Claro", "Jeans Escuro"],
        isNew: false
    },
    {
        id: 7,
        name: "Vestido Festa Tule",
        price: 159.90,
        image: "https://images.unsplash.com/photo-1543076447-215ad9ba6923?q=80&w=600&auto=format&fit=crop",
        category: "Meninas",
        description: "Vestido de festa com saia de tule e detalhes em renda.",
        sizes: ["4", "6", "8"],
        colors: ["Branco", "Rosa Bebê"],
        isNew: false
    },

    // Meninos
    {
        id: 2,
        name: "Conjunto Aventura Dino",
        price: 79.90,
        image: "https://images.unsplash.com/photo-1519238359922-989348752efb?q=80&w=600&auto=format&fit=crop",
        category: "Meninos",
        description: "Camiseta e bermuda em algodão macio. Estampa de dinossauros que brilha no escuro!",
        sizes: ["2", "4", "6"],
        colors: ["Verde", "Azul", "Cinza"],
        isNew: true
    },
    {
        id: 8,
        name: "Camisa Xadrez Social",
        price: 89.90,
        image: "https://images.unsplash.com/photo-1598032895397-b9472444bf93?q=80&w=600&auto=format&fit=crop",
        category: "Meninos",
        description: "Camisa xadrez estilosa para ocasiões especiais.",
        sizes: ["2", "4", "6", "8", "10"],
        colors: ["Xadrez Azul", "Xadrez Vermelho"],
        isNew: true
    },
    {
        id: 9,
        name: "Bermuda Bege Casual",
        price: 69.90,
        image: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?q=80&w=600&auto=format&fit=crop",
        category: "Meninos",
        description: "Bermuda confortável com elástico na cintura.",
        sizes: ["2", "4", "6", "8"],
        colors: ["Bege", "Caqui", "Preto"],
        isNew: false
    },
    {
        id: 10,
        name: "Jaqueta Jeans Cool",
        price: 129.90,
        image: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?q=80&w=600&auto=format&fit=crop",
        category: "Meninos",
        description: "Jaqueta jeans com lavagem moderna, super durável.",
        sizes: ["4", "6", "8", "10", "12"],
        colors: ["Jeans Azul", "Jeans Preto"],
        isNew: false
    },

    // Bebês
    {
        id: 3,
        name: "Romper Jardim Secreto",
        price: 65.00,
        image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?q=80&w=600&auto=format&fit=crop",
        category: "Bebês",
        description: "Romper delicado com babados e botões de pressão para facilitar a troca.",
        sizes: ["P", "M", "G"],
        colors: ["Floral Rosa", "Floral Azul"],
        isNew: false
    },
    {
        id: 11,
        name: "Body Básico Algodão",
        price: 39.90,
        image: "https://images.unsplash.com/photo-1604467707321-70d009801bf4?q=80&w=600&auto=format&fit=crop",
        category: "Bebês",
        description: "Kit com 2 bodies básicos 100% algodão, essenciais pro dia a dia.",
        sizes: ["RN", "P", "M", "G"],
        colors: ["Branco/Cinza", "Azul/Branco", "Rosa/Branco"],
        isNew: false
    },
    {
        id: 12,
        name: "Conjunto Tricô Luxo",
        price: 149.90,
        image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=600&auto=format&fit=crop",
        category: "Bebês",
        description: "Conjunto de tricô antialérgico, perfeito para saída de maternidade.",
        sizes: ["RN", "P"],
        colors: ["Vermelho", "Branco", "Azul Marinho"],
        isNew: true
    },
    {
        id: 13,
        name: "Macacão Ursinho Polar",
        price: 89.90,
        image: "https://images.unsplash.com/photo-1515488042361-9929a1fa91a8?q=80&w=600&auto=format&fit=crop",
        category: "Bebês",
        description: "Macacão quentinho com capuz de orelhinhas.",
        sizes: ["P", "M", "G"],
        colors: ["Branco", "Marrom"],
        isNew: false
    },

    // Acessórios / Promoções
    {
        id: 4,
        name: "Jaqueta Bomber Color",
        price: 110.00,
        image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop",
        category: "Promoções",
        description: "Estilo e proteção para os dias mais frescos. Tecido corta-vento.",
        sizes: ["4", "6", "8", "10"],
        colors: ["Preto", "Verde Militar", "Rosa"],
        isNew: false
    },
    {
        id: 14,
        name: "Tênis Velcro Colorido",
        price: 99.90,
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
        category: "Acessórios",
        description: "Tênis confortável e fácil de calçar, ideal para a escola.",
        sizes: ["26", "28", "30", "32"],
        colors: ["Multicolorido", "Azul", "Rosa"],
        isNew: true
    },
    {
        id: 15,
        name: "Mochila Escolar Zoo",
        price: 129.90,
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop",
        category: "Acessórios",
        description: "Mochila resistente com estampa divertida de animais.",
        sizes: ["Único"],
        colors: ["Leão", "Elefante", "Girafa"],
        isNew: false
    },
    {
        id: 16,
        name: "Boné Estiloso Kids",
        price: 49.90,
        image: "https://images.unsplash.com/photo-1588850561407-ed78c334e67a?q=80&w=600&auto=format&fit=crop",
        category: "Acessórios",
        description: "Proteção contra o sol com muito estilo.",
        sizes: ["Único"],
        colors: ["Preto", "Azul", "Vermelho"],
        isNew: false
    }
];

export const categories = [
    { id: "meninas", name: "Meninas", image: "https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?q=80&w=600&auto=format&fit=crop" },
    { id: "meninos", name: "Meninos", image: "https://images.unsplash.com/photo-1519238359922-989348752efb?q=80&w=600&auto=format&fit=crop" },
    { id: "bebes", name: "Bebês", image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?q=80&w=600&auto=format&fit=crop" },
    { id: "acessorios", name: "Acessórios", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop" }
];
