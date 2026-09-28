// app/(tabs)/profil.tsx
import { JSX, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

type RawUser = Record<string, any>;

type UserData = {
  nama?: string;
  jabatan?: string;
  nik?: string;
  password?: string;
  alamat?: string;
  nomorWa?: string;
  tanggalLahir?: string;
  tanggalMasuk?: string;
  batasKontrak?: string;
  statusBpjs?: string;
  department?: string;
  avatarUrl?: string | null; // Field untuk menampung URL gambar hasil olahan
};

function maskPassword(pw?: string) {
  if (!pw) return "—";
  const len = Math.max(4, Math.min(12, pw.length));
  return "•".repeat(len);
}

/** Normalisasi berbagai variasi shape user dari storage/backend */
function normalizeUser(raw: RawUser | string | null, apiUrl: string): UserData {
  if (!raw) return {};

  let obj: RawUser;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {};
    }
  } else {
    obj = raw;
  }

  const g = (...keys: Array<string | undefined>) => {
    for (const k of keys) {
      if (!k) continue;
      if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null)
        return obj[k];
    }
    return undefined;
  };

  const nik = g("nik", "NIK", "id", "nip") ?? "";
  const name = g("name", "nama", "full_name", "fullName") ?? "";
  const position = g("position", "jabatan", "role") ?? "";
  const password = g("password") ?? "";
  const address = g("address", "alamat") ?? "";
  const phone = g("phone", "nomor", "nomorWa", "nohp", "handphone") ?? "";
  const birth = g("birth_date", "tanggal_lahir", "tanggalLahir") ?? "";
  const hire = g("hire_date", "tanggal_masuk", "tanggalMasuk") ?? "";
  const contract = g("contract_date", "batas_kontrak", "batasKontrak") ?? "";
  const bpjsRaw = g("bpjs", "statusBpjs", "bpjs_status") ?? null;
  const department = g("department", "dept", "bagian") ?? "";

  // Ambil data nama file gambar dari storage local (misal: "avatar", "image", "photo", "profile_picture")
  const avatarName =
    g("avatar", "image", "photo", "profile_picture", "data.avatar") ?? null;    

  // Konstruksi URL gambar penuh mengarah ke folder storage backend via .env
  let avatarUrl = null;
  if (
    avatarName &&
    typeof avatarName === "string" &&
    avatarName.trim() !== ""
  ) {
    avatarUrl = `${apiUrl}${avatarName.trim()}`;
    console.log(avatarUrl);
    
  }

  let statusBpjs = "—";
  if (bpjsRaw !== null && bpjsRaw !== undefined && bpjsRaw !== "") {
    const val = typeof bpjsRaw === "string" ? bpjsRaw.toLowerCase() : bpjsRaw;
    if (val === 1 || val === "1" || val === true || val === "true")
      statusBpjs = "Aktif";
    else if (val === 0 || val === "0" || val === false || val === "false")
      statusBpjs = "Tidak aktif";
    else statusBpjs = String(bpjsRaw);
  }

  return {
    nama: String(name || "").trim() || undefined,
    jabatan: String(position || "").trim() || undefined,
    nik: String(nik || "").trim() || undefined,
    password: password ? String(password) : undefined,
    alamat: address ? String(address) : undefined,
    nomorWa: phone ? String(phone) : undefined,
    tanggalLahir: birth ? String(birth) : undefined,
    tanggalMasuk: hire ? String(hire) : undefined,
    batasKontrak: contract ? String(contract) : undefined,
    statusBpjs,
    department: department ? String(department) : undefined,
    avatarUrl,
  };
}

export default function ProfilePage(): JSX.Element {
  const [user, setUser] = useState<UserData>({});
  const [imageError, setImageError] = useState(false);
  const screenWidth = Dimensions.get("window").width;

  const twoColumn = useMemo(() => screenWidth >= 600, [screenWidth]);
  const router = useRouter();
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.189:8000/api";

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (raw) {
          const normalized = normalizeUser(raw, apiUrl);
          setUser(normalized);
        } else {
          setUser({});
        }
      } catch (e) {
        console.warn("Failed to load userData:", e);
        setUser({});
      }
    })();
  }, [apiUrl]);

  const handleLogout = async () => {
    Alert.alert("Konfirmasi", "Anda yakin ingin logout?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("user");
            router.replace("../login");
          } catch (e) {
            console.warn("Gagal hapus userData:", e);
            Alert.alert("Error", "Gagal logout. Coba lagi.");
          }
        },
      },
    ]);
  };

// Logika penentuan source gambar (URL online vs File Lokal)
const imageSource = useMemo(() => {
  // Hanya gunakan URL jika string-nya valid dan mengandung skema http
  if (user.avatarUrl && typeof user.avatarUrl === "string" && user.avatarUrl.startsWith("http")) {
    return { uri: user.avatarUrl };
  }
  // Fallback default jika data user belum dimuat atau kosong
  return require("@/assets/images/user.png");
}, [user.avatarUrl]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.mainWrapper}>
        {/* ================= FIXED HEADER (TIDAK IKUT SCROLL) ================= */}
        <View style={styles.headerFixedContainer}>
          {/* HERO BANNER BACKGROUND */}
          <View style={styles.heroBanner}>
            <Image
              source={require("@/assets/images/bgs.png")}
              style={styles.backgroundImage}
              resizeMode="cover"
              accessible={false}
            />
          </View>

          {/* AVATAR & HEADER INFO */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={imageSource}
                style={styles.avatar}
                resizeMode="cover"
                accessibilityLabel={user.nama ?? "Avatar"}
                onError={() => setImageError(true)} // Jika link dari ENV 404/rusak, balik ke gambar lokal
              />
            </View>

            <Text style={styles.name} numberOfLines={1}>
              {user.nama ?? "Nama Lengkap"}
            </Text>
            <Text style={styles.position} numberOfLines={1}>
              {user.jabatan ??
                (user.department
                  ? user.department.toUpperCase()
                  : "Jabatan / Posisi")}
            </Text>
          </View>
        </View>

        {/* ================= SCROLLABLE CONTENT (HANYA DATA DIRI) ================= */}
        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentGrid}>
            {/* KOLOM KIRI / UTAMA */}
            <View
              style={[styles.column, twoColumn ? styles.col50 : styles.col100]}
            >
              <Text style={styles.sectionTitle}>Informasi Autentikasi</Text>

              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <SymbolView
                    name={{
                      ios: "badge.substring.badge.ellipsis",
                      android: "fingerprint",
                      web: "fingerprint",
                    }}
                    size={20}
                    tintColor="#0EA5E9"
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>NIK</Text>
                  <Text style={styles.value}>{user.nik ?? "—"}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <SymbolView
                    name={{ ios: "lock.fill", android: "lock", web: "lock" }}
                    size={20}
                    tintColor="#0EA5E9"
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>Password</Text>
                  <Text style={styles.value}>
                    {maskPassword(user.password)}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Kontak & Alamat</Text>

              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <SymbolView
                    name={{
                      ios: "mappin.and.ellipse",
                      android: "location_on",
                      web: "location_on",
                    }}
                    size={20}
                    tintColor="#0EA5E9"
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>Alamat</Text>
                  <Text style={styles.value}>{user.alamat ?? "—"}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <SymbolView
                    name={{ ios: "phone.fill", android: "call", web: "call" }}
                    size={20}
                    tintColor="#0EA5E9"
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>No. HP / WhatsApp</Text>
                  <Text style={styles.value}>{user.nomorWa ?? "—"}</Text>
                </View>
              </View>
            </View>

            {/* KOLOM KANAN / KEPEGAWAIAN */}
            <View
              style={[styles.column, twoColumn ? styles.col50 : styles.col100]}
            >
              <Text style={styles.sectionTitle}>Detail Kepegawaian</Text>

              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <SymbolView
                    name={{ ios: "calendar", android: "cake", web: "cake" }}
                    size={20}
                    tintColor="#0EA5E9"
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>Tanggal Lahir</Text>
                  <Text style={styles.value}>{user.tanggalLahir ?? "—"}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <SymbolView
                    name={{
                      ios: "calendar.badge.plus",
                      android: "date_range",
                      web: "date_range",
                    }}
                    size={20}
                    tintColor="#0EA5E9"
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>Tanggal Masuk</Text>
                  <Text style={styles.value}>{user.tanggalMasuk ?? "—"}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <SymbolView
                    name={{
                      ios: "calendar.badge.exclamationmark",
                      android: "event_busy",
                      web: "event_busy",
                    }}
                    size={20}
                    tintColor="#0EA5E9"
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>Batas Kontrak</Text>
                  <Text style={styles.value}>{user.batasKontrak ?? "—"}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <SymbolView
                    name={{
                      ios: "checkmark.shield.fill",
                      android: "verified_user",
                      web: "verified_user",
                    }}
                    size={20}
                    tintColor="#0EA5E9"
                  />
                </View>
                <View style={styles.info}>
                  <Text style={styles.label}>Status BPJS</Text>
                  <Text
                    style={[
                      styles.value,
                      {
                        color:
                          user.statusBpjs === "Aktif" ? "#10B981" : "#EF4444",
                      },
                    ]}
                  >
                    {user.statusBpjs ?? "—"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ================= FIXED FOOTER (TIDAK IKUT SCROLL) ================= */}
        <View style={styles.footerFixedContainer}>
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            accessibilityLabel="Logout"
            style={styles.logoutBtn}
          >
            <SymbolView
              name={{ ios: "power", android: "logout", web: "logout" }}
              size={18}
              tintColor="#fff"
            />
            <Text style={styles.logoutText}>Keluar dari Akun</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingBottom: 120,
  },
  mainWrapper: {
    flex: 1,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginVertical: 8,
  },

  // Header Style Statis
  headerFixedContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    zIndex: 10,
  },
  heroBanner: {
    height: 110,
    backgroundColor: "#38BDF8",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  avatarSection: {
    paddingTop: -45,
    marginTop: -50,
    paddingBottom: 16,
    alignItems: "center",
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#F8FAFC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  name: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    paddingHorizontal: 16,
    textAlign: "center",
  },
  position: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#0EA5E9",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
    textAlign: "center",
  },

  // Scroll Body Style
  scrollBody: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  column: {
    paddingHorizontal: 6,
  },
  col50: {
    width: "50%",
  },
  col100: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 10,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  value: {
    marginTop: 1,
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "600",
  },

  // Footer Style Statis
  footerFixedContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logoutBtn: {
    backgroundColor: "#EF4444",
    width: "100%",
    maxWidth: 280,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
