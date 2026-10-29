import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { initials } from '../../lib/format';
import { useTheme } from '../../theme';

type Props = {
  email: string;
  size?: number;
  onPress?: () => void;
  label?: string;
};

export function Avatar({ email, size = 40, onPress, label }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors, size), [colors, size]);
  const content = <Text style={styles.text}>{initials(email)}</Text>;

  if (!onPress) {
    return <View style={styles.root}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ?? 'Открыть профиль'}
      style={({ pressed }) => [styles.root, pressed && { opacity: 0.8 }]}
    >
      {content}
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], size: number) {
  return StyleSheet.create({
    root: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary + '33',
    },
    text: { color: colors.primary, fontWeight: '800', fontSize: size * 0.36 },
  });
}
