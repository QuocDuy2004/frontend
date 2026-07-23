import { create } from 'zustand';
import { fetchUserOrders } from '../lib/api';
import { Order } from '../types';
import { useAuthStore } from './authStore';

interface OrderStore {
  orders: Order[];
  hydrateUserOrders: () => Promise<void>;
  onPlaceOrder: (order: Order) => void;
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  hydrateUserOrders: async () => {
    const { currentUser, authToken } = useAuthStore.getState();
    const userIdentifier = currentUser?.email || currentUser?.id;
    if (!userIdentifier) return;

    const orders = await fetchUserOrders(userIdentifier, authToken || undefined);
    set({ orders });
  },
  onPlaceOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
}));
