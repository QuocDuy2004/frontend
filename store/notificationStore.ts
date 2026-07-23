import { create } from 'zustand';
import { fetchNotifications } from '../lib/api';
import { AppNotification } from '../types';
import { useAuthStore } from './authStore';

interface NotificationStore {
  notifications: AppNotification[];
  hydrateNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  hydrateNotifications: async () => {
    const { currentUser, authToken } = useAuthStore.getState();
    const userIdentifier = currentUser?.email || currentUser?.id;
    const notifications = await fetchNotifications(userIdentifier, authToken || undefined);
    set({ notifications });
  },
}));
