import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDownUp, Search, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from '../../components/tw';
import Header from '../../components/Header';
import ProductCard from '../../components/ProductCard';
import { useCatalogStore } from '../../store/catalogStore';
import { useFavoriteStore } from '../../store/favoriteStore';
import { getProductSalePrice } from '../../lib/pricing';

type SortMode = 'popular' | 'price-asc' | 'price-desc' | 'name-asc';

const sortOptions: { key: SortMode; label: string }[] = [
  { key: 'popular', label: 'Nổi bật' },
  { key: 'price-asc', label: 'Giá tăng dần' },
  { key: 'price-desc', label: 'Giá giảm dần' },
  { key: 'name-asc', label: 'Tên A-Z' },
];

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const { products, categories } = useCatalogStore();
  const { favorites, onToggleFavorite } = useFavoriteStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(params.category || 'all');
  const [sortMode, setSortMode] = useState<SortMode>('popular');

  useEffect(() => {
    if (params.category) {
      setCategory(params.category);
    }
  }, [params.category]);

  const list = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchCategory = category === 'all' || product.categoryId === category;
      const matchSearch =
        normalized.length === 0 ||
        product.name.toLowerCase().includes(normalized) ||
        product.brand.toLowerCase().includes(normalized);
      return matchCategory && matchSearch;
    });

    return filtered.sort((a, b) => {
      const favoritePriority = Number(favorites.includes(b.id)) - Number(favorites.includes(a.id));
      if (favoritePriority !== 0) return favoritePriority;

      switch (sortMode) {
        case 'price-asc':
          return getProductSalePrice(a) - getProductSalePrice(b);
        case 'price-desc':
          return getProductSalePrice(b) - getProductSalePrice(a);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'popular':
        default:
          return (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0);
      }
    });
  }, [products, category, search, sortMode, favorites]);

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-24">
        <View className="rounded-[28px] bg-white p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-black text-zinc-950">Sản phẩm</Text>
              <Text className="mt-1 text-[11px] font-medium text-zinc-500">Lọc nhanh theo nhu cầu mua sắm của bạn</Text>
            </View>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <Sparkles size={18} color="#d97706" />
            </View>
          </View>

          <View className="mt-4 flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 px-3">
            <Search size={17} color="#71717a" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm sản phẩm, thương hiệu..."
              className="flex-1 px-3 py-3 text-sm text-zinc-900"
            />
          </View>
        </View>

        <View className="rounded-[28px] bg-white p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <SlidersHorizontal size={16} color="#18181b" />
            <Text className="text-sm font-black uppercase text-zinc-950">Bộ lọc</Text>
          </View>

          <Text className="mb-2 text-[11px] font-bold uppercase text-zinc-500">Danh mục</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2">
            <Pressable
              onPress={() => setCategory('all')}
              className={`rounded-full px-4 py-2 ${category === 'all' ? 'bg-zinc-950' : 'bg-gray-100'}`}
            >
              <Text className={`text-[11px] font-black ${category === 'all' ? 'text-white' : 'text-zinc-700'}`}>Tất cả</Text>
            </Pressable>
            {categories.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setCategory(item.id)}
                className={`rounded-full px-4 py-2 ${category === item.id ? 'bg-amber-500' : 'bg-gray-100'}`}
              >
                <Text className={`text-[11px] font-black ${category === item.id ? 'text-white' : 'text-zinc-700'}`}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text className="mb-2 mt-4 text-[11px] font-bold uppercase text-zinc-500">Sắp xếp</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2">
            {sortOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setSortMode(option.key)}
                className={`flex-row items-center rounded-full px-4 py-2 ${sortMode === option.key ? 'bg-amber-50 border border-amber-200' : 'bg-gray-100 border border-transparent'}`}
              >
                <ArrowDownUp size={12} color={sortMode === option.key ? '#d97706' : '#52525b'} />
                <View className="w-1.5" />
                <Text className={`text-[11px] font-black ${sortMode === option.key ? 'text-amber-700' : 'text-zinc-700'}`}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase text-zinc-500">Kết quả</Text>
          <Text className="text-xs font-black text-zinc-900">{list.length} sản phẩm</Text>
        </View>

        <View className="gap-3">
          {list.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              horizontal
              onPress={() => router.push(`/(tabs)/product/${product.id}`)}
              onFavorite={() => onToggleFavorite(product.id)}
              isFavorite={favorites.includes(product.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

