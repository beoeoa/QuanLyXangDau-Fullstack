import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Alert, ActivityIndicator, Image, ScrollView
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { useTripStore } from '../../store/tripStore';
import { createSOSReport, fetchDriverSOS, uploadImageToFirebase } from '../../services/dataService';
import { getCurrentLocation } from '../../services/locationService';

const SOS_TYPES = [
  { id: 'traffic', label: 'Kẹt Xe / Đến Trễ', icon: 'car', color: '#f97316' },
  { id: 'breakdown', label: 'Hỏng Xe / Tai Nạn', icon: 'construct', color: '#ef4444' },
  { id: 'leak', label: 'Rò Rỉ Hàng', icon: 'water', color: '#8b5cf6' },
  { id: 'theft', label: 'Mất Hàng', icon: 'alert-circle', color: '#ec4899' },
  { id: 'other', label: 'Sự Cố Khác', icon: 'ellipsis-horizontal', color: '#6b7280' },
];

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  acknowledged: '#f59e0b',
  resolved: '#10b981',
};

export default function SOSScreen() {
  const { user } = useAuthStore();
  const { activeTrip } = useTripStore();
  const [mode, setMode] = useState<'main' | 'form'>('main');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Photo attachment
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (user?.userId) {
      const data = await fetchDriverSOS(user.userId);
      setHistory(data);
    }
    setLoadingHistory(false);
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ─── Chụp / chọn ảnh hiện trường ───────────────────────────────────────────
  const handlePickPhoto = () => {
    Alert.alert('Đính kèm ảnh hiện trường', 'Chọn nguồn ảnh', [
      {
        text: '📷 Chụp ảnh',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (perm.status !== 'granted') {
            Alert.alert('Quyền truy cập', 'Cần cấp quyền Camera để chụp ảnh hiện trường.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
          if (!result.canceled && result.assets[0]) {
            await uploadSosPhoto(result.assets[0].uri);
          }
        },
      },
      {
        text: '🖼️ Chọn từ thư viện',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== 'granted') {
            Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập Thư viện ảnh.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
          if (!result.canceled && result.assets[0]) {
            await uploadSosPhoto(result.assets[0].uri);
          }
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const uploadSosPhoto = async (uri: string) => {
    setPhotoUri(uri);
    setUploadingPhoto(true);
    try {
      const timestamp = Date.now();
      const path = `sos-photos/${user?.userId || 'unknown'}/${timestamp}.jpg`;
      const url = await uploadImageToFirebase(uri, path);
      setPhotoUrl(url);
      Alert.alert('✅ Thành công', 'Ảnh hiện trường đã được tải lên.');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể tải ảnh lên. Ảnh sẽ được gửi kèm mô tả văn bản.');
      setPhotoUrl(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSendSOS = async () => {
    if (!selectedType) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại sự cố');
      return;
    }

    setSending(true);
    let lat, lng;
    try {
      const loc = await getCurrentLocation();
      if (loc) {
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
    } catch {}

    const result = await createSOSReport({
      driverId: user?.userId || '',
      driverName: user?.name || '',
      type: selectedType,
      description: description || 'Không có mô tả thêm',
      photoUrl: photoUrl || undefined,
      lat, lng,
      orderId: activeTrip?.id,
    });

    setSending(false);

    if (result.success) {
      Alert.alert('✅ Đã Gửi', 'Báo cáo sự cố đã được gửi lên hệ thống. Đội điều phối sẽ liên hệ bạn sớm nhất.');
      setMode('main');
      setSelectedType(null);
      setDescription('');
      setPhotoUri(null);
      setPhotoUrl(null);
      loadHistory();
    } else {
      Alert.alert('Lỗi', 'Không thể gửi báo cáo. Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Báo Cáo Sự Cố</Text>
        <Text style={styles.subtitle}>Nhấn nút SOS để gửi báo cáo khẩn cấp</Text>
      </View>

      {mode === 'main' ? (
        <View style={styles.mainContent}>
          {/* SOS Button */}
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => setMode('form')}
            activeOpacity={0.7}
          >
            <View style={styles.sosRing3} />
            <View style={styles.sosRing2} />
            <View style={styles.sosRing1}>
              <Ionicons name="warning" size={40} color="#fff" />
              <Text style={styles.sosText}>SOS</Text>
            </View>
          </TouchableOpacity>

          {/* History */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Lịch Sử Báo Cáo</Text>
            {loadingHistory ? (
              <ActivityIndicator color="#4f46e5" style={{ marginTop: 20 }} />
            ) : history.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có báo cáo nào</Text>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyType}>
                        {SOS_TYPES.find((s) => s.id === item.type)?.label || item.type}
                      </Text>
                      <View style={[styles.historyBadge, { backgroundColor: STATUS_COLORS[item.status] || '#6b7280' }]}>
                        <Text style={styles.historyBadgeText}>{item.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.historyDesc} numberOfLines={2}>{item.description}</Text>
                    {item.photoUrl && (
                      <Image source={{ uri: item.photoUrl }} style={styles.historyPhoto} />
                    )}
                    <Text style={styles.historyDate}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '---'}
                    </Text>
                  </View>
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      ) : (
        /* SOS Form */
        <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.formTitle}>Chọn loại sự cố:</Text>

          <View style={styles.typeGrid}>
            {SOS_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && { borderColor: type.color, backgroundColor: type.color + '10' },
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <Ionicons name={type.icon as any} size={28} color={selectedType === type.id ? type.color : '#94a3b8'} />
                <Text style={[styles.typeLabel, selectedType === type.id && { color: type.color }]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Mô tả thêm (tuỳ chọn):</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập mô tả sự cố..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Đính kèm ảnh hiện trường */}
          <Text style={styles.formLabel}>Ảnh hiện trường:</Text>
          <TouchableOpacity style={styles.photoPickerBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
            {uploadingPhoto ? (
              <ActivityIndicator color="#ef4444" />
            ) : photoUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <View style={styles.photoOverlay}>
                  <Ionicons name={photoUrl ? 'checkmark-circle' : 'cloud-upload'} size={24} color={photoUrl ? '#10b981' : '#fff'} />
                  <Text style={styles.photoOverlayText}>{photoUrl ? 'Đã tải lên ✓' : 'Đang tải...'}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={32} color="#94a3b8" />
                <Text style={styles.photoPlaceholderText}>Chụp ảnh hiện trường</Text>
                <Text style={styles.photoPlaceholderSub}>(Tùy chọn nhưng khuyến khích)</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setMode('main'); setSelectedType(null); setPhotoUri(null); setPhotoUrl(null); }}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, sending && { opacity: 0.6 }]}
              onPress={handleSendSOS}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>🆘 GỬI BÁO CÁO</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },

  mainContent: { flex: 1, alignItems: 'center' },

  sosButton: { marginTop: 30, marginBottom: 30, alignItems: 'center', justifyContent: 'center', width: 180, height: 180 },
  sosRing3: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.12)',
  },
  sosRing2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  sosRing1: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center',
    elevation: 10, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 15,
  },
  sosText: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 2 },

  historySection: { flex: 1, width: '100%', paddingHorizontal: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 20, fontSize: 15 },

  historyCard: {
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  historyType: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  historyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  historyBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  historyDesc: { color: '#64748b', fontSize: 13, marginBottom: 6 },
  historyPhoto: { width: '100%', height: 120, borderRadius: 8, marginBottom: 6, resizeMode: 'cover' },
  historyDate: { color: '#94a3b8', fontSize: 12 },

  formContent: { flex: 1, padding: 16 },
  formTitle: { color: '#0f172a', fontSize: 17, fontWeight: '700', marginBottom: 14 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  typeCard: {
    width: '47%', backgroundColor: '#ffffff', borderRadius: 14,
    padding: 16, alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  typeLabel: { color: '#64748b', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  formLabel: { color: '#334155', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  textInput: {
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 14, color: '#0f172a', fontSize: 15,
    borderWidth: 1, borderColor: '#e2e8f0',
    textAlignVertical: 'top', minHeight: 80, marginBottom: 16,
  },

  // Photo picker
  photoPickerBtn: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    borderStyle: 'dashed', marginBottom: 20, overflow: 'hidden',
  },
  photoPlaceholder: {
    alignItems: 'center', padding: 24, gap: 6,
  },
  photoPlaceholderText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  photoPlaceholderSub: { color: '#94a3b8', fontSize: 12 },
  photoPreviewWrap: { position: 'relative' },
  photoPreview: { width: '100%', height: 160, resizeMode: 'cover' },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8,
  },
  photoOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  formActions: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 32 },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#f1f5f9', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cancelBtnText: { color: '#64748b', fontWeight: '700', fontSize: 16 },
  sendBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#ef4444', alignItems: 'center',
    elevation: 4,
  },
  sendBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
