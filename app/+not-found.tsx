import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, TYPE } from '@/constants/design';
import { S } from '@/constants/styles';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.message}>NOT IN THE REGISTRY</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>BACK TO REGISTRY</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...S.screenContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  code: {
    ...TYPE.pageTitle,
    fontSize: 48,
    letterSpacing: -2,
  },
  message: S.emptyTitle,
  button: {
    borderWidth: 1,
    borderColor: COLORS.black,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: SPACING.xl,
  },
  buttonText: S.menuLabel,
});
