import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar } from '../components/AppBar';
import { Avatar } from '../components/ui/Avatar';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { APP_BUILD, APP_NAME, APP_VERSION, API_URL } from '../config';
import { errorMessage } from '../lib/errors';
import { formatRelativeSync, pluralRu } from '../lib/format';
import { useRequireAuth } from '../lib/hooks';
import { useAuth } from '../state/auth';
import { useLists } from '../state/lists';
import { useTheme, type ThemeMode } from '../theme';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'system', label: 'Системная', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Светлая', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Тёмная', icon: 'moon-outline' },
];

type HealthStatus = 'idle' | 'checking' | 'ok' | 'fail';

export default function SettingsScreen() {
  useRequireAuth();
  const { colors, radius, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const router = useRouter();
  const { state: auth, signOut, api } = useAuth();
  const { state: listsState, refresh } = useLists();

  const [health, setHealth] = useState<HealthStatus>('idle');
  const [healthMessage, setHealthMessage] = useState<string | null>(null);

  const checkConnection = async () => {
    setHealth('checking');
    setHealthMessage(null);
    try {
      const response = await api.health();
      setHealth('ok');
      setHealthMessage(response.status === 'ok' ? 'Сервер отвечает, всё в порядке' : `Статус: ${response.status}`);
    } catch (error) {
      setHealth('fail');
      setHealthMessage(errorMessage(error, 'Сервер недоступен'));
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Выйти из аккаунта?', 'Локальный кэш списков будет удалён с устройства.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  const itemCount = listsState.lists.reduce((acc, list) => acc + list.items.length, 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppBar title="Настройки" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { borderRadius: radius.lg }]}>
          <View style={styles.profile}>
            <Avatar email={auth.session?.email ?? 'shopping@local'} size={56} />
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>
                {auth.session?.email ?? 'Гость'}
              </Text>
              <Text style={styles.profileMeta}>
                {pluralRu(listsState.lists.length, 'list')} · {pluralRu(itemCount, 'item')}
              </Text>
            </View>
          </View>
          <View style={styles.profileFooter}>
            <Text style={styles.profileMeta}>
              Синхронизация: {listsState.offline ? 'офлайн' : formatRelativeSync(listsState.lastSync)}
            </Text>
            <Pressable onPress={() => void refresh()} hitSlop={8} style={styles.linkButton}>
              <Ionicons name="refresh" size={15} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>Обновить</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Оформление</Text>
        <View style={[styles.card, { borderRadius: radius.lg }]}>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((option) => {
              const active = option.mode === mode;
              return (
                <Pressable
                  key={option.mode}
                  onPress={() => setMode(option.mode)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.themeOption, active && styles.themeOptionActive]}
                >
                  <Ionicons name={option.icon} size={18} color={active ? colors.primary : colors.textMuted} />
                  <Text style={[styles.themeText, active && { color: colors.primary }]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Подключение</Text>
        <View style={[styles.card, { borderRadius: radius.lg }]}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Сервер</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {API_URL.replace(/^https?:\/\//, '')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Статус</Text>
            <Text style={styles.rowValue}>
              {health === 'ok' ? 'доступен' : health === 'fail' ? 'нет связи' : health === 'checking' ? 'проверяем…' : 'не проверялся'}
            </Text>
          </View>
          {healthMessage ? (
            <Banner
              message={healthMessage}
              variant={health === 'ok' ? 'success' : health === 'fail' ? 'error' : 'info'}
              onDismiss={() => setHealthMessage(null)}
            />
          ) : null}
          <Button
            label="Проверить подключение"
            variant="secondary"
            size="md"
            onPress={() => void checkConnection()}
            loading={health === 'checking'}
            icon="pulse-outline"
          />
        </View>

        <Text style={styles.sectionLabel}>О приложении</Text>
        <View style={[styles.card, { borderRadius: radius.lg }]}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Приложение</Text>
            <Text style={styles.rowValue}>{APP_NAME}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Версия</Text>
            <Text style={styles.rowValue}>
              {APP_VERSION} ({APP_BUILD})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Платформа</Text>
            <Text style={styles.rowValue}>React Native · Expo SDK 58</Text>
          </View>
          <Text style={styles.note}>
            Списки синхронизируются между устройствами через сервер. Токен доступа хранится в защищённом хранилище
            Android (Keystore).
          </Text>
        </View>

        <Button label="Выйти из аккаунта" variant="secondary" icon="log-out-outline" onPress={confirmSignOut} />

        <Text style={styles.footer}>Shopping · семейные списки покупок</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
    card: {
      backgroundColor: colors.surface,
      padding: 16,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    profileText: { flex: 1, gap: 3 },
    profileName: { fontSize: 16, fontWeight: '700', color: colors.text },
    profileMeta: { fontSize: 12, color: colors.textMuted },
    profileFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    linkButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    linkText: { fontSize: 13, fontWeight: '700' },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textFaint,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 6,
    },
    themeRow: { flexDirection: 'row', gap: 8 },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    themeOptionActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    themeText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    rowLabel: { fontSize: 13, color: colors.textMuted },
    rowValue: { fontSize: 13, fontWeight: '700', color: colors.text, flexShrink: 1, textAlign: 'right' },
    note: { fontSize: 12, lineHeight: 18, color: colors.textFaint },
    footer: { textAlign: 'center', fontSize: 11, color: colors.textFaint, marginTop: 8 },
  });
}
