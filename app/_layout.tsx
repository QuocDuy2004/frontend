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
import { CartFlyProvider } from '../components/CartFlyProvider';
import { View } from '../components/tw';
import { fetchCatalogData } from '../lib/api';
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
  const hydrateAuthSession = useAppStore(s => s.hydrateAuthSession);
  const hydrateFavorites = useAppStore(s => s.hydrateFavorites);

  useEffect(() => {
    let mounted = true;

    if (productsCount === 0) {
      setInitialData({
        products: seedProducts,
        categories: seedCategories,
        vouchers: seedVouchers,
        notifications: seedNotifications,
        orders: seedOrders,
      });

      fetchCatalogData()
        .then(({ categories, products }) => {
          if (!mounted || categories.length === 0 || products.length === 0) return;
          setInitialData({ categories, products });
        })
        .catch((error) => {
          console.warn('Could not load catalog from backend:', error?.message || error);
        });
    }

    return () => {
      mounted = false;
    };
  }, [productsCount, setInitialData]);

  useEffect(() => {
    hydrateAuthSession();
    hydrateFavorites();
  }, [hydrateAuthSession, hydrateFavorites]);

  if (!fontsLoaded) return null;

  return (
    <CartFlyProvider>
      <View className="flex-1">
        <Stack screenOptions={{ headerShown: false }} />
        <ChatBox />
      </View>
    </CartFlyProvider>
  );
}
