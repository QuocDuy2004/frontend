import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { formatCurrency, getProductSalePrice } from '../lib/pricing';
import { CartItem as TCartItem } from '../types';
import { Image, Pressable, Text, View } from './tw';

export default function CartItem({
  item,
  onMinus,
  onPlus,
  onRemove,
}: {
  item: TCartItem;
  onMinus: () => void;
  onPlus: () => void;
  onRemove: () => void;
}) {
  const salePrice = getProductSalePrice(item.product);
  const stock = Math.max(0, Number(item.product.stock || 0));
  const reachedStockLimit = item.quantity >= stock;

  return (
    <View className="flex-row gap-3 rounded-2xl border border-gray-100 bg-white p-3">
      <Image source={{ uri: item.product.image }} className="h-20 w-20 rounded-xl" />
      <View className="flex-1">
        <Text numberOfLines={2} className="text-xs font-bold text-gray-900">{item.product.name}</Text>
        <Text className="text-[10px] text-gray-500">
          {[item.selectedColor, item.selectedSize, item.selectedVersion].filter(Boolean).join(' • ')}
        </Text>
        <Text className="mt-1 text-sm font-black text-red-500">{formatCurrency(salePrice)}</Text>
        <View className="mt-2 flex-row items-center gap-2">
          <Pressable onPress={onMinus} className="rounded bg-gray-100 p-1">
            <Minus size={14} />
          </Pressable>
          <Text className="font-bold">{item.quantity}</Text>
          <Pressable
            onPress={onPlus}
            disabled={reachedStockLimit}
            className={`rounded p-1 ${reachedStockLimit ? 'bg-gray-50' : 'bg-gray-100'}`}
          >
            <Plus size={14} />
          </Pressable>
          <Pressable onPress={onRemove} className="ml-auto p-1">
            <Trash2 size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
