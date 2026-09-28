
import { Stack } from "expo-router";
import "react-native-reanimated";

export { ErrorBoundary } from "expo-router";


export default function RootLayout() {
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="scanner" options={{ headerShown: false }} />
        <Stack.Screen name="slip-detail" options={{ headerShown: false }} />
        <Stack.Screen name="form-cuti" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
  );
}