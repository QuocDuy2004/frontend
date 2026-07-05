import { router } from 'expo-router';
import { ArrowLeft, Check, ChevronDown, ChevronUp, CreditCard, MapPin, Pencil, Plus, ShoppingBag, TicketPercent, Truck, UserRound } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from '../components/tw';
import { fetchPayments } from '../lib/api';
import { useAppStore } from '../store/appStore';
import { useCartStore } from '../store/cartStore';
import { PaymentConfig, Voucher } from '../types';

const SHIPPING_METHODS = [
  { id: 'free', name: 'Giao tiết kiệm', eta: 'Nhận 2-4 ngày', price: 0, subtitle: 'Miễn phí vận chuyển cho đơn đủ điều kiện' },
  { id: 'express', name: 'Giao nhanh', eta: 'Nhận nhanh trong nội thành', price: 30000, subtitle: 'Ưu tiên xử lý và giao nhanh hơn' },
];

type PaymentOption = {
  id: 'COD' | 'momo' | 'vnpay' | 'visa' | 'bank_transfer';
  title: string;
  subtitle: string;
  tone: string;
  logoType: 'text' | 'image';
  logoBg?: string;
  logoText?: string;
  logoUri?: string;
  paymentStatusOnOrder?: 'pending' | 'paid';
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'COD', title: 'Thanh toán khi nhận hàng', subtitle: 'Kiểm tra đơn rồi mới thanh toán', tone: 'bg-amber-50 border-amber-200', logoType: 'text', logoBg: 'bg-amber-500', logoText: 'COD' },
  { id: 'momo', title: 'Ví MoMo', subtitle: 'Thanh toán nhanh bằng ví điện tử', tone: 'bg-fuchsia-50 border-fuchsia-200', logoType: 'image', logoUri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MoMo_Logo_App.svg/960px-MoMo_Logo_App.svg.png' },
  { id: 'vnpay', title: 'VNPay', subtitle: 'Quét mã hoặc thanh toán online', tone: 'bg-sky-50 border-sky-200', logoType: 'image', logoUri: 'https://images.seeklogo.com/logo-png/42/1/vnpay-logo-png_seeklogo-428006.png' },
  { id: 'visa', title: 'Visa / Thẻ quốc tế', subtitle: 'Thẻ tín dụng và thẻ ghi nợ', tone: 'bg-indigo-50 border-indigo-200', logoType: 'image', logoUri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Visa_Brandmark_2021.svg/960px-Visa_Brandmark_2021.svg.png' },
] as const;

type PaymentMethod = PaymentOption['id'];
type ShippingMethodOption = (typeof SHIPPING_METHODS)[number];
type SavedAddress = {
  id: string;
  title: string;
  name: string;
  phone: string;
  address: string;
  note?: string;
};

function paymentConfigToOption(item: PaymentConfig): PaymentOption | null {
  const id = item.code as PaymentOption['id'];
  if (!['COD', 'momo', 'vnpay', 'visa', 'bank_transfer'].includes(id)) return null;

  return {
    id,
    title: item.title,
    subtitle: item.subtitle || item.name,
    tone: item.toneClassName || 'bg-zinc-50 border-zinc-200',
    logoType: item.logoType || 'text',
    logoBg: item.logoBgClassName,
    logoText: item.logoText || item.code,
    logoUri: item.logoUri,
    paymentStatusOnOrder: item.paymentStatusOnOrder || (id === 'COD' || id === 'bank_transfer' ? 'pending' : 'paid'),
  };
}

function PaymentLogo({
  logoType,
  logoBg,
  logoText,
  logoUri,
}: {
  logoType: 'text' | 'image';
  logoBg?: string;
  logoText?: string;
  logoUri?: string;
}) {
  if (logoType === 'image' && logoUri) {
    return (
      <View className="h-11 w-20 items-center justify-center rounded-2xl border border-zinc-100 bg-white px-2">
        <Image source={{ uri: logoUri }} className="h-8 w-full" resizeMode="contain" />
      </View>
    );
  }

  return (
    <View className={`h-11 min-w-[72px] items-center justify-center rounded-2xl px-3 ${logoBg || 'bg-zinc-900'}`}>
      <Text className="text-xs font-black uppercase text-white">{logoText}</Text>
    </View>
  );
}

export default function CheckoutScreen() {
  const user = useAppStore((s) => s.currentUser);
  const vouchers = useAppStore((s) => s.vouchers);
  const onPlaceOrder = useAppStore((s) => s.onPlaceOrder);
  const onUpdateInventory = useAppStore((s) => s.onUpdateInventory);
  const { cartItems, subtotal, clearCart } = useCartStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [shipping, setShipping] = useState<ShippingMethodOption>(SHIPPING_METHODS[0]);
  const [payment, setPayment] = useState<PaymentMethod>('COD');
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>(PAYMENT_OPTIONS);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([
    {
      id: 'addr-home',
      title: 'Nhà riêng',
      name: user?.name || 'Nguyễn Văn Hùng',
      phone: user?.phone || '0912345678',
      address: '25 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
      note: 'Địa chỉ mặc định',
    },
    {
      id: 'addr-office',
      title: 'Văn phòng',
      name: user?.name || 'Nguyễn Văn Hùng',
      phone: user?.phone || '0912345678',
      address: 'Tòa nhà Halo, 88 Láng Hạ, Đống Đa, Hà Nội',
      note: 'Nhận giờ hành chính',
    },
  ]);
  const [selectedAddressId, setSelectedAddressId] = useState('addr-home');

  const cartSubtotal = subtotal();
  const selectedAddress = savedAddresses.find((item) => item.id === selectedAddressId);

  const [addressDraft, setAddressDraft] = useState<SavedAddress>(() => ({
    id: 'addr-home',
      title: 'Nhà riêng',
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
  }));

  useEffect(() => {
    if (selectedAddress) {
      setName(selectedAddress.name);
      setPhone(selectedAddress.phone);
      setAddress(selectedAddress.address);
    }
  }, [selectedAddress]);

  useEffect(() => {
    let alive = true;

    fetchPayments()
      .then((items) => {
        if (!alive) return;
        const options = items
          .map(paymentConfigToOption)
          .filter((item): item is PaymentOption => Boolean(item));

        if (options.length === 0) return;
        setPaymentOptions(options);
        if (!options.some((item) => item.id === payment)) {
          setPayment(options[0].id);
        }
      })
      .catch(() => {
        if (alive) setPaymentOptions(PAYMENT_OPTIONS);
      });

    return () => {
      alive = false;
    };
  }, []);

  const discountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    if (cartSubtotal < appliedVoucher.minOrderValue) return 0;

    if (appliedVoucher.discountType === 'fixed') {
      return Math.min(appliedVoucher.discountValue, appliedVoucher.maxDiscount || appliedVoucher.discountValue);
    }

    const rawDiscount = (cartSubtotal * appliedVoucher.discountValue) / 100;
    return Math.min(rawDiscount, appliedVoucher.maxDiscount || rawDiscount);
  }, [appliedVoucher, cartSubtotal]);

  const total = Math.max(cartSubtotal + shipping.price - discountAmount, 0);
  const selectedPayment = paymentOptions.find((item) => item.id === payment);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/cart');
  };

  const selectAddress = (item: SavedAddress) => {
    setSelectedAddressId(item.id);
    setName(item.name);
    setPhone(item.phone);
    setAddress(item.address);
    setShowAddressSelector(false);
    setEditingAddressId(null);
  };

  const startAddAddress = () => {
    setEditingAddressId('new');
    setAddressDraft({
      id: `addr-${Date.now()}`,
      title: 'Địa chỉ mới',
      name: name || user?.name || '',
      phone: phone || user?.phone || '',
      address: '',
      note: '',
    });
  };

  const startEditAddress = (item: SavedAddress) => {
    setEditingAddressId(item.id);
    setAddressDraft(item);
  };

  const saveAddress = () => {
    if (!addressDraft.name.trim() || !addressDraft.phone.trim() || !addressDraft.address.trim()) return;

    setSavedAddresses((current) => {
      const exists = current.some((item) => item.id === addressDraft.id);
      if (exists) {
        return current.map((item) => (item.id === addressDraft.id ? addressDraft : item));
      }
      return [addressDraft, ...current];
    });

    setSelectedAddressId(addressDraft.id);
    setName(addressDraft.name);
    setPhone(addressDraft.phone);
    setAddress(addressDraft.address);
    setEditingAddressId(null);
  };

  const applyVoucher = (code?: string) => {
    const nextCode = (code ?? voucherCode).trim().toUpperCase();
    setVoucherCode(nextCode);
      setVoucherError('Mã giảm giá không hợp lệ.');

    if (!nextCode) {
      setAppliedVoucher(null);
      return;
    }

    const matchedVoucher = vouchers.find((item) => item.code === nextCode);
    if (!matchedVoucher) {
      setAppliedVoucher(null);
      setVoucherError('Mã giảm giá không hợp lệ.');
      return;
    }

    if (cartSubtotal < matchedVoucher.minOrderValue) {
      setAppliedVoucher(null);
      setVoucherError(`Đơn hàng cần đạt tối thiểu ${matchedVoucher.minOrderValue.toLocaleString('vi-VN')}đ để dùng mã này.`);
      return;
    }

    setAppliedVoucher(matchedVoucher);
  };

  const submit = () => {
    if (!name.trim() || !phone.trim() || !address.trim() || cartItems.length === 0) return;

    const order = {
      id: `EXP-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim() || user?.email,
      customerAddress: address.trim(),
      items: cartItems.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.image,
        quantity: item.quantity,
        price: item.product.flashSalePrice || item.product.discountPrice,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        selectedVersion: item.selectedVersion,
      })),
      shippingFee: shipping.price,
      discountAmount,
      voucherCodeUsed: appliedVoucher?.code,
      totalAmount: total,
      shippingUnit: shipping.name,
      paymentMethod: payment,
      paymentStatus: selectedPayment?.paymentStatusOnOrder || (payment === 'COD' || payment === 'bank_transfer' ? 'pending' : 'paid'),
      orderStatus: 'pending',
      createdAt: new Date().toISOString(),
    } as const;

    cartItems.forEach((item) => onUpdateInventory(item.product.id, item.quantity));
    onPlaceOrder(order);
    clearCart();
    router.replace({
      pathname: '/order-success',
      params: {
        orderId: order.id,
        total: String(total),
        paymentMethod: payment,
      },
    });
  };

  if (cartItems.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 px-4 py-6">
        <Pressable onPress={goBack} className="mb-4 flex-row items-center gap-2 self-start">
          <ArrowLeft size={18} color="#52525b" />
          <Text className="font-bold text-gray-600">Quay lại</Text>
        </Pressable>
        <View className="rounded-[28px] bg-white p-6">
          <Text className="text-xl font-black text-zinc-950">Thanh toán</Text>
          <Text className="mt-3 text-sm leading-6 text-zinc-500">Giỏ hàng của bạn đang trống. Chọn thêm sản phẩm trước khi thanh toán nhé.</Text>
          <Pressable onPress={() => router.replace('/(tabs)/catalog')} className="mt-5 rounded-2xl bg-amber-500 py-3.5">
            <Text className="text-center text-sm font-black text-white">Mua sắm ngay</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="gap-4 p-4 pb-28">
      <View className="rounded-[28px] bg-white p-5">
        <View className="flex-row items-start gap-3">
          <Pressable onPress={goBack} className="h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
            <ArrowLeft size={18} color="#52525b" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-black text-zinc-950">Thanh toán</Text>
            <Text className="mt-1 text-[11px] font-medium text-zinc-500">Kiểm tra thông tin sản phẩm, địa chỉ nhận hàng và phương thức thanh toán</Text>
          </View>
        </View>
      </View>

      <View className="rounded-[28px] bg-white p-4">
        <Pressable onPress={() => setShowAddressSelector((current) => !current)} className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="mb-3 flex-row items-center gap-2">
              <ShoppingSectionIcon icon={UserRound} color="#d97706" />
              <Text className="text-sm font-black uppercase text-zinc-950">Thông tin nhận hàng</Text>
            </View>
            <Text className="text-sm font-black text-zinc-950">{name || selectedAddress?.name || 'Chọn địa chỉ nhận hàng'}</Text>
            <Text className="mt-1 text-xs font-bold text-zinc-500">{phone || selectedAddress?.phone}</Text>
            <Text className="mt-2 text-xs leading-5 text-zinc-600">{address || selectedAddress?.address || 'Thêm địa chỉ để tiếp tục thanh toán'}</Text>
            {selectedAddress?.note ? <Text className="mt-2 text-[11px] font-semibold text-amber-700">{selectedAddress.note}</Text> : null}
          </View>
          {showAddressSelector ? <ChevronUp size={18} color="#71717a" /> : <ChevronDown size={18} color="#71717a" />}
        </Pressable>

        {showAddressSelector ? (
          <View className="mt-4 gap-3 border-t border-zinc-100 pt-4">
            {savedAddresses.map((item) => (
              <View key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <View className="flex-row items-start justify-between gap-3">
                  <Pressable onPress={() => selectAddress(item)} className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-black text-zinc-900">{item.title}</Text>
                      {selectedAddressId === item.id ? (
                        <View className="rounded-full bg-amber-500 px-2 py-1">
                          <Text className="text-[10px] font-black text-white">Đang dùng</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-2 text-xs font-bold text-zinc-700">{item.name} • {item.phone}</Text>
                    <Text className="mt-1 text-xs leading-5 text-zinc-500">{item.address}</Text>
                    {item.note ? <Text className="mt-1 text-[11px] text-zinc-400">{item.note}</Text> : null}
                  </Pressable>
                  <Pressable onPress={() => startEditAddress(item)} className="rounded-full bg-white p-2">
                    <Pencil size={14} color="#71717a" />
                  </Pressable>
                </View>
              </View>
            ))}

            <Pressable onPress={startAddAddress} className="flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 py-3">
              <Plus size={16} color="#d97706" />
              <Text className="text-sm font-black text-amber-700">Thêm địa chỉ mới</Text>
            </Pressable>

            {editingAddressId ? (
              <View className="gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
                <Text className="text-xs font-black uppercase text-zinc-500">{editingAddressId === 'new' ? 'Thêm địa chỉ mới' : 'Chỉnh sửa địa chỉ'}</Text>
                <Field label="Tên gợi nhớ">
                  <TextInput value={addressDraft.title} onChangeText={(value) => setAddressDraft((current) => ({ ...current, title: value }))} placeholder="Nha rieng / Van phong" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
                </Field>
                <Field label="Họ và tên">
                  <TextInput value={addressDraft.name} onChangeText={(value) => setAddressDraft((current) => ({ ...current, name: value }))} placeholder="Nhập tên người nhận" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
                </Field>
                <Field label="Số điện thoại">
                  <TextInput value={addressDraft.phone} onChangeText={(value) => setAddressDraft((current) => ({ ...current, phone: value }))} placeholder="Nhập số điện thoại" keyboardType="phone-pad" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
                </Field>
                <Field label="Địa chỉ">
                  <TextInput value={addressDraft.address} onChangeText={(value) => setAddressDraft((current) => ({ ...current, address: value }))} placeholder="Số nhà, đường, phường xã..." multiline className="min-h-24 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
                </Field>
                <Field label="Ghi chú">
                  <TextInput value={addressDraft.note || ''} onChangeText={(value) => setAddressDraft((current) => ({ ...current, note: value }))} placeholder="Ví dụ: gọi trước khi giao" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
                </Field>
                <View className="flex-row gap-3">
                  <Pressable onPress={() => setEditingAddressId(null)} className="flex-1 rounded-2xl bg-zinc-100 py-3">
                    <Text className="text-center text-sm font-black text-zinc-700">Hủy</Text>
                  </Pressable>
                  <Pressable onPress={saveAddress} className="flex-1 rounded-2xl bg-amber-500 py-3">
                    <Text className="text-center text-sm font-black text-white">Lưu địa chỉ</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="mt-4 gap-3 border-t border-zinc-100 pt-4">
          <Field label="Email">
            <TextInput value={email} onChangeText={setEmail} placeholder="Nhập email nhận thông báo" keyboardType="email-address" autoCapitalize="none" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
          </Field>
                <Field label="Địa chỉ">
            <TextInput value={notes} onChangeText={setNotes} placeholder="Ví dụ: đóng hàng kỹ, giao sau 18h, gọi trước khi giao..." multiline className="min-h-20 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
          </Field>
        </View>
      </View>

      <View className="rounded-[28px] bg-white p-4">
        <View className="mb-3 flex-row items-center gap-2">
          <ShoppingSectionIcon icon={ShoppingBag} color="#18181b" />
          <Text className="text-sm font-black uppercase text-zinc-950">Sản phẩm trong đơn</Text>
        </View>
        <View className="gap-3">
          {cartItems.map((item) => (
            <View key={item.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
              <View className="flex-row gap-3">
                <Image source={{ uri: item.product.image }} className="h-20 w-20 rounded-2xl" resizeMode="cover" />
                <View className="flex-1">
                  <Text numberOfLines={2} className="text-sm font-black leading-5 text-zinc-900">{item.product.name}</Text>
                  <Text className="mt-1 text-[11px] font-medium text-zinc-500">{item.product.brand}</Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {item.selectedColor ? <Badge label={`Màu: ${item.selectedColor}`} /> : null}
                    {item.selectedSize ? <Badge label={`Size: ${item.selectedSize}`} /> : null}
                    {item.selectedVersion ? <Badge label={`Phiên bản: ${item.selectedVersion}`} /> : null}
                  </View>
                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-xs font-bold text-zinc-500">Số lượng: {item.quantity}</Text>
                    <Text className="text-sm font-black text-red-500">{((item.product.flashSalePrice || item.product.discountPrice) * item.quantity).toLocaleString('vi-VN')}d</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="rounded-[28px] bg-white p-4">
        <View className="mb-3 flex-row items-center gap-2">
          <ShoppingSectionIcon icon={Truck} color="#d97706" />
          <Text className="text-sm font-black uppercase text-zinc-950">Vận chuyển</Text>
        </View>
        <View className="gap-3">
          {SHIPPING_METHODS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setShipping(item)}
              className={`rounded-2xl border p-3 ${shipping.id === item.id ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-zinc-50'}`}
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-black text-zinc-900">{item.name}</Text>
                  <Text className="mt-1 text-[11px] text-zinc-500">{item.eta}</Text>
                  <Text className="mt-1 text-[11px] text-zinc-400">{item.subtitle}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-black text-zinc-950">{item.price === 0 ? 'Miễn phí' : `${item.price.toLocaleString('vi-VN')}đ`}</Text>
                  {shipping.id === item.id ? <Check size={16} color="#d97706" /> : null}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="rounded-[28px] bg-white p-4">
        <View className="mb-3 flex-row items-center gap-2">
          <ShoppingSectionIcon icon={TicketPercent} color="#d97706" />
          <Text className="text-sm font-black uppercase text-zinc-950">Mã giảm giá</Text>
        </View>

        <View className="flex-row gap-2">
          <TextInput
            value={voucherCode}
            onChangeText={(value) => {
              setVoucherCode(value.toUpperCase());
      setVoucherError('Mã giảm giá không hợp lệ.');
            }}
            placeholder="Nhập mã giảm giá"
            autoCapitalize="characters"
            className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900"
          />
          <Pressable onPress={() => applyVoucher()} className="rounded-2xl bg-amber-500 px-4 py-3">
            <Text className="text-sm font-black text-white">Áp dụng</Text>
          </Pressable>
        </View>

        {voucherError ? <Text className="mt-2 text-xs font-bold text-rose-500">{voucherError}</Text> : null}

        {appliedVoucher ? (
          <View className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <Text className="text-xs font-black uppercase text-emerald-700">{appliedVoucher.code}</Text>
            <Text className="mt-1 text-[11px] leading-4 text-emerald-700">Đã áp dụng mã giảm giá cho đơn hàng này.</Text>
          </View>
        ) : null}

        <View className="mt-4 gap-3">
          {vouchers.map((voucher) => (
            <Pressable
              key={voucher.code}
              onPress={() => applyVoucher(voucher.code)}
              className={`rounded-2xl border border-dashed p-3 ${appliedVoucher?.code === voucher.code ? 'border-amber-400 bg-amber-50' : 'border-zinc-200 bg-zinc-50'}`}
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-black uppercase text-amber-700">{voucher.code}</Text>
                  <Text className="mt-1 text-[11px] leading-4 text-zinc-600">
                    {voucher.discountType === 'fixed'
                      ? `Giảm ${voucher.discountValue.toLocaleString('vi-VN')}đ cho đơn từ ${voucher.minOrderValue.toLocaleString('vi-VN')}đ`
                      : `Giảm ${voucher.discountValue}% tối đa ${(voucher.maxDiscount || 0).toLocaleString('vi-VN')}đ`}
                  </Text>
                </View>
                <View className="rounded-full bg-white px-2.5 py-1.5">
                  <Text className="text-[10px] font-black text-zinc-700">{appliedVoucher?.code === voucher.code ? 'Đã chọn' : 'Chọn'}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="rounded-[28px] bg-white p-4">
        <View className="mb-3 flex-row items-center gap-2">
          <ShoppingSectionIcon icon={CreditCard} color="#18181b" />
          <Text className="text-sm font-black uppercase text-zinc-950">Phương thức thanh toán</Text>
        </View>
        <View className="gap-3">
          {paymentOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setPayment(option.id)}
              className={`rounded-2xl border p-3 ${payment === option.id ? option.tone : 'border-zinc-200 bg-zinc-50'}`}
            >
              <View className="flex-row items-center gap-3">
                <PaymentLogo
                  logoType={option.logoType}
                  logoBg={option.logoBg}
                  logoText={option.logoText}
                  logoUri={option.logoUri}
                />
                <View className="flex-1">
                  <Text className="text-sm font-black text-zinc-900">{option.title}</Text>
                  <Text className="mt-1 text-[11px] text-zinc-500">{option.subtitle}</Text>
                </View>
                <View className={`h-5 w-5 rounded-full border ${payment === option.id ? 'border-amber-500 bg-amber-500' : 'border-zinc-300 bg-white'} items-center justify-center`}>
                  {payment === option.id ? <Check size={12} color="#fff" /> : null}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="rounded-[28px] bg-white p-4">
        <View className="mb-3 flex-row items-center gap-2">
          <ShoppingSectionIcon icon={MapPin} color="#d97706" />
          <Text className="text-sm font-black uppercase text-zinc-950">Tổng thanh toán</Text>
        </View>
        <View className="gap-2">
          <SummaryRow label="Tiền hàng" value={`${cartSubtotal.toLocaleString('vi-VN')}đ`} />
          <SummaryRow label="Phí vận chuyển" value={`${shipping.price.toLocaleString('vi-VN')}đ`} />
          <SummaryRow label="Giảm giá" value={`-${discountAmount.toLocaleString('vi-VN')}đ`} valueClassName="text-emerald-600" />
          <View className="my-2 h-px bg-zinc-100" />
          <SummaryRow label="Tổng cộng" value={`${total.toLocaleString('vi-VN')}đ`} labelClassName="text-sm font-black text-zinc-950" valueClassName="text-lg font-black text-red-500" />
        </View>

        <Pressable
          onPress={submit}
          className="mt-5 rounded-2xl bg-amber-500 py-3.5"
        >
          <Text className="text-center text-sm font-black text-white">Đặt hàng</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ShoppingSectionIcon({ icon: Icon, color }: { icon: typeof UserRound; color: string }) {
  return (
    <View className="h-9 w-9 items-center justify-center rounded-full bg-amber-50">
      <Icon size={17} color={color} />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-bold uppercase text-zinc-500">{label}</Text>
      {children}
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-white px-2.5 py-1">
      <Text className="text-[10px] font-bold text-zinc-600">{label}</Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  labelClassName = 'text-xs text-zinc-500',
  valueClassName = 'text-sm font-bold text-zinc-900',
}: {
  label: string;
  value: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={labelClassName}>{label}</Text>
      <Text className={valueClassName}>{value}</Text>
    </View>
  );
}
