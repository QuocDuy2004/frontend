import { create } from 'zustand';
import {
  clearAuthSession,
  fetchUserByEmail,
  getStoredAuthSession,
  saveAuthSession,
  updateUserProfile,
  type AuthSession,
} from '../lib/api';
import { UserProfile } from '../types';

interface AuthStore {
  currentUser: UserProfile | null;
  authToken: string | null;
  authHydrated: boolean;
  onLogin: (user: UserProfile, token?: string | null, persist?: boolean, sessionMeta?: Partial<AuthSession>) => Promise<void>;
  onLogout: () => Promise<void>;
  hydrateAuthSession: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updateCurrentUserProfile: (payload: Pick<UserProfile, 'name' | 'email' | 'phone' | 'address'>) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  currentUser: null,
  authToken: null,
  authHydrated: false,
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
