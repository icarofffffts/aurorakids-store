// Seed catalog for demo/testing. Uses public image URLs.

const IMAGE_URLS = [
  // Product-only photos (flat lay, no models/children)
  'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560506840-ec148e82a604?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1543076447-215ad9ba6923?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519238359922-989348752efb?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1598032895397-b9472444bf93?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522771930-78848d9293e8?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604467707321-70d009801bf4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515488042361-9929a1fa91a8?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1200&auto=format&fit=crop',
];

function pick(arr, idx) {
  return arr[idx % arr.length];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function priceFromBase(base, idx) {
  // Deterministic price variation
  const delta = ((idx * 7) % 23) - 11; // -11..11
  const v = base + delta;
  return Number(clamp(v, 29.9, 199.9).toFixed(2));
}

export function buildSeedProducts(count = 72) {
  const catalog = [
    {
      category: 'Meninas',
      basePrice: 99.9,
      sizes: ['2', '4', '6', '8', '10', '12'],
      colors: ['Rosa', 'Branco', 'Lilás', 'Amarelo', 'Azul Claro'],
      names: [
        'Vestido Floral',
        'Conjunto Algodão',
        'Saia Plissada',
        'Blusa Manga Longa',
        'Calça Legging',
        'Jaqueta Jeans',
        'Pijama Estrelas',
        'Macacão Conforto',
        'Cardigan Tricô',
        'Short Cintura Alta',
        'Blazer Mini Chic',
        'Body Delicado',
      ],
    },
    {
      category: 'Meninos',
      basePrice: 89.9,
      sizes: ['2', '4', '6', '8', '10', '12'],
      colors: ['Azul', 'Verde', 'Cinza', 'Preto', 'Branco'],
      names: [
        'Camiseta Básica',
        'Conjunto Aventura',
        'Bermuda Sarja',
        'Calça Jogger',
        'Moletom Capuz',
        'Jaqueta Corta-Vento',
        'Camisa Xadrez',
        'Polo Clássica',
        'Pijama Confort',
        'Short Esportivo',
        'Colete Matelassê',
        'Macacão Street',
      ],
    },
    {
      category: 'Bebês',
      basePrice: 69.9,
      sizes: ['RN', 'P', 'M', 'G'],
      colors: ['Branco', 'Azul Bebê', 'Rosa Bebê', 'Bege', 'Cinza Claro'],
      names: [
        'Body Algodão',
        'Macacão Soft',
        'Romper Jardim',
        'Conjunto Saída',
        'Manta Aconchego',
        'Kit Bodies',
        'Touca Fofura',
        'Meias Antiderrapantes',
        'Jardineira Mini',
        'Pijama Nuvens',
        'Macacão Ursinho',
        'Conjunto Tricô',
      ],
    },
    {
      category: 'Acessórios',
      basePrice: 59.9,
      sizes: ['U'],
      colors: ['Azul', 'Rosa', 'Preto', 'Colorido', 'Branco'],
      names: [
        'Boné Kids',
        'Mochila Escolar',
        'Tênis Velcro',
        'Sandália Confort',
        'Meia Cano Curto',
        'Kit Presilhas',
        'Tiara Colorida',
        'Óculos Infantil',
        'Garrafa Squeeze',
        'Lancheira Térmica',
        'Cinto Ajustável',
        'Chinelo Leve',
      ],
    },
    {
      category: 'Promoções',
      basePrice: 49.9,
      sizes: ['2', '4', '6', '8', '10'],
      colors: ['Preto', 'Branco', 'Azul', 'Rosa', 'Verde'],
      names: [
        'Camiseta Oferta',
        'Bermuda Oferta',
        'Vestido Oferta',
        'Moletom Oferta',
        'Body Oferta',
        'Pijama Oferta',
        'Short Oferta',
        'Saia Oferta',
        'Conjunto Oferta',
        'Calça Oferta',
        'Jaqueta Oferta',
        'Acessório Oferta',
      ],
    },
    {
      category: 'Novidades',
      basePrice: 109.9,
      sizes: ['2', '4', '6', '8', '10', '12'],
      colors: ['Rosa', 'Azul', 'Branco', 'Lilás', 'Verde'],
      names: [
        'Coleção Nova - Vestido',
        'Coleção Nova - Conjunto',
        'Coleção Nova - Jaqueta',
        'Coleção Nova - Pijama',
        'Coleção Nova - Camiseta',
        'Coleção Nova - Calça',
        'Coleção Nova - Bermuda',
        'Coleção Nova - Cardigan',
        'Coleção Nova - Saia',
        'Coleção Nova - Body',
        'Coleção Nova - Macacão',
        'Coleção Nova - Acessório',
      ],
    },
  ];

  const adjectives = [
    'Premium',
    'Conforto',
    'Leve',
    'Clássico',
    'Urbano',
    'Fofinho',
    'Dia a Dia',
    'Festa',
    'Verão',
    'Inverno',
  ];

  const products = [];
  for (let i = 0; i < count; i++) {
    const group = catalog[i % catalog.length];
    const nameBase = pick(group.names, i);
    const adj = pick(adjectives, i);
    const name = `${nameBase} ${adj}`;

    const image = pick(IMAGE_URLS, i);
    const price = priceFromBase(group.basePrice, i);

    const sizes = group.sizes;
    const colors = [pick(group.colors, i), pick(group.colors, i + 1)].filter((v, idx, arr) => arr.indexOf(v) === idx);

    const stock_quantity = 10 + ((i * 9) % 75); // 10..84
    const low_stock_threshold = 5;
    const rating = Number((4.2 + ((i % 7) * 0.1)).toFixed(1));
    const reviews = (i * 3) % 120;

    const description =
      'Peça confortável e resistente, ideal para o dia a dia. Tecido macio, acabamento reforçado e modelagem pensada para brincar com liberdade.';

    products.push({
      name,
      price,
      image,
      category: group.category,
      description,
      sizes,
      colors,
      stock_quantity,
      low_stock_threshold,
      rating,
      reviews,
    });
  }

  // De-dup by name (just in case)
  const seen = new Set();
  return products.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
}
