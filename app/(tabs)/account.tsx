import { router, useFocusEffect } from 'expo-router';
import { Bell, Gift, Heart, LogOut, Package, Pencil, Save, ShieldCheck, ShoppingBag, TicketPercent, UserRound, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import type { TextInputProps } from 'react-native';
import { Image, Pressable, ScrollView, Text, TextInput, View } from '../../components/tw';
import Header from '../../components/Header';
import { useAuthStore } from '../../store/authStore';
import { useCatalogStore } from '../../store/catalogStore';
import { useFavoriteStore } from '../../store/favoriteStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useOrderStore } from '../../store/orderStore';
import { useVoucherStore } from '../../store/voucherStore';
import ReviewForm from '../../components/ReviewForm';
import type { Order } from '../../types';

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

const orderStatusLabel: Record<string, string> = {
  pending: 'Chờ giao hàng',
  processing: 'Đã chuyển tới kho',
  shipping: 'Đang giao',
  completed: 'Đã giao',
  cancelled: 'Đã hoàn đơn',
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
    <View className="flex-1 p-3 bg-white border rounded-2xl border-zinc-100">
      <View className={`mb-3 h-10 w-10 items-center justify-center rounded-full ${toneClass}`}>
        <Icon size={18} color="currentColor" />
      </View>
      <Text className="text-[10px] font-bold uppercase text-zinc-500">{title}</Text>
      <Text className="mt-1 text-lg font-black text-zinc-950">{value}</Text>
    </View>
  );
}

function ProfileInput({ label, className = '', ...props }: TextInputProps & { label: string; className?: string }) {
  return (
    <View>
      <Text className="mb-1 text-xs font-bold text-zinc-600">{label}</Text>
      <TextInput
        placeholderTextColor="#a1a1aa"
        className={`rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-semibold text-zinc-950 ${props.multiline ? 'min-h-24' : ''} ${className}`}
        {...props}
      />
    </View>
  );
}

export default function AccountScreen() {
  const { currentUser, authHydrated, onLogout, updateCurrentUserProfile } = useAuthStore();
  const { orders, hydrateUserOrders } = useOrderStore();
  const vouchers = useVoucherStore((s) => s.vouchers);
  const notifications = useNotificationStore((s) => s.notifications);
  const favorites = useFavoriteStore((s) => s.favorites);
  const onAddReview = useCatalogStore((s) => s.onAddReview);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileDraft, setProfileDraft] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const pendingCount = orders.filter((item) => item.orderStatus === 'pending' || item.orderStatus === 'processing').length;
  const shippingCount = orders.filter((item) => item.orderStatus === 'shipping').length;
  const completedCount = orders.filter((item) => item.orderStatus === 'completed').length;

  useFocusEffect(
    useCallback(() => {
      if (!authHydrated || (!currentUser?.id && !currentUser?.email)) return;

      let alive = true;
      setIsLoadingOrders(true);
      setOrdersError('');

      hydrateUserOrders()
        .catch((error) => {
          if (alive) {
            setOrdersError(error instanceof Error ? error.message : 'Không thể tải đơn hàng từ backend.');
          }
        })
        .finally(() => {
          if (alive) setIsLoadingOrders(false);
        });

      return () => {
        alive = false;
      };
    }, [authHydrated, currentUser?.email, currentUser?.id, hydrateUserOrders])
  );

  const handleStartEditProfile = () => {
    if (!currentUser) return;
    setProfileDraft({
      name: currentUser.name || '',
      email: currentUser.email || '',
      phone: currentUser.phone || '',
      address: currentUser.address || '',
    });
    setProfileMessage('');
    setProfileError('');
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileError('');
  };

  const handleSaveProfile = async () => {
    setProfileMessage('');
    setProfileError('');

    const nextProfile = {
      name: profileDraft.name.trim(),
      email: profileDraft.email.trim().toLowerCase(),
      phone: profileDraft.phone.trim(),
      address: profileDraft.address.trim(),
    };

    if (!nextProfile.name || !nextProfile.email || !nextProfile.phone) {
      setProfileError('Vui lòng nhập đầy đủ họ tên, email và số điện thoại.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateCurrentUserProfile(nextProfile);
      setProfileMessage('Đã cập nhật thông tin tài khoản.');
      setIsEditingProfile(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Không thể cập nhật thông tin tài khoản.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await onLogout();
  };

  const toggleOrderDetail = (orderId: string) => {
    setSelectedOrderId((current) => (current === orderId ? null : orderId));
    setReviewProductId(null);
    setReviewComment('');
    setReviewRating(0);
  };

  const startReview = (productId: string) => {
    setReviewProductId((current) => (current === productId ? null : productId));
    setReviewComment('');
    setReviewRating(0);
  };

  const submitReview = (order: Order, productId: string, productName: string) => {
    const comment = reviewComment.trim();
    if (!comment || reviewRating === 0) return;

    onAddReview(productId, {
      id: `r_${order.id}_${productId}_${Date.now()}`,
      productId,
      productName,
      userName: currentUser?.name || order.customerName || 'Khách hàng VeloCart',
      rating: reviewRating,
      comment,
      createdAt: new Date().toISOString().split('T')[0],
      isApproved: true,
    });

    setReviewProductId(null);
    setReviewComment('');
    setReviewRating(0);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="flex-1" contentContainerClassName="gap-5 p-4 pb-24">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-black text-zinc-950">Tài khoản</Text>
            <Text className="mt-1 text-[11px] font-medium text-zinc-500">Quản lý đơn hàng, voucher và thông tin mua sắm</Text>
          </View>
          <View className="items-center justify-center h-11 w-11 rounded-2xl bg-amber-50">
            <ShieldCheck size={20} color="#d97706" />
          </View>
        </View>

        {!authHydrated ? (
          <View className="rounded-[28px] border border-zinc-100 bg-white p-6">
            <Text className="text-base font-black text-zinc-950">Đang tải phiên đăng nhập...</Text>
            <Text className="mt-2 text-xs leading-5 text-zinc-500">VeloCart đang kiểm tra jwt-token đã lưu trên thiết bị.</Text>
          </View>
        ) : !currentUser ? (
          <View className="rounded-[28px] border border-amber-100 bg-white p-6">
            <View className="items-center justify-center mb-4 rounded-full h-14 w-14 bg-amber-100">
              <UserRound size={26} color="#d97706" />
            </View>
            <Text className="text-base font-black text-zinc-950">Đăng nhập tài khoản của bạn</Text>
            <Text className="mt-2 text-xs leading-5 text-zinc-500">
              Đăng nhập để theo dõi hành trình đơn hàng, lưu sản phẩm yêu thích và quản lý ví voucher ưu đãi.
            </Text>
            <Pressable onPress={() => router.push('/auth')} className="mt-5 rounded-2xl bg-amber-500 py-3.5">
              <Text className="text-sm font-black text-center text-white">Đăng nhập ngay</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="overflow-hidden rounded-[28px] border border-zinc-100 bg-white">
              <View className="h-1.5 bg-amber-500" />
              <View className="p-5">
                <View className="flex-row items-center gap-4">
                  {currentUser.avatar ? (
                    <Image source={{ uri: currentUser.avatar }} className="w-20 h-20 rounded-full" resizeMode="cover" />
                  ) : (
                    <View className="items-center justify-center w-20 h-20 rounded-full bg-amber-100">
                      <UserRound size={32} color="#d97706" />
                    </View>
                  )}

                  <View className="flex-1">
                    <Text className="text-lg font-black text-zinc-950">{currentUser.name}</Text>
                    <Text className="mt-1 text-xs font-semibold text-zinc-500">{currentUser.email}</Text>
                    <Text className="mt-1 text-xs font-semibold text-zinc-500">{currentUser.phone || 'Chưa có số điện thoại'}</Text>
                    {currentUser.address ? (
                      <Text className="mt-1 text-xs font-semibold text-zinc-500">{currentUser.address}</Text>
                    ) : null}
                    <View className="mt-3 self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
                      <Text className="text-[10px] font-black uppercase text-amber-700">
                        {currentUser.role || 'member'} - {currentUser.status || 'active'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-3 mt-5">
                  <StatTile icon={Package} title="Đơn hàng" value={currentUser.ordersCount ?? orders.length} tone="amber" />
                  <StatTile icon={Heart} title="Yêu thích" value={favorites.length} tone="rose" />
                  <StatTile icon={Gift} title="Điểm" value={currentUser.loyaltyPoints ?? 0} tone="emerald" />
                </View>

                <View className="flex-row gap-3 mt-5">
                  <Pressable onPress={handleStartEditProfile} className="flex-row items-center justify-center flex-1 gap-2 py-3 rounded-2xl bg-amber-50">
                    <Pencil size={17} color="#d97706" />
                    <Text className="font-black text-amber-700">Sửa thông tin</Text>
                  </Pressable>
                  <Pressable onPress={handleLogout} className="flex-row items-center justify-center flex-1 gap-2 py-3 rounded-2xl bg-rose-50">
                    <LogOut size={17} color="#dc2626" />
                    <Text className="font-black text-rose-600">Đăng xuất</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {profileMessage ? (
              <View className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
                <Text className="text-sm font-black text-emerald-700">{profileMessage}</Text>
              </View>
            ) : null}

            {isEditingProfile ? (
              <View className="rounded-[28px] bg-white p-4">
                <View className="flex-row items-center justify-between gap-3 mb-4">
                  <View className="flex-1">
                    <Text className="text-sm font-black uppercase text-zinc-950">Thông tin cá nhân</Text>
                    <Text className="mt-1 text-[11px] leading-4 text-zinc-500">Cập nhật họ tên, email, số điện thoại và địa chỉ nhận hàng.</Text>
                  </View>
                  <Pressable onPress={handleCancelEditProfile} className="items-center justify-center rounded-full h-9 w-9 bg-zinc-100">
                    <X size={17} color="#52525b" />
                  </Pressable>
                </View>

                {profileError ? (
                  <View className="p-3 mb-4 border rounded-2xl border-rose-100 bg-rose-50">
                    <Text className="text-xs font-bold text-rose-700">{profileError}</Text>
                  </View>
                ) : null}

                <View className="gap-3">
                  <ProfileInput
                    label="Họ tên"
                    value={profileDraft.name}
                    onChangeText={(value) => setProfileDraft((current) => ({ ...current, name: value }))}
                    placeholder="Nguyễn Văn A"
                  />
                  <ProfileInput
                    label="Email"
                    value={profileDraft.email}
                    onChangeText={(value) => setProfileDraft((current) => ({ ...current, email: value }))}
                    placeholder="example@gmail.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <ProfileInput
                    label="Số điện thoại"
                    value={profileDraft.phone}
                    onChangeText={(value) => setProfileDraft((current) => ({ ...current, phone: value }))}
                    placeholder="0911222333"
                    keyboardType="phone-pad"
                  />
                  <ProfileInput
                    label="Địa chỉ"
                    value={profileDraft.address}
                    onChangeText={(value) => setProfileDraft((current) => ({ ...current, address: value }))}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                    multiline
                  />
                </View>

                <View className="flex-row gap-3 mt-4">
                  <Pressable onPress={handleCancelEditProfile} disabled={isSavingProfile} className="flex-1 py-3 rounded-2xl bg-zinc-100">
                    <Text className="text-sm font-black text-center text-zinc-700">Hủy</Text>
                  </Pressable>
                  <Pressable onPress={handleSaveProfile} disabled={isSavingProfile} className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3 ${isSavingProfile ? 'bg-zinc-300' : 'bg-amber-500'}`}>
                    <Save size={17} color="#fff" />
                    <Text className="text-sm font-black text-center text-white">{isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View className="rounded-[28px] bg-white p-4">
              <Text className="mb-3 text-sm font-black uppercase text-zinc-950">Tổng quan tài khoản</Text>
              <View className="flex-row gap-3">
                <View className="flex-1 p-3 border rounded-2xl border-zinc-100 bg-zinc-50">
                  <Text className="text-[10px] font-bold uppercase text-zinc-500">Cần xử lý</Text>
                  <Text className="mt-2 text-lg font-black text-zinc-950">{pendingCount}</Text>
                </View>
                <View className="flex-1 p-3 border rounded-2xl border-zinc-100 bg-zinc-50">
                  <Text className="text-[10px] font-bold uppercase text-zinc-500">Đang giao</Text>
                  <Text className="mt-2 text-lg font-black text-zinc-950">{shippingCount}</Text>
                </View>
                <View className="flex-1 p-3 border rounded-2xl border-zinc-100 bg-zinc-50">
                  <Text className="text-[10px] font-bold uppercase text-zinc-500">Thông báo mới</Text>
                  <Text className="mt-2 text-lg font-black text-zinc-950">{unreadCount}</Text>
                </View>
              </View>
              <View className="p-3 mt-3 border rounded-2xl border-zinc-100 bg-zinc-50">
                <Text className="text-[10px] font-bold uppercase text-zinc-500">Tổng chi tiêu backend</Text>
                <Text className="mt-2 text-lg font-black text-zinc-950">{formatCurrency(currentUser.lifetimeValue || 0)}</Text>
              </View>
            </View>

            <View className="rounded-[28px] bg-white p-4">
              <View className="flex-row items-center gap-2 mb-3">
                <TicketPercent size={17} color="#d97706" />
                <Text className="text-sm font-black uppercase text-zinc-950">Ví voucher của tôi</Text>
              </View>
              <View className="gap-3">
                {vouchers.map((voucher) => (
                  <View key={voucher.code} className="px-4 py-3 border border-dashed rounded-2xl border-amber-300 bg-amber-50">
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <Text className="text-xs font-black uppercase text-amber-700">{voucher.code}</Text>
                        <Text className="mt-1 text-[11px] leading-4 text-amber-900">
                          {voucher.discountType === 'fixed'
                            ? `Giảm ${formatCurrency(voucher.discountValue)}`
                            : `Giảm ${voucher.discountValue}% tối đa ${formatCurrency(voucher.maxDiscount || 0)}`}
                        </Text>
                      </View>
                      <View className="rounded-full bg-white px-2.5 py-1.5">
                        <Text className="text-[10px] font-black text-zinc-700">Đơn từ {formatCurrency(voucher.minOrderValue)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View className="rounded-[28px] bg-white p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <ShoppingBag size={17} color="#18181b" />
                  <Text className="text-sm font-black uppercase text-zinc-950">Đơn hàng gần đây</Text>
                </View>
                <Text className="text-[11px] font-bold text-zinc-500">{isLoadingOrders ? 'Đang tải...' : `${orders.length} đơn`}</Text>
              </View>

              {ordersError ? (
                <View className="p-3 mb-3 border rounded-2xl border-rose-100 bg-rose-50">
                  <Text className="text-xs font-bold leading-5 text-rose-600">{ordersError}</Text>
                </View>
              ) : null}

              {isLoadingOrders && orders.length === 0 ? (
                <View className="p-5 border rounded-2xl border-zinc-100 bg-zinc-50">
                  <Text className="text-sm font-bold text-zinc-500">Đang tải đơn hàng từ backend...</Text>
                </View>
              ) : orders.length === 0 ? (
                <View className="p-5 border rounded-2xl border-zinc-100 bg-zinc-50">
                  <Text className="text-sm font-bold text-zinc-500">Chưa có đơn hàng nào.</Text>
                </View>
              ) : (
                <View className="gap-3">
                  {orders.map((order) => {
                    const isSelected = selectedOrderId === order.id;

                    return (
                      <View key={order.id} className="p-4 border rounded-2xl border-zinc-100 bg-zinc-50">
                        <Pressable onPress={() => toggleOrderDetail(order.id)}>
                          <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                              <Text className="text-sm font-black text-zinc-950">#{order.id}</Text>
                              <Text className="mt-1 text-[11px] text-zinc-500">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</Text>
                            </View>
                            <View className={`rounded-full px-2.5 py-1.5 ${orderStatusClass[order.orderStatus] || 'bg-zinc-100 text-zinc-600'}`}>
                              <Text className="text-[10px] font-black uppercase">{orderStatusLabel[order.orderStatus] || order.orderStatus}</Text>
                            </View>
                          </View>

                          <View className="gap-2 mt-3">
                            {order.items.slice(0, 2).map((item, index) => (
                              <View key={`${order.id}-${index}`} className="flex-row items-center justify-between gap-3">
                                <Text numberOfLines={1} className="flex-1 text-xs font-bold text-zinc-700">{item.productName}</Text>
                                <Text className="text-[11px] font-bold text-zinc-500">x{item.quantity}</Text>
                              </View>
                            ))}
                            {order.items.length > 2 ? (
                              <Text className="text-[11px] font-semibold text-zinc-400">+{order.items.length - 2} sản phẩm khác</Text>
                            ) : null}
                          </View>

                          <View className="flex-row items-center justify-between pt-3 mt-4 border-t border-zinc-200">
                            <Text className="text-[11px] font-bold uppercase text-zinc-500">{isSelected ? 'Ẩn chi tiết' : 'Xem chi tiết'}</Text>
                            <Text className="text-sm font-black text-amber-600">{formatCurrency(order.totalAmount)}</Text>
                          </View>
                        </Pressable>

                        {isSelected ? (
                          <View className="gap-4 pt-4 mt-4 border-t border-zinc-200">
                            <View className="gap-2 p-3 bg-white rounded-2xl">
                              <Text className="text-xs font-black uppercase text-zinc-500">Thông tin nhận hàng</Text>
                              <Text className="text-sm font-black text-zinc-950">{order.customerName}</Text>
                              <Text className="text-xs font-semibold text-zinc-600">{order.customerPhone}</Text>
                              {order.customerEmail ? <Text className="text-xs font-semibold text-zinc-600">{order.customerEmail}</Text> : null}
                              <Text className="text-xs leading-5 text-zinc-600">{order.customerAddress}</Text>
                            </View>

                            <View className="gap-2 p-3 bg-white rounded-2xl">
                              <Text className="text-xs font-black uppercase text-zinc-500">Thanh toán và vận chuyển</Text>
                              <InfoRow label="Phương thức" value={order.paymentMethod} />
                              <InfoRow label="Trạng thái thanh toán" value={order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'} />
                              <InfoRow label="Đơn vị giao" value={order.shippingUnit} />
                              <InfoRow label="Phí vận chuyển" value={formatCurrency(order.shippingFee)} />
                              <InfoRow label="Giảm giá" value={`-${formatCurrency(order.discountAmount)}`} />
                              {order.voucherCodeUsed ? <InfoRow label="Voucher" value={order.voucherCodeUsed} /> : null}
                              <InfoRow label="Tổng thanh toán" value={formatCurrency(order.totalAmount)} strong />
                            </View>

                            <View className="gap-3">
                              <Text className="text-xs font-black uppercase text-zinc-500">Sản phẩm trong đơn</Text>
                              {order.items.map((item, index) => (
                                <View key={`${order.id}-${item.productId}-${index}`} className="p-3 bg-white rounded-2xl">
                                  <View className="flex-row gap-3">
                                    {item.productImage ? (
                                      <Image source={{ uri: item.productImage }} className="w-16 h-16 rounded-xl" resizeMode="cover" />
                                    ) : null}
                                    <View className="flex-1">
                                      <Text className="text-sm font-black text-zinc-900">{item.productName}</Text>
                                      <Text className="mt-1 text-[11px] font-bold text-zinc-500">Số lượng: {item.quantity}</Text>
                                      <Text className="mt-1 text-[11px] font-bold text-zinc-500">Đơn giá: {formatCurrency(item.price)}</Text>
                                      {[item.selectedColor, item.selectedSize, item.selectedVersion].filter(Boolean).length > 0 ? (
                                        <Text className="mt-1 text-[11px] text-zinc-500">
                                          {[item.selectedColor, item.selectedSize, item.selectedVersion].filter(Boolean).join(' • ')}
                                        </Text>
                                      ) : null}
                                    </View>
                                  </View>

                                  <Pressable onPress={() => startReview(item.productId)} className="mt-3 rounded-2xl bg-amber-50 py-2.5">
                                    <Text className="text-xs font-black text-center text-amber-700">
                                      {reviewProductId === item.productId ? 'Đóng đánh giá' : 'Đánh giá sản phẩm'}
                                    </Text>
                                  </Pressable>

                                  {reviewProductId === item.productId ? (
                                    <View className="pt-3 mt-3 border-t border-zinc-100">
                                      <ReviewForm
                                        value={reviewComment}
                                        setValue={setReviewComment}
                                        rating={reviewRating}
                                        setRating={setReviewRating}
                                        onSubmit={() => submitReview(order, item.productId, item.productName)}
                                      />
                                    </View>
                                  ) : null}
                                </View>
                              ))}
                            </View>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View className="rounded-[28px] bg-white p-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Bell size={17} color="#18181b" />
                <Text className="text-sm font-black uppercase text-zinc-950">Lối tắt nhanh</Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable onPress={() => router.push('/(tabs)/notifications')} className="flex-1 p-3 border rounded-2xl border-zinc-100 bg-zinc-50">
                  <Text className="text-xs font-black text-zinc-900">Thông báo</Text>
                  <Text className="mt-1 text-[11px] text-zinc-500">{unreadCount} mới chưa đọc</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/(tabs)/cart')} className="flex-1 p-3 border rounded-2xl border-zinc-100 bg-zinc-50">
                  <Text className="text-xs font-black text-zinc-900">Giỏ hàng</Text>
                  <Text className="mt-1 text-[11px] text-zinc-500">Xem và thanh toán nhanh</Text>
                </Pressable>
              </View>
            </View>

            {completedCount > 0 ? (
              <View className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-4">
                <Text className="text-sm font-black text-emerald-700">Bạn đã hoàn tất {completedCount} đơn hàng tại VeloCart</Text>
                <Text className="mt-1 text-xs leading-5 text-emerald-700/80">
                  Tiếp tục mua sắm để giữ ưu đãi thành viên và nhận thêm voucher mới.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="flex-1 text-[11px] font-bold text-zinc-500">{label}</Text>
      <Text className={`text-right text-[11px] ${strong ? 'font-black text-amber-600' : 'font-bold text-zinc-800'}`}>{value}</Text>
    </View>
  );
}
