import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListCard } from '../../components/ListCard';
import { Fab } from '../../components/Fab';
import { EmptyState } from '../../components/EmptyState';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { TextField } from '../../components/ui/TextField';
import { Avatar } from '../../components/ui/Avatar';
import { errorMessage } from '../../lib/errors';
import { formatRelativeSync, pluralRu } from '../../lib/format';
import { useCurrentUser, useRefreshOnFocus, useRequireAuth } from '../../lib/hooks';
import { validateListName } from '../../lib/validate';
import { useLists } from '../../state/lists';
import { useTheme } from '../../theme';

export default function ListsScreen() {
  useRequireAuth();
  useRefreshOnFocus();

  const { colors, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const router = useRouter();
  const { state, refresh, createList, clearError } = useLists();
  const { email, userId } = useCurrentUser();

  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return state.lists;
    }
    return state.lists.filter(
      (list) =>
        list.name.toLowerCase().includes(search) ||
        list.items.some((item) => item.name.toLowerCase().includes(search)),
    );
  }, [query, state.lists]);

  const openCreate = () => {
    setCreating(true);
    setName('');
    setNameError(null);
    setCreateError(null);
  };

  const closeCreate = () => {
    setCreating(false);
    setSubmitting(false);
  };

  const submitCreate = async () => {
    const validation = validateListName(name);
    setNameError(validation);
    if (validation) {
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      const list = await createList(name);
      closeCreate();
      router.push(`/lists/${list.id}`);
    } catch (error) {
      setCreateError(errorMessage(error, 'Не удалось создать список'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = state.lists.reduce((acc, list) => acc + list.items.length, 0);
  const isEmpty = state.lists.length === 0;
  const isLoading = (state.status === 'loading' || state.status === 'idle') && isEmpty;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Семейный шопинг</Text>
          <Text style={styles.title}>Мои списки</Text>
          <Text style={styles.sync}>
            {state.offline
              ? 'Офлайн · сохранённые данные'
              : `Обновлено ${formatRelativeSync(state.lastSync)}`}
            {state.lists.length > 0 ? ` · ${pluralRu(totalItems, 'item')}` : ''}
          </Text>
        </View>
        {email ? <Avatar email={email} onPress={() => router.push('/settings')} /> : null}
      </View>

      {state.error ? (
        <View style={styles.bannerWrap}>
          <Banner
            message={state.error}
            onDismiss={clearError}
            actionLabel="Повторить"
            onAction={() => void refresh()}
          />
        </View>
      ) : null}

      {state.lists.length > 0 ? (
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.textFaint} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Найти список или товар"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Поиск по спискам"
          />
          {query ? (
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textFaint}
              onPress={() => setQuery('')}
              accessibilityLabel="Очистить поиск"
            />
          ) : null}
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Загружаем списки…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, isEmpty && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <ListCard
              list={item}
              shared={!!userId && item.owner_id !== userId}
              onPress={() => router.push(`/lists/${item.id}`)}
              testID={`list-card-${item.id}`}
            />
          )}
          ListEmptyComponent={
            query ? (
              <EmptyState
                icon="search"
                title="Ничего не найдено"
                description={`По запросу «${query}» списков и товаров нет.`}
              />
            ) : (
              <EmptyState
                icon="basket-outline"
                title="Пока нет списков"
                description="Создайте первый список — например, «Продукты на неделю» — и делитесь им с семьёй."
                actionLabel="Создать список"
                onAction={openCreate}
              />
            )
          }
        />
      )}

      <Fab label="Список" onPress={openCreate} testID="create-list" />

      <Sheet
        visible={creating}
        onClose={closeCreate}
        title="Новый список"
        subtitle="Дайте понятное имя: «Продукты», «Дача», «День рождения»"
        testID="create-list-sheet"
      >
        <TextField
          label="Название"
          testID="create-list-name"
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (nameError) {
              setNameError(null);
            }
          }}
          placeholder="Продукты на неделю"
          maxLength={100}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submitCreate}
          error={nameError}
        />
        {createError ? <Banner message={createError} onDismiss={() => setCreateError(null)} /> : null}
        <Button
          label="Создать"
          onPress={submitCreate}
          loading={submitting}
          disabled={!name.trim()}
          testID="create-list-submit"
        />
      </Sheet>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
    },
    headerText: { flex: 1, gap: 2 },
    eyebrow: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.7 },
    sync: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    bannerWrap: { paddingHorizontal: 20, paddingBottom: 8 },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 12,
      paddingHorizontal: 14,
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 10 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 13, color: colors.textMuted },
    listContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120, gap: 12 },
    listContentEmpty: { flexGrow: 1, justifyContent: 'center' },
  });
}
