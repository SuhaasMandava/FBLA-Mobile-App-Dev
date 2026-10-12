import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { getErrorMessage } from '../services/errors';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { email, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } catch (e) {
            setSigningOut(false);
            Alert.alert("Couldn't sign out", getErrorMessage(e));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View accessible accessibilityLabel={`Signed in as ${email ?? 'unknown'}`} style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Signed in as</Text>
        <Text style={[styles.cardValue, { color: colors.text }]}>{email ?? 'Unknown'}</Text>
      </View>
      <PrimaryButton label="Sign Out" variant="secondary" onPress={confirmSignOut} loading={signingOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 16, padding: 16, gap: 4 },
  cardLabel: { fontSize: 12, fontWeight: '500' },
  cardValue: { fontSize: 16, fontWeight: '600' },
});
