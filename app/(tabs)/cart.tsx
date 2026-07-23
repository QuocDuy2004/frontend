import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ShoppingCart } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from '../../components/tw';
import Header from '../../components/Header';
import CartItem from '../../components/CartItem';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

export default function CartScreen() {
  const { cartItems, updateQuantity, removeItem, hydrateUserCart, subtotal } = useCartStore();
  const currentUser = useAuthStore((s) => s.currentUser);

  useFocusEffect(
    useCallback(() => {
      hydrateUserCart();
    }, [hydrateUserCart])
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4" contentContainerClassName="gap-3 pb-32">
        <View className="flex-row items-center gap-2">
          <ShoppingCart size={18} color="#18181b" />
          <Text className="text-lg font-black">Giỏ hàng</Text>
        </View>
        {cartItems.length === 0 ? (
          <Text className="text-gray-500">Giỏ hàng đang trống.</Text>
        ) : (
          cartItems.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onMinus={() => updateQuantity(item.id, -1)}
              onPlus={() => updateQuantity(item.id, 1)}
              onRemove={() => removeItem(item.id)}
            />
          ))
        )}
      </ScrollView>
      {cartItems.length > 0 ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white p-4">
          <View className="mb-3 flex-row justify-between">
            <Text className="font-bold">Tạm tính</Text>
            <Text className="font-black text-red-500">{subtotal().toLocaleString('vi-VN')}đ</Text>
          </View>
          <Pressable
            onPress={() => router.push(currentUser ? '/checkout' : '/auth?redirect=%2Fcheckout')}
            className="rounded-2xl bg-amber-500 py-3"
          >
            <Text className="text-center font-black text-white">Tiến hành thanh toán</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
