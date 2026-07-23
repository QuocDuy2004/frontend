import { router } from 'expo-router';
import { ArrowLeft, Check, ChevronDown, ChevronUp, CreditCard, MapPin, Pencil, Plus, ShoppingBag, TicketPercent, Truck, UserRound } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import * as ExpoLinking from 'expo-linking';
import { Linking, Platform } from 'react-native';
import { Image, Pressable, ScrollView, Text, TextInput, View } from '../components/tw';
import { confirmVNPayTryItNowPayment, createBankTransferPayment, createMoMoPayment, createOrder, createVisaPayment, createVNPayTokenPayment, fetchBankTransferStatus, fetchPayments, syncBankTransferTransactions } from '../lib/api';
import { formatCurrency, getProductSalePrice } from '../lib/pricing';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useCatalogStore } from '../store/catalogStore';
import { useOrderStore } from '../store/orderStore';
import { useVoucherStore } from '../store/voucherStore';
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
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'COD', title: 'Thanh toán khi nhận hàng', subtitle: 'Kiểm tra đơn rồi mới thanh toán', tone: 'bg-amber-50 border-amber-200', logoType: 'text', logoBg: 'bg-amber-500', logoText: 'COD' },
  { id: 'momo', title: 'Ví MoMo', subtitle: 'Thanh toán nhanh bằng ví điện tử', tone: 'bg-fuchsia-50 border-fuchsia-200', logoType: 'image', logoUri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MoMo_Logo_App.svg/960px-MoMo_Logo_App.svg.png' },
  { id: 'vnpay', title: 'VNPay', subtitle: 'Quét mã hoặc thanh toán online', tone: 'bg-sky-50 border-sky-200', logoType: 'image', logoUri: 'https://images.seeklogo.com/logo-png/42/1/vnpay-logo-png_seeklogo-428006.png' },
  { id: 'visa', title: 'Visa / Thẻ quốc tế', subtitle: 'Thẻ tín dụng và thẻ ghi nợ', tone: 'bg-indigo-50 border-indigo-200', logoType: 'image', logoUri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Visa_Brandmark_2021.svg/960px-Visa_Brandmark_2021.svg.png' },
  { id: 'bank_transfer', title: 'Chuyển khoản ngân hàng', subtitle: 'Lưu đơn hàng và chờ xác nhận chuyển khoản', tone: 'bg-emerald-50 border-emerald-200', logoType: 'text', logoBg: 'bg-emerald-600', logoText: 'BANK' },
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

function getPaymentReturnUrl() {
  if (Platform.OS === 'web') {
    const origin = (globalThis as any)?.location?.origin;
    if (origin) return `${origin}/order-success`;
  }

  return ExpoLinking.createURL('/order-success');
}

function paymentConfigToOption(item: PaymentConfig): PaymentOption | null {
  const config = item.config || {};
  const id = typeof config.bankType === 'string' ? 'bank_transfer' : item.code as PaymentOption['id'];
  if (item.status !== 'active') return null;
  if (!['COD', 'momo', 'vnpay', 'visa', 'bank_transfer'].includes(id)) return null;
  const fallback = PAYMENT_OPTIONS.find((option) => option.id === id);

  return {
    id,
    title: item.title || fallback?.title || item.name,
    subtitle: fallback?.subtitle || item.name,
    tone: item.toneClassName || fallback?.tone || 'bg-zinc-50 border-zinc-200',
    logoType: item.logoType || 'text',
    logoBg: item.logoBgClassName || fallback?.logoBg,
    logoText: item.logoText || fallback?.logoText || item.code,
    logoUri: item.logoUri,
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
  const user = useAuthStore((s) => s.currentUser);
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const vouchers = useVoucherStore((s) => s.vouchers);
  const authToken = useAuthStore((s) => s.authToken);
  const onPlaceOrder = useOrderStore((s) => s.onPlaceOrder);
  const onUpdateInventory = useCatalogStore((s) => s.onUpdateInventory);
  const catalogProductsCount = useCatalogStore((s) => s.products.length);
  const hydrateCatalog = useCatalogStore((s) => s.hydrateCatalog);
  const { cartItems, subtotal, clearCart, hydrateUserCart } = useCartStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [shipping, setShipping] = useState<ShippingMethodOption>(SHIPPING_METHODS[0]);
  const [payment, setPayment] = useState<PaymentMethod>('COD');
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>(PAYMENT_OPTIONS);
  const [visaCardholder, setVisaCardholder] = useState('');
  const [visaCardNumber, setVisaCardNumber] = useState('');
  const [visaExpiry, setVisaExpiry] = useState('');
  const [visaCvv, setVisaCvv] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingCart, setIsCheckingCart] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [paymentWebUrl, setPaymentWebUrl] = useState('');
  const [paymentOrderMeta, setPaymentOrderMeta] = useState<{ orderId: string; total: number; method: PaymentMethod } | null>(null);
  const [bankTransfer, setBankTransfer] = useState<{
    orderId: string;
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
    transferContent: string;
    qrUrl: string;
  } | null>(null);
  const [bankTransferIssue, setBankTransferIssue] = useState<{
    orderId: string;
    amount: number;
    message: string;
  } | null>(null);
  const [isCheckingBankTransfer, setIsCheckingBankTransfer] = useState(false);
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

    const checkCart = async () => {
      if (!authHydrated) return;
      if (!user) {
        setIsCheckingCart(false);
        return;
      }

      setIsCheckingCart(true);
      try {
        if (catalogProductsCount === 0) {
          await hydrateCatalog();
        }
        await hydrateUserCart();
      } finally {
        if (alive) setIsCheckingCart(false);
      }
    };

    checkCart();

    return () => {
      alive = false;
    };
  }, [authHydrated, user?.id, user?.email, catalogProductsCount, hydrateCatalog, hydrateUserCart]);

  useEffect(() => {
    let alive = true;

    fetchPayments()
      .then((items) => {
        if (!alive) return;
        const options = items
          .map(paymentConfigToOption)
          .filter((item): item is PaymentOption => Boolean(item))
          .filter((item, index, list) => list.findIndex((option) => option.id === item.id) === index);

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

  useEffect(() => {
    if (!bankTransfer) return;

    let alive = true;
    const checkStatus = async () => {
      try {
        const status = await fetchBankTransferStatus(bankTransfer.orderId, authToken || undefined);
        if (!alive || !status.paid) return;

        clearCart();
        setBankTransfer(null);
        router.replace({
          pathname: '/order-success',
          params: {
            orderId: bankTransfer.orderId,
            total: String(bankTransfer.amount),
            paymentMethod: 'bank_transfer',
            status: 'success',
            message: 'Da xac nhan chuyen khoan ngan hang.',
          },
        });
      } catch {
        // Keep the QR visible; the user can retry or wait for the next poll.
      }
    };

    const timer = setInterval(checkStatus, 5000);
    checkStatus();

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [authToken, bankTransfer, clearCart]);

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

  const formatVisaCardNumber = (value: string) => (
    value
      .replace(/\D/g, '')
      .slice(0, 19)
      .replace(/(.{4})/g, '$1 ')
      .trim()
  );

  const formatVisaExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const validateVisaCard = () => {
    const cardDigits = visaCardNumber.replace(/\D/g, '');
    const expiryMatch = visaExpiry.match(/^(\d{2})\/(\d{2})$/);
    const cvvDigits = visaCvv.replace(/\D/g, '');

    if (!visaCardholder.trim()) return 'Vui lòng nhập tên chủ thẻ Visa.';
    if (cardDigits.length < 13 || cardDigits.length > 19) return 'Số thẻ Visa không hợp lệ.';
    if (!expiryMatch) return 'Ngày hết hạn thẻ phải có dạng MM/YY.';
    const month = Number(expiryMatch[1]);
    const year = 2000 + Number(expiryMatch[2]);
    const expiryDate = new Date(year, month, 0, 23, 59, 59);
    if (month < 1 || month > 12 || expiryDate < new Date()) return 'Thẻ Visa đã hết hạn hoặc ngày hết hạn không hợp lệ.';
    if (cvvDigits.length < 3 || cvvDigits.length > 4) return 'CVV phải gồm 3-4 chữ số.';
    return '';
  };

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
    setVoucherError('');

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

  const completeOnlinePayment = (params: {
    orderId: string;
    total: string;
    paymentMethod: PaymentMethod;
    status: string;
    message?: string;
  }) => {
    setPaymentWebUrl('');
    setPaymentOrderMeta(null);
    router.replace({
      pathname: '/order-success',
      params,
    });
  };

  const handlePaymentNavigation = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      const isTryItNowReturn = parsedUrl.hostname === 'sandbox.vnpayment.vn'
        && parsedUrl.pathname.includes('/tryitnow/Home/VnPayReturn');

      if (isTryItNowReturn) {
        const params = Object.fromEntries(parsedUrl.searchParams.entries());
        const fallbackOrderId = paymentOrderMeta?.orderId || '';
        const fallbackTotal = String(paymentOrderMeta?.total || total);

        confirmVNPayTryItNowPayment(params, authToken || undefined)
          .then((result) => {
            completeOnlinePayment({
              orderId: result.orderId || fallbackOrderId,
              total: String(result.total || fallbackTotal),
              paymentMethod: 'vnpay',
              status: result.status,
              message: result.message,
            });
          })
          .catch((error) => {
            completeOnlinePayment({
              orderId: fallbackOrderId,
              total: fallbackTotal,
              paymentMethod: 'vnpay',
              status: 'failed',
              message: error instanceof Error ? error.message : 'Không thể xác nhận thanh toán VNPay.',
            });
          });

        return false;
      }

      if (!url.includes('/order-success')) return true;

      completeOnlinePayment({
        orderId: parsedUrl.searchParams.get('orderId') || paymentOrderMeta?.orderId || '',
        total: parsedUrl.searchParams.get('total') || String(paymentOrderMeta?.total || total),
        paymentMethod: paymentOrderMeta?.method || payment,
        status: parsedUrl.searchParams.get('status') || 'success',
        message: parsedUrl.searchParams.get('message') || '',
      });
    } catch {
      setPaymentWebUrl('');
      setPaymentOrderMeta(null);
    }

    return false;
  };

  const confirmVisibleVnpaySuccess = async () => {
    const orderId = paymentOrderMeta?.orderId;
    if (!orderId) return;

    try {
      const result = await confirmVNPayTryItNowPayment({
        vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_Amount: String(Math.round((paymentOrderMeta.total || total) * 100)),
      }, authToken || undefined);

      completeOnlinePayment({
        orderId: result.orderId || orderId,
        total: String(result.total || paymentOrderMeta.total || total),
        paymentMethod: 'vnpay',
        status: result.status,
        message: result.message,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Không thể xác nhận thanh toán VNPay.');
    }
  };

  const checkBankTransferNow = async () => {
    if (!bankTransfer || isCheckingBankTransfer) return;
    setIsCheckingBankTransfer(true);
    setSubmitError('');

    try {
      await syncBankTransferTransactions(authToken || undefined).catch(() => undefined);
      const status = await fetchBankTransferStatus(bankTransfer.orderId, authToken || undefined);
      if (status.paid) {
        clearCart();
        setBankTransfer(null);
        router.replace({
          pathname: '/order-success',
          params: {
            orderId: bankTransfer.orderId,
            total: String(bankTransfer.amount),
            paymentMethod: 'bank_transfer',
            status: 'success',
            message: 'Da xac nhan chuyen khoan ngan hang.',
          },
        });
        return;
      }

      setSubmitError('Chua tim thay giao dich phu hop. Vui long dam bao dung so tien va noi dung chuyen khoan.');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Khong the kiem tra giao dich chuyen khoan.');
    } finally {
      setIsCheckingBankTransfer(false);
    }
  };

  const submit = async () => {
    if (isSubmitting || !user || !name.trim() || !phone.trim() || !address.trim() || cartItems.length === 0) return;
    const quantityByProduct = cartItems.reduce<Record<string, { name: string; quantity: number; stock: number }>>((acc, item) => {
      const productId = item.product.id;
      const current = acc[productId] || {
        name: item.product.name,
        quantity: 0,
        stock: Math.max(0, Number(item.product.stock || 0)),
      };
      current.quantity += item.quantity;
      acc[productId] = current;
      return acc;
    }, {});
    const overStockItem = Object.values(quantityByProduct).find((item) => item.quantity > item.stock);
    if (overStockItem) {
      setSubmitError(`Sản phẩm "${overStockItem.name}" chỉ còn ${overStockItem.stock} trong kho. Vui lòng giảm số lượng trước khi thanh toán.`);
      return;
    }

    if (payment === 'visa') {
      const visaError = validateVisaCard();
      if (visaError) {
        setSubmitError(visaError);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError('');

    const order = {
      id: `EXP-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: user?.id,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim() || user?.email,
      customerAddress: address.trim(),
      items: cartItems.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.image,
        quantity: item.quantity,
        price: getProductSalePrice(item.product),
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
      paymentStatus: 'pending',
      orderStatus: 'pending',
      note: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    } as const;

    try {
      const savedOrder = await createOrder(order, authToken || undefined);
      const orderId = savedOrder.id || order.id;

      if (payment === 'vnpay') {
        const vnpayData = await createVNPayTokenPayment(
          orderId,
          String(user.id || user.email || orderId),
          total,
          authToken || undefined,
          getPaymentReturnUrl(),
        );
        if (vnpayData.paymentUrl) {
          setPaymentOrderMeta({ orderId, total, method: 'vnpay' });
          if (Platform.OS === 'web') {
            (globalThis as any).location.assign(vnpayData.paymentUrl);
          } else {
            await Linking.openURL(vnpayData.paymentUrl);
          }
          return;
        }
        throw new Error('Không thể tạo liên kết thanh toán VNPay.');
      }

      if (payment === 'momo') {
        const momoData = await createMoMoPayment(orderId, total, `Thanh toan don hang ${orderId}`, undefined, authToken || undefined);
        if (momoData.payUrl) {
          cartItems.forEach((item) => onUpdateInventory(item.product.id, item.quantity));
          onPlaceOrder({ ...order, ...savedOrder, id: orderId });
          clearCart();
          setPaymentOrderMeta({ orderId, total, method: 'momo' });
          if (Platform.OS === 'web') {
            setPaymentWebUrl(momoData.payUrl);
          } else {
            await Linking.openURL(momoData.payUrl);
          }
          return;
        }
        throw new Error('Không thể tạo liên kết thanh toán MoMo.');
      }

      if (payment === 'visa') {
        const visaData = await createVisaPayment(
          orderId,
          total,
          `Thanh toan the quoc te don hang ${orderId}`,
          authToken || undefined,
          getPaymentReturnUrl(),
        );
        if (visaData.paymentUrl) {
          setPaymentOrderMeta({ orderId, total, method: 'visa' });
          if (Platform.OS === 'web') {
            (globalThis as any).location.assign(visaData.paymentUrl);
          } else {
            await Linking.openURL(visaData.paymentUrl);
          }
          return;
        }
        throw new Error('Khong the tao lien ket thanh toan Visa / Mastercard.');
      }

      if (payment === 'bank_transfer') {
        setPaymentOrderMeta({ orderId, total, method: 'bank_transfer' });
        try {
          const bankData = await createBankTransferPayment(
            orderId,
            total,
            name.trim() || user.name || 'Khach hang',
            authToken || undefined,
          );
          setBankTransferIssue(null);
          setBankTransfer(bankData);
        } catch (error) {
          const message = error instanceof Error
            ? error.message
            : 'Chưa thể tạo mã QR chuyển khoản ngân hàng.';
          setBankTransfer(null);
          setBankTransferIssue({ orderId, amount: total, message });
        }
        return;
      }

      cartItems.forEach((item) => onUpdateInventory(item.product.id, item.quantity));
      onPlaceOrder({ ...order, ...savedOrder, id: orderId });
      clearCart();
      router.replace({
        pathname: '/order-success',
        params: {
          orderId,
          total: String(savedOrder.totalAmount || total),
          paymentMethod: savedOrder.paymentMethod || payment,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu đơn hàng vào hệ thống.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authHydrated || (isCheckingCart && cartItems.length === 0)) {
    return (
      <View className="flex-1 bg-gray-50 px-4 py-6">
        <View className="rounded-[28px] bg-white p-6">
          <Text className="text-xl font-black text-zinc-950">Đang kiểm tra giỏ hàng</Text>
          <Text className="mt-3 text-sm leading-6 text-zinc-500">VeloCart đang tải lại sản phẩm trong giỏ trước khi thanh toán.</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-gray-50 px-4 py-6">
        <Pressable onPress={goBack} className="mb-4 flex-row items-center gap-2 self-start">
          <ArrowLeft size={18} color="#52525b" />
          <Text className="font-bold text-gray-600">Quay lại</Text>
        </Pressable>
        <View className="rounded-[28px] bg-white p-6">
          <Text className="text-xl font-black text-zinc-950">Đăng nhập để thanh toán</Text>
          <Text className="mt-3 text-sm leading-6 text-zinc-500">Bạn cần đăng nhập tài khoản trước khi tạo đơn hàng.</Text>
          <Pressable onPress={() => router.replace('/auth?redirect=%2Fcheckout')} className="mt-5 rounded-2xl bg-amber-500 py-3.5">
            <Text className="text-center text-sm font-black text-white">Đăng nhập ngay</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
    <View className="flex-1 bg-gray-50">
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
                  <TextInput value={addressDraft.title} onChangeText={(value) => setAddressDraft((current) => ({ ...current, title: value }))} placeholder="Nhà riêng / Văn phòng" placeholderTextColor="#a1a1aa" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
                </Field>
                <Field label="Họ và tên">
                  <TextInput value={addressDraft.name} onChangeText={(value) => setAddressDraft((current) => ({ ...current, name: value }))} placeholder="Nhập tên người nhận" placeholderTextColor="#a1a1aa" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
                </Field>
                <Field label="Số điện thoại">
                  <TextInput value={addressDraft.phone} onChangeText={(value) => setAddressDraft((current) => ({ ...current, phone: value }))} placeholder="Nhập số điện thoại" placeholderTextColor="#a1a1aa" keyboardType="phone-pad" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
                </Field>
                <Field label="Địa chỉ">
                  <TextInput value={addressDraft.address} onChangeText={(value) => setAddressDraft((current) => ({ ...current, address: value }))} placeholder="Số nhà, đường, phường xã..." placeholderTextColor="#a1a1aa" multiline className="min-h-24 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
                </Field>
                <Field label="Ghi chú">
                  <TextInput value={addressDraft.note || ''} onChangeText={(value) => setAddressDraft((current) => ({ ...current, note: value }))} placeholder="Ví dụ: gọi trước khi giao" placeholderTextColor="#a1a1aa" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
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
            <TextInput value={email} onChangeText={setEmail} placeholder="Nhập email nhận thông báo" placeholderTextColor="#a1a1aa" keyboardType="email-address" autoCapitalize="none" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
          </Field>
                <Field label="Địa chỉ">
            <TextInput value={notes} onChangeText={setNotes} placeholder="Ví dụ: đóng hàng kỹ, giao sau 18h, gọi trước khi giao..." placeholderTextColor="#a1a1aa" multiline className="min-h-20 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900" />
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
                    <Text className="text-sm font-black text-red-500">{formatCurrency(getProductSalePrice(item.product) * item.quantity)}</Text>
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
              setVoucherError('');
            }}
            placeholder="Nhập mã giảm giá"
            placeholderTextColor="#a1a1aa"
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
          {payment === 'visa' ? (
            <View className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
              <View className="mb-3 flex-row items-center gap-2">
                <CreditCard size={16} color="#4f46e5" />
                <Text className="text-xs font-black uppercase text-indigo-700">Thông tin thẻ Visa</Text>
              </View>

              <View className="gap-3">
                <View>
                  <Text className="mb-1.5 text-[11px] font-black uppercase text-zinc-500">Tên chủ thẻ</Text>
                  <TextInput
                    value={visaCardholder}
                    onChangeText={setVisaCardholder}
                    placeholder="NGUYEN VAN A"
                    placeholderTextColor="#a1a1aa"
                    autoCapitalize="characters"
                    className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-bold text-zinc-900"
                  />
                </View>

                <View>
                  <Text className="mb-1.5 text-[11px] font-black uppercase text-zinc-500">Số thẻ</Text>
                  <TextInput
                    value={visaCardNumber}
                    onChangeText={(value) => setVisaCardNumber(formatVisaCardNumber(value))}
                    placeholder="4242 4242 4242 4242"
                    placeholderTextColor="#a1a1aa"
                    keyboardType="number-pad"
                    maxLength={23}
                    className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-bold text-zinc-900"
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="mb-1.5 text-[11px] font-black uppercase text-zinc-500">Hết hạn</Text>
                    <TextInput
                      value={visaExpiry}
                      onChangeText={(value) => setVisaExpiry(formatVisaExpiry(value))}
                      placeholder="MM/YY"
                      placeholderTextColor="#a1a1aa"
                      keyboardType="number-pad"
                      maxLength={5}
                      className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-bold text-zinc-900"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1.5 text-[11px] font-black uppercase text-zinc-500">CVV</Text>
                    <TextInput
                      value={visaCvv}
                      onChangeText={(value) => setVisaCvv(value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      placeholderTextColor="#a1a1aa"
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                      className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-bold text-zinc-900"
                    />
                  </View>
                </View>
              </View>

              <Text className="mt-3 text-[11px] leading-4 text-indigo-700">
                Thông tin thẻ chỉ dùng để kiểm tra trước khi chuyển sang cổng thanh toán, không lưu CVV vào đơn hàng.
              </Text>
            </View>
          ) : null}
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

        {submitError ? (
          <View className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3">
            <Text className="text-xs font-bold leading-5 text-rose-600">{submitError}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={isSubmitting}
          className={`mt-5 rounded-2xl py-3.5 ${isSubmitting ? 'bg-zinc-300' : 'bg-amber-500'}`}
        >
          <Text className="text-center text-sm font-black text-white">Đặt hàng</Text>
        </Pressable>
      </View>
    </ScrollView>

    {paymentWebUrl && Platform.OS === 'web' ? (
      <View className="absolute inset-0 z-50 bg-white">
        <View className="flex-row items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
          <View className="flex-1">
            <Text className="text-sm font-black text-zinc-950">Thanh toán trực tuyến</Text>
            <Text className="mt-0.5 text-[11px] font-medium text-zinc-500">Hoàn tất thanh toán ngay trong VeloCart</Text>
          </View>
          <Pressable
            onPress={() => {
              setPaymentWebUrl('');
              setPaymentOrderMeta(null);
            }}
            className="rounded-full bg-zinc-100 px-3 py-2"
          >
            <Text className="text-xs font-black text-zinc-700">Đóng</Text>
          </Pressable>
        </View>
        {Platform.OS === 'web' ? (
          <View className="flex-1 bg-white">
            {React.createElement('iframe', {
              src: paymentWebUrl,
              title: 'VNPay',
              style: { border: 0, flex: 1, width: '100%', height: '100%' },
            })}
            <View className="border-t border-zinc-200 bg-white p-3">
              <Text className="mb-2 text-center text-xs font-semibold text-zinc-500">
                Sau khi VNPay hiển thị giao dịch thành công, bấm nút dưới để hoàn tất đơn hàng.
              </Text>
              <Pressable onPress={confirmVisibleVnpaySuccess} className="rounded-2xl bg-emerald-500 py-3">
                <Text className="text-center text-sm font-black text-white">Hoàn tất thanh toán</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    ) : null}

    {(bankTransfer || bankTransferIssue) ? (
      <View className="absolute inset-0 z-50 bg-emerald-950/80 px-4 py-6">
        <View className="flex-1 justify-center">
          <View className="overflow-hidden rounded-[28px] bg-white p-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-black text-zinc-950">Chuyển khoản ngân hàng</Text>
                <Text className="mt-1 text-xs leading-5 text-zinc-500">
                  {bankTransfer
                    ? 'Quét QR và giữ nguyên nội dung chuyển khoản để đơn hàng được xác nhận tự động.'
                    : 'Đơn hàng đã được ghi nhận, nhưng chưa thể hiển thị QR vì thiếu cấu hình ngân hàng.'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setBankTransfer(null);
                  setBankTransferIssue(null);
                }}
                className="rounded-full bg-zinc-100 px-3 py-2"
              >
                <Text className="text-xs font-black text-zinc-700">Đóng</Text>
              </Pressable>
            </View>

            {bankTransfer ? (
              <>
                <View className="mt-5 items-center">
                  <View className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50 p-3">
                    <Image source={{ uri: bankTransfer.qrUrl }} className="h-64 w-64 rounded-2xl bg-white" resizeMode="contain" />
                    <View className="absolute left-3 right-3 top-3 h-1 rounded-full bg-emerald-400/80 shadow-lg shadow-emerald-500" style={Platform.OS === 'web' ? { animation: 'bankQrScan 1.8s ease-in-out infinite alternate' } as any : undefined} />
                  </View>
                  {Platform.OS === 'web' ? (
                    React.createElement('style', {
                      dangerouslySetInnerHTML: {
                        __html: '@keyframes bankQrScan{0%{transform:translateY(8px)}100%{transform:translateY(248px)}}',
                      },
                    })
                  ) : null}
                </View>

                <View className="mt-5 gap-2 rounded-3xl bg-zinc-50 p-4">
                  <SummaryRow label="Ngân hàng" value={bankTransfer.bankName} />
                  <SummaryRow label="Số tài khoản" value={bankTransfer.accountNumber} />
                  <SummaryRow label="Chủ tài khoản" value={bankTransfer.accountName} />
                  <SummaryRow label="Số tiền" value={formatCurrency(bankTransfer.amount)} valueClassName="text-sm font-black text-red-500" />
                  <View className="my-2 h-px bg-zinc-200" />
                  <Text className="text-xs font-bold uppercase text-zinc-500">Nội dung chuyển khoản</Text>
                  <Text selectable className="rounded-2xl bg-white px-3 py-3 text-center text-sm font-black text-emerald-700">{bankTransfer.transferContent}</Text>
                </View>

                {submitError ? (
                  <View className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3">
                    <Text className="text-xs font-bold leading-5 text-rose-600">{submitError}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={checkBankTransferNow}
                  disabled={isCheckingBankTransfer}
                  className={`mt-4 rounded-2xl py-3.5 ${isCheckingBankTransfer ? 'bg-zinc-300' : 'bg-emerald-500'}`}
                >
                  <Text className="text-center text-sm font-black text-white">{isCheckingBankTransfer ? 'Đang kiểm tra...' : 'Tôi đã chuyển khoản'}</Text>
                </Pressable>
              </>
            ) : (
              <View className="mt-5 gap-4">
                <View className="items-center rounded-3xl border border-amber-200 bg-amber-50 p-6">
                  <View className="h-36 w-36 items-center justify-center rounded-3xl border border-dashed border-amber-300 bg-white">
                    <Text className="text-center text-xs font-black uppercase leading-5 text-amber-600">QR chưa sẵn sàng</Text>
                  </View>
                  <Text className="mt-4 text-center text-sm font-black text-zinc-950">Chưa cấu hình ngân hàng nhận chuyển khoản</Text>
                  <Text className="mt-2 text-center text-xs leading-5 text-zinc-600">
                    {bankTransferIssue?.message || 'Vui lòng vào Settings để nhập ngân hàng, số tài khoản và chủ tài khoản.'}
                  </Text>
                </View>

                <View className="gap-2 rounded-3xl bg-zinc-50 p-4">
                  <SummaryRow label="Mã đơn hàng" value={bankTransferIssue?.orderId || paymentOrderMeta?.orderId || ''} />
                  <SummaryRow label="Số tiền" value={formatCurrency(bankTransferIssue?.amount || paymentOrderMeta?.total || total)} valueClassName="text-sm font-black text-red-500" />
                  <View className="my-2 h-px bg-zinc-200" />
                  <Text className="text-xs font-bold leading-5 text-zinc-600">
                    Hãy cấu hình ít nhất một ngân hàng đang hoạt động trong Settings. Sau đó khách hàng có thể đặt lại đơn hoặc bạn tạo lại QR cho đơn này từ hệ thống quản trị.
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    setBankTransferIssue(null);
                    setPayment('COD');
                  }}
                  className="rounded-2xl bg-zinc-900 py-3.5"
                >
                  <Text className="text-center text-sm font-black text-white">Chọn phương thức khác</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    ) : null}
    </View>
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
