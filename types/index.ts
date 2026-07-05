export interface ProductAttribute { name: string; values: string[] }
export interface Review { id: string; productId: string; productName?: string; userName: string; userAvatar?: string; rating: number; comment: string; createdAt: string; isApproved?: boolean }
export interface Product {
  id: string; sku?: string; name: string; brand: string; categoryId: string; image: string; images?: string[]; videoUrl?: string;
  originalPrice: number; discountPrice: number; flashSalePrice?: number; discountPercent?: number; rating?: number; reviewCount?: number; soldCount?: number;
  stock: number; isNew?: boolean; isBestSeller?: boolean; attributes?: ProductAttribute[]; description?: string; specification?: Record<string,string>; reviews?: Review[];
}
export interface CartItem { id: string; product: Product; quantity: number; selectedColor?: string; selectedSize?: string; selectedVersion?: string }
export interface Voucher { code: string; discountType: 'fixed' | 'percent'; discountValue: number; minOrderValue: number; maxDiscount?: number }
export interface AppNotification { id: string; title: string; message: string; date?: string; isRead?: boolean; type?: string }
export interface ShippingMethod { id: string; name: string; price: number; eta?: string }
export interface PaymentConfig {
  id: string;
  code: 'COD'|'vnpay'|'momo'|'visa'|'bank_transfer'|string;
  name: string;
  title: string;
  subtitle?: string;
  provider?: string;
  logoType: 'text'|'image';
  logoText?: string;
  logoUri?: string;
  logoBgClassName?: string;
  toneClassName: string;
  paymentStatusOnOrder: 'pending'|'paid';
  status: 'active'|'inactive';
  sortOrder?: number;
  config?: Record<string, unknown>;
}
export interface OrderItem { productId: string; productName: string; productImage?: string; quantity: number; price: number; selectedColor?: string; selectedSize?: string; selectedVersion?: string }
export interface Order { id: string; customerName: string; customerPhone: string; customerEmail?: string; customerAddress: string; items: OrderItem[]; shippingFee: number; discountAmount: number; voucherCodeUsed?: string; totalAmount: number; shippingUnit: string; paymentMethod: 'COD'|'vnpay'|'momo'|'visa'|'bank_transfer'; paymentStatus: 'pending'|'paid'; orderStatus: 'pending'|'processing'|'shipping'|'completed'|'cancelled'; createdAt: string }
export interface Category { id: string; name: string; icon?: string; image?: string; slug?: string; status?: 'active' | 'inactive' }
export interface UserProfile {
  id?: string;
  username?: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  avatar?: string;
  avatarUrl?: string;
  role?: 'member' | 'seller' | 'admin';
  status?: 'active' | 'blocked' | 'deleted';
  loyaltyPoints?: number;
  lifetimeValue?: number;
  ordersCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
