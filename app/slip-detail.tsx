// app/slip-detail.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

type SlipDetail = {
  nik: number;
  hari_efektif: string;
  jam_lembur: string;
  periode_bulan: number;
  periode_tahun: number;
  insentif: number;
  jumlah_gaji: number;
  bpjs: number;
  total_gaji: number;
};

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function SlipDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ month?: string; year?: string }>();

  const month = Number(params.month);
  const year = Number(params.year);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SlipDetail | null>(null);

  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.189:8000/api";

  const monthName = useMemo(() => {
    return MONTH_NAMES[month - 1] ?? "-";
  }, [month]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const raw = await AsyncStorage.getItem("user");
        if (!raw) {
          setError("Data user tidak ditemukan. Silakan login ulang.");
          return;
        }

        const user = JSON.parse(raw);
        const department = String(
          user?.department ?? user?.dept ?? user?.data?.department ?? "",
        ).trim();
        const nik = Number(
          user?.nik ?? user?.nik_number ?? user?.data?.nik ?? 0,
        );

        if (!department || !nik) {
          setError("Data user tidak lengkap.");
          return;
        }

        const res = await fetch(`${apiUrl}/api/get-slip-details`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            department,
            nik,
            month,
            year,
          }),
        });

        const json = await res.json();

        if (json?.error === true) {
          setError(json?.message ?? "Gagal mengambil detail slip.");
          return;
        }

        setDetail(json?.data ?? null);
      } catch (e: any) {
        setError("Gagal terhubung ke server.");
      } finally {
        setLoading(false);
      }
    };

    if (month && year) {
      load();
    } else {
      setError("Parameter bulan/tahun tidak valid.");
    }
  }, [month, year, apiUrl]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER HERO (Warna Palet Baru) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <SymbolView
            name={{
              ios: "chevron.left",
              android: "arrow_back",
              web: "arrow_back",
            }}
            tintColor="#ffffff"
            size={24}
          />
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Detail Slip Gaji</Text>
        <Text style={styles.subtitle}>Periode Gaji Karyawan</Text>
      </View>

      {/* BODY KONTEN */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text style={styles.loadingText}>Memuat detail slip...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <SymbolView
              name={{
                ios: "exclamationmark.triangle.fill",
                android: "warning",
                web: "warning",
              }}
              tintColor="#EF4444"
              size={40}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : detail ? (
          <View style={styles.card}>
            {/* BAGIAN ATAS: NIK DAN PERIODE BULAN DI TENGAH */}
            <View style={styles.metaCenterContainer}>
              <View style={styles.badgePeriod}>
                <SymbolView
                  name={{
                    ios: "calendar.badge.clock",
                    android: "schedule",
                    web: "schedule",
                  }}
                  tintColor="#0EA5E9"
                  size={20}
                />
                <Text style={styles.metaPeriodText}>
                  {MONTH_NAMES[detail.periode_bulan - 1]} {detail.periode_tahun}
                </Text>
              </View>
              <Text style={styles.metaNikLabel}>Nomor Induk Karyawan</Text>
              <Text style={styles.metaNikValue}>{detail.nik}</Text>
            </View>

            <View style={styles.divider} />

            {/* RINCIAN DATA UTAMA */}
            <Text style={styles.sectionTitle}>Rincian Kerja & Insentif</Text>

            <View style={styles.row}>
              <View style={styles.labelGroup}>
                <SymbolView
                  name={{
                    ios: "calendar",
                    android: "calendar_today",
                    web: "calendar_today",
                  }}
                  tintColor="#64748B"
                  size={16}
                />
                <Text style={styles.label}>Hari Efektif</Text>
              </View>
              <Text style={styles.value}>
                {Math.ceil(Number(detail.hari_efektif || 0))} Hari
              </Text>
            </View>

            <View style={styles.row}>
              <View style={styles.labelGroup}>
                <SymbolView
                  name={{ ios: "clock.fill", android: "alarm", web: "alarm" }}
                  tintColor="#64748B"
                  size={16}
                />
                <Text style={styles.label}>Jam Lembur</Text>
              </View>
              <Text style={styles.value}>
                {Math.ceil(Number(detail.jam_lembur || 0))} Jam
              </Text>
            </View>

            <View style={styles.row}>
              <View style={styles.labelGroup}>
                <SymbolView
                  name={{
                    ios: "arrow.up.right.circle.fill",
                    android: "trending_up",
                    web: "trending_up",
                  }}
                  tintColor="#10B981"
                  size={16}
                />
                <Text style={styles.label}>Insentif</Text>
              </View>
              <Text style={[styles.value, { color: "#10B981" }]}>
                {formatCurrency(Number(detail.insentif))}
              </Text>
            </View>

            <View style={styles.row}>
              <View style={styles.labelGroup}>
                <SymbolView
                  name={{ ios: "briefcase.fill", android: "work", web: "work" }}
                  tintColor="#64748B"
                  size={16}
                />
                <Text style={styles.label}>Jumlah Gaji Pokok</Text>
              </View>
              <Text style={styles.value}>
                {formatCurrency(Number(detail.jumlah_gaji))}
              </Text>
            </View>

            {/* POTONGAN BPJS BERWARNA MERAH */}
            <View style={[styles.row, styles.deductionRow]}>
              <View style={styles.labelGroup}>
                <SymbolView
                  name={{
                    ios: "arrow.down.left.circle.fill",
                    android: "trending_down",
                    web: "trending_down",
                  }}
                  tintColor="#EF4444"
                  size={16}
                />
                <Text style={[styles.label, { color: "#EF4444" }]}>
                  Potongan BPJS
                </Text>
              </View>
              <Text style={[styles.value, { color: "#EF4444" }]}>
                -{formatCurrency(Number(detail.bpjs))}
              </Text>
            </View>

            {/* TOTAL AKHIR GAJI */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Gaji Bersih</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(Number(detail.total_gaji))}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.loadingText}>Data tidak tersedia.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: "#38BDF8", // Warna Primary
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  backText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#F8FAFC",
    opacity: 0.9,
    fontSize: 14,
    marginTop: 2,
  },

  body: {
    flex: 1,
    padding: 16,
  },
  center: {
    paddingVertical: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  errorText: {
    color: "#EF4444",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0EA5E9", // Shadow bernuansa warna sekunder
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 30,
  },

  // Style Sentralisasi Data NIK dan Periode Bulan di Tengah
  metaCenterContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  badgePeriod: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 14,
  },
  metaPeriodText: {
    color: "#0EA5E9", // Warna Secondary
    fontWeight: "700",
    fontSize: 15,
  },
  metaNikLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaNikValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 14,
  },
  value: {
    color: "#1E293B",
    fontWeight: "700",
    fontSize: 14,
  },
  deductionRow: {
    backgroundColor: "#FFF5F5", // Latar belakang merah tipis khusus potongan BPJS
    paddingHorizontal: 8,
    borderRadius: 8,
    borderColor: "#FEE2E2",
    borderWidth: 1,
    marginTop: 4,
  },

  totalContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  totalLabel: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    color: "#0EA5E9", // Menggunakan warna Secondary
    fontWeight: "800",
  },
});
