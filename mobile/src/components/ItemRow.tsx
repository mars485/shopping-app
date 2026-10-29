import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Item } from '../api/types';
import { formatMoney, formatQuantity, round2 } from '../lib/format';
import { useTheme } from '../theme';

type Props = {
  item: Item;
  onToggle: () => void;
  onEdit: () => void;
  testID?: string;
};

export function ItemRow({ item, onToggle, onEdit, testID }: Props) {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const lineTotal = round2(item.price * item.quantity);

  const handleToggle = () => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync().catch(() => undefined);
    }
    onToggle();
  };

  return (
    <View style={styles.row} testID={testID}>
      <Pressable
        onPress={handleToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        accessibilityLabel={`${item.name}, ${formatQuantity(item.quantity)} ${item.unit}`}
        hitSlop={6}
        style={styles.main}
      >
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked ? <Ionicons name="checkmark" size={15} color={colors.onPrimary} /> : null}
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.name, item.checked && styles.nameChecked]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatQuantity(item.quantity)} {item.unit}
            {item.price > 0 ? ` · ${formatMoney(item.price)} за ед.` : ''}
          </Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={[styles.price, item.checked && styles.priceChecked]}>
            {item.price > 0 ? formatMoney(lineTotal) : '—'}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onEdit}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Изменить ${item.name}`}
        style={({ pressed }) => [styles.edit, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textFaint} />
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingLeft: 14,
      paddingRight: 6,
    },
    main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    textBlock: { flex: 1, gap: 3 },
    name: { fontSize: 15, fontWeight: '600', color: colors.text },
    nameChecked: { textDecorationLine: 'line-through', color: colors.textFaint },
    meta: { fontSize: 12, color: colors.textMuted },
    priceBlock: { alignItems: 'flex-end' },
    price: { fontSize: 14, fontWeight: '700', color: colors.text },
    priceChecked: { color: colors.textFaint },
    edit: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  });
}
