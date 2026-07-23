import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { AppNotification, Category, HomeBanner, Order, PaymentConfig, Product, UserProfile, Voucher } from '../types';

// ============================================================================
// Client
// ============================================================================

export const AUTH_STORAGE_KEY = 'velocart_auth_session';

export type AuthSession = {
  token: string;
  tokenType: string;
  expiresIn?: string;
  user: UserProfile;
};

const getApiBaseUrl = () => {
  const envBaseUrl = (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_BASE_URL;
  if (typeof envBaseUrl === 'string' && envBaseUrl.trim()) return envBaseUrl.replace(/\/$/, '');
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
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

const get = <T>(path: string, token?: string) => apiRequest<T>(path, { method: 'GET' }, token);
const post = <T>(path: string, body?: unknown, token?: string) =>
  apiRequest<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, token);
const put = <T>(path: string, body: unknown, token?: string) =>
  apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(body) }, token);
const del = <T>(path: string, token?: string) => apiRequest<T>(path, { method: 'DELETE' }, token);

const enc = encodeURIComponent;
const identifierQuery = (userIdentifier?: string) => {
  const id = userIdentifier?.trim();
  return id ? `?${id.includes('@') ? 'email' : 'userId'}=${enc(id)}` : '';
};

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

export const saveAuthSession = (session: AuthSession) =>
  AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));

export const clearAuthSession = () => AsyncStorage.removeItem(AUTH_STORAGE_KEY);

// ============================================================================
// Backend types
// ============================================================================

export type BackendUser = {
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
  cart?: unknown[];
  loyaltyPoints?: number;
  lifetimeValue?: number;
  ordersCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendCategory = {
  id: string | number;
  name: string;
  slug?: string;
  image?: string;
  status?: Category['status'];
};

export type BackendBanner = Partial<HomeBanner> & {
  description?: string;
  target_path?: string;
  target_params?: Record<string, unknown>;
  bg_class_name?: string;
  chip_class_name?: string;
  chip_text_class_name?: string;
  button_class_name?: string;
  button_text_color?: string;
  icon_name?: string;
  detail_icon_name?: string;
  detail_label?: string;
  sort_order?: number;
};

export type BackendNotification = Partial<AppNotification> & {
  createdAt?: string;
  created_at?: string;
  deliveredAt?: string;
  delivered_at?: string;
  isRead?: boolean;
  is_read?: boolean;
};

export type BackendVoucher = Partial<Voucher> & {
  discount_type?: Voucher['discountType'];
  discount_value?: number;
  min_order_value?: number;
  max_discount?: number;
  status?: string;
};

export type BackendProduct = {
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

export type BackendOrder = Partial<Order> & {
  numericId?: string;
  userId?: string;
  user_id?: string | number | null;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  shipping_fee?: number;
  discount_amount?: number;
  voucher_code_used?: string;
  total_amount?: number;
  shipping_unit?: string;
  payment_method?: string;
  payment_status?: string;
  order_status?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

export type BackendOrderItem = Partial<Order['items'][number]> & {
  product_id?: string | number;
  product_name?: string;
  product_image?: string;
  selected_color?: string;
  selected_size?: string;
  selected_version?: string;
};

// ============================================================================
// Normalizers
// ============================================================================

export function normalizeProductIds(value: unknown[] | undefined) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      item && typeof item === 'object' && 'productId' in item
        ? String((item as { productId?: unknown }).productId || '').trim()
        : String(item || '').trim(),
    )
    .filter(Boolean);
}

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
    cart: normalizeProductIds(user.cart),
    loyaltyPoints: Number(user.loyaltyPoints || 0),
    lifetimeValue: Number(user.lifetimeValue || 0),
    ordersCount: Number(user.ordersCount || 0),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizeImages(value: unknown, fallback?: string) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item || '').trim()).filter(Boolean);
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

export function normalizeBanner(banner: BackendBanner): HomeBanner {
  return {
    id: String(banner.id || ''),
    tag: String(banner.tag || 'VeloCart'),
    title: String(banner.title || ''),
    description: String(banner.description || ''),
    note: banner.note,
    cta: String(banner.cta || 'Mua ngay'),
    targetPath: String(banner.targetPath || banner.target_path || '/(tabs)/catalog'),
    targetParams: banner.targetParams || banner.target_params || {},
    bgClassName: String(banner.bgClassName || banner.bg_class_name || 'bg-amber-700'),
    chipClassName: String(banner.chipClassName || banner.chip_class_name || 'bg-amber-300'),
    chipTextClassName: String(banner.chipTextClassName || banner.chip_text_class_name || 'text-amber-950'),
    buttonClassName: String(banner.buttonClassName || banner.button_class_name || 'bg-white'),
    buttonTextColor: String(banner.buttonTextColor || banner.button_text_color || '#18181b'),
    iconName: banner.iconName || banner.icon_name,
    detailIconName: banner.detailIconName || banner.detail_icon_name,
    detailLabel: String(banner.detailLabel || banner.detail_label || 'Ưu đãi nổi bật'),
    status: banner.status || 'active',
    sortOrder: Number(banner.sortOrder ?? banner.sort_order ?? 0),
  };
}

export function normalizeNotification(notification: BackendNotification): AppNotification {
  return {
    id: String(notification.id || ''),
    title: String(notification.title || ''),
    message: String(notification.message || ''),
    date: String(
      notification.date ||
        notification.deliveredAt ||
        notification.delivered_at ||
        notification.createdAt ||
        notification.created_at ||
        '',
    ),
    isRead: Boolean(notification.isRead ?? notification.is_read),
    type: notification.type,
  };
}

export function normalizeVoucher(voucher: BackendVoucher): Voucher {
  const maxDiscount = voucher.maxDiscount ?? voucher.max_discount;
  return {
    code: String(voucher.code || ''),
    discountType: (voucher.discountType || voucher.discount_type) === 'percent' ? 'percent' : 'fixed',
    discountValue: Number(voucher.discountValue ?? voucher.discount_value ?? 0),
    minOrderValue: Number(voucher.minOrderValue ?? voucher.min_order_value ?? 0),
    maxDiscount: maxDiscount == null ? undefined : Number(maxDiscount),
  };
}

function normalizeOrderStatus(value: unknown): Order['orderStatus'] {
  if (value === 'delivered') return 'completed';
  if (value === 'refunded') return 'cancelled';
  if (['pending', 'processing', 'shipping', 'completed', 'cancelled'].includes(String(value))) {
    return String(value) as Order['orderStatus'];
  }
  return 'pending';
}

const normalizePaymentStatus = (value: unknown): Order['paymentStatus'] => (value === 'paid' ? 'paid' : 'pending');

function normalizePaymentMethod(value: unknown): Order['paymentMethod'] {
  const method = String(value || 'COD');
  return ['COD', 'vnpay', 'momo', 'visa', 'bank_transfer'].includes(method)
    ? (method as Order['paymentMethod'])
    : 'COD';
}

function normalizeOrderItem(item: BackendOrderItem): Order['items'][number] {
  return {
    productId: String(item.productId ?? item.product_id ?? ''),
    productName: String(item.productName ?? item.product_name ?? ''),
    productImage: item.productImage ?? item.product_image,
    quantity: Math.max(1, Number(item.quantity || 1)),
    price: Number(item.price || 0),
    selectedColor: item.selectedColor ?? item.selected_color,
    selectedSize: item.selectedSize ?? item.selected_size,
    selectedVersion: item.selectedVersion ?? item.selected_version,
  };
}

export function normalizeOrder(order: BackendOrder): Order {
  const rawItems = Array.isArray(order.items) ? order.items : [];
  return {
    id: String(order.id || order.numericId || ''),
    customerName: String(order.customerName ?? order.customer_name ?? ''),
    customerPhone: String(order.customerPhone ?? order.customer_phone ?? ''),
    customerEmail: order.customerEmail ?? order.customer_email,
    customerAddress: String(order.customerAddress ?? order.customer_address ?? ''),
    items: rawItems.map((item) => normalizeOrderItem(item as BackendOrderItem)).filter((item) => item.productId),
    shippingFee: Number(order.shippingFee ?? order.shipping_fee ?? 0),
    discountAmount: Number(order.discountAmount ?? order.discount_amount ?? 0),
    voucherCodeUsed: order.voucherCodeUsed ?? order.voucher_code_used,
    totalAmount: Number(order.totalAmount ?? order.total_amount ?? 0),
    shippingUnit: String(order.shippingUnit ?? order.shipping_unit ?? 'standard'),
    paymentMethod: normalizePaymentMethod(order.paymentMethod ?? order.payment_method),
    paymentStatus: normalizePaymentStatus(order.paymentStatus ?? order.payment_status),
    orderStatus: normalizeOrderStatus(order.orderStatus ?? order.order_status),
    createdAt: String(order.createdAt ?? order.created_at ?? new Date().toISOString()),
  };
}

// ============================================================================
// Auth
// ============================================================================

export async function loginWithPassword(payload: { usernameOrEmail: string; password: string }) {
  const data = await post<{
    ok: true;
    message: string;
    'jwt-token': string;
    tokenType?: string;
    expiresIn?: string;
    user: BackendUser;
  }>('/api/auth/login', payload);

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
  const username =
    payload.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 28) || `user${Date.now()}`;

  await post<{ ok: true; user: BackendUser }>('/api/auth/register', {
    username,
    password: payload.password,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    role: 'member',
  });

  return loginWithPassword({ usernameOrEmail: payload.email, password: payload.password });
}

// ============================================================================
// Users
// ============================================================================

export type BackendCartItem = { productId: string; quantity: number };

function normalizeCartItems(value: unknown[] | undefined): BackendCartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      item && typeof item === 'object' && 'productId' in item
        ? {
            productId: String((item as { productId?: unknown }).productId || '').trim(),
            quantity: Math.max(1, Number((item as { quantity?: unknown }).quantity || 1)),
          }
        : { productId: String(item || '').trim(), quantity: 1 },
    )
    .filter((item) => item.productId);
}

const pickProductIds = (data: { favorites?: unknown[]; productIds?: unknown[] }) =>
  normalizeProductIds(Array.isArray(data.productIds) ? data.productIds : data.favorites);

export async function fetchUserByEmail(email: string, token?: string) {
  const data = await get<{ ok: true; user: BackendUser }>(`/api/users/email/${enc(email)}`, token);
  return normalizeUser(data.user);
}

export async function updateUserProfile(
  userId: string,
  payload: Pick<UserProfile, 'name' | 'email' | 'phone' | 'address'> & Pick<Partial<UserProfile>, 'role' | 'status'>,
  token?: string,
) {
  const data = await put<{ ok: true; user: BackendUser }>(`/api/users/${enc(userId)}`, payload, token);
  return normalizeUser(data.user);
}

export async function addUserCartProduct(userId: string, productId: string, quantity = 1, token?: string) {
  const data = await post<{ ok: true; user: BackendUser }>(
    `/api/users/${enc(userId)}/cart/${enc(productId)}`,
    { quantity },
    token,
  );
  return normalizeUser(data.user);
}

export async function removeUserCartProduct(userId: string, productId: string, token?: string) {
  const data = await del<{ ok: true; user: BackendUser }>(`/api/users/${enc(userId)}/cart/${enc(productId)}`, token);
  return normalizeUser(data.user);
}

export async function fetchUserCart(userId: string, token?: string) {
  const data = await get<{ ok: true; cart?: unknown[]; productIds?: unknown[] }>(
    `/api/users/${enc(userId)}/cart`,
    token,
  );
  return normalizeCartItems(Array.isArray(data.cart) ? data.cart : data.productIds);
}

export async function addUserFavoriteProduct(userId: string, productId: string, token?: string) {
  return pickProductIds(
    await post<{ ok: true; favorites?: unknown[]; productIds?: unknown[] }>(
      `/api/users/${enc(userId)}/favorites/${enc(productId)}`,
      undefined,
      token,
    ),
  );
}

export async function removeUserFavoriteProduct(userId: string, productId: string, token?: string) {
  return pickProductIds(
    await del<{ ok: true; favorites?: unknown[]; productIds?: unknown[] }>(
      `/api/users/${enc(userId)}/favorites/${enc(productId)}`,
      token,
    ),
  );
}

export async function fetchUserFavorites(userId: string, token?: string) {
  return pickProductIds(
    await get<{ ok: true; favorites?: unknown[]; productIds?: unknown[] }>(`/api/users/${enc(userId)}/favorites`, token),
  );
}

// ============================================================================
// Catalog
// ============================================================================

export async function fetchBanners() {
  const data = await get<{ ok: true; banners: BackendBanner[] }>('/api/banners');
  return data.banners.map(normalizeBanner).filter((banner) => banner.id && banner.title);
}

export async function fetchCatalogData() {
  const [categoriesData, productsData] = await Promise.all([
    get<{ ok: true; categories: BackendCategory[] }>('/api/categories'),
    get<{ ok: true; products: BackendProduct[] }>('/api/products'),
  ]);

  return {
    categories: categoriesData.categories.map(normalizeCategory).filter((category) => category.status !== 'inactive'),
    products: productsData.products.map(normalizeProduct).filter((product) => product.categoryId && product.image),
  };
}

// ============================================================================
// Orders
// ============================================================================

export async function createOrder(order: Order & { userId?: string; note?: string }, token?: string) {
  const data = await post<{ ok: true; order: BackendOrder }>('/api/orders', order, token);
  return normalizeOrder(data.order);
}

export async function fetchUserOrders(userIdentifier: string, token?: string) {
  const data = await get<{ ok: true; orders: BackendOrder[] }>(
    `/api/orders${identifierQuery(userIdentifier)}`,
    token,
  );
  return data.orders.map(normalizeOrder);
}

// ============================================================================
// Vouchers
// ============================================================================

export async function fetchVouchers(userIdentifier?: string, token?: string) {
  const data = await get<{ ok: true; vouchers: BackendVoucher[] }>(
    `/api/vouchers${identifierQuery(userIdentifier)}`,
    token,
  );
  return data.vouchers.map(normalizeVoucher).filter((voucher) => voucher.code);
}

// ============================================================================
// Notifications
// ============================================================================

export async function fetchNotifications(userIdentifier?: string, token?: string) {
  const data = await get<{ ok: true; notifications: BackendNotification[] }>(
    `/api/notifications${identifierQuery(userIdentifier)}`,
    token,
  );
  return data.notifications.map(normalizeNotification).filter((notification) => notification.id);
}

// ============================================================================
// Payments
// ============================================================================

export const fetchPayments = async () =>
  (await get<{ ok: true; payments: PaymentConfig[] }>('/api/payments')).payments;

export const createVNPayPayment = (
  orderId: string,
  amount: number,
  orderInfo?: string,
  token?: string,
  useTryItNow = false,
  clientReturnUrl?: string,
) =>
  post<{ ok: true; paymentUrl: string; source?: 'merchant' | 'tryitnow'; warning?: string }>(
    '/api/payments/vnpay/create',
    { orderId, amount, orderInfo, useTryItNow, clientReturnUrl },
    token,
  );

export const createVNPayTokenPayment = (
  orderId: string,
  userId: string,
  amount: number,
  token?: string,
  clientReturnUrl?: string,
) =>
  post<{ ok: true; paymentUrl: string; source?: 'token_ui' | 'merchant' | 'tryitnow'; warning?: string }>(
    '/api/payments/vnpay/token/create',
    { orderId, userId, amount, clientReturnUrl },
    token,
  );

export const confirmVNPayTryItNowPayment = (params: Record<string, string>, token?: string) =>
  post<{
    ok: true;
    orderId: string;
    transactionId?: string;
    status: 'success' | 'failed';
    message: string;
    total?: number;
  }>('/api/payments/vnpay/tryitnow/confirm', { params }, token);

export const createMoMoPayment = (
  orderId: string,
  amount: number,
  orderInfo?: string,
  extraData?: string,
  token?: string,
) =>
  post<{ ok: true; payUrl: string; qrCodeUrl?: string; deeplink?: string }>(
    '/api/payments/momo/create',
    { orderId, amount, orderInfo, extraData },
    token,
  );

export const createVisaPayment = (
  orderId: string,
  amount: number,
  orderInfo?: string,
  token?: string,
  clientReturnUrl?: string,
) =>
  post<{ ok: true; paymentUrl: string; source?: 'merchant' | 'tryitnow'; warning?: string }>(
    '/api/payments/visa/create',
    { orderId, amount, orderInfo, clientReturnUrl },
    token,
  );

export const createBankTransferPayment = (orderId: string, amount: number, payerName: string, token?: string) =>
  post<{
    ok: true;
    orderId: string;
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
    transferContent: string;
    qrUrl: string;
  }>('/api/payments/bank-transfer/create', { orderId, amount, payerName }, token);

export const fetchBankTransferStatus = (orderId: string, token?: string) =>
  get<{
    ok: true;
    orderId: string;
    total: number;
    paymentStatus: string;
    orderStatus: string;
    paid: boolean;
  }>(`/api/payments/bank-transfer/status/${enc(orderId)}`, token);

export const syncBankTransferTransactions = (token?: string) =>
  post<{ ok: true; matched: number; transactions: number }>('/api/payments/bank-transfer/sync', undefined, token);

// ============================================================================
// Settings
// ============================================================================

export type MobileSetting = {
  key?: string;
  settingKey?: string;
  value?: Record<string, unknown>;
  status?: 'active' | 'inactive' | string;
};

export const fetchSettings = (includeInactive = false, token?: string) =>
  get<{ ok: true; settings: MobileSetting[] }>(
    `/api/settings${includeInactive ? '?includeInactive=true' : ''}`,
    token,
  );

// ============================================================================
// Support
// ============================================================================

export type MobileSupportMessage = {
  id: string;
  sender: 'customer' | 'ai' | 'agent';
  text: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type MobileSupportTicket = {
  id: string;
  customerName: string;
  customerEmail: string;
  lastMessage: string;
  updatedAt?: string;
  status?: 'open' | 'pending' | 'solved';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  sentiment?: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;
  intent?: string;
  confidenceScore?: number;
  messages?: MobileSupportMessage[];
  assignedToAI?: boolean;
  notes?: string;
  slaMinutesRemaining?: number;
};

export const saveSupportTicket = (ticket: MobileSupportTicket, token?: string) =>
  post<{ ok: true; ticket: MobileSupportTicket }>('/api/support/tickets', ticket, token);

export const fetchSupportTicket = (ticketId: string, token?: string) =>
  get<{ ok: true; ticket: MobileSupportTicket }>(`/api/support/tickets/${enc(ticketId)}`, token);

export const addSupportTicketMessage = (ticketId: string, message: MobileSupportMessage, token?: string) =>
  post<{ ok: true; ticket: MobileSupportTicket }>(
    `/api/support/tickets/${enc(ticketId)}/messages`,
    message,
    token,
  );

// ============================================================================
// AI
// ============================================================================

export const askCustomerSupportAi = (payload: {
  customerName?: string;
  customerEmail?: string;
  messages: Array<{ sender: 'user' | 'bot' | 'customer' | 'ai'; text: string }>;
  catalog?: Array<{
    id: string;
    name: string;
    brand?: string;
    price?: number;
    stock?: number;
    image?: string;
    category?: string;
    rating?: number;
    soldCount?: number;
    isBestSeller?: boolean;
    trendLabel?: string;
  }>;
  shopContext?: Record<string, unknown>;
}) =>
  post<{
    ok: true;
    provider?: string;
    aiDisabled?: boolean;
    suggestedReply: string;
    intent?: string;
    recommendedActions?: string[];
    note?: string;
  }>('/api/ai/customer-support', payload);
