import { useRef } from 'react';
import { Pressable, Text, View } from './tw';
import { Bell, ShoppingBag } from 'lucide-react-native';
import { router } from 'expo-router';
import { useCartStore } from '../store/cartStore';
import { useAppStore } from '../store/appStore';
import { useCartFlyAnimation } from './CartFlyProvider';

export default function Header() {
  const count = useCartStore(s => s.cartItems.reduce((sum, item) => sum + item.quantity, 0));
  const unread = useAppStore(s => s.notifications.filter(n => !n.isRead).length);
  const cartRef = useRef<any>(null);
  const { registerCartTarget } = useCartFlyAnimation();

  const measureCartTarget = () => {
    requestAnimationFrame(() => {
      cartRef.current?.measureInWindow?.((x: number, y: number, width: number, height: number) => {
        registerCartTarget({ x: x + width / 2, y: y + height / 2 });
      });
    });
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
      <Pressable onPress={() => router.replace('/(tabs)')}>
        <Text className="text-xl font-black text-zinc-950">VeloCart<Text className="text-amber-500">.</Text></Text>
      </Pressable>
      <View className="flex-row gap-3">
        <Pressable onPress={() => router.push('/(tabs)/notifications')} className="relative p-2">
          <Bell size={21} color="#52525b" />{unread > 0 && <View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />}
        </Pressable>
        <Pressable ref={cartRef} onLayout={measureCartTarget} onPress={() => router.push('/(tabs)/cart')} className="relative p-2">
          <ShoppingBag size={21} color="#52525b" />{count > 0 && <Text className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1.5 rounded-full">{count}</Text>}
        </Pressable>
      </View>
    </View>
  );
}
