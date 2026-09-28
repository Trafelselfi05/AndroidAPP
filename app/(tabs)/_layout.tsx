// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import CustomBottomTabBar from "@/components/CustomBottomTabBar";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props: BottomTabBarProps | any) => <CustomBottomTabBar {...(props as BottomTabBarProps)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="cuti" options={{ title: "Cuti" }} />
      <Tabs.Screen name="qr" options={{ title: "QR" }} />
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />
    </Tabs>
  );
}