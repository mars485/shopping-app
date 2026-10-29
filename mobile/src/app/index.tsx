import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Brand } from '../components/Brand';
import { useAuth } from '../state/auth';
import { useTheme } from '../theme';

export default function IndexScreen() {
  const { state } = useAuth();
  const { colors } = useTheme();

  if (state.status === 'loading') {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Brand size={64} withWordmark />
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      </View>
    );
  }

  return <Redirect href={state.status === 'signedIn' ? '/lists' : '/sign-in'} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  spinner: { marginTop: 8 },
});
