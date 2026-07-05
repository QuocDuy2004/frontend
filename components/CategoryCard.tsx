import { Image, Pressable, Text, View } from './tw';
import { Category } from '../types';

const categoryImages = {
  'phones-laptops': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&auto=format&fit=crop&q=80',
  'home-living': 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&auto=format&fit=crop&q=80',
  accessories: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
  beauty: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80',
} as const;

export default function CategoryCard({ category, onPress }: { category: Category; onPress: () => void }) {
  const imageUri = category.image || categoryImages[category.id as keyof typeof categoryImages] || categoryImages.fashion;

  return (
    <Pressable onPress={onPress} className="w-[48%] overflow-hidden rounded-[22px] border border-gray-100 bg-white">
      <View className="relative">
        <Image source={{ uri: imageUri }} className="h-24 w-full" resizeMode="cover" />
        <View className="absolute inset-0 bg-black/10" />
        <View className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1">
          <Text className="text-[9px] font-black uppercase text-zinc-800">Danh mục</Text>
        </View>
      </View>
      <View className="px-3 py-3">
        <Text numberOfLines={2} className="text-sm font-black leading-5 text-zinc-900">{category.name}</Text>
        <Text numberOfLines={1} className="mt-1 text-[11px] text-zinc-500">Chạm để xem sản phẩm liên quan</Text>
      </View>
    </Pressable>
  );
}
