// app/(tabs)/index.tsx
import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

/* ================= TYPES ================= */
type Slip = {
  id: string;
  year: number;
  month: number;
  baseSalary: number;
};

type AttendanceStatus = {
  jamMasuk: string;
  jamKeluar: string;
};

/* ================= CONSTANTS ================= */
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // Penyesuaian presisi lebar grid item ganda

/* ================= HELPERS ================= */
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatCurrency(n: number) {
  return currencyFormatter.format(n);
}

/* ================= MAIN COMPONENT ================= */
export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [slips, setSlips] = useState<Slip[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, setUserName] = useState<string | null>(null);

  const { height: SCREEN_HEIGHT } = Dimensions.get("window");

  const [attendance, setAttendance] = useState<AttendanceStatus>({
    jamMasuk: "-:-",
    jamKeluar: "-:-",
  });

  const router = useRouter();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.189:8000/api";

const loadDashboardData = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    const raw = await AsyncStorage.getItem("user");
    if (!raw) {
      Alert.alert("Data user tidak ditemukan", "Silakan login terlebih dahulu.");
      return;
    }

    const user = JSON.parse(raw);
    const department = (user?.department ?? user?.dept ?? user?.data?.department ?? "").toString();
    const nik = (user?.nik ?? user?.nik_number ?? user?.data?.nik ?? "").toString();
    const name = user?.name ?? user?.full_name ?? user?.data?.name ?? null;
    setUserName(name);

    if (!department || !nik) {
      Alert.alert("Data user tidak lengkap", "Department atau NIK tidak ditemukan.");
      return;
    }

    const payload = { department, nik: Number(nik) };

    const [resSlip, resAbsen] = await Promise.all([
      fetch(`${apiUrl}/api/get-slip-month`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      fetch(`${apiUrl}/api/get-absens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ]);

    const jsonSlip = await resSlip.json();
    const jsonAbsen = await resAbsen.json();

    if (jsonAbsen && jsonAbsen.error === false) {
      setAttendance({
        jamMasuk: jsonAbsen.jam_masuk ?? "-:-",
        jamKeluar: jsonAbsen.jam_keluar ?? "-:-",
      });
    }

    if (jsonSlip?.error === true) {
      setError(jsonSlip?.message ?? "Terjadi kesalahan pengambilan data slip.");
      setSlips([]);
      setAvailableYears([]);
      setYear(null);
      return;
    }

    const apiSlips: { month: number; year: number; total_gaji: number }[] = jsonSlip?.slips ?? [];
    const mapped: Slip[] = apiSlips.map((s) => ({
      id: `s-${s.year}-${String(s.month).padStart(2, "0")}`,
      year: s.year,
      month: s.month,
      baseSalary: s.total_gaji,
    }));

    mapped.sort((a, b) => b.year - a.year || b.month - a.month);
    setSlips(mapped);

    const years = Array.from(new Set(mapped.map((s) => s.year))).sort((a, b) => b - a);
    setAvailableYears(years);
    setYear((prev) => (prev && years.includes(prev) ? prev : (years[0] ?? null)));
  } catch (e: any) {
    console.warn("loadDashboardData error:", e);
    setError("Gagal terhubung ke server.");
  } finally {
    setLoading(false);
  }
}, [apiUrl]);

// 2. GANTI USEEFFECT LAMA DENGAN INI:
useFocusEffect(
  useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData])
);

  const slipsForYear = useMemo(() => {
    if (!year) return [];
    return slips.filter((s) => s.year === year).sort((a, b) => b.month - a.month);
  }, [slips, year]);

  const attendanceStatusInfo = useMemo(() => {
    const m = attendance.jamMasuk;
    const k = attendance.jamKeluar;

    if ((m === "-:-" || !m) && (k === "-:-" || !k)) {
      return {
        text: "Anda belum melakukan absen hari ini.",
        icon: "xmark.circle.fill" as const,
        color: "#EF4444",
        bg: "#FEE2E2",
      };
    } else if (m && m !== "-:-" && (k === "-:-" || !k)) {
      return {
        text: "Anda sudah absen masuk. Jangan lupa absen keluar!",
        icon: "checkmark.circle.fill" as const,
        color: "#0EA5E9",
        bg: "#E0F2FE",
      };
    } else {
      return {
        text: "Sampai jumpa di hari esok! Kerja bagus.",
        icon: "sparkles" as const,
        color: "#10B981",
        bg: "#D1FAE5",
      };
    }
  }, [attendance]);

  const renderItem = useCallback(
    ({ item }: { item: Slip }) => (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, { width: CARD_WIDTH }]}
        onPress={() =>
          router.push({
            pathname: "../slip-detail",
            params: { month: String(item.month), year: String(item.year) },
          })
        }
      >
        <Image
          source={require("@/assets/images/invoice.png")}
          style={[styles.cardImage, { backgroundColor: "#F1F5F9", borderRadius: 8 }]}
          resizeMode="contain"
        />
        <Text style={styles.cardMonth}>
          {MONTH_NAMES[item.month - 1]} {item.year}
        </Text>
        <Text style={styles.cardSalary}>{formatCurrency(item.baseSalary)}</Text>
      </TouchableOpacity>
    ),
    [router],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER HERO */}
      <View style={styles.headerHero}>
        <Image
          source={require("@/assets/images/hero.png")}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>

      {/* STATUS ABSENSI */}
      <View style={[styles.statusCard, { backgroundColor: attendanceStatusInfo.bg }]}>
        <View style={styles.statusMainContent}>
          <View style={styles.timeInfoRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Masuk</Text>
              <Text style={[styles.timeValue, { color: attendanceStatusInfo.color }]}>
                {attendance.jamMasuk}
              </Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Keluar</Text>
              <Text style={[styles.timeValue, { color: attendanceStatusInfo.color }]}>
                {attendance.jamKeluar}
              </Text>
            </View>
          </View>
          <Text style={[styles.statusBriefText, { color: attendanceStatusInfo.color }]}>
            {attendanceStatusInfo.text}
          </Text>
        </View>

        <View style={styles.iconContainer}>
          <SymbolView
            name={attendanceStatusInfo.icon}
            size={36}
            tintColor={attendanceStatusInfo.color}
            fallback={
              <View style={[styles.fallbackIcon, { backgroundColor: attendanceStatusInfo.color }]} />
            }
          />
        </View>
      </View>

      {/* CONTAINER UTAMA BACKGROUND ABU-ABU */}
      <View style={styles.mainContainer}>
        {/* FILTER CARD */}
        <View style={styles.filterCard}>
          <View style={styles.pickerWrapper}>
            {loading ? (
              <ActivityIndicator style={{ padding: 12 }} color="#0EA5E9" />
            ) : (
<Picker
  selectedValue={year ?? undefined}
  onValueChange={(val) => setYear(Number(val))}
  dropdownIconColor="#000000" // Warna panah dropdown menjadi hitam
  style={{ color: '#000000' }} // Warna teks utama Picker
>
  {availableYears.length === 0 ? (
    <Picker.Item 
      label="— Tidak ada data —" 
      value={undefined} 
      color="#000000" 
    />
  ) : (
    availableYears.map((y) => (
      <Picker.Item 
        key={y} 
        label={String(y)} 
        value={y} 
        color="#000000" // Warna opsi pilihan pada dropdown
      />
    ))
  )}
</Picker>
            )}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* LIST GRID FLATLIST */}
        {loading && slips.length === 0 ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#0EA5E9" />
          </View>
        ) : (
          <View style={styles.listContainer}>
            <FlatList
              data={slipsForYear}
              keyExtractor={(item) => item.id}
              numColumns={2}
              renderItem={renderItem}
              contentContainerStyle={[styles.list, { minHeight: SCREEN_HEIGHT * 0.4 }]}
              columnWrapperStyle={styles.listColumnRow}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    {error ? "Gagal mengambil data." : `Tidak ada slip gaji tahun ${year ?? "-"}`}
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingBottom:100,
  },
  headerHero: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 320, // Tinggi disesuaikan agar proporsional untuk image contain
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  statusCard: {
    marginHorizontal: 16,
    marginTop: -20,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statusMainContent: {
    flex: 1,
  },
  timeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  timeBlock: {
    flexDirection: "column",
  },
  timeLabel: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  timeDivider: {
    width: 1.5,
    height: 20,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 16,
  },
  statusBriefText: {
    fontSize: 12,
    fontWeight: "600",
  },
  iconContainer: {
    marginLeft: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1E293B",
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  errorText: {
    color: "#EF4444",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  listContainer: {
    flex: 1,
  },
  list: {
    paddingBottom: 24,
  },
  listColumnRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardImage: {
    height: 64,
    width: "100%",
    marginBottom: 8,
  },
  cardMonth: {
    fontSize: 12,
    color: "#64748B",
    borderTopWidth: 1,
    paddingTop: 6,
    borderColor: "#F1F5F9",
    fontWeight: "500",
  },
  cardSalary: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
    color: "#0EA5E9",
  },
  centerLoading: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500",
  },
});