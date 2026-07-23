import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { Image, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from '../components/tw';
import { API_BASE_URL, loginWithPassword, registerAccount, type AuthSession } from '../lib/api';
import { useAuthStore } from '../store/authStore';

type AuthMode = 'login' | 'register';

const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';
const googleLogo = 'https://developers.google.com/identity/images/g-logo.png';
const facebookLogo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2023_Facebook_icon.svg/120px-2023_Facebook_icon.svg.png';

export default function AuthScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const onLogin = useAuthStore(s => s.onLogin);
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isLogin = mode === 'login';
  const canSubmit = useMemo(() => {
    if (isLogin) return email.trim().length > 3 && password.trim().length >= 6;
    return (
      name.trim().length >= 2 &&
      phone.trim().length >= 9 &&
      email.trim().length > 3 &&
      password.trim().length >= 6 &&
      confirmPassword.trim().length >= 6
    );
  }, [confirmPassword, email, isLogin, name, password, phone]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMsg('');
    setSuccessMsg('');
    setConfirmPassword('');
    setEmail('');
    setPassword(nextMode === 'login' ? '123456' : '');
  };

  const completeAuth = async (session: AuthSession) => {
    await onLogin(
      { ...session.user, avatar: session.user.avatar || session.user.avatarUrl || defaultAvatar },
      session.token,
      remember,
      session,
    );
    setSuccessMsg(isLogin ? 'Đăng nhập thành công!' : 'Đăng ký tài khoản thành công!');
    const redirectPath = typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/(tabs)/account';
    setTimeout(() => router.replace(redirectPath as never), 500);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!canSubmit) {
      setErrorMsg(isLogin ? 'Vui lòng nhập email và mật khẩu tối thiểu 6 ký tự.' : 'Vui lòng điền đầy đủ thông tin đăng ký.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = isLogin
        ? await loginWithPassword({ usernameOrEmail: email.trim(), password })
        : await registerAccount({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            password,
          });

      await completeAuth(session);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể kết nối đến backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: 'Google' | 'Facebook') => {
    setErrorMsg(`Đăng nhập bằng ${provider} chưa được kết nối với backend.`);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-zinc-950">
      <ScrollView className="flex-1" contentContainerClassName="min-h-screen justify-center px-4 py-8">
        <View className="mb-5 flex-row items-center justify-between">
          <Pressable onPress={handleBack} className="h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <View className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5">
            <Text className="text-[10px] font-black uppercase tracking-widest text-amber-300">VeloCart Secure</Text>
          </View>
        </View>

        <View className="overflow-hidden rounded-3xl border border-zinc-800 bg-white shadow-2xl">
          <View className="border-b border-zinc-100 p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-black text-zinc-950">{isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'}</Text>
                <Text className="mt-1 text-xs font-semibold text-zinc-500">
                  {isLogin ? `API: ${API_BASE_URL}` : 'Tạo hồ sơ mua sắm mới tại VeloCart'}
                </Text>
              </View>
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-amber-100">
                <ShieldCheck size={22} color="#d97706" />
              </View>
            </View>
          </View>

          {successMsg ? (
            <View className="mx-5 mt-4 flex-row items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <CheckCircle2 size={18} color="#047857" />
              <Text className="flex-1 text-xs font-bold text-emerald-700">{successMsg}</Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View className="mx-5 mt-4 flex-row items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3">
              <XCircle size={18} color="#e11d48" />
              <Text className="flex-1 text-xs font-bold text-rose-700">{errorMsg}</Text>
            </View>
          ) : null}

          <View className="p-5">
            <View className="mb-5 flex-row rounded-2xl bg-zinc-100 p-1">
              <Pressable onPress={() => switchMode('login')} className={`flex-1 rounded-xl py-3 ${isLogin ? 'bg-white shadow-sm' : ''}`}>
                <Text className={`text-center text-xs font-black ${isLogin ? 'text-zinc-950' : 'text-zinc-500'}`}>Đăng nhập</Text>
              </Pressable>
              <Pressable onPress={() => switchMode('register')} className={`flex-1 rounded-xl py-3 ${!isLogin ? 'bg-white shadow-sm' : ''}`}>
                <Text className={`text-center text-xs font-black ${!isLogin ? 'text-zinc-950' : 'text-zinc-500'}`}>Đăng ký</Text>
              </Pressable>
            </View>

            <View className="gap-3">
              {!isLogin ? (
                <>
                  <AuthField icon={<UserRound size={16} color="#71717a" />} label="Họ tên của bạn">
                    <TextInput
                      value={name}
                      onChangeText={(value) => {
                        setName(value);
                        setErrorMsg('');
                      }}
                      placeholder="Nguyễn Văn A"
                      placeholderTextColor="#a1a1aa"
                      className="text-sm font-bold text-zinc-950"
                    />
                  </AuthField>

                  <AuthField icon={<Phone size={16} color="#71717a" />} label="Số điện thoại nhận hàng">
                    <TextInput
                      value={phone}
                      onChangeText={(value) => {
                        setPhone(value);
                        setErrorMsg('');
                      }}
                      keyboardType="phone-pad"
                      placeholder="0911222333"
                      placeholderTextColor="#a1a1aa"
                      className="text-sm font-bold text-zinc-950"
                    />
                  </AuthField>
                </>
              ) : null}

              <AuthField icon={<Mail size={16} color="#71717a" />} label={isLogin ? 'Email hoặc username' : 'Địa chỉ email'}>
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setErrorMsg('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="example@gmail.com"
                  placeholderTextColor="#a1a1aa"
                  className="text-sm font-bold text-zinc-950"
                />
              </AuthField>

              <AuthField icon={<LockKeyhole size={16} color="#71717a" />} label="Mật khẩu">
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      setErrorMsg('');
                    }}
                    secureTextEntry={!showPassword}
                    placeholder="Tối thiểu 6 ký tự"
                    placeholderTextColor="#a1a1aa"
                    className="flex-1 text-sm font-bold text-zinc-950"
                  />
                  <Pressable onPress={() => setShowPassword(value => !value)} className="p-1">
                    {showPassword ? <EyeOff size={18} color="#71717a" /> : <Eye size={18} color="#71717a" />}
                  </Pressable>
                </View>
              </AuthField>

              {!isLogin ? (
                <AuthField icon={<LockKeyhole size={16} color="#71717a" />} label="Xác nhận mật khẩu">
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      setErrorMsg('');
                    }}
                    secureTextEntry={!showPassword}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor="#a1a1aa"
                    className="text-sm font-bold text-zinc-950"
                  />
                </AuthField>
              ) : null}
            </View>

            {isLogin ? (
              <View className="mt-4 flex-row items-center justify-between">
                <Pressable onPress={() => setRemember(value => !value)} className="flex-row items-center gap-2">
                  <View className={`h-5 w-5 items-center justify-center rounded-md border ${remember ? 'border-amber-500 bg-amber-500' : 'border-zinc-300 bg-white'}`}>
                    {remember ? <Check size={12} color="#fff" /> : null}
                  </View>
                  <Text className="text-xs font-bold text-zinc-600">Ghi nhớ đăng nhập</Text>
                </Pressable>
              </View>
            ) : (
              <Text className="mt-4 text-[11px] leading-5 text-zinc-500">
                Sau khi đăng ký, tài khoản sẽ được tạo trên backend và đăng nhập lại để lấy jwt-token.
              </Text>
            )}

            <Pressable disabled={!canSubmit || isSubmitting} onPress={handleSubmit} className={`mt-5 rounded-2xl py-4 ${canSubmit && !isSubmitting ? 'bg-amber-500' : 'bg-zinc-300'}`}>
              <Text className="text-center text-sm font-black text-white">
                {isSubmitting ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
              </Text>
            </Pressable>

            {isLogin ? (
              <>
                <View className="my-5 flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-zinc-100" />
                  <Text className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Hoặc tiếp tục với</Text>
                  <View className="h-px flex-1 bg-zinc-100" />
                </View>

                <View className="flex-row gap-3">
                  <SocialButton label="Google" provider="Google" onPress={() => handleSocialLogin('Google')} />
                  <SocialButton label="Facebook" provider="Facebook" onPress={() => handleSocialLogin('Facebook')} />
                </View>
              </>
            ) : null}

            <View className="mt-5 flex-row justify-center gap-1">
              <Text className="text-xs font-semibold text-zinc-500">{isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</Text>
              <Pressable onPress={() => switchMode(isLogin ? 'register' : 'login')}>
                <Text className="text-xs font-black text-amber-600">{isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthField({ children, icon, label }: { children: ReactNode; icon: ReactNode; label: string }) {
  return (
    <View>
      <Text className="mb-1 text-xs font-bold text-zinc-600">{label}</Text>
      <View className="flex-row items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
        {icon}
        <View className="flex-1">{children}</View>
      </View>
    </View>
  );
}

function SocialButton({ label, provider, onPress }: { label: string; provider: 'Google' | 'Facebook'; onPress: () => void }) {
  const isGoogle = provider === 'Google';

  return (
    <Pressable onPress={onPress} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-3">
      {isGoogle ? (
        <Image source={{ uri: googleLogo }} className="h-5 w-5" resizeMode="contain" />
      ) : (
        <Image source={{ uri: facebookLogo }} className="h-6 w-6 rounded-full" resizeMode="contain" />
      )}
      <Text className="text-xs font-black text-zinc-800">{label}</Text>
    </Pressable>
  );
}
