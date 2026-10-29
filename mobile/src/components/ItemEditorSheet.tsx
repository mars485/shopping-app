import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Item, ItemInput } from '../api/types';
import { formatQuantity } from '../lib/format';
import { parseDecimalInput, validateItemName, validatePrice, validateQuantity } from '../lib/validate';
import { useTheme } from '../theme';
import { Banner } from './ui/Banner';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { TextField } from './ui/TextField';

export const UNITS = ['шт', 'кг', 'г', 'л', 'мл', 'упак'] as const;

type Props = {
  visible: boolean;
  editableItem?: Item | null;
  onClose: () => void;
  onSubmit: (input: ItemInput) => Promise<void>;
  onDelete?: () => void;
  submitLabel?: string;
};

export function ItemEditorSheet({
  visible,
  editableItem,
  onClose,
  onSubmit,
  onDelete,
  submitLabel,
}: Props) {
  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);

  const isEdit = !!editableItem;
  const [name, setName] = useState(editableItem?.name ?? '');
  const [quantity, setQuantity] = useState(editableItem ? formatQuantity(editableItem.quantity) : '1');
  const [unit, setUnit] = useState<string>(editableItem?.unit ?? 'шт');
  const [price, setPrice] = useState(
    editableItem && editableItem.price > 0 ? String(editableItem.price).replace('.', ',') : '',
  );
  const [errors, setErrors] = useState<{ name?: string | null; quantity?: string | null; price?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = (delta: number) => {
    const current = parseDecimalInput(quantity) ?? 0;
    const next = Math.max(0.5, Math.round((current + delta) * 100) / 100);
    setQuantity(formatQuantity(next));
  };

  const submit = async () => {
    const next = {
      name: validateItemName(name),
      quantity: validateQuantity(quantity),
      price: validatePrice(price),
    };
    setErrors(next);
    setFormError(null);
    if (next.name || next.quantity || next.price) {
      return;
    }

    const parsedPrice = parseDecimalInput(price);
    const input: ItemInput = {
      name: name.trim(),
      quantity: parseDecimalInput(quantity) ?? 1,
      unit: unit.trim() || 'шт',
      price: parsedPrice && !Number.isNaN(parsedPrice) ? parsedPrice : 0,
    };

    setSubmitting(true);
    try {
      await onSubmit(input);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Не удалось сохранить товар');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Изменить товар' : 'Новый товар'}
      subtitle={isEdit ? 'Обновите название, количество или цену' : 'Добавьте позицию в список покупок'}
      testID="item-sheet"
    >
      <TextField
        label="Что купить"
        testID="item-name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (errors.name) {
            setErrors((current) => ({ ...current, name: null }));
          }
        }}
        placeholder="Молоко 3,2%"
        maxLength={120}
        autoFocus={!isEdit}
        error={errors.name}
        returnKeyType="next"
      />

      <View style={styles.inline}>
        <View style={styles.quantityBlock}>
          <Text style={styles.label}>Количество</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => step(-1)}
              accessibilityRole="button"
              accessibilityLabel="Уменьшить количество"
              hitSlop={6}
              style={styles.stepButton}
            >
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
            <TextField
              testID="item-quantity"
              value={quantity}
              onChangeText={(value) => {
                setQuantity(value);
                if (errors.quantity) {
                  setErrors((current) => ({ ...current, quantity: null }));
                }
              }}
              keyboardType="decimal-pad"
              style={styles.quantityInput}
              error={errors.quantity}
            />
            <Pressable
              onPress={() => step(1)}
              accessibilityRole="button"
              accessibilityLabel="Увеличить количество"
              hitSlop={6}
              style={styles.stepButton}
            >
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.priceBlock}>
          <TextField
            label="Цена за единицу, ₽"
            testID="item-price"
            value={price}
            onChangeText={(value) => {
              setPrice(value);
              if (errors.price) {
                setErrors((current) => ({ ...current, price: null }));
              }
            }}
            placeholder="0,00"
            keyboardType="decimal-pad"
            error={errors.price}
          />
        </View>
      </View>

      <View style={styles.unitsBlock}>
        <Text style={styles.label}>Единица</Text>
        <View style={styles.units}>
          {UNITS.map((option) => {
            const active = option === unit;
            return (
              <Pressable
                key={option}
                onPress={() => setUnit(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.unit, active && styles.unitActive]}
              >
                <Text style={[styles.unitText, active && styles.unitTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {formError ? <Banner message={formError} onDismiss={() => setFormError(null)} /> : null}

      <Button
        label={submitLabel ?? (isEdit ? 'Сохранить' : 'Добавить в список')}
        onPress={submit}
        loading={submitting}
        testID="item-submit"
      />

      {isEdit && onDelete ? (
        <Button label="Удалить товар" variant="ghost" icon="trash-outline" onPress={onDelete} />
      ) : null}
    </Sheet>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    inline: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    quantityBlock: { flex: 1, gap: 6 },
    priceBlock: { flex: 1 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepButton: {
      width: 42,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    quantityInput: { flex: 1, textAlign: 'center' },
    unitsBlock: { gap: 8 },
    units: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    unit: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unitActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    unitText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    unitTextActive: { color: colors.primary },
  });
}
