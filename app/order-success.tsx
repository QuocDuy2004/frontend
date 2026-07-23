import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, ClipboardList, Home, ShoppingBag, XCircle } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from '../components/tw';
import { useCartStore } from '../store/cartStore';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCurrency(value?: string | string[]) {
  const numberValue = Number(firstParam(value) || 0);
  return `${numberValue.toLocaleString('vi-VN')}đ`;
}

export default function OrderSuccessScreen() {
  const clearCart = useCartStore((s) => s.clearCart);
  const { orderId, total, paymentMethod, status, message } = useLocalSearchParams<{
    orderId?: string;
    total?: string;
    paymentMethod?: string;
    status?: string;
    message?: string;
  }>();

  const displayOrderId = firstParam(orderId) || 'Đơn hàng mới';
  const method = firstParam(paymentMethod);
  const isFailed = firstParam(status) === 'failed';
  const isPaidOnlineSuccess = !isFailed && (method === 'vnpay' || method === 'momo' || method === 'visa' || method === 'bank_transfer');
  const statusMessage = firstParam(message);
  const paymentLabel =
    method === 'COD'
      ? 'Thanh toán khi nhận hàng'
      : method === 'bank_transfer'
        ? 'Chờ xác nhận chuyển khoản'
        : method === 'vnpay'
          ? (isFailed ? 'VNPAY thanh toán thất bại' : 'VNPAY đã thanh toán')
          : method === 'momo'
            ? (isFailed ? 'MoMo thanh toán thất bại' : 'MoMo đã thanh toán')
            : 'Đã ghi nhận thanh toán';

  const displayPaymentLabel = method === 'bank_transfer'
    ? (isFailed ? 'Chuyen khoan chua xac nhan' : 'Da xac nhan chuyen khoan')
    : paymentLabel;

  useEffect(() => {
    if (isPaidOnlineSuccess) {
      clearCart();
    }
  }, [clearCart, isPaidOnlineSuccess]);

  return (
    <ScrollView className={`flex-1 ${isFailed ? 'bg-rose-50' : 'bg-emerald-50'}`} contentContainerClassName="min-h-full justify-center p-4">
      <View className="overflow-hidden rounded-[32px] bg-white p-6">
        <View className={`absolute -right-10 -top-10 h-36 w-36 rounded-full ${isFailed ? 'bg-rose-100' : 'bg-emerald-100'}`} />
        <View className="absolute -left-12 bottom-8 h-28 w-28 rounded-full bg-amber-100" />

        <View className="items-center">
          <View className={`h-20 w-20 items-center justify-center rounded-full ${isFailed ? 'bg-rose-500' : 'bg-emerald-500'}`}>
            {isFailed ? <XCircle size={42} color="#fff" /> : <CheckCircle2 size={42} color="#fff" />}
          </View>
          <Text className="mt-5 text-center text-2xl font-black text-zinc-950">
            {isFailed ? 'Thanh toán chưa thành công' : 'Đặt hàng thành công'}
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-zinc-500">
            {statusMessage || (isFailed
              ? 'Giao dịch chưa được cổng thanh toán xác nhận thành công. Bạn có thể kiểm tra lại đơn hàng hoặc thử thanh toán lại.'
              : 'Cảm ơn bạn đã mua sắm tại VeloCart. Đơn hàng đang được tiếp nhận và sẽ sớm được xử lý.')}
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
            <Text className={`text-sm font-black ${isFailed ? 'text-rose-600' : 'text-emerald-700'}`}>{displayPaymentLabel}</Text>
          </View>
        </View>

        <View className="mt-6 gap-3">
          <Pressable onPress={() => router.replace('/(tabs)/account')} className={`flex-row items-center justify-center gap-2 rounded-2xl py-3.5 ${isFailed ? 'bg-rose-500' : 'bg-emerald-500'}`}>
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
