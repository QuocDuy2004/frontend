import { create } from 'zustand';
import { AppNotification, Category, Order, Product, UserProfile, Voucher } from '../types';

interface AppStore {
  products: Product[];
  categories: Category[];
  vouchers: Voucher[];
  notifications: AppNotification[];
  orders: Order[];
  currentUser: UserProfile | null;
  favorites: string[];
  setInitialData: (data: Partial<Pick<AppStore,'products'|'categories'|'vouchers'|'notifications'|'orders'|'currentUser'|'favorites'>>) => void;
  onToggleFavorite: (productId: string) => void;
  onAddReview: (productId: string, review: any) => void;
  onPlaceOrder: (order: Order) => void;
  onUpdateInventory: (productId: string, quantity: number) => void;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  products: [], categories: [], vouchers: [], notifications: [], orders: [], currentUser: null, favorites: [],
  setInitialData: (data) => set((s) => ({ ...s, ...data })),
  onToggleFavorite: (productId) => set((s) => ({ favorites: s.favorites.includes(productId) ? s.favorites.filter(id => id !== productId) : [...s.favorites, productId] })),
  onAddReview: (productId, review) => set((s) => ({ products: s.products.map(p => p.id === productId ? { ...p, reviews: [...(p.reviews || []), review], reviewCount: (p.reviewCount || 0) + 1 } : p) })),
  onPlaceOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
  onUpdateInventory: (productId, quantity) => set((s) => ({ products: s.products.map(p => p.id === productId ? { ...p, stock: Math.max(0, p.stock - quantity) } : p) })),
  onLogin: (user) => set({ currentUser: user }),
  onLogout: () => set({ currentUser: null }),
}));
