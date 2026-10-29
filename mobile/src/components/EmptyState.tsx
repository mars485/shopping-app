import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './ui/Button';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);

  return (
    <View style={styles.root}>
      <View style={styles.badge}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} size="md" icon="add" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    root: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28, gap: 12 },
    badge: {
      width: 72,
      height: 72,
      borderRadius: radius.xl,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
    description: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    action: { marginTop: 8 },
  });
}
