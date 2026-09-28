// app/login.tsx
import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
} from "react-native";

import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { SafeAreaView } from "react-native-safe-area-context";
import { getRandomUserAgent } from "@/components/getRandomUserAgent";

// --- SEEDING DEVICE ID FUNCTION ---
async function getDeviceId(): Promise<string> {
  try {
    try {
      if (typeof (Application as any).getAndroidId === "function") {
        const result = (Application as any).getAndroidId();
        const androidId = result instanceof Promise ? await result : result;
        if (androidId) return String(androidId);
      }
    } catch (e) {
      console.warn("getAndroidId() method failed:", e);
    }

    try {
      const propId = (Application as any).androidId;
      if (propId) return String(propId);
    } catch (e) {
      console.warn("androidId property access failed:", e);
    }

    try {
      if (typeof (Application as any).getInstallationIdAsync === "function") {
        const installId = await (Application as any).getInstallationIdAsync();
        if (installId) return String(installId);
      }
    } catch (e) {
      console.warn("getInstallationIdAsync failed:", e);
    }

    return "error";
  } catch (err) {
    return "error";
  }
}

// --- FLOATING LABEL INPUT COMPONENT ---
interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

function FloatingLabelInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "none",
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const animatedIsFocused = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animatedIsFocused, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(animatedIsFocused, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  // Mengatur posisi label berpindah ke atas border
  const labelStyle = {
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [14, -10],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 12],
    }),
    color: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: ["#94A3B8", "#0EA5E9"], // Berubah ke Secondary Color saat aktif
    }),
    backgroundColor: value || isFocused ? "#F8FAFC" : "transparent",
    paddingHorizontal: value || isFocused ? 4 : 0,
  };

  return (
    <View style={styles.inputContainer}>
      <Animated.Text style={[styles.floatingLabel, labelStyle]}>
        {isFocused || value ? label : placeholder}
      </Animated.Text>
      <TextInput
        style={[styles.input, isFocused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        blurOnSubmit
      />
    </View>
  );
}

// --- MAIN LOGIN COMPONENT ---
export default function Login() {
  const router = useRouter();

  const [department, setDepartment] = useState("");
  const [nik, setNik] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.xx:8000/api";

    console.log(apiUrl);
    

  const login = async () => {
    if (department === "1") {
      router.replace("./scanner");
      return;
    }

    console.log(apiUrl);

    if (!department.trim())
      return Alert.alert("Validasi", "Masukkan department.");
    if (!nik.trim() || Number.isNaN(Number(nik)))
      return Alert.alert("Validasi", "Masukkan NIK yang valid.")
    if (!password) return Alert.alert("Validasi", "Masukkan password.");

    setLoading(true);

    try {
      const deviceId = await getDeviceId();
      console.log("DEVICE ID:", deviceId);

      if (!deviceId) {
        Alert.alert("Error", "Device ID tidak ditemukan");
        setLoading(false);
        return;
      }

      const payload = {
        department: department.trim(),
        nik: Number(nik),
        password,
        device_id: deviceId,
      };

      console.log(getRandomUserAgent());
      

const res = await fetch(`${apiUrl}/api/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "User-Agent": getRandomUserAgent(), // <-- Fungsi dipanggil di sini
  },
  body: JSON.stringify(payload),
});

      const json = await res.json();

      if (json?.error === true) {
        Alert.alert("Login gagal", json?.message ?? "Terjadi kesalahan.");
      } else if (json?.error === false && json?.data) {
        await AsyncStorage.setItem("user", JSON.stringify(json.data));
        router.replace("/(tabs)");
      } else {
        Alert.alert("Login gagal", "Respons server tidak dikenali.");
      }
    } catch (e) {
      console.log("login error:", e);
      Alert.alert(
        "Kesalahan jaringan",
        "Pastikan server menyala dan IP benar.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Aksesoris Gambar Bagian Paling Atas */}
      <View style={styles.topAccessoryContainer}>
        <Image
          source={require("../assets/images/top.png")} // Sesuaikan path gambar Anda
          style={styles.topAccessoryImage}
          resizeMode="stretch"
        />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        {/* Header dengan Logo full width pengganti kata Login */}
        <View style={styles.header}>
          <View style={styles.logoWrapperFull}>
            <Image
              source={require("../assets/images/logo.png")} // Sesuaikan path logo Anda
              style={styles.logoImageFull}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Container Form Input dengan Padding Horizontal khusus */}
        <View style={styles.formContainer}>
          <FloatingLabelInput
            label="Department"
            placeholder="Contoh: DKY"
            value={department}
            onChangeText={setDepartment}
            autoCapitalize="characters"
          />

          <FloatingLabelInput
            label="NIK"
            placeholder="Contoh: 914810"
            value={nik}
            onChangeText={setNik}
            keyboardType="numeric"
          />

          <FloatingLabelInput
            label="Password"
            placeholder="••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={login}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Masuk</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- STYLESHEET ---
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Menggunakan palet background baru
  },
  topAccessoryContainer: {
    width: "100%",
    overflow: "hidden",
  },
  topAccessoryImage: {
    width: "100%",
    height: 160,
  },
  container: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    width: "100%",
  },
  logoWrapperFull: {
    width: "100%",
    paddingHorizontal: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImageFull: {
    width: "100%",
    height: 240,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 12,
    fontWeight: "500",
  },
  // Container form dan button dengan padding horizontal khusus
  formContainer: {
    paddingHorizontal: 32,
    width: "100%",
  },
  inputContainer: {
    marginBottom: 24,
    position: "relative",
    width: "100%",
  },
  floatingLabel: {
    position: "absolute",
    left: 12,
    zIndex: 1,
    fontWeight: "500",
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#F8FAFC",
    fontSize: 15,
    color: "#1E293B",
  },
  inputFocused: {
    borderColor: "#38BDF8", // Menggunakan palet Primary saat di-focus
  },
  button: {
    height: 50,
    borderRadius: 10,
    backgroundColor: "#0EA5E9", // Menggunakan palet Secondary
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3, // Shadow untuk Android
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
