// app/index.tsx
import { useEffect } from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { SymbolView } from "expo-symbols";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function IndexPage() {
  const router = useRouter();

  // --- PALET WARNA ---
  const PRIMARY = "#e1f8fc";

  // --- ANIMATION STATES ---
  const bgSharedColor = useSharedValue("#ffffff");
  const maskScale = useSharedValue(1);
  
  // Memulai dari bawah layar (SCREEN_HEIGHT / 1.5) untuk efek loncatan yang kuat
  const logoY = useSharedValue(400); 
  const logoOpacity = useSharedValue(0);
  const logoX = useSharedValue(0);
  
  const textOpacity = useSharedValue(0);
  const textX = useSharedValue(-50); // Memulai agak ke kiri untuk efek slide ke kanan
  const screenOpacity = useSharedValue(1);

  // Fungsi navigasi setelah seluruh rangkaian animasi selesai
  const navigateToNextScreen = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Izin akses lokasi ditolak");
      } else {
        let location = await Location.getCurrentPositionAsync({});
        console.log("Lokasi GPS:", location);
      }

      const user = await AsyncStorage.getItem("user");
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("./login");
      }
    } catch (error) {
      console.log("Terjadi kesalahan:", error);
      router.replace("./login");
    }
  };

  useEffect(() => {
    // TAHAP 1: Masking mengecil & Ikon masuk dari bawah dengan BOUNCE (Spring) yang kuat
    maskScale.value = withTiming(0, { duration: 600 }, () => {
      bgSharedColor.value = PRIMARY;
    });

    logoOpacity.value = withTiming(1, { duration: 400 });
    
    // Menggunakan withSpring untuk efek memantul yang elastis di tengah layar
    logoY.value = withSpring(0, {
      damping: 10,     // Semakin kecil, pentalan semakin banyak
      stiffness: 90,   // Kecepatan pentalan
      mass: 0.8,
    }, (isFinished) => {
      if (isFinished) {
        // TAHAP 2: Begitu selesai memantul di tengah, jalankan slide kiri (ikon) & kanan (teks) secara sinkron
        logoX.value = withTiming(-((SCREEN_WIDTH * 0.35) / 2), { duration: 700 });
        textX.value = withTiming(0, { duration: 700 });
        textOpacity.value = withTiming(1, { duration: 700 }, (allDone) => {
          if (allDone) {
            // TAHAP 3: Beri jeda membaca teks sebentar, lalu fade-out halaman
            screenOpacity.value = withTiming(0, { duration: 600 }, (exitDone) => {
              if (exitDone) {
                runOnJS(navigateToNextScreen)();
              }
            });
          }
        });
      }
    });
  }, []);

  // --- ANIMATED STYLES ---
  const animatedContainerStyle = useAnimatedStyle(() => ({
    backgroundColor: bgSharedColor.value,
    opacity: screenOpacity.value,
  }));

  const animatedMaskStyle = useAnimatedStyle(() => ({
    transform: [{ scale: maskScale.value }],
    opacity: maskScale.value === 0 ? 0 : 1,
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoY.value }, { translateX: logoX.value }],
    opacity: logoOpacity.value,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: textX.value }],
    opacity: textOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {/* 1. MASK OVERLAY */}
      <Animated.View style={[styles.maskOverlay, animatedMaskStyle]} pointerEvents="none">
        <View style={styles.ovalHole} />
      </Animated.View>

      {/* 2. MAIN SPLASH CONTENT */}
      <View style={styles.contentWrapper}>
        {/* LOGO BOX */}
        <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
          <Image
            source={require("../assets/images/favicon.png")} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* TEXT CONTENT */}
        <Animated.View style={[styles.textContainer, animatedTextStyle]}>
          <Text style={styles.title}>Crocodic Absensi</Text>
          <Text style={styles.subtitle}>
            Panen Lebih Pintar — Pantau & Optimalkan Lahan Anda
          </Text>
        </Animated.View>
      </View>

      {/* 3. DECORATIVE SYMBOLS */}
      <View style={styles.symbolFooter} pointerEvents="none">
        <SymbolView
          name={{ ios: "info.circle", android: "info", web: "info" }}
          tintColor="#ffffff"
          size={24}
          style={{ opacity: 0.3 }}
        />
        <SymbolView
          name={{
            ios: "pencil.tip.crop.circle.badge.plus",
            android: "home_and_garden",
            web: "home_and_garden",
          }}
          tintColor="#ffffff"
          size={24}
          style={{ opacity: 0.3 }}
        />
      </View>
    </Animated.View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  maskOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  ovalHole: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: (SCREEN_WIDTH * 0.7) / 2,
    backgroundColor: "transparent",
    borderWidth: 999,
    borderColor: "#ffffff",
  },
  contentWrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    zIndex: 20,
  },
  logoContainer: {
    width: 95,
    height: 95,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    position: "absolute",
    left: SCREEN_WIDTH * 0.44,
    width: SCREEN_WIDTH * 0.52,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#000000",
    fontWeight: "600",
    lineHeight: 15,
  },
  symbolFooter: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    gap: 16,
    zIndex: 5,
  },
});