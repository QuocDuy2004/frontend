import { useEffect, useState } from 'react';
import { ArrowRight, BadgePercent, ShieldCheck, Shirt, Sparkles, Truck } from 'lucide-react-native';
import { Pressable, Text, View } from './tw';
import type { HomeBanner } from '../types';

type BannerIcon = typeof BadgePercent;

const iconMap: Record<string, BannerIcon> = {
  BadgePercent,
  ShieldCheck,
  Shirt,
  Sparkles,
  Truck,
};

const fallbackBanners: HomeBanner[] = [
  {
    id: 'fallback-tech',
    tag: 'HOT SALE',
    title: 'Xả kho công nghệ, ưu đãi đến 50%',
    description: 'Điện thoại, laptop và phụ kiện đang được đẩy lên trang chủ với mức giá rất dễ chốt đơn.',
    note: 'Cập nhật deal mới lúc 10:00 và 20:00 mỗi ngày',
    cta: 'Xem deal công nghệ',
    targetPath: '/(tabs)/catalog',
    targetParams: { category: 'phones-laptops' },
    bgClassName: 'bg-amber-700',
    chipClassName: 'bg-amber-300',
    chipTextClassName: 'text-amber-950',
    buttonClassName: 'bg-white',
    buttonTextColor: '#18181b',
    detailIconName: 'ShieldCheck',
    detailLabel: 'Hàng chính hãng',
    iconName: 'BadgePercent',
  },
  {
    id: 'fallback-fashion',
    tag: 'FASHION WEEK',
    title: 'Thời trang hè, phối sản phẩm gọn và dễ mua',
    description: 'Áo khoác gió, đầm midi và phụ kiện được gom thành nhóm banner để khách vuốt danh mục nhanh hơn.',
    note: 'Bộ sưu tập mới thêm hàng vào thứ 2, 4, 6',
    cta: 'Khám phá thời trang',
    targetPath: '/(tabs)/catalog',
    targetParams: { category: 'fashion' },
    bgClassName: 'bg-rose-700',
    chipClassName: 'bg-rose-200',
    chipTextClassName: 'text-rose-950',
    buttonClassName: 'bg-zinc-950',
    buttonTextColor: '#ffffff',
    detailIconName: 'Sparkles',
    detailLabel: 'Phong cách mới',
    iconName: 'Shirt',
  },
  {
    id: 'fallback-ship',
    tag: 'FREESHIP MAX',
    title: 'Giao nhanh toàn quốc, giảm phí cho đơn từ 150K',
    description: 'Nhóm banner vận chuyển giúp đặt voucher, mua hàng nhanh và thấy thông tin giao nhận lần đầu tiên.',
    note: 'Áp dụng với nhiều gian hàng tham gia chương trình',
    cta: 'Lấy mã freeship',
    targetPath: '/(tabs)/catalog',
    targetParams: {},
    bgClassName: 'bg-emerald-700',
    chipClassName: 'bg-emerald-200',
    chipTextClassName: 'text-emerald-950',
    buttonClassName: 'bg-white',
    buttonTextColor: '#064e3b',
    detailIconName: 'Truck',
    detailLabel: 'Giao 2H nội thành',
    iconName: 'Truck',
  },
];

export default function BannerCarousel({
  banners,
  onBannerPress,
}: {
  banners?: HomeBanner[];
  onBannerPress: (banner: HomeBanner) => void;
}) {
  const [idx, setIdx] = useState(0);
  const list = banners && banners.length > 0 ? banners : fallbackBanners;

  useEffect(() => {
    setIdx(0);
  }, [list.length]);

  useEffect(() => {
    const timer = setInterval(() => setIdx((current) => (current + 1) % list.length), 5000);
    return () => clearInterval(timer);
  }, [list.length]);

  const banner = list[idx] || list[0];
  const Icon = iconMap[banner.iconName || ''] || BadgePercent;
  const DetailIcon = iconMap[banner.detailIconName || ''] || ShieldCheck;

  return (
    <View>
      <View className={`overflow-hidden rounded-[28px] ${banner.bgClassName}`}>
        <View className="absolute right-0 top-4 h-24 w-24 rounded-full bg-white/10" />
        <View className="absolute right-10 top-20 h-16 w-16 rounded-full bg-white/10" />
        <View className="absolute bottom-0 left-0 right-0 h-14 bg-black/10" />

        <View className="min-h-[176px] justify-center px-5 py-4">
          <View className={`mb-2 self-start flex-row items-center gap-2 rounded-full px-3 py-1 ${banner.chipClassName}`}>
            <Icon size={13} color="#111827" />
            <Text className={`text-[10px] font-black uppercase ${banner.chipTextClassName}`}>{banner.tag}</Text>
          </View>

          <Text className="max-w-[74%] text-lg font-black leading-6 text-white">{banner.title}</Text>
          <Text className="mt-1.5 max-w-[78%] text-[11px] leading-4 text-white/85" numberOfLines={2}>{banner.description}</Text>

          <View className="mt-3 flex-row items-center gap-2">
            <Pressable onPress={() => onBannerPress(banner)} className={`flex-row items-center rounded-xl px-4 py-2.5 ${banner.buttonClassName}`}>
              <Text className="text-xs font-black" style={{ color: banner.buttonTextColor }}>{banner.cta}</Text>
              <View className="w-2" />
              <ArrowRight size={14} color={banner.buttonTextColor} />
            </Pressable>

            <View className="rounded-full border border-white/25 bg-white/10 px-3 py-2">
              <Text className="text-[10px] font-bold uppercase text-white/70">Hôm nay</Text>
              <Text className="text-xs font-black text-white">Cập nhật liên tục</Text>
            </View>
          </View>

          <View className="mt-3 max-w-[68%] rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-white/15">
                <DetailIcon size={14} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase text-white/65">Điểm nhấn banner</Text>
                <Text className="text-xs font-black text-white">{banner.detailLabel}</Text>
              </View>
            </View>
            {banner.note ? <Text className="mt-1.5 text-[10px] leading-4 text-white/80" numberOfLines={1}>{banner.note}</Text> : null}
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-center gap-2">
        {list.map((item, dotIdx) => (
          <Pressable
            key={item.id || item.tag}
            onPress={() => setIdx(dotIdx)}
            className={dotIdx === idx ? 'h-2.5 w-7 rounded-full bg-zinc-900' : 'h-2.5 w-2.5 rounded-full bg-zinc-300'}
          />
        ))}
      </View>
    </View>
  );
}
