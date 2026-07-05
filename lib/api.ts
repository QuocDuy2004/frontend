import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Category, PaymentConfig, Product, UserProfile } from '../types';

export const AUTH_STORAGE_KEY = 'velocart_auth_session';

export type AuthSession = {
  token: string;
  tokenType: string;
  expiresIn?: string;
  user: UserProfile;
};

type BackendUser = {
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  avatar_url?: string;
  role?: UserProfile['role'];
  status?: UserProfile['status'];
  loyaltyPoints?: number;
  lifetimeValue?: number;
  ordersCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type BackendCategory = {
  id: string | number;
  name: string;
  slug?: string;
  image?: string;
  status?: Category['status'];
};

type BackendProduct = {
  id: string | number;
  categoryId?: string | number;
  category_id?: string | number;
  sku?: string;
  name: string;
  brand?: string;
  image?: string;
  images?: string[];
  videoUrl?: string;
  video_url?: string;
  originalPrice?: number;
  original_price?: number;
  discountPrice?: number;
  discount_price?: number;
  flashSalePrice?: number;
  flash_sale_price?: number;
  discountPercent?: number;
  discount_percent?: number;
  rating?: number;
  reviewCount?: number;
  review_count?: number;
  soldCount?: number;
  stock?: number;
  inventory?: number;
  isNew?: boolean;
  is_new?: boolean;
  isBestSeller?: boolean;
  is_best_seller?: boolean;
  attributes?: Product['attributes'];
  specification?: Product['specification'];
  description?: string;
};

const getApiBaseUrl = () => {
  const envBaseUrl = (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_BASE_URL;
  if (typeof envBaseUrl === 'string' && envBaseUrl.trim()) {
    return envBaseUrl.replace(/\/$/, '');
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

export function normalizeUser(user: BackendUser): UserProfile {
  const avatar = user.avatarUrl || user.avatar_url;

  return {
    id: user.id,
    username: user.username,
    name: user.name || 'Khach hang VeloCart',
    email: user.email || '',
    phone: user.phone || '',
    address: user.address || '',
    avatar,
    avatarUrl: avatar,
    role: user.role || 'member',
    status: user.status || 'active',
    loyaltyPoints: Number(user.loyaltyPoints || 0),
    lifetimeValue: Number(user.lifetimeValue || 0),
    ordersCount: Number(user.ordersCount || 0),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizeImages(value: unknown, fallback?: string) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      return [value.trim()];
    }
  }
  return fallback ? [fallback] : [];
}

function isVideoMedia(value?: string) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return /\.(mp4|mov|m4v|webm|ogg)(\?.*)?$/.test(normalized) || normalized.includes('/video/') || normalized.includes('video');
}

export function normalizeCategory(category: BackendCategory): Category {
  return {
    id: String(category.id),
    name: category.name,
    slug: category.slug,
    image: category.image,
    status: category.status || 'active',
  };
}

export function normalizeProduct(product: BackendProduct): Product {
  const images = normalizeImages(product.images, product.image);
  const coverImage = images.find((image) => !isVideoMedia(image)) || product.image || images[0] || '';
  const originalPrice = Number(product.originalPrice ?? product.original_price ?? 0);
  const discountPrice = Number(product.discountPrice ?? product.discount_price ?? originalPrice);
  const flashSalePrice = product.flashSalePrice ?? product.flash_sale_price;

  return {
    id: String(product.id),
    sku: product.sku,
    name: product.name,
    brand: product.brand || 'VeloCart',
    categoryId: String(product.categoryId ?? product.category_id ?? ''),
    image: coverImage,
    images,
    videoUrl: product.videoUrl || product.video_url,
    originalPrice,
    discountPrice,
    flashSalePrice: flashSalePrice == null ? undefined : Number(flashSalePrice),
    discountPercent: Number(product.discountPercent ?? product.discount_percent ?? 0),
    rating: Number(product.rating || 0),
    reviewCount: Number(product.reviewCount ?? product.review_count ?? 0),
    soldCount: Number(product.soldCount || 0),
    stock: Number(product.stock ?? product.inventory ?? 0),
    isNew: Boolean(product.isNew ?? product.is_new),
    isBestSeller: Boolean(product.isBestSeller ?? product.is_best_seller),
    attributes: Array.isArray(product.attributes) ? product.attributes : [],
    specification: product.specification || {},
    description: product.description || '',
  };
}

export async function getStoredAuthSession() {
  const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed?.token && parsed?.user?.email) return parsed;
  } catch {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return null;
}

export async function saveAuthSession(session: AuthSession) {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export async function clearAuthSession() {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || `API request failed (${response.status})`);
  }

  return data as T;
}

export async function loginWithPassword(payload: { usernameOrEmail: string; password: string }) {
  const data = await apiRequest<{
    ok: true;
    message: string;
    'jwt-token': string;
    tokenType?: string;
    expiresIn?: string;
    user: BackendUser;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    token: data['jwt-token'],
    tokenType: data.tokenType || 'Bearer',
    expiresIn: data.expiresIn,
    user: normalizeUser(data.user),
  } satisfies AuthSession;
}

export async function registerAccount(payload: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  address?: string;
}) {
  const username = payload.email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 28) || `user${Date.now()}`;

  await apiRequest<{ ok: true; user: BackendUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      password: payload.password,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      role: 'member',
    }),
  });

  return loginWithPassword({ usernameOrEmail: payload.email, password: payload.password });
}

export async function fetchUserByEmail(email: string, token?: string) {
  const data = await apiRequest<{ ok: true; user: BackendUser }>(
    `/api/users/email/${encodeURIComponent(email)}`,
    { method: 'GET' },
    token,
  );

  return normalizeUser(data.user);
}

export async function updateUserProfile(
  userId: string,
  payload: Pick<UserProfile, 'name' | 'email' | 'phone' | 'address'> &
    Pick<Partial<UserProfile>, 'role' | 'status'>,
  token?: string,
) {
  const data = await apiRequest<{ ok: true; user: BackendUser }>(
    `/api/users/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    token,
  );

  return normalizeUser(data.user);
}

export async function fetchPayments() {
  const data = await apiRequest<{ ok: true; payments: PaymentConfig[] }>('/api/payments', {
    method: 'GET',
  });

  return data.payments;
}

export async function fetchCatalogData() {
  const [categoriesData, productsData] = await Promise.all([
    apiRequest<{ ok: true; categories: BackendCategory[] }>('/api/categories', { method: 'GET' }),
    apiRequest<{ ok: true; products: BackendProduct[] }>('/api/products', { method: 'GET' }),
  ]);

  return {
    categories: categoriesData.categories
      .map(normalizeCategory)
      .filter((category) => category.status !== 'inactive'),
    products: productsData.products
      .map(normalizeProduct)
      .filter((product) => product.categoryId && product.image),
  };
}
