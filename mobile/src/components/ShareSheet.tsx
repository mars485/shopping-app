import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { validateEmail } from '../lib/validate';
import { useTheme } from '../theme';
import { Banner } from './ui/Banner';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { TextField } from './ui/TextField';

type Props = {
  visible: boolean;
  listName: string;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
};

export function ShareSheet({ visible, listName, onClose, onSubmit }: Props) {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const validation = validateEmail(email);
    setError(validation);
    if (validation) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(email);
      onClose();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Не удалось поделиться списком');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Поделиться списком"
      subtitle={`«${listName}» станет доступен второму участнику — он сможет добавлять и отмечать товары.`}
      testID="share-sheet"
    >
      <View style={[styles.tip, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}>
        <Ionicons name="information-circle" size={18} color={colors.primary} />
        <Text style={styles.tipText}>
          Участник должен быть зарегистрирован в Shopping с этим e-mail. Ссылки-приглашения бэкенд не поддерживает.
        </Text>
      </View>

      <TextField
        label="E-mail участника"
        testID="share-email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (error) {
            setError(null);
          }
        }}
        placeholder="family@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        icon="person-add-outline"
        error={error}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      {formError ? <Banner message={formError} onDismiss={() => setFormError(null)} /> : null}

      <Button label="Открыть доступ" onPress={submit} loading={submitting} testID="share-submit" />
    </Sheet>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    tip: { flexDirection: 'row', gap: 10, padding: 12 },
    tipText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  });
}
