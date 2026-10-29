import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';

type Props = {
  size?: number;
  tone?: 'default' | 'onPrimary';
  withWordmark?: boolean;
};

/** Логотип приложения: корзина в скруглённом квадрате. */
export function Brand({ size = 48, tone = 'default', withWordmark = false }: Props) {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius, size, tone), [colors, radius, size, tone]);

  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        <Ionicons name="basket" size={size * 0.5} color={tone === 'onPrimary' ? colors.primary : colors.onPrimary} />
      </View>
      {withWordmark ? <Text style={styles.wordmark}>Shopping</Text> : null}
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  radius: ReturnType<typeof useTheme>['radius'],
  size: number,
  tone: 'default' | 'onPrimary',
) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    mark: {
      width: size,
      height: size,
      borderRadius: size * 0.3,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tone === 'onPrimary' ? '#FFFFFF' : colors.primary,
      shadowColor: '#000000',
      shadowOpacity: tone === 'onPrimary' ? 0.15 : 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    wordmark: {
      fontSize: size * 0.52,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: tone === 'onPrimary' ? '#FFFFFF' : colors.text,
    },
  });
}
