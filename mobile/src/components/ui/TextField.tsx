import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useMemo, useState, type ComponentRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useTheme } from '../../theme';

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  testID?: string;
};

export type TextFieldRef = ComponentRef<typeof TextInput>;

export const TextField = forwardRef<TextFieldRef, Props>(function TextField(
  { label, error, hint, icon, secure = false, style, testID, ...rest },
  ref,
) {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.focused, !!error && styles.invalid]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.textFaint} /> : null}
        <TextInput
          ref={ref}
          testID={testID}
          style={[styles.input, style]}
          placeholderTextColor={colors.textFaint}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          secureTextEntry={secure && !revealed}
          {...rest}
          accessibilityLabel={rest.accessibilityLabel ?? label}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Скрыть пароль' : 'Показать пароль'}
            hitSlop={10}
            onPress={() => setRevealed((value) => !value)}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    wrapper: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 52,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    focused: { borderColor: colors.primary },
    invalid: { borderColor: colors.danger },
    input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 14 },
    error: { fontSize: 12, color: colors.danger, fontWeight: '600' },
    hint: { fontSize: 12, color: colors.textFaint },
  });
}
