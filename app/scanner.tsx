// app/scanner.tsx
import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import CryptoJS from "crypto-js";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location"; // Tambahkan import expo-location

/* ========== alfabet & utilities (same as encrypter) ========== */
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

function caesarUnshiftWithAlphabet(
  input: string,
  shift: number,
  alphabet: string,
) {
  return caesarShiftWithAlphabet(input, -shift, alphabet);
}

function caesarOnReversed(input: string, shift: number) {
  const reversed = PRINTABLE_ALPHABET.split("").reverse().join("");
  return caesarShiftWithAlphabet(input, shift, reversed);
}

function caesarUnshiftOnReversed(input: string, shift: number) {
  const reversed = PRINTABLE_ALPHABET.split("").reverse().join("");
  return caesarUnshiftWithAlphabet(input, shift, reversed);
}

/* ========== AES helpers (crypto-js) ========== */
function aes256DecryptBase64(aesBase64: string, keyDate: string): string {
  const keyHash = CryptoJS.SHA256(keyDate);
  const key = CryptoJS.enc.Hex.parse(keyHash.toString());

  const ivHash = CryptoJS.SHA256(keyDate + "_iv");
  const ivHex = ivHash.toString().slice(0, 32);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const ciphertextWA = CryptoJS.enc.Base64.parse(aesBase64);

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: ciphertextWA,
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const plain = decrypted.toString(CryptoJS.enc.Utf8);
  return plain;
}

/* ========== Scanner Component ========== */
export default function Scanner() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanning, setScanning] = useState(false);
  const [scannedRaw, setScannedRaw] = useState<string | null>(null);
  const [decryptedPlain, setDecryptedPlain] = useState<string | null>(null);
  const [parsedParts, setParsedParts] = useState<{
    dept?: string;
    nik?: string;
    deviceId?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scannedLock = useRef(false);

  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.xx:8000/api";

  const decryptEncryptedString = async (encrypted: string) => {
    const buildKeyDate = (d: Date) => {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = String(d.getFullYear());
      return {
        keyDate: `${dd}${mm}${yyyy}`,
        dayNum: Number(dd),
        monthNum: Number(mm),
      };
    };

    const now = new Date();
    const offsets = [0, -1, 1];
    let lastError: string | null = null;

    for (const off of offsets) {
      const d = new Date(now.getTime() + off * 24 * 3600 * 1000);
      const { keyDate, dayNum, monthNum } = buildKeyDate(d);

      try {
        const afterUnrev = caesarUnshiftOnReversed(encrypted, monthNum);
        const aesBase64Candidate = caesarUnshiftWithAlphabet(
          afterUnrev,
          dayNum,
          PRINTABLE_ALPHABET,
        );

        const plain = aes256DecryptBase64(aesBase64Candidate, keyDate);

        if (typeof plain === "string" && plain.includes(";")) {
          return { plain, keyDate };
        } else {
          lastError = `Decrypted plaintext invalid for keyDate=${keyDate}`;
          continue;
        }
      } catch (e: any) {
        lastError = String(e);
        continue;
      }
    }

    throw new Error("Gagal dekripsi. " + (lastError ?? ""));
  };

  const processScanned = useCallback(async (scanned: string) => {
    setLoading(true);
    setError(null);
    setDecryptedPlain(null);
    setParsedParts(null);

    try {
      const { plain, keyDate } = (await decryptEncryptedString(scanned)) as {
        plain: string;
        keyDate: string;
      };
      setDecryptedPlain(plain);

      const parts = plain.split(";");
      if (parts.length >= 3) {
        const dept = parts[0] ?? "";
        const nik = parts[1] ?? "";
        const deviceId = parts.slice(2).join(";");
        setParsedParts({ dept, nik, deviceId });
        console.log("Decryption succeeded with keyDate:", keyDate);
      } else {
        setError(
          "Format hasil dekripsi tidak sesuai (harus dept;nik;deviceId).",
        );
      }
    } catch (e: any) {
      console.warn("processScanned error", e);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const onBarcodeScanned = useCallback(
    async (result: any) => {
      const data = result?.data ?? result ?? null;
      if (!data) {
        console.debug("scan result no data", result);
        return;
      }

      if (scannedLock.current) return;
      scannedLock.current = true;

      setScanning(false);
      setScannedRaw(String(data ?? ""));
      setError(null);
      setDecryptedPlain(null);
      setParsedParts(null);
      setLoading(true);

      try {
        // 1. Ambil izin dan koordinat GPS Perangkat terkini
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          alert("Gagal: Izin akses lokasi diperlukan untuk melakukan absensi.");
          setLoading(false);
          scannedLock.current = false;
          return;
        }

        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        const currentLat = location.coords.latitude;
        const currentLot = location.coords.longitude;

        console.log(currentLat + " " + currentLot);
        

        // Jalankan proses simulasi lokal (opsional untuk kebutuhan UI Anda)
        await processScanned(String(data ?? ""));

        // 2. Kirim data QR beserta koordinat GPS ke Server Laravel melalui Fetch
        const response = await fetch(`${apiUrl}/api/absen`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            kode: String(data), 
            lat: String(currentLat), // Dikirim sebagai string sesuai validasi Laravel Anda
            lot: String(currentLot), // Dikirim sebagai string menggunakan parameter 'lot'
          }),
        });

        const resultData = await response.json();

        if (response.ok) {
          alert("Sukses: " + (resultData.message || "Absen masuk berhasil."));
        } else {
          const errorMsg =
            resultData.error || resultData.message || "Terjadi kesalahan lokasi/perangkat";
          setError(errorMsg);
          alert("Gagal: " + errorMsg);
        }
      } catch (err) {
        setError("Tidak dapat terhubung ke server");
        console.error("Fetch Error:", err);
        alert("Gagal: Tidak dapat terhubung ke server.");
      } finally {
        setLoading(false);
        // Lock dilepas setelah 1.2 detik agar tidak terscan ganda
        setTimeout(() => {
          scannedLock.current = false;
        }, 1200);
      }
    },
    [processScanned],
  );

  const openScanner = async () => {
    setScannedRaw(null);
    setDecryptedPlain(null);
    setParsedParts(null);
    setError(null);

    if (!permission) {
      const granted = await requestPermission();
      if (!granted?.granted) {
        Alert.alert(
          "Izin kamera diperlukan",
          "Berikan izin kamera untuk memindai QR.",
        );
        return;
      }
    } else if (!permission.granted) {
      const granted = await requestPermission();
      if (!granted?.granted) {
        Alert.alert(
          "Izin kamera diperlukan",
          "Berikan izin kamera untuk memindai QR.",
        );
        return;
      }
    }

    setScanning(true);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Memeriksa izin kamera...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ textAlign: "center", marginBottom: 12 }}>
          Aplikasi butuh izin kamera untuk memindai QR.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            const res = await requestPermission();
            if (!res?.granted) {
              Alert.alert(
                "Izin ditolak",
                "Aktifkan izin kamera di pengaturan perangkat.",
              );
            }
          }}
        >
          <Text style={styles.btnText}>Berikan Izin Kamera</Text>
        </TouchableOpacity>
        {error ? (
          <Text style={{ color: "red", marginTop: 10 }}>{error}</Text>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scanner</Text>
        <Text style={styles.subtitle}>
          Tekan tombol untuk membuka scanner QR
        </Text>
      </View>

      <View style={styles.body}>
        <TouchableOpacity
          style={[styles.button, scanning && styles.buttonDisabled]}
          onPress={openScanner}
          disabled={scanning}
        >
          <Text style={styles.btnText}>
            {scanning ? "Membuka kamera..." : "Buka Scanner QR"}
          </Text>
        </TouchableOpacity>

        {scanning ? (
          <View style={styles.scannerWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={onBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            />
            <View style={styles.scannerOverlay}>
              <Text style={styles.overlayText}>Arahkan kamera ke QR</Text>
              <TouchableOpacity
                style={[styles.button, { marginTop: 12 }]}
                onPress={() => setScanning(false)}
              >
                <Text style={styles.btnText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Hasil Scan (raw)</Text>
          <Text style={styles.resultText}>
            {scannedRaw ?? "Belum ada hasil scan"}
          </Text>

          <Text style={[styles.resultLabel, { marginTop: 12 }]}>
            Hasil Dekripsi (plain: dept;nik;deviceId)
          </Text>

          {loading ? (
            <ActivityIndicator />
          ) : decryptedPlain ? (
            <>
              <Text style={styles.small}>{decryptedPlain}</Text>
              {parsedParts ? (
                <>
                  <Text style={[styles.small, { marginTop: 8 }]}>
                    Department: {parsedParts.dept}
                  </Text>
                  <Text style={[styles.small]}>NIK: {parsedParts.nik}</Text>
                  <Text style={[styles.small]}>
                    DeviceId: {parsedParts.deviceId}
                  </Text>
                </>
              ) : null}
            </>
          ) : error ? (
            <Text style={[styles.small, { color: "red" }]}>{error}</Text>
          ) : (
            <Text style={styles.small}>Belum ada dekripsi</Text>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={[styles.button, { backgroundColor: "#e5e7eb" }]}
        >
          <Text style={[styles.btnText, { color: "#111" }]}>Kembali</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ========== styles ========== */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { alignItems: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 6 },
  body: { flex: 1, alignItems: "center" },
  button: {
    backgroundColor: "#0b84ff",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  btnText: { color: "#fff", fontWeight: "700" },
  scannerWrap: {
    width: "100%",
    height: 360,
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  scannerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: "center",
  },
  overlayText: { color: "#fff", fontWeight: "600" },
  resultBox: {
    width: "100%",
    marginTop: 18,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fafafa",
  },
  resultLabel: { fontSize: 13, fontWeight: "700", color: "#111" },
  resultText: { marginTop: 8, color: "#111" },
  small: { fontSize: 12, color: "#374151", marginTop: 6 },
  footer: { paddingVertical: 12, alignItems: "center" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
});