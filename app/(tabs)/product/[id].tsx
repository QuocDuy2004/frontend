import { router, useLocalSearchParams } from 'expo-router';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView as RNScrollView, useWindowDimensions } from 'react-native';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Heart, MessageSquareText, Play, ShoppingBag, Star, X } from 'lucide-react-native';
import { Image, Pressable, ScrollView, Text, View } from '../../../components/tw';
import Header from '../../../components/Header';
import { useCatalogStore } from '../../../store/catalogStore';
import { useFavoriteStore } from '../../../store/favoriteStore';
import { useCartStore } from '../../../store/cartStore';
import { Product, Review } from '../../../types';
import { useCartFlyAnimation } from '../../../components/CartFlyProvider';
import { formatCurrency, getProductSalePrice } from '../../../lib/pricing';

const fallbackNames = ['Nguyễn Minh', 'Thanh Hà', 'Bảo Châu', 'Quốc Anh', 'Mai Linh', 'Tuấn Kiệt'];
const fallbackComments = [
  'Sản phẩm đúng mô tả, đóng gói gọn gàng và giao khá nhanh.',
  'Chất lượng tốt trong tầm giá, dùng ổn định và dễ thao tác.',
  'Mình mua để dùng hằng ngày và thấy rất hài lòng.',
  'Màu sắc đẹp, hoàn thiện tốt, phù hợp với nhu cầu của mình.',
  'Đã mua lần thứ hai, trải nghiệm vẫn rất ổn.',
  'Giá tốt hơn mong đợi, sẽ giới thiệu cho bạn bè.',
];

type ProductMedia = {
  id: string;
  uri: string;
  type: 'image' | 'video';
};

const videoPattern = /\.(mp4|mov|m4v|webm|ogg)(\?.*)?$/i;

function isVideoUrl(uri: string) {
  const normalized = uri.toLowerCase();
  return videoPattern.test(normalized) || normalized.includes('/video/') || normalized.includes('video');
}

function formatSoldCount(count: number) {
  if (count < 10000) return count.toLocaleString('vi-VN');

  const thousands = Math.floor(count / 1000);
  return count % 1000 === 0 ? `${thousands}k` : `${thousands}k+`;
}

function normalizeAttributeName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

function findAttributeValues(product: Product, names: string[]) {
  const targets = names.map(normalizeAttributeName);
  return product.attributes?.find((attribute) => targets.includes(normalizeAttributeName(attribute.name)))?.values || [];
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useCatalogStore((s) => s.products.find((p) => p.id === id));
  const addToCart = useCartStore((s) => s.addToCart);
  const clearCart = useCartStore((s) => s.clearCart);
  const cartItems = useCartStore((s) => s.cartItems);
  const favorites = useFavoriteStore((s) => s.favorites);
  const onToggleFavorite = useFavoriteStore((s) => s.onToggleFavorite);
  const { flyToCart } = useCartFlyAnimation();
  const [qty, setQty] = useState(1);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [variantSheetAction, setVariantSheetAction] = useState<'cart' | 'buy' | null>(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const mediaScrollRef = useRef<RNScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const mediaWidth = Math.max(screenWidth - 32, 280);

  useEffect(() => {
    if (!product) return;

    const nextStock = Math.max(0, Number(product.stock || 0));
    setQty((current) => Math.max(1, Math.min(current, Math.max(1, nextStock))));
  }, [product?.id, product?.stock]);

  const displayReviews = useMemo(() => {
    if (!product) return [] as Review[];

    const realReviews = product.reviews || [];
    const targetCount = Math.max(product.reviewCount || 0, realReviews.length);
    const fillerCount = Math.max(targetCount - realReviews.length, 0);

    const fillerReviews: Review[] = Array.from({ length: fillerCount }, (_, index) => ({
      id: `fallback-${product.id}-${index}`,
      productId: product.id,
      userName: fallbackNames[index % fallbackNames.length],
      rating: Math.max(4, Math.round(product.rating || 5)),
      comment: fallbackComments[index % fallbackComments.length],
      createdAt: `2026-06-${String((index % 24) + 1).padStart(2, '0')}`,
    }));

    return [...realReviews, ...fillerReviews];
  }, [product]);

  if (!product) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        <View className="flex-1 p-4">
          <Text>Không tìm thấy sản phẩm.</Text>
        </View>
      </View>
    );
  }

  const mediaItems = Array.from(new Set([...(product.images || []), product.videoUrl, product.image].filter(Boolean) as string[]))
    .map((uri, index) => ({
      id: `${product.id}-media-${index}`,
      uri,
      type: isVideoUrl(uri) ? 'video' : 'image',
    })) satisfies ProductMedia[];
  const isFavorite = favorites.includes(product.id);
  const salePrice = getProductSalePrice(product);
  const variantTotalPrice = salePrice * qty;
  const soldCount = product.soldCount || 0;
  const soldText = `Đã bán ${formatSoldCount(soldCount)}`;
  const stock = Math.max(0, Number(product.stock || 0));
  const cartQuantityForProduct = cartItems
    .filter((item) => item.product.id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0);
  const availableToAdd = Math.max(0, stock - cartQuantityForProduct);
  const isOutOfStock = stock <= 0;
  const colorOptions = findAttributeValues(product, ['Màu sắc', 'Mau sac', 'Color', 'Colour']);
  const sizeOptions = findAttributeValues(product, ['Kích cỡ', 'Kích thước', 'Kich co', 'Kich thuoc', 'Size']);
  const hasSelectableVariants = colorOptions.length > 0 || sizeOptions.length > 0;
  const canConfirmVariant = (!colorOptions.length || selectedColor) && (!sizeOptions.length || selectedSize);
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/catalog');
  };

  const addSelectedProductToCart = () => {
    addToCart(product, qty, {
      color: selectedColor || undefined,
      size: selectedSize || undefined,
    });
  };

  const showStockAlert = (message: string) => {
    Alert.alert('Tồn kho không đủ', message);
  };

  const showStockLimitAlert = () => {
    showStockAlert(`Tồn kho chỉ còn lại ${stock} sản phẩm.`);
  };

  const increaseQuantity = () => {
    if (isOutOfStock) {
      showStockAlert('Sản phẩm này hiện đã hết hàng.');
      return;
    }

    if (qty >= stock) {
      showStockLimitAlert();
      return;
    }

    setQty((current) => Math.min(stock, current + 1));
  };

  const canUseQuantity = (action: 'cart' | 'buy') => {
    if (isOutOfStock) {
      showStockAlert('Sản phẩm này hiện đã hết hàng.');
      return false;
    }

    if (qty > stock) {
      showStockLimitAlert();
      setQty(stock);
      return false;
    }

    if (action === 'cart' && qty > availableToAdd) {
      showStockAlert(
        availableToAdd > 0
          ? `Tồn kho chỉ còn lại ${stock} sản phẩm. Giỏ hàng đã có ${cartQuantityForProduct} sản phẩm này.`
          : `Tồn kho chỉ còn lại ${stock} sản phẩm.`
      );
      setQty(Math.max(1, availableToAdd));
      return false;
    }

    return true;
  };

  const openVariantSheet = (action: 'cart' | 'buy') => {
    if (!canUseQuantity(action)) return;

    if (!hasSelectableVariants) {
      if (action === 'buy') {
        clearCart();
        addToCart(product, qty);
        router.push('/checkout');
        return;
      }

      addToCart(product, qty);
      return;
    }

    setSelectedColor('');
    setSelectedSize('');
    setVariantSheetAction(action);
  };

  const handleBuyNow = () => {
    openVariantSheet('buy');
  };

  const handleAddToCart = (event: any) => {
    if (!canUseQuantity('cart')) return;

    if (hasSelectableVariants) {
      openVariantSheet('cart');
      return;
    }

    addToCart(product, qty);
    flyToCart({
      x: event?.nativeEvent?.pageX || 180,
      y: event?.nativeEvent?.pageY || 520,
      imageUri: product.images?.[0] || product.image,
    });
  };

  const confirmVariantSelection = () => {
    if (!variantSheetAction || !canConfirmVariant) return;
    if (!canUseQuantity(variantSheetAction)) return;

    if (variantSheetAction === 'buy') {
      clearCart();
      addSelectedProductToCart();
      setVariantSheetAction(null);
      router.push('/checkout');
      return;
    }

    addSelectedProductToCart();
    setVariantSheetAction(null);
    flyToCart({
      x: 180,
      y: 520,
      imageUri: product.images?.[0] || product.image,
    });
  };

  const handleMediaScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / mediaWidth);
    setActiveMediaIndex(Math.max(0, Math.min(nextIndex, mediaItems.length - 1)));
  };

  const selectMedia = (index: number) => {
    setActiveMediaIndex(index);
    mediaScrollRef.current?.scrollTo({ x: index * mediaWidth, animated: true });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="gap-4 pb-24">
        <Pressable onPress={handleBack} className="flex-row items-center gap-2 self-start">
          <ArrowLeft size={18} />
          <Text className="font-bold text-gray-600">Trở lại</Text>
        </Pressable>

        <View className="relative overflow-hidden rounded-3xl bg-white">
          <ScrollView
            ref={mediaScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMediaScroll}
            scrollEventThrottle={16}
          >
            {mediaItems.map((item) => (
              <View key={item.id} className="bg-white" style={{ width: mediaWidth, height: mediaWidth }}>
                {item.type === 'video' && Platform.OS === 'web' ? (
                  createElement('video', {
                    src: item.uri,
                    controls: true,
                    playsInline: true,
                    style: { width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#ffffff' },
                  })
                ) : item.type === 'video' ? (
                  <View className="h-full w-full items-center justify-center bg-zinc-950">
                    <Play size={38} color="#ffffff" fill="#ffffff" />
                    <Text className="mt-3 text-xs font-black text-white">Video sản phẩm</Text>
                  </View>
                ) : (
                  <Image source={{ uri: item.uri }} className="h-full w-full" resizeMode="cover" />
                )}
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={() => onToggleFavorite(product.id)}
            className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/95"
          >
            <Heart size={20} color={isFavorite ? '#ef4444' : '#71717a'} fill={isFavorite ? '#ef4444' : 'transparent'} />
          </Pressable>
          {mediaItems.length > 1 ? (
            <View className="absolute bottom-3 left-0 right-0 flex-row items-center justify-center gap-1.5">
              {mediaItems.map((item, index) => (
                <View
                  key={item.id}
                  className={`h-2 rounded-full ${index === activeMediaIndex ? 'w-6 bg-white' : 'w-2 bg-white/60'}`}
                />
              ))}
            </View>
          ) : null}
        </View>

        {mediaItems.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2">
            {mediaItems.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => selectMedia(index)}
                className={`h-16 w-16 overflow-hidden rounded-2xl border-2 bg-white ${
                  index === activeMediaIndex ? 'border-amber-500' : 'border-transparent'
                }`}
              >
                {item.type === 'video' ? (
                  <View className="h-full w-full items-center justify-center bg-zinc-900">
                    <Play size={18} color="#ffffff" fill="#ffffff" />
                  </View>
                ) : (
                  <Image source={{ uri: item.uri }} className="h-full w-full" resizeMode="cover" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View className="gap-3 rounded-3xl bg-white p-4">
          <Text className="text-[10px] font-bold text-gray-400">SKU: {product.sku || product.id}</Text>
          <Text className="text-xl font-black text-gray-900">{product.name}</Text>

          <View className="flex-row items-center justify-between gap-3">
            <Pressable onPress={() => setShowAllReviews((current) => !current)} className="self-start rounded-full bg-amber-50 px-3 py-2">
              <View className="flex-row items-center gap-1.5">
                <Star size={14} color="#f59e0b" fill="#f59e0b" />
                <Text className="text-xs font-bold text-zinc-900">{product.rating || 5}</Text>
                <Text className="text-xs text-gray-500">| {product.reviewCount || 0} đánh giá</Text>
                {showAllReviews ? <ChevronUp size={14} color="#71717a" /> : <ChevronDown size={14} color="#71717a" />}
              </View>
            </Pressable>
            <Text className="text-xs font-bold text-zinc-500">{soldText}</Text>
          </View>

          <View className="flex-row items-end gap-2">
            <Text className="text-2xl font-black text-red-500">{formatCurrency(salePrice)}</Text>
            {product.originalPrice > salePrice ? (
              <Text className="text-sm font-bold text-gray-400 line-through">
                {formatCurrency(product.originalPrice)}
              </Text>
            ) : null}
          </View>

          <Text className="text-xs leading-5 text-gray-500">{product.description}</Text>

          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => setQty(Math.max(1, qty - 1))} className="rounded-xl bg-gray-100 px-4 py-2">
              <Text className="font-black">-</Text>
            </Pressable>
            <Text className="font-black">{qty}</Text>
            <Pressable
              onPress={increaseQuantity}
              className={`rounded-xl px-4 py-2 ${isOutOfStock || qty >= stock ? 'bg-gray-50' : 'bg-gray-100'}`}
            >
              <Text className="font-black">+</Text>
            </Pressable>
          </View>
          <Text className={`text-xs font-bold ${isOutOfStock ? 'text-red-500' : 'text-zinc-500'}`}>
            {isOutOfStock ? 'Hết hàng' : `Còn ${stock} sản phẩm trong kho`}
          </Text>

          <View className="flex-row gap-3">
            <Pressable
              onPress={handleAddToCart}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3 ${
                isOutOfStock || availableToAdd <= 0 ? 'bg-zinc-200' : 'bg-amber-100'
              }`}
            >
              <ShoppingBag size={18} color="#92400e" />
              <Text className={`font-black ${isOutOfStock || availableToAdd <= 0 ? 'text-zinc-500' : 'text-amber-800'}`}>Thêm giỏ</Text>
            </Pressable>
            <Pressable
              onPress={handleBuyNow}
              disabled={isOutOfStock}
              className={`flex-1 rounded-2xl py-3 ${isOutOfStock ? 'bg-zinc-300' : 'bg-amber-500'}`}
            >
              <Text className="text-center font-black text-white">Mua ngay</Text>
            </Pressable>
          </View>
        </View>

        {showAllReviews ? (
          <View className="gap-3 rounded-3xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MessageSquareText size={18} color="#18181b" />
                <Text className="font-black">Tất cả đánh giá của khách hàng</Text>
              </View>
              <Text className="text-xs font-bold text-zinc-500">{displayReviews.length} đánh giá</Text>
            </View>

            <View className="gap-3">
              {displayReviews.map((review) => (
                <View key={review.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-black text-zinc-900">{review.userName}</Text>
                      <Text className="mt-1 text-[10px] font-medium text-zinc-400">{review.createdAt}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Star size={12} color="#f59e0b" fill="#f59e0b" />
                      <Text className="text-xs font-bold text-zinc-700">{review.rating}</Text>
                    </View>
                  </View>
                  <Text className="mt-2 text-xs leading-5 text-zinc-600">{review.comment}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

      </ScrollView>

      {variantSheetAction ? (
        <View className="absolute inset-0 z-50 justify-end bg-black/45">
          <Pressable className="flex-1" onPress={() => setVariantSheetAction(null)} />
          <View className="rounded-t-[32px] bg-white px-4 pb-6 pt-4 shadow-2xl">
            <View className="mb-4 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-black text-zinc-950">Chọn phân loại</Text>
                <Text className="mt-1 text-xs leading-5 text-zinc-500">Chọn màu và size trước khi tiếp tục.</Text>
              </View>
              <Pressable onPress={() => setVariantSheetAction(null)} className="h-9 w-9 items-center justify-center rounded-full bg-zinc-100">
                <X size={18} color="#52525b" />
              </Pressable>
            </View>

            <View className="mb-4 flex-row gap-3 rounded-3xl bg-zinc-50 p-3">
              <Image source={{ uri: product.images?.[0] || product.image }} className="h-20 w-20 rounded-2xl bg-white" resizeMode="cover" />
              <View className="flex-1 justify-center gap-2">
                <Text numberOfLines={2} className="text-sm font-black leading-5 text-zinc-900">{product.name}</Text>
                <View className="flex-row items-center justify-between gap-2">
                  <View>
                    <Text className="text-lg font-black text-red-500">{formatCurrency(variantTotalPrice)}</Text>
                    <Text className="text-[10px] font-bold text-zinc-400">{formatCurrency(salePrice)} / sản phẩm</Text>
                  </View>
                  <View className="flex-row items-center rounded-full border border-zinc-200 bg-white">
                    <Pressable
                      onPress={() => setQty(Math.max(1, qty - 1))}
                      className="h-8 w-8 items-center justify-center rounded-full"
                    >
                      <Text className="text-base font-black text-zinc-600">-</Text>
                    </Pressable>
                    <Text className="min-w-7 text-center text-sm font-black text-zinc-950">{qty}</Text>
                    <Pressable
                      onPress={increaseQuantity}
                      className={`h-8 w-8 items-center justify-center rounded-full ${isOutOfStock || qty >= stock ? 'bg-zinc-300' : 'bg-amber-500'}`}
                    >
                      <Text className="text-base font-black text-white">+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
            {colorOptions.length > 0 ? (
              <View className="mb-4">
                <Text className="mb-2 text-xs font-black uppercase text-zinc-500">Màu sắc</Text>
                <View className="flex-row flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                        selectedColor === color ? 'border-amber-500 bg-amber-50' : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <Text className={`text-xs font-black ${selectedColor === color ? 'text-amber-700' : 'text-zinc-700'}`}>{color}</Text>
                      {selectedColor === color ? <Check size={13} color="#b45309" /> : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {sizeOptions.length > 0 ? (
              <View className="mb-4">
                <Text className="mb-2 text-xs font-black uppercase text-zinc-500">Size</Text>
                <View className="flex-row flex-wrap gap-2">
                  {sizeOptions.map((size) => (
                    <Pressable
                      key={size}
                      onPress={() => setSelectedSize(size)}
                      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                        selectedSize === size ? 'border-amber-500 bg-amber-50' : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <Text className={`text-xs font-black ${selectedSize === size ? 'text-amber-700' : 'text-zinc-700'}`}>{size}</Text>
                      {selectedSize === size ? <Check size={13} color="#b45309" /> : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {!canConfirmVariant ? (
              <Text className="mb-3 text-center text-xs font-bold text-rose-500">Vui lòng chọn đầy đủ phân loại sản phẩm.</Text>
            ) : null}

            <Pressable
              onPress={confirmVariantSelection}
              disabled={!canConfirmVariant || isOutOfStock || (variantSheetAction === 'cart' && availableToAdd <= 0)}
              className={`rounded-2xl py-3.5 ${
                canConfirmVariant && !isOutOfStock && !(variantSheetAction === 'cart' && availableToAdd <= 0)
                  ? 'bg-amber-500'
                  : 'bg-zinc-300'
              }`}
            >
              <Text className="text-center text-sm font-black text-white">
                {variantSheetAction === 'buy' ? 'Mua ngay' : 'Thêm vào giỏ hàng'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
