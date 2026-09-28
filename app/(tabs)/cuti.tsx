// app/cuti-history.tsx
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

/* ================= TYPES ================= */
type CutiItem = {
  id: number;
  nama: string;
  divisi: string;
  leave_category: string;
  start_date: string;
  end_date: string;
  supporting_document: string | null;
  description: string;
  bring_laptop: boolean;
  can_be_contacted: boolean;
  status: "Pending" | "Accept" | "Reject";
  created_at: string;
};

/* ================= MAIN COMPONENT ================= */
export default function CutiHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cutiList, setCutiList] = useState<CutiItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // State untuk kontrol Modal Detail
  const [selectedCuti, setSelectedCuti] = useState<CutiItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.189:8000/api";

const fetchCutiData = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const raw = await AsyncStorage.getItem("user");
    if (!raw) {
      setError("Data user tidak ditemukan. Silakan login kembali.");
      return;
    }

    const user = JSON.parse(raw);
    const nama = user?.name ?? user?.full_name ?? user?.data?.name ?? null;
    const divisi = (user?.department ?? user?.dept ?? user?.data?.department ?? "").toString().trim();

    if (!nama || !divisi) {
      setError("Profil nama atau divisi Anda belum lengkap.");
      return;
    }

    const res = await fetch(`${apiUrl}/api/get-cuti`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, divisi }),
    });

    const json = await res.json();      

    if (json?.error === true) {
      setError(json?.message ?? "Gagal memuat riwayat cuti.");
      return;
    }

    setCutiList(json?.data ?? []);
  } catch (e) {
    setError("Gagal terhubung ke server.");
  } finally {
    setLoading(false);
  }
}, [apiUrl]);

// 2. GANTI USEEFFECT LAMA DENGAN KODE INI:
useFocusEffect(
  useCallback(() => {
    fetchCutiData();
  }, [fetchCutiData])
);

  // Helper untuk menentukan visual status riwayat cuti
  const getStatusConfig = (status: CutiItem["status"]) => {
    switch (status) {
      case "Accept":
        return { color: "#10B981", bg: "#D1FAE5", icon: "checkmark.circle.fill" as const, text: "Diterima" };
      case "Reject":
        return { color: "#EF4444", bg: "#FEE2E2", icon: "xmark.circle.fill" as const, text: "Ditolak" };
      default:
        return { color: "#F59E0B", bg: "#FEF3C7", icon: "clock.fill" as const, text: "Pending" };
    }
  };

  const openDetailModal = (item: CutiItem) => {
    setSelectedCuti(item);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER HERO SECTION */}
      <View style={styles.headerHero}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Riwayat Cuti</Text>
          <Text style={styles.subtitle}>Pantau status pengajuan izin Anda</Text>
        </View>

        {/* BUTTON LINK KE HALAMAN TAMBAH CUTI */}
        <TouchableOpacity 
          style={styles.addBtn} 
          activeOpacity={0.8}
          onPress={() => router.push("../form-cuti")} // Sesuaikan path routing form Anda
        >
          <SymbolView 
            name={{ ios: "plus.circle.fill", android: "add_circle", web: "add_circle" }} 
            tintColor="#ffffff" 
            size={18} 
          />
          <Text style={styles.addBtnText}>Ajukan Cuti</Text>
        </TouchableOpacity>
      </View>

      {/* BODY UTAMA / DATA TABLE AREA */}
      <View style={styles.mainContainer}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0EA5E9" />
            <Text style={styles.infoText}>Mengambil data cuti...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <SymbolView name={{ ios: "exclamationmark.triangle.fill", android: "warning", web: "warning" }} tintColor="#EF4444" size={36} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : cutiList.length === 0 ? (
          <View style={styles.center}>
            <SymbolView name={{ ios: "calendar.badge.exclamationmark", android: "event_busy", web: "event_busy" }} tintColor="#64748B" size={40} />
            <Text style={styles.infoText}>Belum ada riwayat pengajuan cuti.</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {/* TABLE HEADER */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { flex: 2 }]}>Kategori Cuti</Text>
              <Text style={[styles.th, { flex: 2.5, textAlign: "center" }]}>Tanggal Cuti</Text>
              <Text style={[styles.th, { flex: 1.5, textAlign: "center" }]}>Aksi</Text>
            </View>

            {/* TABLE ROWS (SCROLLABLE LIST) */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {cutiList.map((item, index) => {
                const statusConf = getStatusConfig(item.status);
                return (
                  <View 
                    key={item.id} 
                    style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? "#ffffff" : "#F8FAFC" }]}
                  >
                    {/* Kategori Cuti */}
                    <View style={{ flex: 2, justifyContent: "center" }}>
                      <Text style={styles.tdCategory}>{item.leave_category}</Text>
                    </View>

                    {/* Rentang Tanggal */}
                    <View style={{ flex: 2.5, justifyContent: "center", alignItems: "center" }}>
                      <Text style={styles.tdDate}>{item.start_date}</Text>
                      <Text style={styles.tdDateDivider}>s/d</Text>
                      <Text style={styles.tdDate}>{item.end_date}</Text>
                    </View>

                    {/* Aksi & Icon Status */}
                    <View style={styles.actionCell}>
                      {/* Icon Status Dinamis */}
                      <View style={[styles.statusMiniBadge, { backgroundColor: statusConf.bg }]}>
                        <SymbolView 
                          name={statusConf.icon} 
                          tintColor={statusConf.color} 
                          size={16} 
                        />
                      </View>
                      
                      {/* Tombol Info Detail */}
                      <TouchableOpacity 
                        style={styles.infoBtn}
                        onPress={() => openDetailModal(item)}
                        activeOpacity={0.7}
                      >
                        <SymbolView 
                          name={{ ios: "info.circle", android: "info", web: "info" }} 
                          tintColor="#0EA5E9" 
                          size={18} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ================= MODAL DETAIL KESELURUHAN DATA ================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <SymbolView name={{ ios: "doc.text.fill", android: "description", web: "description" }} tintColor="#0EA5E9" size={20} />
                <Text style={styles.modalTitle}>Detail Pengajuan Cuti</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <SymbolView name={{ ios: "xmark.circle.fill", android: "cancel", web: "cancel" }} tintColor="#94A3B8" size={22} />
              </TouchableOpacity>
            </View>

            {selectedCuti && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                
                {/* Info Pemohon */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Nama Karyawan</Text>
                  <Text style={styles.detailValue}>{selectedCuti.nama}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Divisi / Departemen</Text>
                  <Text style={styles.detailValue}>{selectedCuti.divisi.toUpperCase()}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Jenis Kategori Cuti</Text>
                  <Text style={[styles.detailValue, { color: "#0EA5E9" }]}>{selectedCuti.leave_category}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Periode Tanggal Efektif</Text>
                  <Text style={styles.detailValue}>{selectedCuti.start_date} hingga {selectedCuti.end_date}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Keterangan / Alasan</Text>
                  <Text style={styles.detailValueDescription}>{selectedCuti.description || "—"}</Text>
                </View>

                {/* Status Bawa Laptop / Kontak */}
                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <SymbolView name={selectedCuti.bring_laptop ? { ios: "laptopcomputer", android: "laptop", web: "laptop" } : { ios: "laptopcomputer.slash", android: "laptop", web: "laptop" }} tintColor="#64748B" size={14} />
                    <Text style={styles.metaBadgeText}>{selectedCuti.bring_laptop ? "Bawa Laptop" : "Tidak Bawa Laptop"}</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <SymbolView name={{ ios: "phone.circle.fill", android: "contact_phone", web: "contact_phone" }} tintColor="#64748B" size={14} />
                    <Text style={styles.metaBadgeText}>{selectedCuti.can_be_contacted ? "Bisa Dihubungi" : "Sulit Dihubungi"}</Text>
                  </View>
                </View>

                {/* Lampiran Dokumen */}
<View style={styles.detailSection}>
  <Text style={styles.detailLabel}>Dokumen Pendukung</Text>
  {selectedCuti.supporting_document ? (
    <Image
      source={{ uri: `http://192.168.0.189:8000${selectedCuti.supporting_document}` }}
      style={{
        width: "100%",
        height: 180,
        borderRadius: 8,
        marginTop: 6,
        backgroundColor: "#F1F5F9",
      }}
      resizeMode="contain"
    />
  ) : (
    <Text style={[styles.detailValue, { fontSize: 13, color: "#64748B", fontWeight: "500", marginTop: 2 }]}>
      Tidak ada lampiran dokumen
    </Text>
  )}
</View>

                <View style={styles.divider} />

                {/* Status Persetujuan */}
                <View style={styles.statusFooterBlock}>
                  <Text style={styles.detailLabel}>Status Pengajuan</Text>
                  <View style={[styles.statusFinalBadge, { backgroundColor: getStatusConfig(selectedCuti.status).bg }]}>
                    <SymbolView name={getStatusConfig(selectedCuti.status).icon} tintColor={getStatusConfig(selectedCuti.status).color} size={16} />
                    <Text style={[styles.statusFinalText, { color: getStatusConfig(selectedCuti.status).color }]}>
                      {getStatusConfig(selectedCuti.status).text}
                    </Text>
                  </View>
                </View>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Base Background
  },
  headerHero: {
    backgroundColor: "#38BDF8", // Primary Color
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 12,
    color: "#ffffff",
    opacity: 0.9,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: "#0EA5E9", // Secondary Color
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  mainContainer: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  infoText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    marginTop: 10,
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  
  // Table Layout Styling
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    maxHeight: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#E0F2FE", // Sentuhan warna Sky Blue muda untuk header tabel
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: "#CBD5E1",
  },
  th: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0369A1",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
  },
  tdCategory: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  tdDate: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  tdDateDivider: {
    fontSize: 10,
    color: "#94A3B8",
    marginVertical: 1,
    fontWeight: "500",
  },
  actionCell: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  statusMiniBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#F0F9FF",
  },

  // Modal Detail Layout Styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)", // Backdrop gelap tipis transparan
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalHeaderTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  modalBody: {
    flexGrow: 0,
  },
  detailSection: {
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "700",
    marginTop: 2,
  },
  detailValueDescription: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 2,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    marginTop: 2,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  metaBadgeText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  statusFooterBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  statusFinalBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusFinalText: {
    fontSize: 13,
    fontWeight: "700",
  },
});