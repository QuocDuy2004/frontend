import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, ClipboardList, Home, ShoppingBag } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from '../components/tw';

function formatCurrency(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const numberValue = Number(rawValue || 0);
  return `${numberValue.toLocaleString('vi-VN')}đ`;
}

export default function OrderSuccessScreen() {
  const { orderId, total, paymentMethod } = useLocalSearchParams<{
    orderId?: string;
    total?: string;
    paymentMethod?: string;
  }>();

  const displayOrderId = orderId || 'Đơn hàng mới';
  const paymentLabel = paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'Đã ghi nhận thanh toán';

  return (
    <ScrollView className="flex-1 bg-emerald-50" contentContainerClassName="min-h-full justify-center p-4">
      <View className="overflow-hidden rounded-[32px] bg-white p-6">
        <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-100" />
        <View className="absolute -left-12 bottom-8 h-28 w-28 rounded-full bg-amber-100" />

        <View className="items-center">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-emerald-500">
            <CheckCircle2 size={42} color="#fff" />
          </View>
          <Text className="mt-5 text-center text-2xl font-black text-zinc-950">Đặt hàng thành công</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-zinc-500">
            Cảm ơn bạn đã mua sắm tại VeloCart. Đơn hàng đang được tiếp nhận và sẽ sớm được xử lý.
          </Text>
        </View>

        <View className="mt-6 gap-3 rounded-3xl bg-zinc-50 p-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-xs font-bold uppercase text-zinc-500">Mã đơn hàng</Text>
            <Text className="text-sm font-black text-zinc-950">{displayOrderId}</Text>
          </View>
          <View className="h-px bg-zinc-200" />
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-xs font-bold uppercase text-zinc-500">Tổng thanh toán</Text>
            <Text className="text-base font-black text-red-500">{formatCurrency(total)}</Text>
          </View>
          <View className="h-px bg-zinc-200" />
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-xs font-bold uppercase text-zinc-500">Phương thức</Text>
            <Text className="text-sm font-black text-emerald-700">{paymentLabel}</Text>
          </View>
        </View>

        <View className="mt-6 gap-3">
          <Pressable onPress={() => router.replace('/(tabs)/account')} className="flex-row items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5">
            <ClipboardList size={18} color="#fff" />
            <Text className="text-sm font-black text-white">Xem đơn hàng</Text>
          </Pressable>
          <View className="flex-row gap-3">
            <Pressable onPress={() => router.replace('/(tabs)')} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-zinc-100 py-3">
              <Home size={17} color="#3f3f46" />
              <Text className="text-sm font-black text-zinc-700">Trang chủ</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/(tabs)/catalog')} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-amber-100 py-3">
              <ShoppingBag size={17} color="#92400e" />
              <Text className="text-sm font-black text-amber-800">Mua tiếp</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
