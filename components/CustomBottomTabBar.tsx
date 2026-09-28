// components/CustomBottomTabBar.tsx
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

const NAV_ITEMS = [
  {
    name: "index",
    label: "Dashboard",
    icon: { ios: "house.fill", android: "home", web: "home" },
    key: "dashboard",
  },
  {
    name: "cuti",
    label: "Cuti",
    icon: {
      ios: "doc.text.badge.plus",
      android: "description",
      web: "description",
    },
    key: "cuti",
  },
  {
    name: "qr",
    label: "QR",
    icon: { ios: "qrcode", android: "qr_code_scanner", web: "qr_code_scanner" },
    key: "qr",
  },
  {
    name: "profil",
    label: "Profil",
    icon: { ios: "person.fill", android: "person", web: "person" },
    key: "profil",
  },
];

export default function CustomBottomTabBar(props: BottomTabBarProps) {
  const { state, navigation } = props;
  const insets = useSafeAreaInsets();

  const currentRouteName = state.routes[state.index].name;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom }, // Menyesuaikan notch iPhone, latar belakang mengikuti biru
      ]}
    >
      <View style={styles.backgroundCardWrapper}>
        <View style={styles.row}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentRouteName === item.name;

            // Tampilan saat Tab AKTIF/DITEKAN (Melayang Putih di atas Navbar Biru)
            if (isActive) {
              return (
                <View key={item.key} style={styles.centerWrapper}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate(item.name)}
                    style={styles.centerButton}
                    activeOpacity={0.85}
                  >
                    <SymbolView
                      name={item.icon}
                      size={28}
                      tintColor="#38BDF8" // Ikon aktif berubah warna biru kontras di dalam lingkaran putih
                    />
                  </TouchableOpacity>
                  <Text style={styles.centerLabel}>{item.label}</Text>
                </View>
              );
            }

            // Tampilan saat Tab TIDAK AKTIF (Putih Transparan di atas Navbar Biru)
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.tabButton}
                onPress={() => navigation.navigate(item.name)}
                activeOpacity={0.8}
              >
                <View style={styles.iconWrapper}>
                  <SymbolView
                    name={item.icon}
                    size={22}
                    tintColor="rgba(255, 255, 255, 0.75)" // Ikon tidak aktif berwarna putih transparan
                  />
                </View>
                <Text style={styles.label}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ========== Stylesheet ========== */
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#38BDF8", // Diubah menjadi Biru Cerah penuh hingga bawah notch
    overflow: "visible",
  },
  backgroundCardWrapper: {
    height: 76,
    marginHorizontal: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#38BDF8", // Diubah menjadi Biru Cerah
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: "visible", 
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 12,
    overflow: "visible",
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: 70,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)", // Transparansi putih lembut agar senada dengan background biru
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    color: "rgba(255, 255, 255, 0.8)", // Label tidak aktif berwarna putih pudar
    fontWeight: "600",
  },
  centerWrapper: {
    alignItems: "center",
    flex: 1,
    height: 100,
    justifyContent: "flex-end",
    marginTop: -40,
    overflow: "visible",
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffffff", // Tombol aktif menjadi Putih Bersih agar menonjol keluar
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#38BDF8", // Border lingkaran mengikuti warna navbar biru
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 2,
  },
  centerLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#ffffff", // Label aktif menjadi Putih Terang
    fontWeight: "700",
    marginBottom: 6,
  },
});