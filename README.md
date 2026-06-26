# VeloCart Expo Router split

Đây là bản tách từ component Next.js `CustomerInterface` thành cấu trúc Expo Router:

- `app/(tabs)/index.tsx`: Home — banner, danh mục, flash sale, sản phẩm nổi bật
- `app/(tabs)/catalog.tsx`: Catalog — tìm kiếm, lọc danh mục, danh sách sản phẩm
- `app/(tabs)/cart.tsx`: Cart — giỏ hàng, tăng/giảm/xóa, chuyển checkout
- `app/(tabs)/notifications.tsx`: Notifications
- `app/(tabs)/account.tsx`: Account + lịch sử đơn hàng
- `app/product/[id].tsx`: Product detail
- `app/checkout.tsx`: Checkout
- `app/chat.tsx`: Chat CSKH
- `store/*`: Zustand stores tách state dùng chung
- `components/*`: UI dùng lại

Lưu ý: file gốc là Next.js dùng `div`, `img`, `localStorage`, Tailwind web và `lucide-react`. Bản này chuyển sang React Native/Expo Router dùng `View`, `Text`, `Image`, `ScrollView`, `Pressable`, `lucide-react-native`.
