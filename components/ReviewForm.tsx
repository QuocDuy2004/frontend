import { Star } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from './tw';

type ReviewFormProps = {
  value: string;
  setValue: (v: string) => void;
  rating: number;
  setRating: (v: number) => void;
  onSubmit: () => void;
};

export default function ReviewForm({ value, setValue, rating, setRating, onSubmit }: ReviewFormProps) {
  return (
    <View className="gap-3">
      <View>
        <Text className="text-xs font-black uppercase text-zinc-500">Nhập đánh giá sản phẩm</Text>
        <Text className="mt-1 text-[11px] leading-4 text-zinc-500">Chia sẻ cảm nhận để người mua sau dễ tham khảo.</Text>
      </View>

      <View className="flex-row items-center gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <Pressable key={item} onPress={() => setRating(item)} className="rounded-full bg-amber-50 p-2">
            <Star size={16} color="#f59e0b" fill={item <= rating ? '#f59e0b' : 'transparent'} />
          </Pressable>
        ))}
        <Text className="text-xs font-bold text-zinc-600">{rating > 0 ? `${rating}/5 sao` : 'Chưa chọn sao'}</Text>
      </View>

      <TextInput
        value={value}
        onChangeText={setValue}
        multiline
        placeholder="Viết nhận xét của bạn..."
        className="min-h-28 rounded-2xl border border-zinc-200 bg-gray-50 p-3 text-xs text-zinc-900"
      />

      <Pressable onPress={onSubmit} disabled={rating === 0 || !value.trim()} className={`rounded-xl py-3 ${rating === 0 || !value.trim() ? 'bg-zinc-300' : 'bg-amber-500'}`}>
        <Text className="text-center text-sm font-bold text-white">Gửi đánh giá</Text>
      </Pressable>
    </View>
  );
}
