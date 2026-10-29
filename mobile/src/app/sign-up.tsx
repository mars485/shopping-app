import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '../components/Brand';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { TextField, type TextFieldRef } from '../components/ui/TextField';
import { errorMessage } from '../lib/errors';
import { useRedirectIfSignedIn } from '../lib/hooks';
import { useKeyboardHeight } from '../lib/useKeyboardHeight';
import { validateEmail, validatePassword, validatePasswordConfirm } from '../lib/validate';
import { useAuth } from '../state/auth';
import { useTheme } from '../theme';

export default function SignUpScreen() {
  useRedirectIfSignedIn();
  const { signUp } = useAuth();
  const { colors, gradient, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const passwordRef = useRef<TextFieldRef>(null);
  const confirmRef = useRef<TextFieldRef>(null);
  const keyboardHeight = useKeyboardHeight();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{
    email?: string | null;
    password?: string | null;
    confirm?: string | null;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const next = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validatePasswordConfirm(password, confirm),
    };
    setErrors(next);
    setFormError(null);

    if (next.email || next.password || next.confirm) {
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email, password);
      router.replace('/lists');
    } catch (error) {
      setFormError(errorMessage(error, 'Не удалось создать аккаунт'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {keyboardHeight === 0 ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.hero,
            { paddingTop: insets.top + 20, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            style={styles.back}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Brand size={52} tone="onPrimary" />
          <Text style={styles.heroTitle}>Новый аккаунт</Text>
          <Text style={styles.heroSubtitle}>Один аккаунт — все семейные списки на всех устройствах</Text>
        </LinearGradient>
      ) : null}

      <View style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 + keyboardHeight }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
            ]}
          >
            <TextField
              label="E-mail"
              testID="signup-email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) {
                  setErrors((current) => ({ ...current, email: null }));
                }
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              icon="mail-outline"
              error={errors.email}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <TextField
              label="Пароль"
              testID="signup-password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errors.password) {
                  setErrors((current) => ({ ...current, password: null }));
                }
              }}
              placeholder="Минимум 8 символов"
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              icon="lock-closed-outline"
              error={errors.password}
              hint="Не короче 8 символов"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              ref={passwordRef}
            />

            <TextField
              label="Повторите пароль"
              testID="signup-confirm"
              value={confirm}
              onChangeText={(value) => {
                setConfirm(value);
                if (errors.confirm) {
                  setErrors((current) => ({ ...current, confirm: null }));
                }
              }}
              placeholder="Ещё раз"
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              icon="shield-checkmark-outline"
              error={errors.confirm}
              returnKeyType="go"
              onSubmitEditing={submit}
              ref={confirmRef}
            />

            {formError ? <Banner message={formError} onDismiss={() => setFormError(null)} /> : null}

            <Button label="Создать аккаунт" onPress={submit} loading={submitting} testID="signup-submit" />
          </View>

          <Text style={[styles.legal, { color: colors.textFaint }]}>
            Регистрируясь, вы соглашаетесь с правилами семейного использования приложения. Пароль хранится в виде
            криптографического хеша, токен — в защищённом хранилище устройства.
          </Text>

          <Button label="У меня уже есть аккаунт" variant="ghost" onPress={() => router.replace('/sign-in')} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 36, gap: 10 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 6,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.6, marginTop: 4 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 20, maxWidth: 320 },
  content: { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  card: { padding: 20, gap: 16, borderWidth: StyleSheet.hairlineWidth },
  legal: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
});
