import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ControlledFormField } from '../components/ControlledFormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useJoinTripForm } from '../hooks/useJoinTripForm';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from './types';

export default function JoinTripScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const form = useJoinTripForm(() => navigation.popToTop());

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.intro, { color: colors.labelSecondary }]}>
          Ask the trip organizer for their 6-character invite code.
        </Text>

        <ControlledFormField
          control={form.control}
          name="code"
          label="Invite code"
          hint="Six letters and numbers."
          placeholder="e.g. K7M9PQ"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={form.submit}
        />

        <PrimaryButton
          label="Join Trip"
          hint="Adds you to the trip that matches this code."
          onPress={form.submit}
          loading={form.submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  intro: { fontSize: 14 },
});
