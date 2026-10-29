import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ShoppingList } from '../api/types';
import { formatListSubtitle, formatMoney, listStats } from '../lib/format';
import { useTheme } from '../theme';
import { ProgressBar } from './ProgressBar';

type Props = {
  list: ShoppingList;
  onPress: () => void;
  shared?: boolean;
  testID?: string;
};

export function ListCard({ list, onPress, shared = false, testID }: Props) {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const stats = listStats(list);
  const done = stats.totalCount > 0 && stats.remaining === 0;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Список ${list.name}, ${formatListSubtitle(list)}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={[styles.icon, done && styles.iconDone]}>
          <Ionicons
            name={done ? 'checkmark-done' : 'basket-outline'}
            size={20}
            color={done ? colors.primary : colors.primary}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {list.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {formatListSubtitle(list)}
          </Text>
        </View>
        {shared ? (
          <View style={styles.sharedBadge}>
            <Ionicons name="people" size={12} color={colors.textMuted} />
            <Text style={styles.sharedText}>Общий</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <ProgressBar progress={stats.progress} />
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {stats.totalCount === 0 ? 'Нет товаров' : `${stats.checkedCount} из ${stats.totalCount} куплено`}
          </Text>
          <Text style={styles.sum}>{formatMoney(stats.sum)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
      gap: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    pressed: { transform: [{ scale: 0.995 }], opacity: 0.96 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconDone: { backgroundColor: colors.primarySoft },
    titleBlock: { flex: 1, gap: 3 },
    name: { fontSize: 16, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted },
    sharedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    sharedText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
    bottom: { gap: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    meta: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    sum: { fontSize: 15, fontWeight: '800', color: colors.text },
  });
}
