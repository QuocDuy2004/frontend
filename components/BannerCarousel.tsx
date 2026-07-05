import { useEffect, useState } from 'react';
import { ArrowRight, BadgePercent, ShieldCheck, Shirt, Sparkles, Truck } from 'lucide-react-native';
import { Pressable, Text, View } from './tw';

type Banner = {
  tag: string;
  title: string;
  desc: string;
  note: string;
  cta: string;
  bgClassName: string;
  chipClassName: string;
  chipTextClassName: string;
  buttonClassName: string;
  buttonTextColor: string;
  detailIcon: typeof BadgePercent;
  detailLabel: string;
  icon: typeof BadgePercent;
};

const banners: Banner[] = [
  {
    tag: 'HOT SALE',
    title: 'X? kho c?ng ngh?, ?u ??i đơn 50%',
    desc: 'Điện thoại, laptop và phụ kiện đang được đẩy lên trang chủ với mức giá rất dễ chốt đơn.',
    note: 'Cập nhật deal mới lúc 10:00 và 20:00 mỗi ngày',
    cta: 'Xem deal cong nghe',
    bgClassName: 'bg-amber-700',
    chipClassName: 'bg-amber-300',
    chipTextClassName: 'text-amber-950',
    buttonClassName: 'bg-white',
    buttonTextColor: '#18181b',
    detailIcon: ShieldCheck,
    detailLabel: 'Hang chinh hang',
    icon: BadgePercent,
  },
  {
    tag: 'FASHION WEEK',
    title: 'Thời trang he, phoi sản phẩm gon va de mua',
    desc: 'Áo khoác gió, ??m midi v? ph? ki?n ???c gom th?nh nh?m banner ?? kh?ch vu?t danh m?c nhanh h?n.',
    note: 'B? s?u t?p m?i th?m hàng v?o th? 2, 4, 6',
    cta: 'Kh?m ph? th?i trang',
    bgClassName: 'bg-rose-700',
    chipClassName: 'bg-rose-200',
    chipTextClassName: 'text-rose-950',
    buttonClassName: 'bg-zinc-950',
    buttonTextColor: '#ffffff',
    detailIcon: Sparkles,
    detailLabel: 'Phong cách mới',
    icon: Shirt,
  },
  {
    tag: 'FREESHIP MAX',
    title: 'Giao nhanh toàn quốc, giảm phí cho đơn từ 150K',
    desc: 'Nh?m banner v?n chuy?n gi?p địa voucher, mua hàng nhanh v? thàng tin giao nhận l?n v?ng nhận ??u ti?n.',
    note: 'Ap dung voi nhieu gian hang tham gia chuong trinh',
    cta: 'Lay ma freeship',
    bgClassName: 'bg-emerald-700',
    chipClassName: 'bg-emerald-200',
    chipTextClassName: 'text-emerald-950',
    buttonClassName: 'bg-white',
    buttonTextColor: '#064e3b',
    detailIcon: Truck,
    detailLabel: 'Giao 2H nội thành',
    icon: Truck,
  },
];

export default function BannerCarousel({ onShopNow }: { onShopNow: () => void }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIdx((current) => (current + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const banner = banners[idx];
  const Icon = banner.icon;
  const DetailIcon = banner.detailIcon;

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
          <Text className="mt-1.5 max-w-[78%] text-[11px] leading-4 text-white/85" numberOfLines={2}>{banner.desc}</Text>

          <View className="mt-3 flex-row items-center gap-2">
            <Pressable onPress={onShopNow} className={`flex-row items-center rounded-xl px-4 py-2.5 ${banner.buttonClassName}`}>
              <Text className="text-xs font-black" style={{ color: banner.buttonTextColor }}>{banner.cta}</Text>
              <View className="w-2" />
              <ArrowRight size={14} color={banner.buttonTextColor} />
            </Pressable>

            <View className="rounded-full border border-white/25 bg-white/10 px-3 py-2">
              <Text className="text-[10px] font-bold uppercase text-white/70">Hom nay</Text>
              <Text className="text-xs font-black text-white">Cap nhat lien tuc</Text>
            </View>
          </View>

          <View className="mt-3 max-w-[68%] rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-white/15">
                <DetailIcon size={14} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase text-white/65">Điểm nhan banner</Text>
                <Text className="text-xs font-black text-white">{banner.detailLabel}</Text>
              </View>
            </View>
            <Text className="mt-1.5 text-[10px] leading-4 text-white/80" numberOfLines={1}>{banner.note}</Text>
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-center gap-2">
        {banners.map((item, dotIdx) => (
          <Pressable
            key={item.tag}
            onPress={() => setIdx(dotIdx)}
            className={dotIdx === idx ? 'h-2.5 w-7 rounded-full bg-zinc-900' : 'h-2.5 w-2.5 rounded-full bg-zinc-300'}
          />
        ))}
      </View>
    </View>
  );
}
