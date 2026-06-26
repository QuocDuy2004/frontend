import { Bell } from 'lucide-react-native';
import { ScrollView, Text, View } from '../../components/tw';
import Header from '../../components/Header';
import { useAppStore } from '../../store/appStore';

export default function NotificationsScreen() {
  const notifications = useAppStore((s) => s.notifications);

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4" contentContainerClassName="gap-3 pb-24">
        <View className="flex-row items-center gap-2">
          <Bell size={18} color="#18181b" />
          <Text className="text-lg font-black">Thông báo</Text>
        </View>
        {notifications.map((n) => (
          <View key={n.id} className="rounded-2xl border border-gray-100 bg-white p-4">
            <Text className="font-black text-gray-900">{n.title}</Text>
            <Text className="mt-1 text-xs text-gray-500">{n.message}</Text>
            <Text className="mt-2 text-[10px] text-gray-400">{n.date}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
