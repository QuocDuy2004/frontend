import { create } from 'zustand';
import { CartItem, Product } from '../types';

const firstAttr = (product: Product, name: string) => product.attributes?.find(a => a.name === name)?.values?.[0] || '';
const versionAttr = (product: Product) => product.attributes?.find(a => a.name === 'Dung lượng' || a.name === 'Phiên bản')?.values?.[0] || '';

interface CartStore {
  cartItems: CartItem[];
  voucherCode: string;
  appliedVoucherCode?: string;
  addToCart: (product: Product, quantity?: number, options?: { color?: string; size?: string; version?: string }) => void;
  updateQuantity: (cartItemId: string, change: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  subtotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  cartItems: [], voucherCode: '',
  addToCart: (product, quantity = 1, options = {}) => set((s) => {
    const color = options.color ?? firstAttr(product, 'Màu sắc');
    const size = options.size ?? firstAttr(product, 'Kích cỡ');
    const version = options.version ?? versionAttr(product);
    const id = `${product.id}_${color}_${size}_${version}`;
    const exists = s.cartItems.find(i => i.id === id);
    return { cartItems: exists ? s.cartItems.map(i => i.id === id ? { ...i, quantity: i.quantity + quantity } : i) : [...s.cartItems, { id, product, quantity, selectedColor: color || undefined, selectedSize: size || undefined, selectedVersion: version || undefined }] };
  }),
  updateQuantity: (id, change) => set((s) => ({ cartItems: s.cartItems.map(i => i.id === id ? { ...i, quantity: i.quantity + change } : i).filter(i => i.quantity > 0) })),
  removeItem: (id) => set((s) => ({ cartItems: s.cartItems.filter(i => i.id !== id) })),
  clearCart: () => set({ cartItems: [] }),
  subtotal: () => get().cartItems.reduce((sum, item) => sum + item.product.discountPrice * item.quantity, 0),
}));
