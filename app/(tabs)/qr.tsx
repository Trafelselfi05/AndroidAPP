// components/QrModal.tsx (Halaman Utuh QR Absensi)
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SymbolView } from "expo-symbols";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import CryptoJS from "crypto-js";

type Props = {
  title?: string;
};

/* ================= ENCRYPTION FUNCTIONS ================= */
const PRINTABLE_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function caesarShiftWithAlphabet(
  input: string,
  shift: number,
  alphabet: string,
) {
  const n = alphabet.length;
  const s = mod(shift, n);
  let out = "";
  for (const ch of input) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) {
      out += ch;
    } else {
      out += alphabet[(idx + s) % n];
    }
  }
  return out;
}

function caesarOnReversed(input: string, shift: number) {
  const reversed = PRINTABLE_ALPHABET.split("").reverse().join("");
  return caesarShiftWithAlphabet(input, shift, reversed);
}

async function getDeviceId(): Promise<string> {
  try {
    try {
      if (typeof (Application as any).getAndroidId === "function") {
        const result = (Application as any).getAndroidId();
        const androidId = result instanceof Promise ? await result : result;
        if (androidId) return String(androidId);
      }
    } catch (e) {}
    try {
      const propId = (Application as any).androidId;
      if (propId) return String(propId);
    } catch (e) {}
    try {
      if (typeof (Application as any).getInstallationIdAsync === "function") {
        const installId = await (Application as any).getInstallationIdAsync();
        if (installId) return String(installId);
      }
    } catch (e) {}
    return "error";
  } catch (err) {
    return "error";
  }
}

function aes256EncryptBase64(plainText: string, keyDate: string): string {
  const keyHash = CryptoJS.SHA256(keyDate);
  const key = CryptoJS.enc.Hex.parse(keyHash.toString());
  const ivHash = CryptoJS.SHA256(keyDate + "_iv");
  const ivHex = ivHash.toString().slice(0, 32);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
}

/* ================= MAIN COMPONENT ================= */
export default function QrPage({
  title = "Sistem Absensi QR",
}: Props) {
  const [qrValue, setQrValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    generateQrData();
  }, []);

  const generateQrData = async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem("user");
      if (!raw) {
        Alert.alert(
          "Data user tidak ditemukan",
          "Silakan login terlebih dahulu.",
        );
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parsed = null;
      }

      const department =
        parsed?.department ?? parsed?.dept ?? parsed?.data?.department ?? null;
      const nik =
        parsed?.nik ?? parsed?.nik_number ?? parsed?.data?.nik ?? null;

      if (!department || !nik) {
        Alert.alert(
          "Data user tidak lengkap",
          "Informasi department atau NIK tidak ditemukan.",
        );
        return;
      }

      const deptStr = String(department).trim().toUpperCase();
      const nikStr = String(nik).trim();
      const deviceId = await getDeviceId();
      const plainText = `${deptStr};${nikStr};${deviceId}`;

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = String(now.getFullYear());
      const keyDate = `${dd}${mm}${yyyy}`;

      const aesBase64 = aes256EncryptBase64(plainText, keyDate);
      const dayNum = Number(dd);
      const step1 = caesarShiftWithAlphabet(
        aesBase64,
        dayNum,
        PRINTABLE_ALPHABET,
      );
      const monthNum = Number(mm);
      const encryptedFinal = caesarOnReversed(step1, monthNum);

      setQrValue(encryptedFinal);
    } catch (e) {
      console.warn("generateQrData error", e);
      Alert.alert("Error", "Gagal membuat QR terenkripsi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* CARD UTAMA QR */}
      <View style={styles.card}>
        
        {/* ICON DEKORASI ATAS */}
        <View style={styles.iconHeader}>
          <SymbolView 
            name={{ ios: "qrcode", android: "qr_code_2", web: "qr_code_2" }} 
            tintColor="#0EA5E9" 
            size={40} 
          />
        </View>

        {/* TITLE */}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Tunjukkan kode QR ini ke alat scanner</Text>

        {/* CONTAINER QR DENGAN SHADOW & BORDER PALET SECONDARY */}
        <View style={styles.qrWrap}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#0EA5E9" />
              <Text style={styles.loaderText}>Mengenkripsi data...</Text>
            </View>
          ) : (
            <QRCode 
              value={qrValue || "Please provide dynamic value"} 
              size={200}
              color="#1E293B"
              backgroundColor="#ffffff"
            />
          )}
        </View>
        

        {/* PETUNJUK ABSENSI */}
        <View style={styles.hintContainer}>
          <SymbolView
            name={{ ios: "info.circle.fill", android: "info", web: "info" }}
            tintColor="#0EA5E9"
            size={18}
          />
          <Text style={styles.urlText}>
            Pastikan kecerahan layar Anda cukup agar QR Code mudah terbaca oleh mesin scanner absensi.
          </Text>
        </View>

      </View>

    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Base background sesuai palet
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0EA5E9", // Shadow bernuansa Deep Sky Blue
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  iconHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F2FE", // Sky Blue sangat muda untuk bg icon
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 24,
    textAlign: "center",
    fontWeight: "500",
  },
  qrWrap: {
    width: 236,
    height: 236,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#38BDF8", // Border warna Primary (Sky Blue)
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748B",
  },
  hintContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F9FF", // Background alert info transparan
    padding: 12,
    borderRadius: 14,
    gap: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    color: "#0369A1", // Text biru gelap senada agar mudah dibaca
    lineHeight: 18,
    fontWeight: "500",
  },
});