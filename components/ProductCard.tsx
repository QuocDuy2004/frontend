import { Heart, Star } from 'lucide-react-native';
import type { GestureResponderEvent } from 'react-native';
import { Image, Pressable, Text, View } from './tw';
import { Product } from '../types';
import { formatCurrency, getProductSalePrice } from '../lib/pricing';

type ProductCardProps = {
  product: Product;
  onPress: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  horizontal?: boolean;
};

export default function ProductCard({
  product,
  onPress,
  onFavorite,
  isFavorite,
  horizontal = false,
}: ProductCardProps) {
  const salePrice = getProductSalePrice(product);
  const handleFavoritePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onFavorite?.();
  };

  return (
    <Pressable onPress={onPress} className={`rounded-2xl border border-gray-100 bg-white p-3 ${horizontal ? 'flex-row gap-4' : ''}`}>
      <View className={`relative overflow-hidden rounded-xl bg-gray-50 ${horizontal ? 'h-32 w-32' : 'aspect-square w-full'}`}>
        <Image source={{ uri: product.image }} className="h-full w-full" resizeMode="cover" />
        {onFavorite ? (
          <Pressable
            onPress={handleFavoritePress}
            className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/95"
          >
            <Heart size={16} color={isFavorite ? '#ef4444' : '#9ca3af'} fill={isFavorite ? '#ef4444' : 'transparent'} />
          </Pressable>
        ) : null}
      </View>

      <View className={`flex-1 gap-1 ${horizontal ? 'justify-center' : 'mt-3'}`}>
        <Text className="text-[10px] font-bold uppercase text-gray-400">{product.brand}</Text>
        <Text numberOfLines={2} className="min-h-[34px] text-xs font-bold leading-4 text-gray-900">{product.name}</Text>
        <View className="flex-row items-center gap-1">
          <Star size={12} color="#f59e0b" fill="#f59e0b" />
          <Text className="text-[10px] text-gray-500">{product.rating || 5} • {product.reviewCount || 0} đánh giá</Text>
        </View>
        <View className="mt-1 flex-row flex-wrap items-baseline gap-1">
          <Text className="text-sm font-black text-red-500">{formatCurrency(salePrice)}</Text>
          <Text className="text-[10px] text-gray-400 line-through">{product.originalPrice.toLocaleString('vi-VN')}đ</Text>
        </View>
      </View>
    </Pressable>
  );
}
