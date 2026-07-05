import { router, useSegments } from 'expo-router';
import { Bot, HelpCircle, Plus, Send, ShoppingBag, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from './tw';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import { Product } from '../types';
import { useCartFlyAnimation } from './CartFlyProvider';

type Suggestion = {
  id: string;
  title: string;
  subtitle: string;
  product: Product;
};

type ChatMessage = {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  suggestions?: Suggestion[];
  actions?: { id: string; label: string; type: 'catalog' | 'cart' }[];
};

const formatTime = () => {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const formatPrice = (product: Product) => `${(product.flashSalePrice || product.discountPrice).toLocaleString('vi-VN')}d`;

const buildSuggestion = (product: Product): Suggestion => ({
  id: product.id,
  title: product.name,
  subtitle: `${product.brand} - ${formatPrice(product)}`,
  product,
});

export default function ChatBox() {
  const segments = useSegments();
  const products = useAppStore((state) => state.products);
  const categories = useAppStore((state) => state.categories);
  const addToCart = useCartStore((state) => state.addToCart);
  const { flyToCart } = useCartFlyAnimation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Xin chao. VeloCart co the ho tro tu van sáº£n pháº©m, voucher, giao hang va len Ä‘Æ¡n nhanh cho ban ngay tai day.',
      time: '16:15',
      actions: [
        { id: 'go-catalog', label: 'Xem sáº£n pháº©m', type: 'catalog' },
        { id: 'go-cart', label: 'MÃ£ giá» hÃ ng', type: 'cart' },
      ],
    },
  ]);

  const quickReplies = useMemo(
    () => ['T? v?n Ä‘iá»‡n thoáº¡i', 'C? voucher n?o khÃ ng?', 'Sáº£n pháº©m duoi 500K', 'Phá»¥ kiá»‡n bÃ¡n cháº¡y'],
    [],
  );

  if (segments[0] === 'auth') {
    return null;
  }

  const appendBotMessage = (message: Omit<ChatMessage, 'id' | 'time'>) => {
    setMessages((current) => [...current, { ...message, id: `${Date.now()}-${current.length}`, time: formatTime() }]);
  };

  const handleAction = (type: 'catalog' | 'cart') => {
    if (type === 'catalog') {
      router.push('/(tabs)/catalog');
      setOpen(false);
      return;
    }

    router.push('/(tabs)/cart');
    setOpen(false);
  };

  const getResponse = (query: string): Omit<ChatMessage, 'id' | 'time'> => {
    const normalized = query.toLowerCase().trim();
    const categoryMatches = (product: Product, keywords: string[]) => {
      const category = categories.find((item) => item.id === product.categoryId);
      const haystack = `${category?.name || ''} ${category?.slug || ''} ${product.categoryId}`.toLowerCase();
      return keywords.some((keyword) => haystack.includes(keyword));
    };

    if (normalized.includes('voucher') || normalized.includes('ma giam') || normalized.includes('khuyen mai')) {
      return {
        sender: 'bot',
        text: 'Hiá»‡n táº¡i báº¡n cÃ³ thá»ƒ dÃ¹ng LIXI2026 Ä‘á»ƒ giáº£m 100K vÃ  FREESHIP cho Ä‘Æ¡n tá»« 150K. Náº¿u cáº§n, mÃ¬nh cÃ³ thá»ƒ Ä‘Æ°a báº¡n Ä‘áº¿n khu sáº£n pháº©m Ä‘ang cÃ³ deal tá»‘t.',
        actions: [{ id: 'promo-catalog', label: 'Xem sáº£n pháº©m', type: 'catalog' }],
      };
    }

    if (normalized.includes('giao hang') || normalized.includes('freeship') || normalized.includes('van chuyen')) {
      return {
        sender: 'bot',
        text: 'VeloCart Æ°u tiÃªn giao nhanh 2H ná»™i thÃ nh vÃ  há»— trá»£ giao toÃ n quá»‘c. Báº¡n muá»‘n mÃ¬nh gá»£i Ã½ nhÃ³m sáº£n pháº©m Ä‘á»ƒ lÃªn Ä‘Æ¡n nhanh khÃ´ng?',
        actions: [{ id: 'shipping-catalog', label: 'Tu van sáº£n pháº©m', type: 'catalog' }],
      };
    }

    const matchingProducts = products
      .filter((product) => {
        const haystack = `${product.name} ${product.brand} ${product.description || ''}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 3);

    if (matchingProducts.length > 0) {
      return {
        sender: 'bot',
        text: 'Minh tim thay vai sáº£n pháº©m phu hop. Ban co the them vao gio hoac mo chi tiet de xem ky hon.',
        suggestions: matchingProducts.map(buildSuggestion),
      };
    }

    if (normalized.includes('dien thoai') || normalized.includes('iphone') || normalized.includes('samsung')) {
      return {
        sender: 'bot',
        text: 'N?u b?n Äang t?m Ä‘iá»‡n thoáº¡i, ??y l? nh?m n?i b?t hi?n t?i. iPhone h?p v?i nhu c?u camera v? h? sinh th?i, c?n Galaxy m?nh v? AI v? m?n h?nh.',
        suggestions: products.filter((product) => categoryMatches(product, ['dien thoai', 'điện thoại', 'laptop', 'phone'])).slice(0, 3).map(buildSuggestion),
      };
    }

    if (normalized.includes('thoi trang') || normalized.includes('ao') || normalized.includes('fashion')) {
      return {
        sender: 'bot',
        text: '??y l? nh?m th?i trang Äang ???c kh?ch xem nhi?u. B?n c? th? th?m v?o gi? ngay n?u th?y ph? h?p.',
        suggestions: products.filter((product) => categoryMatches(product, ['thoi trang', 'thời trang', 'fashion'])).slice(0, 3).map(buildSuggestion),
      };
    }

    if (normalized.includes('duoi 500') || normalized.includes('500k') || normalized.includes('re')) {
      return {
        sender: 'bot',
        text: 'Minh loc nhanh mot vai mon trong tam gia duoi 500K cho ban.',
        suggestions: products.filter((product) => (product.flashSalePrice || product.discountPrice) <= 500000).slice(0, 3).map(buildSuggestion),
      };
    }

    if (normalized.includes('phu kien') || normalized.includes('tai nghe')) {
      return {
        sender: 'bot',
        text: 'Nh?m ph? ki?n n?y Äang ???c h?i kh? nhi?u. B?n c? th? m? chi ti?t ho?c th?m v?o gi? ngay trong chat.',
        suggestions: products.filter((product) => categoryMatches(product, ['phu kien', 'phụ kiện', 'accessories'])).slice(0, 3).map(buildSuggestion),
      };
    }

    return {
      sender: 'bot',
      text: 'MÃ¬nh cÃ³ thá»ƒ há»— trá»£ theo sáº£n pháº©m, má»©c giÃ¡, voucher, giao hÃ ng hoáº·c tÆ° váº¥n nhanh theo nhu cáº§u. Báº¡n thá»­ há»i nhÆ°: "Ä‘iá»‡n thoáº¡i", "dÆ°á»›i 500K", "voucher", hoáº·c "phá»¥ kiá»‡n bÃ¡n cháº¡y".',
      actions: [{ id: 'fallback-catalog', label: 'Mo danh muc', type: 'catalog' }],
    };
  };

  const send = (value?: string) => {
    const nextText = (value ?? text).trim();
    if (!nextText) return;

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: nextText,
        time: formatTime(),
      },
    ]);

    appendBotMessage(getResponse(nextText));
    setText('');
  };

  const addProductToCart = (product: Product, event?: any) => {
    addToCart(product, 1);
    flyToCart({
      x: event?.nativeEvent?.pageX || 300,
      y: event?.nativeEvent?.pageY || 520,
      imageUri: product.image,
    });
    appendBotMessage({
      sender: 'bot',
      text: `ÄÃ£ thÃªm "${product.name}" v?o giá» hÃ ng. B?n c? th? m? giá» hÃ ng ?? thanh to?n ho?c ti?p t?c mua s?m.`,
      actions: [{ id: `cart-${product.id}`, label: 'MÃ£ giá» hÃ ng', type: 'cart' }],
    });
  };

  const buyNow = (product: Product) => {
    addToCart(product, 1);
    router.push(`/(tabs)/product/${product.id}`);
    setOpen(false);
  };

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
                <Text className="text-[9px] text-amber-50">Phan hoi than toc</Text>
              </View>
            </View>
            <Pressable onPress={() => setOpen(false)} className="p-1">
              <X size={16} color="#ffffff" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 bg-zinc-50 px-3 py-3" contentContainerClassName="gap-2.5 pb-3">
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
                      <Text className="text-[10px] font-black uppercase text-zinc-500">Tro ly</Text>
                    </View>
                  ) : null}
                  <Text className={`text-[12px] leading-5 ${message.sender === 'user' ? 'text-white' : 'text-zinc-800'}`}>{message.text}</Text>
                  <Text className={`mt-1 text-right text-[8px] font-medium ${message.sender === 'user' ? 'text-white/70' : 'text-zinc-400'}`}>{message.time}</Text>
                </View>

                {message.actions ? (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {message.actions.map((action) => (
                      <Pressable key={action.id} onPress={() => handleAction(action.type)} className="rounded-full bg-zinc-950 px-3 py-2">
                        <Text className="text-[11px] font-black text-white">{action.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {message.suggestions ? (
                  <View className="mt-2 gap-2">
                    {message.suggestions.map((suggestion) => (
                      <View key={suggestion.id} className="w-[272px] rounded-3xl border border-zinc-100 bg-white p-3">
                        <View className="flex-row gap-3">
                          <Image source={{ uri: suggestion.product.image }} className="h-16 w-16 rounded-2xl" resizeMode="cover" />
                          <View className="flex-1">
                            <Text numberOfLines={2} className="text-[12px] font-black leading-4 text-zinc-900">{suggestion.title}</Text>
                            <Text className="mt-1 text-[11px] text-zinc-500">{suggestion.subtitle}</Text>
                            <View className="mt-3 flex-row gap-2">
                              <Pressable onPress={(event) => addProductToCart(suggestion.product, event)} className="flex-row items-center rounded-full bg-amber-500 px-3 py-2">
                                <Plus size={12} color="#ffffff" />
                                <View className="w-1" />
                                <Text className="text-[11px] font-black text-white">ThÃªm giá»</Text>
                              </Pressable>
                              <Pressable onPress={() => buyNow(suggestion.product)} className="flex-row items-center rounded-full bg-zinc-950 px-3 py-2">
                                <ShoppingBag size={12} color="#ffffff" />
                                <View className="w-1" />
                                <Text className="text-[11px] font-black text-white">Mua ngay</Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>

          <View className="flex-row items-center gap-1.5 border-t border-zinc-100 bg-white p-2.5">
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => send()}
              placeholder="Nháº­p n?i dung c?n h? tr?..."
              className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900"
            />
            <Pressable onPress={() => send()} className="rounded-xl bg-amber-500 p-2">
              <Send size={14} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

