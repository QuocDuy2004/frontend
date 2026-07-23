import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useSegments } from 'expo-router';
import { Bot, HelpCircle, Plus, Send, ShoppingBag, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from './tw';
import { useAuthStore } from '../store/authStore';
import { useCatalogStore } from '../store/catalogStore';
import { useFavoriteStore } from '../store/favoriteStore';
import { useNotificationStore } from '../store/notificationStore';
import { useOrderStore } from '../store/orderStore';
import { useVoucherStore } from '../store/voucherStore';
import { useCartStore } from '../store/cartStore';
import { Product } from '../types';
import { useCartFlyAnimation } from './CartFlyProvider';
import {
  addSupportTicketMessage,
  addUserCartProduct,
  addUserFavoriteProduct,
  askCustomerSupportAi,
  fetchSupportTicket,
  fetchUserCart,
  fetchUserFavorites,
  fetchSettings,
  removeUserCartProduct,
  removeUserFavoriteProduct,
  saveSupportTicket,
  saveAuthSession,
} from '../lib/api';
import { getProductSalePrice } from '../lib/pricing';

type Suggestion = {
  id: string;
  title: string;
  subtitle: string;
  product: Product;
};

type ChatAction =
  | { id: string; label: string; type: 'catalog' | 'cart' | 'account' | 'notifications' }
  | { id: string; label: string; type: 'add-cart' | 'remove-cart' | 'add-favorite' | 'remove-favorite' | 'view-product'; productId: string };

type ChatMessage = {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  createdAt: number;
  suggestions?: Suggestion[];
  actions?: ChatAction[];
};

const CHAT_STORAGE_KEY = 'velocart_chatbox_messages_v1';
const CHAT_TICKET_STORAGE_KEY = 'velocart_chatbox_ticket_id_v1';
const CHAT_ACTIVE_TICKET_STORAGE_KEY = 'velocart_chatbox_active_support_ticket_id_v1';
const CHAT_TTL_MS = 24 * 60 * 60 * 1000;

const formatTime = () => {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

const toSupportSafeId = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'guest';

const formatPrice = (product: Product) => `${getProductSalePrice(product).toLocaleString('vi-VN')}đ`;

const buildSuggestion = (product: Product): Suggestion => ({
  id: product.id,
  title: product.name,
  subtitle: `${product.brand} - ${formatPrice(product)}`,
  product,
});

const PRODUCT_STOP_WORDS = new Set([
  'xem',
  'tim',
  'kiem',
  'tra',
  'tu',
  'van',
  'san',
  'pham',
  'hang',
  'gia',
  'tu',
  'den',
  'duoi',
  'tren',
  'nho',
  'hon',
  'lon',
  'khoang',
  're',
  'dat',
  'cao',
  'thap',
  'nhat',
  'sap',
  'xep',
  'theo',
  'co',
  'khong',
]);

const welcomeMessage = (): ChatMessage => ({
  id: 'welcome',
  sender: 'bot',
  text: 'Xin chào. VeloCart có thể hỗ trợ tư vấn sản phẩm, xem giỏ hàng, thêm hoặc xóa sản phẩm khỏi giỏ theo yêu cầu của bạn.',
  time: formatTime(),
  createdAt: Date.now(),
  actions: [
    { id: 'go-catalog', label: 'Xem sản phẩm', type: 'catalog' },
    { id: 'go-cart', label: 'Mở giỏ hàng', type: 'cart' },
  ],
});

function TypingBubble({ step }: { step: number }) {
  return (
    <View className="items-start">
      <View className="max-w-[84%] rounded-2xl rounded-tl-none border border-cyan-100 bg-white px-3 py-2.5 shadow-sm">
        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1">
            {[0, 1, 2].map((dot) => (
              <View key={dot} className={`h-1.5 w-1.5 rounded-full ${dot <= step ? 'bg-cyan-500' : 'bg-cyan-200'}`} />
            ))}
          </View>
          <Text className="text-[12px] font-black text-cyan-600">Đang soạn tin</Text>
        </View>
      </View>
    </View>
  );
}

export default function ChatBox() {
  const segments = useSegments();
  const products = useCatalogStore((state) => state.products);
  const categories = useCatalogStore((state) => state.categories);
  const vouchers = useVoucherStore((state) => state.vouchers);
  const notifications = useNotificationStore((state) => state.notifications);
  const orders = useOrderStore((state) => state.orders);
  const favorites = useFavoriteStore((state) => state.favorites);
  const currentUser = useAuthStore((state) => state.currentUser);
  const authToken = useAuthStore((state) => state.authToken);
  const addToCart = useCartStore((state) => state.addToCart);
  const cartItems = useCartStore((state) => state.cartItems);
  const hydrateUserCart = useCartStore((state) => state.hydrateUserCart);
  const { flyToCart } = useCartFlyAnimation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [typingStep, setTypingStep] = useState(0);
  const [historyReady, setHistoryReady] = useState(false);
  const [solvedTicketCheckReady, setSolvedTicketCheckReady] = useState(false);
  const [guestTicketId, setGuestTicketId] = useState('');
  const [activeSupportTicketId, setActiveSupportTicketId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const chatScrollRef = useRef<any>(null);
  const clearingSolvedTicketRef = useRef(false);
  const activeSupportTicketIdRef = useRef('');

  const quickReplies = useMemo(
    () => ['Xem sản phẩm đang hot', 'Xem giỏ hàng', 'Thêm p1 vào giỏ', 'Xóa p1 khỏi giỏ'],
    [],
  );

  const trendingProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const aScore = Number(a.soldCount || 0) * 2 + Number(a.rating || 0) * 20 + (a.isBestSeller ? 80 : 0);
        const bScore = Number(b.soldCount || 0) * 2 + Number(b.rating || 0) * 20 + (b.isBestSeller ? 80 : 0);
        return bScore - aScore;
      })
      .slice(0, 6);
  }, [products]);

  useEffect(() => {
    if (!historyReady || clearingSolvedTicketRef.current) return;
    AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), messages })).catch(() => undefined);
  }, [historyReady, messages]);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(CHAT_TICKET_STORAGE_KEY)
      .then(async (storedId) => {
        if (cancelled) return;
        if (storedId) {
          setGuestTicketId(storedId);
          return;
        }

        const nextId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await AsyncStorage.setItem(CHAT_TICKET_STORAGE_KEY, nextId);
        if (!cancelled) setGuestTicketId(nextId);
      })
      .catch(() => {
        if (!cancelled) setGuestTicketId(`guest-${Date.now()}`);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isThinking) {
      setTypingStep(0);
      return;
    }

    const timer = setInterval(() => {
      setTypingStep((current) => (current + 1) % 3);
    }, 420);

    return () => clearInterval(timer);
  }, [isThinking]);

  const scrollChatToEnd = (animated = true) => {
    requestAnimationFrame(() => {
      chatScrollRef.current?.scrollToEnd?.({ animated });
    });
  };

  useEffect(() => {
    if (!open) return;
    scrollChatToEnd();
  }, [messages.length, isThinking, open]);

  const appendBotMessage = (message: Omit<ChatMessage, 'id' | 'time' | 'createdAt'>) => {
    const botMessage = {
      ...message,
      id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: formatTime(),
      createdAt: Date.now(),
    };
    setMessages((current) => [...current, botMessage]);
    void persistSupportChatMessage('ai', botMessage, 'mobile_chat').catch((err) => {
      console.warn('Failed to save support bot chat message:', err);
    });
  };

  const getSupportOwnerKey = () => {
    const userKey = currentUser?.username || currentUser?.id || currentUser?.email || guestTicketId || 'guest';
    return toSupportSafeId(String(userKey));
  };

  const getActiveTicketStorageKey = () => `${CHAT_ACTIVE_TICKET_STORAGE_KEY}_${getSupportOwnerKey()}`;

  const createNewSupportTicketId = () => `CHAT-${getSupportOwnerKey()}-${Date.now()}`;

  const getSupportTicketId = () => {
    return activeSupportTicketIdRef.current || activeSupportTicketId || `CHAT-${getSupportOwnerKey()}`;
  };

  const getSupportTicketIdsToCheck = () => {
    const activeId = activeSupportTicketIdRef.current || activeSupportTicketId;
    if (activeId) return [activeId];
    const ids = [currentUser?.username, currentUser?.id, currentUser?.email, guestTicketId]
      .filter(Boolean)
      .map((value) => `CHAT-${toSupportSafeId(String(value))}`);
    return Array.from(new Set(ids.length > 0 ? ids : [getSupportTicketId()]));
  };

  const clearSolvedSupportConversation = async () => {
    clearingSolvedTicketRef.current = true;
    const nextTicketId = createNewSupportTicketId();
    const nextMessages = [welcomeMessage()];
    activeSupportTicketIdRef.current = nextTicketId;
    setActiveSupportTicketId(nextTicketId);
    setMessages(nextMessages);
    await AsyncStorage.setItem(getActiveTicketStorageKey(), nextTicketId);
    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), messages: nextMessages }));
    clearingSolvedTicketRef.current = false;
  };

  const clearChatIfCurrentTicketSolved = async () => {
    for (const ticketId of getSupportTicketIdsToCheck()) {
      try {
        const data = await fetchSupportTicket(ticketId, authToken || undefined);
        if (data.ticket?.status === 'solved') {
          await clearSolvedSupportConversation();
          return true;
        }
      } catch {
        // Missing legacy ticket ids are expected when a user has only one active conversation id.
      }
    }
    return false;
  };

  useEffect(() => {
    if (!currentUser?.username && !currentUser?.id && !currentUser?.email && !guestTicketId) return;
    let cancelled = false;

    const loadHistoryAfterSolvedCheck = async () => {
      setHistoryReady(false);
      setSolvedTicketCheckReady(false);
      setMessages([welcomeMessage()]);
      const storedActiveTicketId = await AsyncStorage.getItem(getActiveTicketStorageKey()).catch(() => null);
      if (!cancelled && storedActiveTicketId) {
        activeSupportTicketIdRef.current = storedActiveTicketId;
        setActiveSupportTicketId(storedActiveTicketId);
      } else if (!cancelled) {
        activeSupportTicketIdRef.current = '';
        setActiveSupportTicketId('');
      }
      const wasSolved = await clearChatIfCurrentTicketSolved();
      if (cancelled || wasSolved) {
        if (!cancelled) {
          setHistoryReady(true);
          setSolvedTicketCheckReady(true);
        }
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (cancelled) return;
        if (!raw) {
          setMessages([welcomeMessage()]);
          return;
        }

        const parsed = JSON.parse(raw) as { savedAt?: number; messages?: ChatMessage[] };
        const now = Date.now();
        const freshMessages = Array.isArray(parsed.messages)
          ? parsed.messages.filter((message) => now - Number(message.createdAt || parsed.savedAt || 0) <= CHAT_TTL_MS)
          : [];

        if (freshMessages.length > 0 && now - Number(parsed.savedAt || 0) <= CHAT_TTL_MS) {
          setMessages(freshMessages);
        } else {
          setMessages([welcomeMessage()]);
          await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
        }
      } catch {
        if (!cancelled) setMessages([welcomeMessage()]);
      } finally {
        if (!cancelled) {
          setHistoryReady(true);
          setSolvedTicketCheckReady(true);
        }
      }
    };

    void loadHistoryAfterSolvedCheck();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.username, currentUser?.id, currentUser?.email, guestTicketId]);

  useEffect(() => {
    if (!open || !solvedTicketCheckReady) return;
    const timer = setInterval(() => {
      void clearChatIfCurrentTicketSolved();
    }, 5000);

    return () => clearInterval(timer);
  }, [open, solvedTicketCheckReady, currentUser?.username, currentUser?.id, currentUser?.email, guestTicketId, activeSupportTicketId]);

  const persistSupportChatMessage = async (sender: 'customer' | 'ai', message: ChatMessage, intent?: string) => {
    const ticketId = getSupportTicketId();
    const customerName = currentUser?.name || 'Khách vãng lai';
    const customerEmail = currentUser?.email || `${ticketId.toLowerCase()}@guest.velocart.local`;
    const timestamp = new Date(message.createdAt || Date.now()).toISOString();
    const metadata = {
      actions: message.actions || [],
      suggestions: (message.suggestions || []).map((suggestion) => ({
        id: suggestion.id,
        title: suggestion.title,
        subtitle: suggestion.subtitle,
        product: {
          id: suggestion.product.id,
          name: suggestion.product.name,
          brand: suggestion.product.brand,
          image: suggestion.product.image,
          originalPrice: suggestion.product.originalPrice,
          discountPrice: suggestion.product.discountPrice,
          flashSalePrice: suggestion.product.flashSalePrice,
          stock: suggestion.product.stock,
          soldCount: suggestion.product.soldCount,
          rating: suggestion.product.rating,
        },
      })),
    };

    await saveSupportTicket({
      id: ticketId,
      customerName,
      customerEmail,
      lastMessage: message.text,
      updatedAt: timestamp,
      status: 'open',
      priority: 'medium',
      sentiment: 'neutral',
      sentimentScore: 0,
      intent: intent || 'mobile_chat',
      confidenceScore: 90,
      messages: [],
      assignedToAI: true,
      slaMinutesRemaining: 60,
    }, authToken || undefined);

    await addSupportTicketMessage(ticketId, {
      id: `mobile_${message.id}`.slice(0, 80),
      sender,
      text: message.text,
      timestamp,
      metadata,
    }, authToken || undefined);
  };

  const isAiReplyInactive = async () => {
    const data = await fetchSettings(true, authToken || undefined);
    const setting = (data.settings || []).find((item) => (item.settingKey || item.key) === 'ai_customer_support');
    const value = setting?.value && typeof setting.value === 'object' ? setting.value : {};
    return setting?.status === 'inactive' || value.enabled === false || value.status === 'inactive';
  };

  const handleAction = async (action: ChatAction) => {
    if (action.type === 'catalog') {
      router.push('/(tabs)/catalog');
      setOpen(false);
      return;
    }

    if (action.type === 'cart') {
      router.push('/(tabs)/cart');
      setOpen(false);
      return;
    }

    if (action.type === 'account') {
      router.push('/(tabs)/account');
      setOpen(false);
      return;
    }

    if (action.type === 'notifications') {
      router.push('/(tabs)/notifications');
      setOpen(false);
      return;
    }

    if (action.type === 'view-product') {
      router.push(`/(tabs)/product/${action.productId}`);
      setOpen(false);
      return;
    }

    if (action.type === 'add-cart') {
      const product = products.find((item) => item.id === action.productId);
      if (product) {
        await addProductToCartByApi(product);
      }
    }
    if (action.type === 'remove-cart') {
      await removeProductFromCartByApi(action.productId);
    }
    if (action.type === 'add-favorite') {
      await addProductToFavoritesByApi(action.productId);
    }
    if (action.type === 'remove-favorite') {
      await removeProductFromFavoritesByApi(action.productId);
    }
  };

  const findRequestedProduct = (query: string) => {
    const normalized = normalizeText(query);
    const productId = normalized.match(/\b[p][a-z0-9_-]*\d+\b/)?.[0];
    if (productId) {
      const byId = products.find((product) => normalizeText(product.id) === productId);
      if (byId) return byId;
    }

    return products.find((product) => {
      const haystack = normalizeText(`${product.id} ${product.name} ${product.brand} ${product.description || ''}`);
      return haystack.includes(normalized) || normalized.includes(normalizeText(product.name));
    });
  };

  const normalizePriceValue = (rawValue: string, unit = '') => {
    const number = Number(rawValue.replace(',', '.'));
    if (!Number.isFinite(number)) return 0;
    const normalizedUnit = normalizeText(unit);
    if (['trieu', 'tr', 'm'].includes(normalizedUnit)) return number * 1000000;
    if (['k', 'nghin', 'ngan'].includes(normalizedUnit)) return number * 1000;
    return number >= 1000 ? number : number * 1000000;
  };

  const extractPriceValues = (normalized: string) => {
    const values: number[] = [];
    const matches = normalized.matchAll(/(\d+(?:[.,]\d+)?)\s*(trieu|tr|m|k|nghin|ngan)?/g);
    for (const match of matches) {
      values.push(normalizePriceValue(match[1], match[2] || ''));
    }
    return values.filter((value) => value > 0);
  };

  const parseProductQuery = (query: string) => {
    const normalized = normalizeText(query);
    const hasPriceIntent =
      normalized.includes('gia') ||
      normalized.includes('duoi') ||
      normalized.includes('tren') ||
      normalized.includes('tu ') ||
      normalized.includes(' den ') ||
      normalized.includes('re') ||
      normalized.includes('dat') ||
      normalized.includes('cao') ||
      normalized.includes('thap');
    const priceValues = hasPriceIntent ? extractPriceValues(normalized) : [];
    const hasRange = priceValues.length >= 2 && (normalized.includes('tu') || normalized.includes('den') || normalized.includes('khoang'));
    const upper = normalized.includes('duoi') || normalized.includes('toi da') || normalized.includes('nho hon')
      ? priceValues[0]
      : hasRange
      ? Math.max(priceValues[0], priceValues[1])
      : undefined;
    const lower = normalized.includes('tren') || normalized.includes('toi thieu') || normalized.includes('lon hon')
      ? priceValues[0]
      : hasRange
      ? Math.min(priceValues[0], priceValues[1])
      : undefined;
    const sortDirection = normalized.includes('cao den thap') || normalized.includes('dat nhat')
      ? 'desc'
      : normalized.includes('thap den cao') || normalized.includes('re nhat') || normalized.includes('thap nhat')
      ? 'asc'
      : undefined;
    const nameTokens = normalized
      .replace(/\d+(?:[.,]\d+)?\s*(trieu|tr|m|k|nghin|ngan)?/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !PRODUCT_STOP_WORDS.has(token));

    return { normalized, lower, upper, sortDirection, nameTokens };
  };

  const productSearchScore = (product: Product, tokens: string[]) => {
    if (tokens.length === 0) return 1;
    const category = categories.find((item) => item.id === product.categoryId);
    const haystack = normalizeText(`${product.id} ${product.name} ${product.brand} ${category?.name || ''} ${category?.slug || ''} ${product.description || ''}`);
    return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
  };

  const findProductMatches = (query: string) => {
    const { normalized, lower, upper, sortDirection, nameTokens } = parseProductQuery(query);
    const wantsAllProducts =
      normalized.includes('tat ca san pham') ||
      normalized.includes('toan bo san pham') ||
      normalized.includes('danh sach san pham') ||
      normalized === 'xem san pham' ||
      normalized === 'san pham';
    const hasSpecificFilter =
      nameTokens.length > 0 ||
      lower !== undefined ||
      upper !== undefined ||
      normalized.includes('dien thoai') ||
      normalized.includes('iphone') ||
      normalized.includes('samsung') ||
      normalized.includes('phu kien') ||
      normalized.includes('tai nghe') ||
      normalized.includes('hot') ||
      normalized.includes('trend') ||
      normalized.includes('ban chay') ||
      normalized.includes('noi bat');
    const categoryMatches = (product: Product, keywords: string[]) => {
      const category = categories.find((item) => item.id === product.categoryId);
      const haystack = normalizeText(`${category?.name || ''} ${category?.slug || ''} ${product.categoryId}`);
      return keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
    };

    if (!wantsAllProducts && !hasSpecificFilter) {
      return [];
    }

    let matches = products;

    if (normalized.includes('dien thoai') || normalized.includes('iphone') || normalized.includes('samsung')) {
      matches = matches.filter((product) => categoryMatches(product, ['dien thoai', 'phone']) || normalizeText(`${product.name} ${product.brand}`).includes('iphone') || normalizeText(`${product.name} ${product.brand}`).includes('samsung'));
    } else if (normalized.includes('phu kien') || normalized.includes('tai nghe')) {
      matches = matches.filter((product) => categoryMatches(product, ['phu kien', 'accessories']) || normalizeText(product.name).includes('tai nghe'));
    } else if (nameTokens.length > 0) {
      matches = matches
        .map((product) => ({ product, score: productSearchScore(product, nameTokens) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.product);
    }

    if (lower !== undefined) {
      matches = matches.filter((product) => getProductSalePrice(product) >= lower);
    }
    if (upper !== undefined) {
      matches = matches.filter((product) => getProductSalePrice(product) <= upper);
    }

    if (sortDirection === 'asc') {
      matches = [...matches].sort((a, b) => getProductSalePrice(a) - getProductSalePrice(b));
    } else if (sortDirection === 'desc') {
      matches = [...matches].sort((a, b) => getProductSalePrice(b) - getProductSalePrice(a));
    } else if (normalized.includes('hot') || normalized.includes('trend') || normalized.includes('ban chay') || normalized.includes('noi bat')) {
      matches = [...matches].sort((a, b) => {
        const aScore = Number(a.soldCount || 0) * 2 + Number(a.rating || 0) * 20 + (a.isBestSeller ? 80 : 0);
        const bScore = Number(b.soldCount || 0) * 2 + Number(b.rating || 0) * 20 + (b.isBestSeller ? 80 : 0);
        return bScore - aScore;
      });
    }

    return matches;
  };

  const getUserIdentifier = () => currentUser?.email || currentUser?.id || '';

  const persistFreshUser = async (freshUser: NonNullable<typeof currentUser>) => {
    useAuthStore.setState({ currentUser: freshUser });
    if (authToken) {
      await saveAuthSession({ token: authToken, tokenType: 'Bearer', user: freshUser });
    }
  };

  const addProductToCartByApi = async (product: Product, quantity = 1, event?: any) => {
    const userIdentifier = getUserIdentifier();
    if (!userIdentifier) {
      appendBotMessage({
        sender: 'bot',
        text: 'Bạn cần đăng nhập để mình thêm sản phẩm vào giỏ hàng.',
        actions: [{ id: 'open-cart-login', label: 'Mở giỏ hàng', type: 'cart' }],
      });
      return;
    }

    const freshUser = await addUserCartProduct(userIdentifier, product.id, quantity, authToken || undefined);
    await persistFreshUser(freshUser);
    await hydrateUserCart();
    flyToCart({
      x: event?.nativeEvent?.pageX || 300,
      y: event?.nativeEvent?.pageY || 520,
      imageUri: product.image,
    });

    appendBotMessage({
      sender: 'bot',
      text: `Đã thêm ${quantity} x "${product.name}" vào giỏ hàng qua API user_cart.`,
      suggestions: [buildSuggestion(product)],
      actions: [{ id: `cart-${product.id}`, label: 'Mở giỏ hàng', type: 'cart' }],
    });
  };

  const removeProductFromCartByApi = async (productId: string) => {
    const userIdentifier = getUserIdentifier();
    if (!userIdentifier) {
      appendBotMessage({
        sender: 'bot',
        text: 'Bạn cần đăng nhập để mình xóa sản phẩm khỏi giỏ hàng.',
        actions: [{ id: 'open-cart-login', label: 'Mở giỏ hàng', type: 'cart' }],
      });
      return;
    }

    const product = products.find((item) => item.id === productId);
    const freshUser = await removeUserCartProduct(userIdentifier, productId, authToken || undefined);
    await persistFreshUser(freshUser);
    await hydrateUserCart();

    appendBotMessage({
      sender: 'bot',
      text: `Đã xóa "${product?.name || productId}" khỏi giỏ hàng của bạn.`,
      actions: [{ id: 'cart-after-remove', label: 'Xem giỏ hàng', type: 'cart' }],
    });
  };

  const viewCartByApi = async () => {
    const userIdentifier = getUserIdentifier();
    if (!userIdentifier) {
      appendBotMessage({
        sender: 'bot',
        text: 'Bạn cần đăng nhập để mình kiểm tra giỏ hàng.',
        actions: [{ id: 'open-cart-login', label: 'Mở giỏ hàng', type: 'cart' }],
      });
      return;
    }

    const cart = await fetchUserCart(userIdentifier, authToken || undefined);
    const suggestions = cart
      .map((item) => products.find((product) => product.id === item.productId))
      .filter(Boolean)
      .map((product) => buildSuggestion(product as Product));

    const summary = cart.length > 0
      ? cart.map((item) => {
          const product = products.find((value) => value.id === item.productId);
          return `${product?.name || item.productId} x${item.quantity}`;
        }).join(', ')
      : '';

    appendBotMessage({
      sender: 'bot',
      text: cart.length > 0 ? `Giỏ hàng hiện có: ${summary}.` : 'Giỏ hàng của bạn hiện đang trống.',
      suggestions,
      actions: [{ id: 'open-cart-detail', label: 'Mở giỏ hàng', type: 'cart' }],
    });
  };

  const addProductToFavoritesByApi = async (productId: string) => {
    const userIdentifier = getUserIdentifier();
    if (!userIdentifier) {
      appendBotMessage({
        sender: 'bot',
        text: 'Bạn cần đăng nhập để mình lưu sản phẩm vào yêu thích.',
        actions: [{ id: 'open-account-login', label: 'Mở tài khoản', type: 'account' }],
      });
      return;
    }

    const nextFavorites = await addUserFavoriteProduct(userIdentifier, productId, authToken || undefined);
    useFavoriteStore.setState({ favorites: nextFavorites });
    const product = products.find((item) => item.id === productId);

    appendBotMessage({
      sender: 'bot',
      text: `Đã thêm "${product?.name || productId}" vào danh sách yêu thích.`,
      suggestions: product ? [buildSuggestion(product)] : undefined,
      actions: [{ id: 'open-account-favorites', label: 'Mở tài khoản', type: 'account' }],
    });
  };

  const removeProductFromFavoritesByApi = async (productId: string) => {
    const userIdentifier = getUserIdentifier();
    if (!userIdentifier) {
      appendBotMessage({
        sender: 'bot',
        text: 'Bạn cần đăng nhập để mình xóa sản phẩm khỏi yêu thích.',
        actions: [{ id: 'open-account-login', label: 'Mở tài khoản', type: 'account' }],
      });
      return;
    }

    const nextFavorites = await removeUserFavoriteProduct(userIdentifier, productId, authToken || undefined);
    useFavoriteStore.setState({ favorites: nextFavorites });
    const product = products.find((item) => item.id === productId);

    appendBotMessage({
      sender: 'bot',
      text: `Đã xóa "${product?.name || productId}" khỏi danh sách yêu thích.`,
      actions: [{ id: 'open-account-favorites-after-remove', label: 'Mở tài khoản', type: 'account' }],
    });
  };

  const viewFavoritesByApi = async () => {
    const userIdentifier = getUserIdentifier();
    let favoriteIds = favorites;

    if (userIdentifier) {
      favoriteIds = await fetchUserFavorites(userIdentifier, authToken || undefined);
      useFavoriteStore.setState({ favorites: favoriteIds });
    }

    const favoriteProducts = favoriteIds
      .map((productId) => products.find((product) => product.id === productId))
      .filter(Boolean) as Product[];

    appendBotMessage({
      sender: 'bot',
      text: favoriteProducts.length > 0
        ? `Bạn đang yêu thích ${favoriteProducts.length} sản phẩm. Mình hiển thị các sản phẩm đó bên dưới.`
        : 'Danh sách yêu thích hiện đang trống.',
      suggestions: favoriteProducts.map(buildSuggestion),
      actions: [{ id: 'open-account-favorites', label: 'Mở tài khoản', type: 'account' }],
    });
  };

  const viewOrders = () => {
    appendBotMessage({
      sender: 'bot',
      text: orders.length > 0
        ? `Bạn có ${orders.length} đơn hàng. Đơn gần nhất: ${orders[0].id} - trạng thái ${orders[0].orderStatus} - tổng ${orders[0].totalAmount.toLocaleString('vi-VN')}đ.`
        : 'Mình chưa thấy đơn hàng nào trong tài khoản hiện tại.',
      actions: [{ id: 'open-account-orders', label: 'Xem đơn hàng', type: 'account' }],
    });
  };

  const viewVouchers = () => {
    appendBotMessage({
      sender: 'bot',
      text: vouchers.length > 0
        ? `Mã ưu đãi hiện có: ${vouchers.map((voucher) => `${voucher.code} (${voucher.discountType === 'percent' ? `${voucher.discountValue}%` : `${voucher.discountValue.toLocaleString('vi-VN')}đ`})`).join(', ')}.`
        : 'Hiện chưa có voucher khả dụng trong dữ liệu app.',
      actions: [{ id: 'open-catalog-voucher', label: 'Xem sản phẩm', type: 'catalog' }],
    });
  };

  const viewPayments = () => {
    appendBotMessage({
      sender: 'bot',
      text: 'VeloCart hỗ trợ COD, chuyển khoản ngân hàng, ví điện tử và các phương thức thanh toán đang được bật trong trang thanh toán. Khi đặt hàng, hệ thống sẽ dùng đúng phương thức bạn chọn.',
      actions: [{ id: 'open-cart-payment', label: 'Mở giỏ hàng', type: 'cart' }],
    });
  };

  const viewNotifications = () => {
    appendBotMessage({
      sender: 'bot',
      text: notifications.length > 0
        ? `Thông báo mới nhất: ${notifications[0].title} - ${notifications[0].message}`
        : 'Hiện chưa có thông báo mới.',
      actions: [{ id: 'open-notifications', label: 'Mở thông báo', type: 'notifications' }],
    });
  };

  const runLocalCommand = async (query: string) => {
    const normalized = normalizeText(query);
    const wantsCart = normalized.includes('gio') || normalized.includes('cart');
    const wantsFavorite = normalized.includes('yeu thich') || normalized.includes('favorite') || normalized.includes('wishlist');
    const wantsOrder = normalized.includes('don hang') || normalized.includes('order') || normalized.includes('ma don');
    const wantsVoucher = normalized.includes('voucher') || normalized.includes('ma giam') || normalized.includes('khuyen mai') || normalized.includes('uu dai');
    const wantsPayment = normalized.includes('thanh toan') || normalized.includes('payment') || normalized.includes('cod') || normalized.includes('chuyen khoan');
    const wantsNotification = normalized.includes('thong bao') || normalized.includes('notice') || normalized.includes('notification');
    const wantsAdd = normalized.includes('them') || normalized.includes('add') || normalized.includes('bo vao');
    const wantsRemove = normalized.includes('xoa') || normalized.includes('delete') || normalized.includes('remove') || normalized.includes('bo khoi');
    const wantsProducts = normalized.includes('san pham') || normalized.includes('product') || normalized.includes('xem hang') || normalized.includes('tu van');
    const wantsPriceProducts = normalized.includes('gia') || normalized.includes('duoi') || normalized.includes('tren') || normalized.includes('thap nhat') || normalized.includes('thap den cao') || normalized.includes('cao den thap');
    const namedProductMatches = !wantsCart && !wantsFavorite && !wantsOrder && !wantsVoucher && !wantsPayment && !wantsNotification
      ? findProductMatches(query)
      : [];

    if (wantsCart && wantsAdd) {
      const product = findRequestedProduct(query);
      if (!product) {
        appendBotMessage({
          sender: 'bot',
          text: 'Mình chưa xác định được sản phẩm cần thêm. Bạn có thể gửi theo dạng: thêm p1 vào giỏ.',
          suggestions: findProductMatches(query).slice(0, 12).map(buildSuggestion),
        });
        return true;
      }
      await addProductToCartByApi(product);
      return true;
    }

    if (wantsCart && wantsRemove) {
      const product = findRequestedProduct(query);
      if (!product) {
        appendBotMessage({
          sender: 'bot',
          text: 'Mình chưa xác định được sản phẩm cần xóa. Bạn có thể gửi theo dạng: xóa p1 khỏi giỏ.',
        });
        return true;
      }
      await removeProductFromCartByApi(product.id);
      return true;
    }

    if (wantsCart && (normalized.includes('xem') || normalized.includes('kiem tra') || normalized.includes('hien thi'))) {
      await viewCartByApi();
      return true;
    }

    if (wantsFavorite && wantsAdd) {
      const product = findRequestedProduct(query);
      if (!product) {
        appendBotMessage({
          sender: 'bot',
          text: 'Mình chưa xác định được sản phẩm cần thêm vào yêu thích. Bạn có thể gửi theo dạng: thêm p1 vào yêu thích.',
          suggestions: findProductMatches(query).slice(0, 12).map(buildSuggestion),
        });
        return true;
      }
      await addProductToFavoritesByApi(product.id);
      return true;
    }

    if (wantsFavorite && wantsRemove) {
      const product = findRequestedProduct(query);
      if (!product) {
        appendBotMessage({
          sender: 'bot',
          text: 'Mình chưa xác định được sản phẩm cần xóa khỏi yêu thích. Bạn có thể gửi theo dạng: xóa p1 khỏi yêu thích.',
        });
        return true;
      }
      await removeProductFromFavoritesByApi(product.id);
      return true;
    }

    if (wantsFavorite) {
      await viewFavoritesByApi();
      return true;
    }

    if (wantsOrder) {
      viewOrders();
      return true;
    }

    if (wantsVoucher) {
      viewVouchers();
      return true;
    }

    if (wantsPayment) {
      viewPayments();
      return true;
    }

    if (wantsNotification) {
      viewNotifications();
      return true;
    }

    if (wantsProducts || wantsPriceProducts || normalized.includes('hot') || normalized.includes('trend') || normalized.includes('ban chay') || namedProductMatches.length > 0) {
      const matches = namedProductMatches.length > 0 ? namedProductMatches : findProductMatches(query);
      const isAllProducts = normalized.includes('tat ca san pham') || normalized.includes('toan bo san pham') || normalized.includes('danh sach san pham') || normalized === 'xem san pham' || normalized === 'san pham';
      appendBotMessage({
        sender: 'bot',
        text: matches.length > 0
          ? isAllProducts
            ? `Mình hiển thị tất cả ${matches.length} sản phẩm hiện có.`
            : `Mình tìm thấy ${matches.length} sản phẩm phù hợp với từ khóa/yêu cầu của bạn.`
          : 'Mình chưa tìm thấy sản phẩm phù hợp với từ khóa hoặc yêu cầu này.',
        suggestions: matches.map(buildSuggestion),
        actions: [{ id: 'open-catalog-from-products', label: 'Mở danh mục', type: 'catalog' }],
      });
      return true;
    }

    return false;
  };

  const getFallbackResponse = (query: string): Omit<ChatMessage, 'id' | 'time' | 'createdAt'> => {
    const normalized = normalizeText(query);

    if (normalized.includes('voucher') || normalized.includes('ma giam') || normalized.includes('khuyen mai')) {
      return {
        sender: 'bot',
        text: 'Hiện tại bạn có thể dùng LIXI2026 để giảm 100K và FREESHIP cho đơn từ 150K. Nếu cần, mình có thể đưa bạn đến khu sản phẩm đang có deal tốt.',
        actions: [{ id: 'promo-catalog', label: 'Xem sản phẩm', type: 'catalog' }],
      };
    }

    if (normalized.includes('giao') || normalized.includes('ship') || normalized.includes('van chuyen')) {
      return {
        sender: 'bot',
        text: 'VeloCart hỗ trợ giao nhanh nội thành và giao toàn quốc. Nếu bạn đã có đơn hàng, hãy gửi mã đơn để mình hướng dẫn kiểm tra chi tiết.',
        actions: [{ id: 'shipping-catalog', label: 'Tư vấn sản phẩm', type: 'catalog' }],
      };
    }

    return {
      sender: 'bot',
      text: 'Mình có thể hỗ trợ xem sản phẩm, tư vấn sản phẩm trending, thêm/xóa sản phẩm khỏi giỏ hàng, kiểm tra giỏ hàng, voucher và giao hàng.',
      actions: [
        { id: 'fallback-catalog', label: 'Xem sản phẩm', type: 'catalog' },
        { id: 'fallback-cart', label: 'Xem giỏ hàng', type: 'cart' },
      ],
    };
  };

  const send = async (value?: string) => {
    const nextText = (value ?? text).trim();
    if (!nextText || isThinking) return;
    if (await clearChatIfCurrentTicketSolved()) {
      setText('');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: nextText,
      time: formatTime(),
      createdAt: Date.now(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setText('');
    setIsThinking(true);
    void persistSupportChatMessage('customer', userMessage).catch((err) => {
      console.warn('Failed to save customer support chat message:', err);
    });

    try {
      if (await isAiReplyInactive()) {
        return;
      }

      const handledLocally = await runLocalCommand(nextText);
      if (handledLocally) return;

      const catalogForAi = products.map((product) => {
        const category = categories.find((item) => item.id === product.categoryId);
        return {
          id: product.id,
          name: product.name,
          brand: product.brand,
          price: getProductSalePrice(product),
          stock: product.stock,
          image: product.image,
          category: category?.name || product.categoryId,
          rating: product.rating || 0,
          soldCount: product.soldCount || 0,
          isBestSeller: Boolean(product.isBestSeller),
          trendLabel: product.isBestSeller || Number(product.soldCount || 0) > 0 ? 'trending' : 'catalog',
        };
      });
      const shopContextForAi = {
        capabilities: [
          'GET /api/products',
          'GET /api/categories',
          'GET /api/banners',
          'GET /api/notifications',
          'GET /api/payments',
          'GET /api/orders?email|userId',
          'GET /api/users/:id/cart',
          'POST /api/users/:id/cart/:productId',
          'DELETE /api/users/:id/cart/:productId',
          'GET /api/users/:id/favorites',
          'POST /api/users/:id/favorites/:productId',
          'DELETE /api/users/:id/favorites/:productId',
        ],
        categories: categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          status: category.status,
        })),
        vouchers: vouchers.map((voucher) => ({
          code: voucher.code,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
          minOrderValue: voucher.minOrderValue,
          maxDiscount: voucher.maxDiscount,
        })),
        cart: cartItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: getProductSalePrice(item.product),
        })),
        favorites,
        orders: orders.slice(0, 5).map((order) => ({
          id: order.id,
          status: order.orderStatus,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          itemCount: order.items.length,
        })),
        notifications: notifications.slice(0, 5).map((notification) => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          date: notification.date,
          type: notification.type,
          isRead: notification.isRead,
        })),
      };

      const aiResponse = await askCustomerSupportAi({
        customerName: currentUser?.name,
        customerEmail: currentUser?.email,
        messages: nextMessages.slice(-10).map((message) => ({
          sender: message.sender === 'user' ? 'user' : 'bot',
          text: message.text,
        })),
        catalog: catalogForAi,
        shopContext: shopContextForAi,
      });

      if (aiResponse.aiDisabled || aiResponse.provider === 'disabled') {
        return;
      }

      const localResponse = getFallbackResponse(nextText);
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: aiResponse.suggestedReply || localResponse.text,
        time: formatTime(),
        createdAt: Date.now(),
        actions: localResponse.actions,
        suggestions: aiResponse.intent === 'product_advice' ? findProductMatches(nextText).map(buildSuggestion) : localResponse.suggestions,
      };
      setMessages((current) => [...current, botMessage]);
      void persistSupportChatMessage('ai', botMessage, aiResponse.intent).catch((err) => {
        console.warn('Failed to save AI support chat message:', err);
      });
    } catch {
      const localResponse = getFallbackResponse(nextText);
      const botMessage: ChatMessage = {
        ...localResponse,
        id: `bot-${Date.now()}`,
        time: formatTime(),
        createdAt: Date.now(),
      };
      setMessages((current) => [...current, botMessage]);
      void persistSupportChatMessage('ai', botMessage, 'fallback_support').catch((err) => {
        console.warn('Failed to save fallback support chat message:', err);
      });
    } finally {
      setIsThinking(false);
    }
  };

  const addProductToCart = (product: Product, event?: any) => {
    void addProductToCartByApi(product, 1, event).catch(() => {
      addToCart(product, 1);
      appendBotMessage({
        sender: 'bot',
        text: `Đã thêm "${product.name}" vào giỏ hàng trên thiết bị. Mình sẽ đồng bộ lại khi API sẵn sàng.`,
        actions: [{ id: `cart-${product.id}`, label: 'Mở giỏ hàng', type: 'cart' }],
      });
    });
  };

  const buyNow = (product: Product) => {
    addToCart(product, 1);
    router.push(`/(tabs)/product/${product.id}`);
    setOpen(false);
  };

  if (segments[0] === 'auth') {
    return null;
  }

  return (
    <View className="absolute bottom-6 right-4 z-50 items-end">
      <Pressable
        onPress={() => setOpen((current) => !current)}
        className={`items-center justify-center rounded-full border p-3 shadow-lg ${open ? 'bg-zinc-800 border-zinc-700' : 'bg-amber-500 border-amber-400/30'}`}
      >
        {open ? <X size={18} color="#ffffff" /> : <HelpCircle size={20} color="#ffffff" />}
      </Pressable>

      {open ? (
        <View className="absolute bottom-16 right-0 h-[560px] w-80 overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-2xl">
          <View className="flex-row items-center justify-between bg-amber-500 px-4 py-3">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <View>
                <Text className="text-xs font-black text-white">CSKH VeloCart</Text>
                <Text className="text-[9px] text-amber-50">Phản hồi thần tốc</Text>
              </View>
            </View>
            <Pressable onPress={() => setOpen(false)} className="p-1">
              <X size={16} color="#ffffff" />
            </Pressable>
          </View>

          <ScrollView
            ref={chatScrollRef}
            className="flex-1 bg-zinc-50 px-3 py-3"
            contentContainerClassName="gap-2.5 pb-3"
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollChatToEnd()}
          >
            <View className="mb-1 flex-row flex-wrap gap-2">
              {quickReplies.map((item) => (
                <Pressable key={item} onPress={() => send(item)} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2">
                  <Text className="text-[11px] font-black text-amber-700">{item}</Text>
                </Pressable>
              ))}
            </View>

            {messages.map((message) => (
              <View key={message.id} className={message.sender === 'user' ? 'items-end' : 'items-start'}>
                <View
                  className={`max-w-[84%] px-3 py-2.5 ${message.sender === 'user'
                    ? 'rounded-2xl rounded-tr-none bg-amber-500'
                    : 'rounded-2xl rounded-tl-none border border-zinc-100 bg-white'}`}
                >
                  {message.sender === 'bot' ? (
                    <View className="mb-1 flex-row items-center gap-1.5">
                      <Bot size={12} color="#52525b" />
                      <Text className="text-[10px] font-black uppercase text-zinc-500">Trợ lý</Text>
                    </View>
                  ) : null}
                  <Text className={`text-[12px] leading-5 ${message.sender === 'user' ? 'text-white' : 'text-zinc-800'}`}>{message.text}</Text>
                  <Text className={`mt-1 text-right text-[8px] font-medium ${message.sender === 'user' ? 'text-white/70' : 'text-zinc-400'}`}>{message.time}</Text>
                </View>

                {message.actions ? (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {message.actions.map((action) => (
                      <Pressable key={action.id} onPress={() => handleAction(action)} className="rounded-full bg-zinc-950 px-3 py-2">
                        <Text className="text-[11px] font-black text-white">{action.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {message.suggestions ? (
                  <View className="mt-2 gap-2">
                    {message.suggestions.map((suggestion) => (
                      <View key={suggestion.id} className="w-[272px] rounded-2xl border border-zinc-100 bg-white p-3">
                        <View className="flex-row gap-3">
                          <Image source={{ uri: suggestion.product.image }} className="h-20 w-20 rounded-xl bg-zinc-100" resizeMode="cover" />
                          <View className="flex-1">
                            <Text numberOfLines={2} className="text-[12px] font-black leading-4 text-zinc-900">{suggestion.title}</Text>
                            <Text className="mt-1 text-[11px] text-zinc-500">Mã: {suggestion.product.id}</Text>
                            <Text className="mt-1 text-[11px] font-black text-amber-600">{formatPrice(suggestion.product)}</Text>
                            <Text className="mt-1 text-[10px] text-zinc-500">
                              Kho {suggestion.product.stock} | Đã bán {suggestion.product.soldCount || 0} | {suggestion.product.rating || 0} sao
                            </Text>
                            {suggestion.product.description ? (
                              <Text numberOfLines={2} className="mt-1 text-[10px] leading-4 text-zinc-500">{suggestion.product.description}</Text>
                            ) : null}
                          </View>
                        </View>

                        <View className="mt-3 flex-row flex-wrap gap-2">
                          <Pressable onPress={(event) => addProductToCart(suggestion.product, event)} className="flex-row items-center rounded-full bg-amber-500 px-3 py-2">
                            <Plus size={12} color="#ffffff" />
                            <View className="w-1" />
                            <Text className="text-[11px] font-black text-white">Thêm giỏ</Text>
                          </Pressable>
                          <Pressable onPress={() => buyNow(suggestion.product)} className="flex-row items-center rounded-full bg-zinc-950 px-3 py-2">
                            <ShoppingBag size={12} color="#ffffff" />
                            <View className="w-1" />
                            <Text className="text-[11px] font-black text-white">Mua ngay</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}

            {isThinking ? <TypingBubble step={typingStep} /> : null}
          </ScrollView>

          <View className="flex-row items-center gap-1.5 border-t border-zinc-100 bg-white p-2.5">
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => send()}
              placeholder="Nhập nội dung cần hỗ trợ..."
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900"
            />
            <Pressable onPress={() => send()} disabled={isThinking} className={`rounded-xl p-2 ${isThinking ? 'bg-zinc-300' : 'bg-amber-500'}`}>
              <Send size={14} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
