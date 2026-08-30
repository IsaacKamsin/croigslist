import { Stack } from 'expo-router';
import { COLORS } from '@/constants/design';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
        animation: 'slide_from_right',
        animationDuration: 160,
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="apply" />
    </Stack>
  );
}
