import { create } from 'zustand';
import { fetchVouchers } from '../lib/api';
import { Voucher } from '../types';
import { useAuthStore } from './authStore';

interface VoucherStore {
  vouchers: Voucher[];
  hydrateVouchers: () => Promise<void>;
}

export const useVoucherStore = create<VoucherStore>((set) => ({
  vouchers: [],
  hydrateVouchers: async () => {
    const { currentUser, authToken } = useAuthStore.getState();
    const userIdentifier = currentUser?.email || currentUser?.id;
    const vouchers = await fetchVouchers(userIdentifier, authToken || undefined);
    set({ vouchers });
  },
}));
