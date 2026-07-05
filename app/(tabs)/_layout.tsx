import { Tabs } from 'expo-router';
import { Bell, Grid, Home, ShoppingBag, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#f59e0b' }}>
      <Tabs.Screen name="index" options={{ title: 'Trang chủ', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="catalog" options={{ title: 'Sản phẩm', tabBarIcon: ({ color, size }) => <Grid color={color} size={size} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Giỏ hàng', tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Thông báo', tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
    </Tabs>
  );
}
