// app/tambah-cuti.tsx
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

/* ================= MAIN COMPONENT ================= */
export default function TambahCutiPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // User Profile State (Auto-filled dari AsyncStorage)
  const [userData, setUserData] = useState({ nama: "", divisi: "" });

  // Form States
  const [leaveCategory, setLeaveCategory] = useState("Cuti Tahunan");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [hasSelectedStart, setHasSelectedStart] = useState(false);
  const [hasSelectedEnd, setHasSelectedEnd] = useState(false);

  const [description, setDescription] = useState("");
  const [bringLaptop, setBringLaptop] = useState(false);
  const [canBeContacted, setCanBeContacted] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Picker visibility states (Untuk Android kontrol modal, iOS inline/compact)
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.xx:8000/api";

  // Format Date menjadi string YYYY-MM-DD
  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Ambil profile saat halaman dibuka
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (raw) {
          const user = JSON.parse(raw);
          const name = user?.name ?? user?.full_name ?? user?.data?.name ?? "";
          const department = (
            user?.department ??
            user?.dept ??
            user?.data?.department ??
            ""
          ).toString();
          setUserData({ nama: name, divisi: department });
        }
      } catch (e) {
        console.warn("Gagal memuat profil user", e);
      }
    };
    loadUserProfile();
  }, []);

  // Handler Pilih Gambar Dokumen Pendukung
  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Izin Ditolak",
        "Aplikasi membutuhkan izin galeri untuk mengunggah dokumen."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // Date Change Handlers (menggunakan onChange, bukan onValueChange)
  const onStartChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      setHasSelectedStart(true);
      if (endDate < selectedDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const onEndChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
      setHasSelectedEnd(true);
    }
  };

  // Kirim Data Form ke API Backend
  const handleSubmit = useCallback(async () => {
    if (!hasSelectedStart || !hasSelectedEnd) {
      Alert.alert(
        "Validasi Gagal",
        "Tanggal mulai dan tanggal selesai wajib ditentukan."
      );
      return;
    }

    if (endDate < startDate) {
      Alert.alert(
        "Validasi Gagal",
        "Tanggal selesai tidak boleh mendahului tanggal mulai."
      );
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("nama", userData.nama);
      formData.append("divisi", userData.divisi);
      formData.append("leave_category", leaveCategory);
      formData.append("start_date", formatDateString(startDate));
      formData.append("end_date", formatDateString(endDate));
      formData.append("description", description);
      formData.append("bring_laptop", bringLaptop ? "1" : "0");
      formData.append("can_be_contacted", canBeContacted ? "1" : "0");

      // ===== PERBAIKAN UTAMA: kirim file tanpa JSON.stringify =====
      // if (imageUri) {
      //   const filename = imageUri.split("/").pop() ?? "document.jpg";
      //   const match = /\.(\w+)$/.exec(filename);
      //   const type = match ? `image/${match[1]}` : `image/jpeg`;
      // console.log(filename);
      // console.log(type);
      //   // React Native FormData menerima objek dengan { uri, name, type }
      //   formData.append("supporting_document", {
      //     uri: Platform.OS === "ios" ? imageUri.replace("file://", "") : imageUri,
      //     name: filename,
      //     type: type,
      //   });
      // }
      
      const requestUrl = apiUrl.endsWith('/api')
        ? `${apiUrl}/post-cuti`
        : `${apiUrl}/api/post-cuti`;

      const res = await fetch(requestUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          // Jangan set 'Content-Type' – akan diatur otomatis oleh fetch
        },
        body: formData,
      });

      const json = await res.json();

      if (res.ok && json.error === false) {
        Alert.alert(
          "Sukses",
          json.message ?? "Pengajuan cuti berhasil dikirim.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "Gagal Menyimpan",
          json.message ?? "Terjadi kesalahan pada server."
        );
      }
    } catch (error) {
      console.error("Detail Error Submit Cuti:", error);
      Alert.alert("Koneksi Eror", "Gagal terhubung ke server internal.");
    } finally {
      setSubmitting(false);
    }
  }, [
    userData,
    leaveCategory,
    startDate,
    endDate,
    hasSelectedStart,
    hasSelectedEnd,
    description,
    bringLaptop,
    canBeContacted,
    imageUri,
    apiUrl,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER BAR */}
      <View style={styles.headerHero}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <SymbolView
            name={{
              ios: "chevron.backward",
              android: "arrow_back",
              web: "arrow_back",
            }}
            tintColor="#ffffff"
            size={20}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.title}>Form Pengajuan Cuti</Text>
          <Text style={styles.subtitle}>
            Isi data di bawah ini secara lengkap
          </Text>
        </View>
      </View>

      {/* COMPONENT FORM BODY */}
      <ScrollView
        style={styles.mainContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {/* Read Only Profiles */}
          <View style={styles.rowProfile}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Nama Karyawan</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={userData.nama}
                editable={false}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Divisi</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={userData.divisi.toUpperCase()}
                editable={false}
              />
            </View>
          </View>

          {/* Kategori Cuti */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kategori Cuti</Text>
            <View style={styles.pickerWrapper}>
<Picker
  selectedValue={leaveCategory}
  onValueChange={(val) => setLeaveCategory(val)}
  style={{ color: '#000000' }} // Warna teks pilihan utama
  dropdownIconColor="#000000"  // Warna panah dropdown
>
  <Picker.Item label="Cuti Tahunan" value="Cuti Tahunan" color="#000000" />
  <Picker.Item label="Cuti Sakit" value="Cuti Sakit" color="#000000" />
  <Picker.Item label="Cuti Melahirkan" value="Cuti Melahirkan" color="#000000" />
  <Picker.Item label="Cuti Darurat" value="Cuti Darurat" color="#000000" />
  <Picker.Item label="Cuti Pribadi" value="Cuti Pribadi" color="#000000" />
  <Picker.Item label="Cuti Pernikahan" value="Cuti Pernikahan" color="#000000" />
</Picker>
            </View>
          </View>

          {/* Date Picker Input Trigger Grid */}
          <View style={styles.rowProfile}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Tanggal Mulai</Text>
              <TouchableOpacity
                style={styles.dateSelectorInput}
                onPress={() => setShowStartPicker(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateSelectorText,
                    !hasSelectedStart && styles.datePlaceholder,
                  ]}
                >
                  {hasSelectedStart
                    ? formatDateString(startDate)
                    : "Pilih Tanggal"}
                </Text>
                <SymbolView
                  name={{
                    ios: "calendar",
                    android: "calendar_today",
                    web: "calendar_today",
                  }}
                  tintColor="#0EA5E9"
                  size={16}
                />
              </TouchableOpacity>

              {/* PERBAIKAN: gunakan onChange, bukan onValueChange */}
              {(showStartPicker || Platform.OS === "ios") && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "compact" : "default"}
                  onChange={onStartChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Tanggal Selesai</Text>
              <TouchableOpacity
                style={styles.dateSelectorInput}
                onPress={() => setShowEndPicker(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateSelectorText,
                    !hasSelectedEnd && styles.datePlaceholder,
                  ]}
                >
                  {hasSelectedEnd ? formatDateString(endDate) : "Pilih Tanggal"}
                </Text>
                <SymbolView
                  name={{
                    ios: "calendar",
                    android: "calendar_today",
                    web: "calendar_today",
                  }}
                  tintColor="#0EA5E9"
                  size={16}
                />
              </TouchableOpacity>

              {/* PERBAIKAN: gunakan onChange, bukan onValueChange */}
              {(showEndPicker || Platform.OS === "ios") && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "compact" : "default"}
                  onChange={onEndChange}
                  minimumDate={startDate}
                />
              )}
            </View>
          </View>

          {/* Deskripsi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Keterangan / Alasan Cuti</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tulis alasan detail liburan atau kepentingan Anda..."
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>

          {/* Switch Boolean Grid */}
          <View style={styles.switchContainerRow}>
            <View style={styles.switchBox}>
              <View style={styles.switchTextGroup}>
                <Text style={styles.switchLabel}>Membawa Laptop</Text>
                <Text style={styles.switchSubLabel}>Siap bekerja darurat</Text>
              </View>
              <Switch
                value={bringLaptop}
                onValueChange={setBringLaptop}
                trackColor={{ false: "#CBD5E1", true: "#38BDF8" }}
                thumbColor={bringLaptop ? "#0EA5E9" : "#F4F3F4"}
              />
            </View>

            <View style={styles.switchBox}>
              <View style={styles.switchTextGroup}>
                <Text style={styles.switchLabel}>Bisa Dihubungi</Text>
                <Text style={styles.switchSubLabel}>Komunikasi via ponsel</Text>
              </View>
              <Switch
                value={canBeContacted}
                onValueChange={setCanBeContacted}
                trackColor={{ false: "#CBD5E1", true: "#38BDF8" }}
                thumbColor={canBeContacted ? "#0EA5E9" : "#F4F3F4"}
              />
            </View>
          </View>

          {/* <View style={styles.inputGroup}>
            <Text style={styles.label}>Dokumen Pendukung (Opsional)</Text>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              <SymbolView
                name={{
                  ios: "pencil.tip.crop.circle.badge.plus",
                  android: "home_and_garden",
                  web: "home_and_garden",
                }}
                tintColor="#0EA5E9"
                size={22}
              />
              <Text style={styles.uploadBtnText}>
                {imageUri
                  ? "Ubah Dokumen Gambar"
                  : "Pilih Berkas Gambar (.png, .jpg)"}
              </Text>
            </TouchableOpacity>

            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View> */}

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <SymbolView
              name={{ ios: "info.circle", android: "info", web: "info" }}
              tintColor="#0EA5E9"
              size={20}
            />
            <Text style={styles.infoBannerText}>
              Pastikan pengajuan dilakukan minimal 3 hari sebelum tanggal
              efektif cuti dimulai.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Kirim Pengajuan</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  headerHero: {
    backgroundColor: "#38BDF8",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleGroup: { flex: 1 },
  title: { fontSize: 20, fontWeight: "800", color: "#ffffff" },
  subtitle: { fontSize: 12, color: "#ffffff", opacity: 0.9, marginTop: 2 },
  mainContainer: { flex: 1, padding: 16 },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 40,
  },
  rowProfile: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },
  disabledInput: { backgroundColor: "#F1F5F9", color: "#64748B" },
  pickerWrapper: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  dateSelectorInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateSelectorText: { fontSize: 14, color: "#1E293B", fontWeight: "600" },
  datePlaceholder: { color: "#94A3B8", fontWeight: "500" },
  textArea: { minHeight: 80 },
  switchContainerRow: { flexDirection: "column", gap: 12, marginBottom: 18 },
  switchBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  switchTextGroup: { flex: 1 },
  switchLabel: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  switchSubLabel: { fontSize: 11, color: "#64748B", marginTop: 1 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#0EA5E9",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  uploadBtnText: { fontSize: 13, color: "#0EA5E9", fontWeight: "700" },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: "#1D4ED8",
    fontWeight: "500",
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: "#0EA5E9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: { backgroundColor: "#94A3B8" },
  submitBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
});