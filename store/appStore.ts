import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearAuthSession,
  fetchUserByEmail,
  getStoredAuthSession,
  saveAuthSession,
  type AuthSession,
  updateUserProfile,
} from '../lib/api';
import { AppNotification, Category, Order, Product, UserProfile, Voucher } from '../types';

const FAVORITES_STORAGE_KEY = 'velocart_favorites';

interface AppStore {
  products: Product[];
  categories: Category[];
  vouchers: Voucher[];
  notifications: AppNotification[];
  orders: Order[];
  currentUser: UserProfile | null;
  authToken: string | null;
  authHydrated: boolean;
  favorites: string[];
  setInitialData: (data: Partial<Pick<AppStore,'products'|'categories'|'vouchers'|'notifications'|'orders'|'currentUser'|'favorites'>>) => void;
  onToggleFavorite: (productId: string) => void;
  hydrateFavorites: () => Promise<void>;
  onAddReview: (productId: string, review: any) => void;
  onPlaceOrder: (order: Order) => void;
  onUpdateInventory: (productId: string, quantity: number) => void;
  onLogin: (user: UserProfile, token?: string | null, persist?: boolean, sessionMeta?: Partial<AuthSession>) => Promise<void>;
  onLogout: () => Promise<void>;
  hydrateAuthSession: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updateCurrentUserProfile: (payload: Pick<UserProfile, 'name' | 'email' | 'phone' | 'address'>) => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  products: [], categories: [], vouchers: [], notifications: [], orders: [], currentUser: null, authToken: null, authHydrated: false, favorites: [],
  setInitialData: (data) => set((s) => ({ ...s, ...data })),
  onToggleFavorite: (productId) => {
    const current = get().favorites;
    const favorites = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [productId, ...current];

    set({ favorites });
    AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites)).catch(() => undefined);
  },
  hydrateFavorites: async () => {
    const raw = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return;

    try {
      const favorites = JSON.parse(raw);
      if (Array.isArray(favorites)) {
        set({ favorites: favorites.map(String) });
      }
    } catch {
      await AsyncStorage.removeItem(FAVORITES_STORAGE_KEY);
    }
  },
  onAddReview: (productId, review) => set((s) => ({ products: s.products.map(p => p.id === productId ? { ...p, reviews: [...(p.reviews || []), review], reviewCount: (p.reviewCount || 0) + 1 } : p) })),
  onPlaceOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
  onUpdateInventory: (productId, quantity) => set((s) => ({ products: s.products.map(p => p.id === productId ? { ...p, stock: Math.max(0, p.stock - quantity) } : p) })),
  onLogin: async (user, token = null, persist = true, sessionMeta = {}) => {
    const nextToken = token || get().authToken;
    const normalizedUser = { ...user, avatar: user.avatar || user.avatarUrl };

    if (persist && nextToken) {
      await saveAuthSession({
        token: nextToken,
        tokenType: sessionMeta.tokenType || 'Bearer',
        expiresIn: sessionMeta.expiresIn,
        user: normalizedUser,
      });
    } else if (!persist) {
      await clearAuthSession();
    }

    set({ currentUser: normalizedUser, authToken: nextToken, authHydrated: true });
  },
  onLogout: async () => {
    await clearAuthSession();
    set({ currentUser: null, authToken: null, authHydrated: true });
  },
  hydrateAuthSession: async () => {
    const session = await getStoredAuthSession();
    if (!session) {
      set({ currentUser: null, authToken: null, authHydrated: true });
      return;
    }

    set({ currentUser: session.user, authToken: session.token, authHydrated: true });

    try {
      const freshUser = await fetchUserByEmail(session.user.email, session.token);
      await saveAuthSession({ ...session, user: freshUser });
      set({ currentUser: freshUser });
    } catch {
      set({ currentUser: session.user });
    }
  },
  refreshCurrentUser: async () => {
    const { currentUser, authToken } = get();
    if (!currentUser?.email) return;

    const freshUser = await fetchUserByEmail(currentUser.email, authToken || undefined);
    if (authToken) {
      await saveAuthSession({ token: authToken, tokenType: 'Bearer', user: freshUser });
    }
    set({ currentUser: freshUser });
  },
  updateCurrentUserProfile: async (payload) => {
    const { currentUser, authToken } = get();
    if (!currentUser?.id) {
      throw new Error('Không tìm thấy ID tài khoản để cập nhật.');
    }

    const freshUser = await updateUserProfile(
      currentUser.id,
      {
        ...payload,
        role: currentUser.role || 'member',
        status: currentUser.status || 'active',
      },
      authToken || undefined,
    );

    if (authToken) {
      await saveAuthSession({ token: authToken, tokenType: 'Bearer', user: freshUser });
    }
    set({ currentUser: freshUser });
  },
}));
