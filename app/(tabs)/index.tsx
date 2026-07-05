import { router } from 'expo-router';
import { Clock3, CreditCard, Flame, Grid2x2, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from '../../components/tw';
import Header from '../../components/Header';
import BannerCarousel from '../../components/BannerCarousel';
import CategoryCard from '../../components/CategoryCard';
import ProductCard from '../../components/ProductCard';
import { useAppStore } from '../../store/appStore';
import { Product } from '../../types';

function SectionHeader({
  title,
  icon: Icon,
  iconColor = '#18181b',
  action,
  onPress,
}: {
  title: string;
  icon: typeof Grid2x2;
  iconColor?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <Icon size={16} color={iconColor} />
        <Text className="text-sm font-black uppercase tracking-wide text-zinc-950">{title}</Text>
      </View>
      {action && onPress ? (
        <Pressable onPress={onPress} className="rounded-full bg-amber-50 px-3 py-1.5">
          <Text className="text-[11px] font-black text-amber-700">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PromoRail() {
  const items = [
    { icon: Truck, title: 'Giao nhanh 2H', desc: 'Ná»™i thÃ nh HN vÃ  TP.HCM' },
    { icon: ShieldCheck, title: 'Hang chinh hang', desc: 'Bao hanh minh bach' },
    { icon: CreditCard, title: 'Thanh toÃ¡n linh ho?t', desc: 'COD, v? Ä‘iá»‡n tá»­, bank' },
  ];

  return (
    <View className="flex-row gap-3">
      {items.map(({ icon: Icon, title, desc }) => (
        <View key={title} className="flex-1 rounded-2xl border border-amber-100 bg-white p-3">
          <View className="mb-2 h-9 w-9 items-center justify-center rounded-full bg-amber-50">
            <Icon size={18} color="#d97706" />
          </View>
          <Text className="text-[11px] font-black text-zinc-900">{title}</Text>
          <Text className="mt-1 text-[10px] leading-4 text-zinc-500">{desc}</Text>
        </View>
      ))}
    </View>
  );
}

function FlashSaleStrip({ products }: { products: Product[] }) {
  const targetTime = useMemo(() => {
    const next = new Date();
    next.setHours(23, 59, 59, 999);
    return next.getTime();
  }, []);

  const [remaining, setRemaining] = useState(() => {
    const diff = Math.max(targetTime - Date.now(), 0);
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(targetTime - Date.now(), 0);
      setRemaining({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  return (
    <View className="overflow-hidden rounded-3xl border border-red-200 bg-red-50">
      <View className="absolute left-8 top-0 h-24 w-24 rounded-full bg-red-200/40" />
      <View className="absolute right-0 top-2 h-32 w-32 rounded-full bg-orange-200/50" />

      <View className="p-4">
        <View className="mb-4 flex-row items-start justify-between gap-3">
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-red-500">
              <Flame size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-black uppercase text-red-700">Flash Sale</Text>
                <View className="rounded-full bg-red-500 px-2 py-1">
                  <Text className="text-[10px] font-black uppercase text-white">Äang diá»…n ra</Text>
                </View>
              </View>
              <Text className="mt-1 text-[11px] font-bold text-red-950/70">GiÃ¡ tá»‘t trong ngÃ y cho nhÃ³m sáº£n pháº©m Ä‘ang Ä‘Æ°á»£c Ä‘áº©y banner</Text>
            </View>
          </View>

          <View className="rounded-2xl border border-red-200 bg-white/80 px-3 py-2">
            <View className="mb-1 flex-row items-center gap-1">
              <Clock3 size={14} color="#b91c1c" />
              <Text className="text-[10px] font-bold uppercase text-red-700">Ket thuc sau</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              {[remaining.hours, remaining.minutes, remaining.seconds].map((value, index) => (
                <View key={index} className="min-w-[34px] rounded-lg bg-zinc-950 px-2 py-1.5">
                  <Text className="text-center text-xs font-black text-white">{String(value).padStart(2, '0')}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-2">
          {products.map((product) => {
            const salePrice = product.flashSalePrice || product.discountPrice;
            const soldPercent = Math.min(92, Math.max(38, 100 - product.stock));

            return (
              <Pressable
                key={product.id}
                onPress={() => router.push(`/(tabs)/product/${product.id}`)}
                className="w-44 overflow-hidden rounded-2xl border border-white/70 bg-white"
              >
                <View className="relative">
                  <Image source={{ uri: product.image }} className="h-36 w-full" resizeMode="cover" />
                  <View className="absolute left-2 top-2 rounded-br-xl rounded-tl-xl bg-red-600 px-2 py-1">
                    <Text className="text-[10px] font-black text-white">-{product.discountPercent || 0}%</Text>
                  </View>
                </View>

                <View className="p-3">
                  <Text className="text-xs font-black leading-4 text-zinc-900" numberOfLines={2}>{product.name}</Text>
                  <Text className="mt-1 text-[10px] font-bold uppercase text-zinc-500">{product.brand}</Text>

                  <View className="mt-3 flex-row items-end gap-1">
                    <Text className="text-sm font-black text-red-600">{salePrice.toLocaleString('vi-VN')}d</Text>
                    <Text className="text-[10px] text-zinc-400 line-through">{product.originalPrice.toLocaleString('vi-VN')}d</Text>
                  </View>

                  <View className="mt-3 rounded-full bg-red-100 px-2 py-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[10px] font-bold text-red-700">Da ban {soldPercent}%</Text>
                      <Text className="text-[10px] font-bold text-red-700">CÃ²n {product.stock}</Text>
                    </View>
                    <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
                      <View className="h-full rounded-full bg-red-500" style={{ width: `${soldPercent}%` }} />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable onPress={() => router.push('/(tabs)/catalog')} className="mt-4 self-start rounded-full bg-white px-4 py-2">
          <Text className="text-[11px] font-black uppercase text-red-700">Xem tat ca deal hom nay</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ProductGrid({
  products,
  favorites,
  onToggleFavorite,
}: {
  products: Product[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {products.map((product) => (
        <View key={product.id} className="w-[48%]">
          <ProductCard
            product={product}
            onPress={() => router.push(`/(tabs)/product/${product.id}`)}
            onFavorite={() => onToggleFavorite(product.id)}
            isFavorite={favorites.includes(product.id)}
          />
        </View>
      ))}
    </View>
  );
}

function VoucherPreview() {
  return (
    <View className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-4">
      <View className="flex-row items-center gap-2">
        <Sparkles size={18} color="#d97706" />
        <Text className="text-sm font-black text-amber-900">Vi voucher cua ban</Text>
      </View>
      <Text className="mt-2 text-xs leading-5 text-amber-800">
        DÃ¹ng LIXI2026 Ä‘á»ƒ giáº£m 100K hoáº·c FREESHIP Ä‘á»ƒ tiáº¿t kiá»‡m phÃ­ giao hÃ ng cho Ä‘Æ¡n tá»« 150K.
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { categories, products, favorites, onToggleFavorite } = useAppStore();
  const flashSale = products.filter((product) => product.flashSalePrice);
  const featured = products.filter((product) => product.isBestSeller || product.isNew).slice(0, 4);

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="flex-1" contentContainerClassName="gap-5 p-4 pb-24">
        <BannerCarousel onShopNow={() => router.push('/(tabs)/catalog')} />
        <PromoRail />

        <View>
          <SectionHeader title="Danh muc sáº£n pháº©m" icon={Grid2x2} action="Táº¥t cáº£" onPress={() => router.push('/(tabs)/catalog')} />
          <View className="flex-row flex-wrap gap-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onPress={() => router.push({ pathname: '/(tabs)/catalog', params: { category: category.id } })}
              />
            ))}
          </View>
        </View>

        {flashSale.length > 0 ? <FlashSaleStrip products={flashSale} /> : null}

        <View>
          <SectionHeader title="Noi bat va ban chay" icon={Star} action="Mua ngay" onPress={() => router.push('/(tabs)/catalog')} />
          <ProductGrid
            products={featured.length > 0 ? featured : products.slice(0, 4)}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
          />
        </View>

        <VoucherPreview />
      </ScrollView>
    </View>
  );
}

