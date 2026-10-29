import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme';

type Variant = 'error' | 'info' | 'success';

type Props = {
  message: string;
  variant?: Variant;
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export function Banner({ message, variant = 'error', onDismiss, actionLabel, onAction }: Props) {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);

  const background = variant === 'error' ? colors.dangerSoft : variant === 'success' ? colors.primarySoft : colors.surfaceAlt;
  const tint = variant === 'error' ? colors.danger : variant === 'success' ? colors.primary : colors.text;
  const icon = variant === 'error' ? 'alert-circle' : variant === 'success' ? 'checkmark-circle' : 'information-circle';

  return (
    <View style={[styles.root, { backgroundColor: background }]} accessibilityLiveRegion="polite">
      <Ionicons name={icon} size={18} color={tint} />
      <Text style={[styles.text, { color: tint }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: tint }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Скрыть сообщение">
          <Ionicons name="close" size={16} color={tint} />
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: radius.md,
    },
    text: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
    action: { fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' },
  });
}
