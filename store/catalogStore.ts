import { create } from 'zustand';
import { fetchBanners, fetchCatalogData } from '../lib/api';
import { Category, HomeBanner, Product } from '../types';

interface CatalogStore {
  products: Product[];
  categories: Category[];
  banners: HomeBanner[];
  hydrateCatalog: () => Promise<void>;
  hydrateBanners: () => Promise<void>;
  onAddReview: (productId: string, review: any) => void;
  onUpdateInventory: (productId: string, quantity: number) => void;
}

export const useCatalogStore = create<CatalogStore>((set) => ({
  products: [],
  categories: [],
  banners: [],
  hydrateCatalog: async () => {
    const [catalog, banners] = await Promise.all([
      fetchCatalogData(),
      fetchBanners().catch(() => [] as HomeBanner[]),
    ]);
    set({ products: catalog.products, categories: catalog.categories, banners });
  },
  hydrateBanners: async () => {
    const banners = await fetchBanners();
    set({ banners });
  },
  onAddReview: (productId, review) =>
    set((s) => ({
      products: s.products.map((p) =>
        p.id === productId
          ? { ...p, reviews: [...(p.reviews || []), review], reviewCount: (p.reviewCount || 0) + 1 }
          : p,
      ),
    })),
  onUpdateInventory: (productId, quantity) =>
    set((s) => ({
      products: s.products.map((p) =>
        p.id === productId ? { ...p, stock: Math.max(0, p.stock - quantity) } : p,
      ),
    })),
}));
