import { router, useLocalSearchParams } from 'expo-router';
import { createElement, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView as RNScrollView, useWindowDimensions } from 'react-native';
import { ArrowLeft, ChevronDown, ChevronUp, Heart, MessageSquareText, Play, ShoppingBag, Star } from 'lucide-react-native';
import { Image, Pressable, ScrollView, Text, View } from '../../../components/tw';
import Header from '../../../components/Header';
import { useAppStore } from '../../../store/appStore';
import { useCartStore } from '../../../store/cartStore';
import ReviewForm from '../../../components/ReviewForm';
import { Review } from '../../../types';
import { useCartFlyAnimation } from '../../../components/CartFlyProvider';

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

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useAppStore((s) => s.products.find((p) => p.id === id));
  const orders = useAppStore((s) => s.orders);
  const addToCart = useCartStore((s) => s.addToCart);
  const clearCart = useCartStore((s) => s.clearCart);
  const onAddReview = useAppStore((s) => s.onAddReview);
  const favorites = useAppStore((s) => s.favorites);
  const onToggleFavorite = useAppStore((s) => s.onToggleFavorite);
  const currentUser = useAppStore((s) => s.currentUser);
  const { flyToCart } = useCartFlyAnimation();
  const [qty, setQty] = useState(1);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const mediaScrollRef = useRef<RNScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const mediaWidth = Math.max(screenWidth - 32, 280);

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

  const hasPurchased = useMemo(() => {
    if (!product) return false;

    return orders.some((order) => {
      const containsProduct = order.items.some((item) => item.productId === product.id);
      if (!containsProduct || order.orderStatus === 'cancelled') return false;

      if (!currentUser) return true;

      return order.customerPhone === currentUser.phone || order.customerEmail === currentUser.email;
    });
  }, [currentUser, orders, product]);

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
  const soldCount = product.soldCount || 0;
  const soldText = `Đã bán ${formatSoldCount(soldCount)}`;
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/catalog');
  };

  const handleBuyNow = () => {
    clearCart();
    addToCart(product, qty);
    router.push('/checkout');
  };

  const handleAddToCart = (event: any) => {
    addToCart(product, qty);
    flyToCart({
      x: event?.nativeEvent?.pageX || 180,
      y: event?.nativeEvent?.pageY || 520,
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
            <Text className="text-2xl font-black text-red-500">{product.discountPrice.toLocaleString('vi-VN')}đ</Text>
            {product.originalPrice > product.discountPrice ? (
              <Text className="text-sm font-bold text-gray-400 line-through">
                {product.originalPrice.toLocaleString('vi-VN')}đ
              </Text>
            ) : null}
          </View>

          <Text className="text-xs leading-5 text-gray-500">{product.description}</Text>

          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => setQty(Math.max(1, qty - 1))} className="rounded-xl bg-gray-100 px-4 py-2">
              <Text className="font-black">-</Text>
            </Pressable>
            <Text className="font-black">{qty}</Text>
            <Pressable onPress={() => setQty(qty + 1)} className="rounded-xl bg-gray-100 px-4 py-2">
              <Text className="font-black">+</Text>
            </Pressable>
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={handleAddToCart} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-amber-100 py-3">
              <ShoppingBag size={18} color="#92400e" />
              <Text className="font-black text-amber-800">Thêm giỏ</Text>
            </Pressable>
            <Pressable onPress={handleBuyNow} className="flex-1 rounded-2xl bg-amber-500 py-3">
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

        {hasPurchased ? (
          <View className="gap-3 rounded-3xl bg-white p-4">
            <View className="flex-row items-center gap-2">
              <MessageSquareText size={18} color="#18181b" />
              <Text className="font-black">Nhập đánh giá sản phẩm</Text>
            </View>
            <ReviewForm
              value={comment}
              setValue={setComment}
              rating={rating}
              setRating={setRating}
              onSubmit={() => {
                if (!comment.trim()) return;
                onAddReview(product.id, {
                  id: `r_${Date.now()}`,
                  productId: product.id,
                  userName: currentUser?.name || 'Khách hàng VeloCart',
                  rating,
                  comment,
                  createdAt: new Date().toISOString().split('T')[0],
                });
                setComment('');
                setRating(5);
                setShowAllReviews(true);
              }}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
