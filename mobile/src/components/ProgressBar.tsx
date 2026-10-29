import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';

type Props = {
  progress: number;
  height?: number;
  tone?: 'primary' | 'muted';
  trackColor?: string;
  fillColor?: string;
};

export function ProgressBar({ progress, height = 6, tone = 'primary', trackColor, fillColor }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors, height, tone), [colors, height, tone]);
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View
      style={[styles.track, trackColor ? { backgroundColor: trackColor } : null]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View
        style={[
          styles.fill,
          fillColor ? { backgroundColor: fillColor } : null,
          { width: `${clamped * 100}%` },
        ]}
      />
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  height: number,
  tone: 'primary' | 'muted',
) {
  return StyleSheet.create({
    track: {
      height,
      borderRadius: height / 2,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
      width: '100%',
    },
    fill: {
      height: '100%',
      borderRadius: height / 2,
      backgroundColor: tone === 'primary' ? colors.primary : colors.textFaint,
    },
  });
}
