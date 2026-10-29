import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '../components/Brand';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { TextField, type TextFieldRef } from '../components/ui/TextField';
import { errorMessage } from '../lib/errors';
import { useRedirectIfSignedIn } from '../lib/hooks';
import { useKeyboardHeight } from '../lib/useKeyboardHeight';
import { validateEmail, validatePassword } from '../lib/validate';
import { useAuth } from '../state/auth';
import { useTheme } from '../theme';

export default function SignInScreen() {
  useRedirectIfSignedIn();
  const { signIn, state, clearNotice } = useAuth();
  const { colors, gradient, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const passwordRef = useRef<TextFieldRef>(null);
  const keyboardHeight = useKeyboardHeight();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(null);

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace('/lists');
    } catch (error) {
      setFormError(errorMessage(error, 'Не удалось войти'));
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
            { paddingTop: insets.top + 36, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
          ]}
        >
          <Brand size={60} tone="onPrimary" />
          <Text style={styles.heroTitle}>Shopping</Text>
          <Text style={styles.heroSubtitle}>Семейные списки покупок — всегда под рукой</Text>
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
          {state.notice ? <Banner message={state.notice} variant="info" onDismiss={clearNotice} /> : null}

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>С возвращением</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Войдите, чтобы увидеть свои списки на любом устройстве
            </Text>

            <TextField
              label="E-mail"
              testID="signin-email"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (emailError) {
                  setEmailError(null);
                }
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              icon="mail-outline"
              error={emailError}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <TextField
              label="Пароль"
              testID="signin-password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (passwordError) {
                  setPasswordError(null);
                }
              }}
              placeholder="••••••••"
              secure
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              icon="lock-closed-outline"
              error={passwordError}
              returnKeyType="go"
              onSubmitEditing={submit}
              ref={passwordRef}
            />

            {formError ? <Banner message={formError} onDismiss={() => setFormError(null)} /> : null}

            <Button label="Войти" onPress={submit} loading={submitting} testID="signin-submit" />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>Впервые здесь?</Text>
            <Button
              label="Создать аккаунт"
              variant="secondary"
              onPress={() => router.push('/sign-up')}
              testID="signin-register"
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 44, gap: 10 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.8, marginTop: 6 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 21, maxWidth: 300 },
  content: { paddingHorizontal: 20, paddingTop: 18, gap: 16 },
  card: { padding: 20, gap: 16, borderWidth: StyleSheet.hairlineWidth },
  cardTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  cardSubtitle: { fontSize: 13, lineHeight: 19, marginTop: -8 },
  footer: { gap: 10, marginTop: 4 },
  footerText: { fontSize: 13, textAlign: 'center' },
});
