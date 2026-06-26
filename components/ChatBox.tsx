import { router, useSegments } from 'expo-router';
import { Bot, HelpCircle, Plus, Send, ShoppingBag, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from './tw';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import { Product } from '../types';

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
  const addToCart = useCartStore((state) => state.addToCart);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Xin chao. VeloCart co the ho tro tu van san pham, voucher, giao hang va len don nhanh cho ban ngay tai day.',
      time: '16:15',
      actions: [
        { id: 'go-catalog', label: 'Xem san pham', type: 'catalog' },
        { id: 'go-cart', label: 'Mo gio hang', type: 'cart' },
      ],
    },
  ]);

  const quickReplies = useMemo(
    () => ['Tu van dien thoai', 'Co voucher nao khong?', 'San pham duoi 500K', 'Phu kien ban chay'],
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

    if (normalized.includes('voucher') || normalized.includes('ma giam') || normalized.includes('khuyen mai')) {
      return {
        sender: 'bot',
        text: 'Hien tai ban co the dung LIXI2026 de giam 100K va FREESHIP cho don tu 150K. Neu can, minh co the dua ban den khu san pham dang co deal tot.',
        actions: [{ id: 'promo-catalog', label: 'Xem san pham', type: 'catalog' }],
      };
    }

    if (normalized.includes('giao hang') || normalized.includes('freeship') || normalized.includes('van chuyen')) {
      return {
        sender: 'bot',
        text: 'VeloCart uu tien giao nhanh 2H noi thanh va ho tro giao toan quoc. Ban muon minh goi y nhom san pham de len don nhanh khong?',
        actions: [{ id: 'shipping-catalog', label: 'Tu van san pham', type: 'catalog' }],
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
        text: 'Minh tim thay vai san pham phu hop. Ban co the them vao gio hoac mo chi tiet de xem ky hon.',
        suggestions: matchingProducts.map(buildSuggestion),
      };
    }

    if (normalized.includes('dien thoai') || normalized.includes('iphone') || normalized.includes('samsung')) {
      return {
        sender: 'bot',
        text: 'Neu ban dang tim dien thoai, day la nhom noi bat hien tai. iPhone hop voi nhu cau camera va he sinh thai, con Galaxy manh ve AI va man hinh.',
        suggestions: products.filter((product) => product.categoryId === 'phones-laptops').slice(0, 3).map(buildSuggestion),
      };
    }

    if (normalized.includes('thoi trang') || normalized.includes('ao') || normalized.includes('fashion')) {
      return {
        sender: 'bot',
        text: 'Day la nhom thoi trang dang duoc khach xem nhieu. Ban co the them vao gio ngay neu thay phu hop.',
        suggestions: products.filter((product) => product.categoryId === 'fashion').slice(0, 3).map(buildSuggestion),
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
        text: 'Nhom phu kien nay dang duoc hoi kha nhieu. Ban co the mo chi tiet hoac them vao gio ngay trong chat.',
        suggestions: products.filter((product) => product.categoryId === 'accessories').slice(0, 3).map(buildSuggestion),
      };
    }

    return {
      sender: 'bot',
      text: 'Minh co the ho tro theo san pham, muc gia, voucher, giao hang hoac tu van nhanh theo nhu cau. Ban thu hoi nhu: "dien thoai", "duoi 500K", "voucher", hoac "phu kien ban chay".',
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

  const addProductToCart = (product: Product) => {
    addToCart(product, 1);
    appendBotMessage({
      sender: 'bot',
      text: `Da them "${product.name}" vao gio hang. Ban co the mo gio hang de thanh toan hoac tiep tuc mua sam.`,
      actions: [{ id: `cart-${product.id}`, label: 'Mo gio hang', type: 'cart' }],
    });
  };

  const buyNow = (product: Product) => {
    addToCart(product, 1);
    router.push(`/product/${product.id}`);
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
                              <Pressable onPress={() => addProductToCart(suggestion.product)} className="flex-row items-center rounded-full bg-amber-500 px-3 py-2">
                                <Plus size={12} color="#ffffff" />
                                <View className="w-1" />
                                <Text className="text-[11px] font-black text-white">Them gio</Text>
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
              placeholder="Nhap noi dung can ho tro..."
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
