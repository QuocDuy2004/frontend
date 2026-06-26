import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import {
  Signika_400Regular,
  Signika_500Medium,
  Signika_600SemiBold,
  Signika_700Bold,
} from '@expo-google-fonts/signika';
import ChatBox from '../components/ChatBox';
import { View } from '../components/tw';
import { useAppStore } from '../store/appStore';
import { seedCategories, seedNotifications, seedOrders, seedProducts, seedVouchers } from '../store/seedData';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Signika: Signika_400Regular,
    'Signika Medium': Signika_500Medium,
    'Signika SemiBold': Signika_600SemiBold,
    'Signika Bold': Signika_700Bold,
  });
  const productsCount = useAppStore(s => s.products.length);
  const setInitialData = useAppStore(s => s.setInitialData);

  useEffect(() => {
    if (productsCount === 0) {
      setInitialData({
        products: seedProducts,
        categories: seedCategories,
        vouchers: seedVouchers,
        notifications: seedNotifications,
        orders: seedOrders,
        currentUser: null,
      });
    }
  }, [productsCount, setInitialData]);

  if (!fontsLoaded) return null;

  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }} />
      <ChatBox />
    </View>
  );
}
