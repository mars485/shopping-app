import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar, AppBarAction } from '../../components/AppBar';
import { EmptyState } from '../../components/EmptyState';
import { Fab } from '../../components/Fab';
import { ItemEditorSheet } from '../../components/ItemEditorSheet';
import { ItemRow } from '../../components/ItemRow';
import { ProgressBar } from '../../components/ProgressBar';
import { ShareSheet } from '../../components/ShareSheet';
import { Banner } from '../../components/ui/Banner';
import type { Item, ItemInput } from '../../api/types';
import { formatMoney, listStats, pluralRu } from '../../lib/format';
import { useCurrentUser, useRefreshOnFocus, useRequireAuth } from '../../lib/hooks';
import { useLists } from '../../state/lists';
import { useTheme } from '../../theme';

export default function ListDetailScreen() {
  useRequireAuth();
  useRefreshOnFocus(5_000);

  const { colors, gradient, radius } = useTheme();
  const styles = useMemo(() => makeStyles(colors, radius), [colors, radius]);
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const listId = Array.isArray(params.id) ? params.id[0] : params.id;

  const {
    state,
    refresh,
    toggleItem,
    addItem,
    updateItem,
    deleteItem,
    deleteList,
    shareList,
    clearError,
  } = useLists();
  const { userId } = useCurrentUser();

  const list = useMemo(() => state.lists.find((entry) => entry.id === listId), [listId, state.lists]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const stats = useMemo(() => listStats(list ?? { items: [] }), [list]);
  const undone = list?.items.filter((item) => !item.checked) ?? [];
  const done = list?.items.filter((item) => item.checked) ?? [];
  const isOwner = !!userId && list?.owner_id === userId;

  const openCreate = () => {
    setEditing(null);
    setEditorVisible(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setEditorVisible(true);
  };

  const submitItem = async (input: ItemInput) => {
    if (!list) {
      return;
    }
    if (editing) {
      await updateItem(list.id, editing.id, input);
    } else {
      await addItem(list.id, input);
    }
  };

  const confirmDeleteItem = () => {
    if (!list || !editing) {
      return;
    }
    const target = editing;
    setEditorVisible(false);
    setEditing(null);
    Alert.alert('Удалить товар?', `«${target.name}» будет удалён из списка.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          void deleteItem(list.id, target.id);
        },
      },
    ]);
  };

  const confirmDeleteList = () => {
    if (!list) {
      return;
    }
    Alert.alert('Удалить список?', `«${list.name}» и все его товары будут удалены. Действие необратимо.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          void deleteList(list.id)
            .then(() => router.back())
            .catch(() => undefined);
        },
      },
    ]);
  };

  const submitShare = async (email: string) => {
    if (!list) {
      return;
    }
    await shareList(list.id, email);
    setNotice(`Доступ к списку открыт для ${email}`);
  };

  if (!list) {
    const loading = state.status === 'loading' || state.status === 'idle';
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <AppBar title="Список" onBack={() => router.back()} />
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <EmptyState
            icon="alert-circle-outline"
            title="Список не найден"
            description="Возможно, его удалили или доступ был закрыт."
            actionLabel="К спискам"
            onAction={() => router.replace('/lists')}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppBar
        title={list.name}
        subtitle={`${stats.checkedCount} из ${stats.totalCount} куплено`}
        onBack={() => router.back()}
        right={
          <>
            {isOwner ? (
              <AppBarAction
                icon="share-social-outline"
                label="Поделиться списком"
                tone="primary"
                onPress={() => setShareVisible(true)}
              />
            ) : null}
            {isOwner ? (
              <AppBarAction
                icon="trash-outline"
                label="Удалить список"
                tone="danger"
                onPress={confirmDeleteList}
              />
            ) : null}
          </>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {state.offline ? (
          <Banner
            message="Нет связи с сервером. Изменения могут не сохраниться — проверьте интернет."
            variant="info"
          />
        ) : null}

        {state.error ? (
          <Banner message={state.error} onDismiss={clearError} actionLabel="Повторить" onAction={() => void refresh()} />
        ) : null}

        {notice ? (
          <Banner message={notice} variant="success" onDismiss={() => setNotice(null)} />
        ) : null}

        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.summary, { borderRadius: radius.lg }]}
        >
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>Сумма списка</Text>
              <Text style={styles.summaryValue}>{formatMoney(stats.sum)}</Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressValue}>{Math.round(stats.progress * 100)}%</Text>
            </View>
          </View>

          <ProgressBar progress={stats.progress} height={8} trackColor="rgba(255,255,255,0.25)" fillColor="#FFFFFF" />

          <View style={styles.summaryBottom}>
            <Text style={styles.summaryMeta}>
              {stats.totalCount === 0 ? 'Пока пусто' : `${pluralRu(stats.checkedCount, 'item')} в корзине`}
            </Text>
            <Text style={styles.summaryMeta}>Осталось {formatMoney(Math.max(0, stats.sum - stats.checkedSum))}</Text>
          </View>
        </LinearGradient>

        {list.items.length === 0 ? (
          <EmptyState
            icon="bag-add-outline"
            title="Список пуст"
            description="Добавьте первый товар — количество и цену можно указать сразу."
            actionLabel="Добавить товар"
            onAction={openCreate}
          />
        ) : (
          <>
            <SectionHeader title="Купить" count={undone.length} />
            {undone.length === 0 ? (
              <View style={[styles.allDone, { backgroundColor: colors.primarySoft, borderRadius: radius.md }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <Text style={[styles.allDoneText, { color: colors.primary }]}>Всё куплено — отличная работа!</Text>
              </View>
            ) : (
              undone.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => void toggleItem(list.id, item.id)}
                  onEdit={() => openEdit(item)}
                  testID={`item-${item.id}`}
                />
              ))
            )}

            {done.length > 0 ? (
              <>
                <SectionHeader title="В корзине" count={done.length} tone="muted" />
                {done.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => void toggleItem(list.id, item.id)}
                    onEdit={() => openEdit(item)}
                    testID={`item-${item.id}`}
                  />
                ))}
              </>
            ) : null}
          </>
        )}

        {!isOwner ? (
          <View style={styles.memberHint}>
            <Ionicons name="people-outline" size={16} color={colors.textFaint} />
            <Text style={styles.memberHintText}>
              Это общий список. Удалять его и открывать доступ может только владелец.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Fab label="Товар" onPress={openCreate} testID="add-item" />

      {editorVisible ? (
        <ItemEditorSheet
          visible
          editableItem={editing}
          onClose={() => {
            setEditorVisible(false);
            setEditing(null);
          }}
          onSubmit={submitItem}
          onDelete={editing ? confirmDeleteItem : undefined}
        />
      ) : null}

      {shareVisible ? (
        <ShareSheet
          visible
          listName={list.name}
          onClose={() => setShareVisible(false)}
          onSubmit={submitShare}
        />
      ) : null}
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  count,
  tone = 'default',
}: {
  title: string;
  count: number;
  tone?: 'default' | 'muted';
}) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '800',
          color: tone === 'muted' ? colors.textMuted : colors.text,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          minWidth: 24,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted }}>{count}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors'], radius: ReturnType<typeof useTheme>['radius']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 20, paddingBottom: 120, gap: 10 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    summary: { padding: 18, gap: 14, marginBottom: 4 },
    summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    summaryLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
    summaryValue: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.8, marginTop: 2 },
    progressBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    progressValue: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    summaryBottom: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryMeta: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    allDone: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
    allDoneText: { fontSize: 13, fontWeight: '700' },
    memberHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 12 },
    memberHintText: { flex: 1, fontSize: 12, color: colors.textFaint, lineHeight: 17 },
  });
}
