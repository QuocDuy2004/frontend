import { create } from 'zustand';
import { CartItem, Product } from '../types';
import { addUserCartProduct, fetchUserCart, removeUserCartProduct, saveAuthSession } from '../lib/api';
import { getProductSalePrice } from '../lib/pricing';
import { useAuthStore } from './authStore';
import { useCatalogStore } from './catalogStore';

const firstAttr = (product: Product, name: string) => product.attributes?.find(a => a.name === name)?.values?.[0] || '';
const versionAttr = (product: Product) => product.attributes?.find(a => a.name === 'Dung lượng' || a.name === 'Phiên bản')?.values?.[0] || '';

interface CartStore {
  cartItems: CartItem[];
  voucherCode: string;
  appliedVoucherCode?: string;
  addToCart: (product: Product, quantity?: number, options?: { color?: string; size?: string; version?: string }) => void;
  updateQuantity: (cartItemId: string, change: number) => void;
  removeItem: (cartItemId: string) => void;
  hydrateUserCart: () => Promise<void>;
  clearCart: () => void;
  subtotal: () => number;
}

async function syncUserCart(productId: string, action: 'add' | 'remove', quantity = 1) {
  const { currentUser, authToken } = useAuthStore.getState();
  const userIdentifier = currentUser?.email || currentUser?.id;
  if (!userIdentifier) return;

  try {
    const freshUser = action === 'add'
      ? await addUserCartProduct(userIdentifier, productId, quantity, authToken || undefined)
      : await removeUserCartProduct(userIdentifier, productId, authToken || undefined);

    useAuthStore.setState({ currentUser: freshUser });
    if (authToken) {
      await saveAuthSession({ token: authToken, tokenType: 'Bearer', user: freshUser });
    }
  } catch {
    // Cart stays usable offline; the next profile refresh will restore server state.
  }
}

export const useCartStore = create<CartStore>((set, get) => ({
  cartItems: [],
  voucherCode: '',
  addToCart: (product, quantity = 1, options = {}) => {
    let addedQuantity = 0;
    set((s) => {
      const color = options.color ?? firstAttr(product, 'Màu sắc');
      const size = options.size ?? firstAttr(product, 'Kích cỡ');
      const version = options.version ?? versionAttr(product);
      const id = `${product.id}_${color}_${size}_${version}`;
      const exists = s.cartItems.find(i => i.id === id);
      const stock = Math.max(0, Number(product.stock || 0));
      const currentProductQuantity = s.cartItems
        .filter(i => i.product.id === product.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      addedQuantity = Math.min(Math.max(1, quantity), Math.max(0, stock - currentProductQuantity));

      if (addedQuantity <= 0) return s;

      return {
        cartItems: exists
          ? s.cartItems.map(i => i.id === id ? { ...i, quantity: i.quantity + addedQuantity } : i)
          : [...s.cartItems, { id, product, quantity: addedQuantity, selectedColor: color || undefined, selectedSize: size || undefined, selectedVersion: version || undefined }],
      };
    });
    if (addedQuantity > 0) {
      void syncUserCart(product.id, 'add', addedQuantity);
    }
  },
  updateQuantity: (id, change) => {
    const productId = get().cartItems.find(i => i.id === id)?.product.id;
    let actualChange = 0;
    set((s) => ({
      cartItems: s.cartItems
        .map((i) => {
          if (i.id !== id) return i;

          const stock = Math.max(0, Number(i.product.stock || 0));
          const otherProductQuantity = s.cartItems
            .filter(item => item.id !== id && item.product.id === i.product.id)
            .reduce((sum, item) => sum + item.quantity, 0);
          const maxQuantity = Math.max(0, stock - otherProductQuantity);
          const nextQuantity = Math.max(0, Math.min(i.quantity + change, maxQuantity));
          actualChange = nextQuantity - i.quantity;

          return { ...i, quantity: nextQuantity };
        })
        .filter(i => i.quantity > 0),
    }));
    if (productId && actualChange > 0) {
      void syncUserCart(productId, 'add', actualChange);
    }
    if (productId && !get().cartItems.some(i => i.product.id === productId)) {
      void syncUserCart(productId, 'remove');
    }
  },
  removeItem: (id) => {
    const productId = get().cartItems.find(i => i.id === id)?.product.id;
    set((s) => ({ cartItems: s.cartItems.filter(i => i.id !== id) }));
    if (productId && !get().cartItems.some(i => i.product.id === productId)) {
      void syncUserCart(productId, 'remove');
    }
  },
  hydrateUserCart: async () => {
    const { currentUser, authToken } = useAuthStore.getState();
    const { products } = useCatalogStore.getState();
    const userIdentifier = currentUser?.email || currentUser?.id;
    if (!userIdentifier || products.length === 0) return;

    try {
      const cartItemsFromApi = await fetchUserCart(userIdentifier, authToken || undefined);
      const quantityByProductId = new Map(
        cartItemsFromApi.map((item) => [item.productId, Math.max(1, Number(item.quantity || 1))])
      );
      const currentItems = get().cartItems;
      const cartItems = products
        .filter(product => quantityByProductId.has(product.id))
        .map((product) => {
          const existing = currentItems.find(item => item.product.id === product.id);
          const quantity = Math.min(quantityByProductId.get(product.id) || 1, Math.max(0, Number(product.stock || 0)));
          return existing ? { ...existing, quantity } : { id: `${product.id}___`, product, quantity };
        })
        .filter(item => item.quantity > 0);

      set({ cartItems });
    } catch {
      // Keep the local cart visible if the backend is temporarily unavailable.
    }
  },
  clearCart: () => set({ cartItems: [] }),
  subtotal: () => get().cartItems.reduce((sum, item) => sum + getProductSalePrice(item.product) * item.quantity, 0),
}));
