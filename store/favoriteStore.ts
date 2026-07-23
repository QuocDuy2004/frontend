import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addUserFavoriteProduct, fetchUserFavorites, removeUserFavoriteProduct } from '../lib/api';
import { useAuthStore } from './authStore';

const FAVORITES_STORAGE_KEY = 'velocart_favorites';

interface FavoriteStore {
  favorites: string[];
  onToggleFavorite: (productId: string) => void;
  hydrateFavorites: () => Promise<void>;
}

export const useFavoriteStore = create<FavoriteStore>((set, get) => ({
  favorites: [],
  onToggleFavorite: (productId) => {
    const { currentUser, authToken } = useAuthStore.getState();
    const userIdentifier = currentUser?.email || currentUser?.id;
    const current = get().favorites;
    const isFavorite = current.includes(productId);
    const favorites = isFavorite
      ? current.filter((id) => id !== productId)
      : [productId, ...current];

    set({ favorites });
    AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites)).catch(() => undefined);
    if (userIdentifier) {
      const request = isFavorite
        ? removeUserFavoriteProduct(userIdentifier, productId, authToken || undefined)
        : addUserFavoriteProduct(userIdentifier, productId, authToken || undefined);

      request
        .then((freshFavorites) => {
          set({ favorites: freshFavorites });
          AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(freshFavorites)).catch(() => undefined);
        })
        .catch(() => undefined);
    }
  },
  hydrateFavorites: async () => {
    const { currentUser, authToken } = useAuthStore.getState();
    const userIdentifier = currentUser?.email || currentUser?.id;
    if (userIdentifier) {
      try {
        const favorites = await fetchUserFavorites(userIdentifier, authToken || undefined);
        set({ favorites });
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
        return;
      } catch {
        // Fall back to local favorites when the backend is temporarily unavailable.
      }
    }

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
}));
