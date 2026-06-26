import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, MessageSquareText, ShoppingBag, Star } from 'lucide-react-native';
import { Image, Pressable, ScrollView, Text, View } from '../../components/tw';
import { useAppStore } from '../../store/appStore';
import { useCartStore } from '../../store/cartStore';
import ReviewForm from '../../components/ReviewForm';
import { Review } from '../../types';

const fallbackNames = ['Nguyen Minh', 'Thanh Ha', 'Bao Chau', 'Quoc Anh', 'Mai Linh', 'Tuan Kiet'];
const fallbackComments = [
  'San pham dung mo ta, dong goi gon gang va giao kha nhanh.',
  'Chat luong tot trong tam gia, dung on dinh va de thao tac.',
  'Minh mua de dung hang ngay va thay rat hai long.',
  'Mau sac dep, hoan thien tot, phu hop voi nhu cau cua minh.',
  'Da mua lan thu hai, trai nghiem van rat on.',
  'Gia tot hon mong doi, se gioi thieu cho ban be.',
];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useAppStore((s) => s.products.find((p) => p.id === id));
  const orders = useAppStore((s) => s.orders);
  const addToCart = useCartStore((s) => s.addToCart);
  const onAddReview = useAppStore((s) => s.onAddReview);
  const currentUser = useAppStore((s) => s.currentUser);
  const [qty, setQty] = useState(1);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [showAllReviews, setShowAllReviews] = useState(false);

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

  if (!product) return <View className="flex-1 p-4"><Text>Khong tim thay san pham.</Text></View>;

  const img = product.images?.[0] || product.image;
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/catalog');
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="gap-4 pb-24">
        <Pressable onPress={handleBack} className="flex-row items-center gap-2 self-start">
          <ArrowLeft size={18} />
          <Text className="font-bold text-gray-600">Tro lai</Text>
        </Pressable>

        <Image source={{ uri: img }} className="aspect-square w-full rounded-3xl bg-white" resizeMode="cover" />

        <View className="gap-3 rounded-3xl bg-white p-4">
          <Text className="text-[10px] font-bold text-gray-400">SKU: {product.sku || product.id}</Text>
          <Text className="text-xl font-black text-gray-900">{product.name}</Text>

          <Pressable onPress={() => setShowAllReviews((current) => !current)} className="self-start rounded-full bg-amber-50 px-3 py-2">
            <View className="flex-row items-center gap-1.5">
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <Text className="text-xs font-bold text-zinc-900">{product.rating || 5}</Text>
              <Text className="text-xs text-gray-500">| {product.reviewCount || 0} danh gia</Text>
              {showAllReviews ? <ChevronUp size={14} color="#71717a" /> : <ChevronDown size={14} color="#71717a" />}
            </View>
          </Pressable>

          <Text className="text-2xl font-black text-red-500">{product.discountPrice.toLocaleString('vi-VN')}d</Text>
          <Text className="text-xs leading-5 text-gray-500">{product.description}</Text>

          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => setQty(Math.max(1, qty - 1))} className="rounded-xl bg-gray-100 px-4 py-2"><Text className="font-black">-</Text></Pressable>
            <Text className="font-black">{qty}</Text>
            <Pressable onPress={() => setQty(qty + 1)} className="rounded-xl bg-gray-100 px-4 py-2"><Text className="font-black">+</Text></Pressable>
            <Text className="text-xs text-gray-500">Con {product.stock} san pham</Text>
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={() => addToCart(product, qty)} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-amber-100 py-3">
              <ShoppingBag size={18} color="#92400e" />
              <Text className="font-black text-amber-800">Them gio</Text>
            </Pressable>
            <Pressable onPress={() => { addToCart(product, qty); router.push('/(tabs)/cart'); }} className="flex-1 rounded-2xl bg-amber-500 py-3">
              <Text className="text-center font-black text-white">Mua ngay</Text>
            </Pressable>
          </View>
        </View>

        {showAllReviews ? (
          <View className="gap-3 rounded-3xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MessageSquareText size={18} color="#18181b" />
                <Text className="font-black">Tất ca danh gia cua khach hang</Text>
              </View>
              <Text className="text-xs font-bold text-zinc-500">{displayReviews.length} danh gia</Text>
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
              <Text className="font-black">Nhap danh gia san pham</Text>
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
                  userName: currentUser?.name || 'Khach hang VeloCart',
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
