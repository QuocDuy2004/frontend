import { useFocusEffect } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from '../../components/tw';
import Header from '../../components/Header';
import { useNotificationStore } from '../../store/notificationStore';

export default function NotificationsScreen() {
  const notifications = useNotificationStore((s) => s.notifications);
  const hydrateNotifications = useNotificationStore((s) => s.hydrateNotifications);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setIsLoading(true);
      setError('');

      hydrateNotifications()
        .catch((err) => {
          if (alive) setError(err instanceof Error ? err.message : 'Không thể tải thông báo từ backend.');
        })
        .finally(() => {
          if (alive) setIsLoading(false);
        });

      return () => {
        alive = false;
      };
    }, [hydrateNotifications])
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView className="p-4" contentContainerClassName="gap-3 pb-24">
        <View className="flex-row items-center gap-2">
          <Bell size={18} color="#18181b" />
          <Text className="text-lg font-black">Thông báo</Text>
          {isLoading ? <Text className="text-xs font-bold text-zinc-400">Đang tải...</Text> : null}
        </View>

        {error ? (
          <View className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <Text className="text-xs font-bold leading-5 text-rose-600">{error}</Text>
          </View>
        ) : null}

        {!isLoading && notifications.length === 0 ? (
          <View className="rounded-2xl border border-gray-100 bg-white p-4">
            <Text className="text-sm font-bold text-gray-500">Chưa có thông báo nào.</Text>
          </View>
        ) : null}

        {notifications.map((notification) => (
          <View key={notification.id} className="rounded-2xl border border-gray-100 bg-white p-4">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 font-black text-gray-900">{notification.title}</Text>
              {!notification.isRead ? <View className="mt-1 h-2 w-2 rounded-full bg-rose-500" /> : null}
            </View>
            <Text className="mt-1 text-xs text-gray-500">{notification.message}</Text>
            {notification.date ? (
              <Text className="mt-2 text-[10px] text-gray-400">{new Date(notification.date).toLocaleDateString('vi-VN')}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
