import { router } from 'expo-router';
import { Bell, Gift, Heart, LogIn, LogOut, Package, ShieldCheck, ShoppingBag, TicketPercent, UserRound } from 'lucide-react-native';
import { Image, Pressable, ScrollView, Text, View } from '../../components/tw';
import Header from '../../components/Header';
import { useAppStore } from '../../store/appStore';

const orderStatusLabel: Record<string, string> = {
  pending: 'Cho xac nhan',
  processing: 'Dang xu ly',
  shipping: 'Dang giao',
  completed: 'Da giao',
  cancelled: 'Da huy',
};

const orderStatusClass: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-sky-50 text-sky-700',
  shipping: 'bg-indigo-50 text-indigo-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
};

function StatTile({ icon: Icon, title, value, tone = 'amber' }: { icon: typeof Package; title: string; value: string | number; tone?: 'amber' | 'rose' | 'sky' | 'emerald' }) {
  const toneClass = {
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }[tone];

  return (
    <View className="flex-1 rounded-2xl border border-zinc-100 bg-white p-3">
      <View className={`mb-3 h-10 w-10 items-center justify-center rounded-full ${toneClass}`}>
        <Icon size={18} color="currentColor" />
      </View>
      <Text className="text-[10px] font-bold uppercase text-zinc-500">{title}</Text>
      <Text className="mt-1 text-lg font-black text-zinc-950">{value}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const { currentUser, orders, vouchers, notifications, favorites, onLogout } = useAppStore();
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const pendingCount = orders.filter((item) => item.orderStatus === 'pending' || item.orderStatus === 'processing').length;
  const shippingCount = orders.filter((item) => item.orderStatus === 'shipping').length;
  const completedCount = orders.filter((item) => item.orderStatus === 'completed').length;

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="flex-1" contentContainerClassName="gap-5 p-4 pb-24">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-black text-zinc-950">Tai khoan</Text>
            <Text className="mt-1 text-[11px] font-medium text-zinc-500">Quan ly don hang, voucher va thong tin mua sam</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-amber-50">
            <ShieldCheck size={20} color="#d97706" />
          </View>
        </View>

        {!currentUser ? (
          <View className="rounded-[28px] border border-amber-100 bg-white p-6">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <UserRound size={26} color="#d97706" />
            </View>
            <Text className="text-base font-black text-zinc-950">Dang nhap tai khoan cua ban</Text>
            <Text className="mt-2 text-xs leading-5 text-zinc-500">
              Dang nhap de theo doi hanh trinh don hang, luu san pham yeu thich va quan ly vi voucher uu dai.
            </Text>
            <Pressable onPress={() => router.push('/auth')} className="mt-5 rounded-2xl bg-amber-500 py-3.5">
              <Text className="text-center text-sm font-black text-white">Dang nhap ngay</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="overflow-hidden rounded-[28px] border border-zinc-100 bg-white">
              <View className="h-1.5 bg-amber-500" />
              <View className="p-5">
                <View className="flex-row items-center gap-4">
                  {currentUser.avatar ? (
                    <Image source={{ uri: currentUser.avatar }} className="h-20 w-20 rounded-full" resizeMode="cover" />
                  ) : (
                    <View className="h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                      <UserRound size={32} color="#d97706" />
                    </View>
                  )}

                  <View className="flex-1">
                    <Text className="text-lg font-black text-zinc-950">{currentUser.name}</Text>
                    <Text className="mt-1 text-xs font-semibold text-zinc-500">{currentUser.email}</Text>
                    <Text className="mt-1 text-xs font-semibold text-zinc-500">{currentUser.phone}</Text>
                    <View className="mt-3 self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
                      <Text className="text-[10px] font-black uppercase text-amber-700">Thanh vien uu dai</Text>
                    </View>
                  </View>
                </View>

                <View className="mt-5 flex-row gap-3">
                  <StatTile icon={Package} title="Don hang" value={orders.length} tone="amber" />
                  <StatTile icon={Heart} title="Yeu thich" value={favorites.length} tone="rose" />
                  <StatTile icon={Gift} title="Voucher" value={vouchers.length} tone="emerald" />
                </View>

                <Pressable onPress={onLogout} className="mt-5 flex-row items-center justify-center gap-2 rounded-2xl bg-rose-50 py-3">
                  <LogOut size={17} color="#dc2626" />
                  <Text className="font-black text-rose-600">Dang xuat tai khoan</Text>
                </Pressable>
              </View>
            </View>

            <View className="rounded-[28px] bg-white p-4">
              <Text className="mb-3 text-sm font-black uppercase text-zinc-950">Tong quan tai khoan</Text>
              <View className="flex-row gap-3">
                <View className="flex-1 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <Text className="text-[10px] font-bold uppercase text-zinc-500">Can xu ly</Text>
                  <Text className="mt-2 text-lg font-black text-zinc-950">{pendingCount}</Text>
                </View>
                <View className="flex-1 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <Text className="text-[10px] font-bold uppercase text-zinc-500">Dang giao</Text>
                  <Text className="mt-2 text-lg font-black text-zinc-950">{shippingCount}</Text>
                </View>
                <View className="flex-1 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <Text className="text-[10px] font-bold uppercase text-zinc-500">Thong bao moi</Text>
                  <Text className="mt-2 text-lg font-black text-zinc-950">{unreadCount}</Text>
                </View>
              </View>
            </View>

            <View className="rounded-[28px] bg-white p-4">
              <View className="mb-3 flex-row items-center gap-2">
                <TicketPercent size={17} color="#d97706" />
                <Text className="text-sm font-black uppercase text-zinc-950">Vi voucher cua toi</Text>
              </View>
              <View className="gap-3">
                {vouchers.map((voucher) => (
                  <View key={voucher.code} className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3">
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-xs font-black uppercase text-amber-700">{voucher.code}</Text>
                        <Text className="mt-1 text-[11px] leading-4 text-amber-900">
                          {voucher.discountType === 'fixed'
                            ? `Giam ${voucher.discountValue.toLocaleString('vi-VN')}d`
                            : `Giam ${voucher.discountValue}% toi da ${(voucher.maxDiscount || 0).toLocaleString('vi-VN')}d`}
                        </Text>
                      </View>
                      <View className="rounded-full bg-white px-2.5 py-1.5">
                        <Text className="text-[10px] font-black text-zinc-700">Don tu {voucher.minOrderValue.toLocaleString('vi-VN')}d</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View className="rounded-[28px] bg-white p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <ShoppingBag size={17} color="#18181b" />
                  <Text className="text-sm font-black uppercase text-zinc-950">Don hang gan day</Text>
                </View>
                <Text className="text-[11px] font-bold text-zinc-500">{orders.length} don</Text>
              </View>

              {orders.length === 0 ? (
                <View className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
                  <Text className="text-sm font-bold text-zinc-500">Chua co don hang nao.</Text>
                </View>
              ) : (
                <View className="gap-3">
                  {orders.map((order) => (
                    <View key={order.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-sm font-black text-zinc-950">#{order.id}</Text>
                          <Text className="mt-1 text-[11px] text-zinc-500">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</Text>
                        </View>
                        <View className={`rounded-full px-2.5 py-1.5 ${orderStatusClass[order.orderStatus] || 'bg-zinc-100 text-zinc-600'}`}>
                          <Text className="text-[10px] font-black uppercase">{orderStatusLabel[order.orderStatus] || order.orderStatus}</Text>
                        </View>
                      </View>

                      <View className="mt-3 gap-2">
                        {order.items.slice(0, 2).map((item, index) => (
                          <View key={`${order.id}-${index}`} className="flex-row items-center justify-between gap-3">
                            <Text numberOfLines={1} className="flex-1 text-xs font-bold text-zinc-700">{item.productName}</Text>
                            <Text className="text-[11px] font-bold text-zinc-500">x{item.quantity}</Text>
                          </View>
                        ))}
                        {order.items.length > 2 ? (
                          <Text className="text-[11px] font-semibold text-zinc-400">+{order.items.length - 2} san pham khac</Text>
                        ) : null}
                      </View>

                      <View className="mt-4 flex-row items-center justify-between border-t border-zinc-200 pt-3">
                        <Text className="text-[11px] font-bold uppercase text-zinc-500">Tong thanh toan</Text>
                        <Text className="text-sm font-black text-amber-600">{order.totalAmount.toLocaleString('vi-VN')}d</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="rounded-[28px] bg-white p-4">
              <View className="mb-3 flex-row items-center gap-2">
                <Bell size={17} color="#18181b" />
                <Text className="text-sm font-black uppercase text-zinc-950">Loi tat nhanh</Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable onPress={() => router.push('/(tabs)/notifications')} className="flex-1 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <Text className="text-xs font-black text-zinc-900">Thong bao</Text>
                  <Text className="mt-1 text-[11px] text-zinc-500">{unreadCount} moi chua doc</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/(tabs)/cart')} className="flex-1 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <Text className="text-xs font-black text-zinc-900">Gio hang</Text>
                  <Text className="mt-1 text-[11px] text-zinc-500">Xem va thanh toan nhanh</Text>
                </Pressable>
              </View>
            </View>

            {completedCount > 0 ? (
              <View className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-4">
                <Text className="text-sm font-black text-emerald-700">Ban da hoan tat {completedCount} don hang tai VeloCart</Text>
                <Text className="mt-1 text-xs leading-5 text-emerald-700/80">
                  Tiep tuc mua sam de giu uu dai thanh vien va nhan them voucher moi.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
