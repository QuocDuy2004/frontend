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
import { useAuthStore } from '../store/authStore';
import { useCatalogStore } from '../store/catalogStore';
import { useFavoriteStore } from '../store/favoriteStore';
import { useNotificationStore } from '../store/notificationStore';
import { useOrderStore } from '../store/orderStore';
import { useVoucherStore } from '../store/voucherStore';
import { useCartStore } from '../store/cartStore';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Signika: Signika_400Regular,
    'Signika Medium': Signika_500Medium,
    'Signika SemiBold': Signika_600SemiBold,
    'Signika Bold': Signika_700Bold,
  });
  const hydrateCatalog = useCatalogStore(s => s.hydrateCatalog);
  const hydrateAuthSession = useAuthStore(s => s.hydrateAuthSession);
  const hydrateFavorites = useFavoriteStore(s => s.hydrateFavorites);
  const hydrateNotifications = useNotificationStore(s => s.hydrateNotifications);
  const hydrateVouchers = useVoucherStore(s => s.hydrateVouchers);
  const hydrateUserOrders = useOrderStore(s => s.hydrateUserOrders);
  const currentUserId = useAuthStore(s => s.currentUser?.id);
  const currentUserEmail = useAuthStore(s => s.currentUser?.email);
  const productIdsKey = useCatalogStore(s => s.products.map(product => product.id).join('|'));
  const hydrateUserCart = useCartStore(s => s.hydrateUserCart);

  useEffect(() => {
    hydrateCatalog().catch((error) => {
      console.warn('Could not load catalog from backend:', error?.message || error);
    });
  }, [hydrateCatalog]);

  useEffect(() => {
    hydrateAuthSession().finally(() => {
      hydrateFavorites();
      hydrateNotifications().catch(() => undefined);
      hydrateVouchers().catch(() => undefined);
      hydrateUserOrders().catch(() => undefined);
    });
  }, [hydrateAuthSession, hydrateFavorites, hydrateNotifications, hydrateUserOrders, hydrateVouchers]);

  useEffect(() => {
    if ((!currentUserId && !currentUserEmail) || !productIdsKey) return;
    hydrateUserCart();
    hydrateFavorites();
    hydrateNotifications().catch(() => undefined);
    hydrateVouchers().catch(() => undefined);
    hydrateUserOrders().catch(() => undefined);
  }, [currentUserEmail, currentUserId, hydrateFavorites, hydrateNotifications, hydrateUserCart, hydrateUserOrders, hydrateVouchers, productIdsKey]);

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
