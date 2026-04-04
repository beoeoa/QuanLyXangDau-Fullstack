import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, TextInput, Image, Modal
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/authStore';
import { fetchDriverOrders, updateTripStatus, uploadImageToFirebase } from '../../services/dataService';
import { startBackgroundTracking, stopBackgroundTracking } from '../../services/locationService';

const TRIP_STEPS = [
  { id: 0, text: 'Sẵn sàng', apiStatus: 'pending', icon: 'time', color: '#f59e0b' },
  { id: 1, text: 'Đang vận chuyển', apiStatus: 'moving', icon: 'car', color: '#f97316' },
  { id: 2, text: 'Đã đến trạm', apiStatus: 'arrived', icon: 'flag', color: '#6366f1' },
  { id: 3, text: 'Đang bơm/xả', apiStatus: 'unloading', icon: 'water', color: '#0ea5e9' },
  { id: 4, text: 'Hoàn thành', apiStatus: 'completed', icon: 'checkmark-circle', color: '#10b981' },
];

// Haversine distance in km
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuthStore();

  const [trip, setTrip] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [timeline, setTimeline] = useState<{ step: number; time: string }[]>([]);

  // Seal
  const [sealCode, setSealCode] = useState('');
  const [sealPhotoUri, setSealPhotoUri] = useState<string | null>(null);
  const [uploadingSeal, setUploadingSeal] = useState(false);

  // Delivery
  const [deliveredAmount, setDeliveredAmount] = useState('');
  const [temperature, setTemperature] = useState('');
  const [density, setDensity] = useState('');
  const [docs, setDocs] = useState<any>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Geofence warning modal
  const [geoWarning, setGeoWarning] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');
  const [pendingNextStep, setPendingNextStep] = useState<(() => void) | null>(null);

  useEffect(() => {
    const load = async () => {
      if (user?.userId) {
        const orders = await fetchDriverOrders(user.userId);
        const found = orders?.find((o: any) => o.id === tripId);
        if (found) {
          setTrip(found);
          const stepIdx = TRIP_STEPS.findIndex((s) => s.apiStatus === found.status);
          setCurrentStep(stepIdx >= 0 ? stepIdx : 0);
          if (found.sealCode) setSealCode(found.sealCode);
          if (found.sealPhotoUrl) setSealPhotoUri(found.sealPhotoUrl);
          if (found.deliveredQuantity) setDeliveredAmount(found.deliveredQuantity.toString());
          if (found.documents) setDocs(found.documents);
          if (found.statusHistory && Array.isArray(found.statusHistory)) {
            const existingTimeline = found.statusHistory.map((h: any) => {
              const sIdx = TRIP_STEPS.findIndex((s) => s.apiStatus === h.status);
              return {
                step: sIdx >= 0 ? sIdx : 0,
                time: h.timestamp?._seconds
                  ? new Date(h.timestamp._seconds * 1000).toLocaleTimeString('vi-VN')
                  : h.timestamp ? new Date(h.timestamp).toLocaleTimeString('vi-VN') : '---',
              };
            });
            setTimeline(existingTimeline);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [tripId]);

  // ─── Geofence check ────────────────────────────────────────────────────────
  const checkGeofence = useCallback(async (destinationAddress: string, onPass: () => void) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { onPass(); return; }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      // Geocode destination to coordinates
      const geocoded = await Location.geocodeAsync(destinationAddress);
      if (!geocoded || geocoded.length === 0) { onPass(); return; }

      const dest = geocoded[0];
      const distKm = getDistanceKm(
        current.coords.latitude, current.coords.longitude,
        dest.latitude, dest.longitude
      );

      if (distKm > 1.0) {
        setGeoMessage(
          `Trạm đích đang cách bạn khoảng ${distKm.toFixed(1)} km.\n\n` +
          `Đảm bảo bạn đã đến đúng nơi để giao hàng?\n\n` +
          `⚠️ Sai phạm định vị có thể bị xử lý kỷ luật.`
        );
        setPendingNextStep(() => onPass);
        setGeoWarning(true);
      } else {
        onPass();
      }
    } catch {
      onPass(); // Nếu lỗi GPS thì cho qua
    }
  }, []);

  // ─── Pick + upload ảnh ─────────────────────────────────────────────────────
  const pickAndUploadImage = async (docKey: string, storagePath: string, setLoadingKey: (k: string | null) => void, onDone: (url: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền Camera hoặc Thư viện ảnh để đính kèm chứng từ.');
        return;
      }
    }

    Alert.alert('Đính kèm ảnh', 'Chọn nguồn ảnh', [
      {
        text: '📷 Chụp ảnh mới',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });
          if (!result.canceled && result.assets[0]) {
            setLoadingKey(docKey);
            try {
              const url = await uploadImageToFirebase(result.assets[0].uri, storagePath);
              onDone(url);
              Alert.alert('✅ Thành công', 'Ảnh đã được tải lên hệ thống.');
            } catch {
              Alert.alert('Lỗi', 'Không thể tải ảnh lên. Kiểm tra kết nối mạng.');
            } finally {
              setLoadingKey(null);
            }
          }
        },
      },
      {
        text: '🖼️ Chọn từ thư viện',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });
          if (!result.canceled && result.assets[0]) {
            setLoadingKey(docKey);
            try {
              const url = await uploadImageToFirebase(result.assets[0].uri, storagePath);
              onDone(url);
              Alert.alert('✅ Thành công', 'Ảnh đã được tải lên hệ thống.');
            } catch {
              Alert.alert('Lỗi', 'Không thể tải ảnh lên. Kiểm tra kết nối mạng.');
            } finally {
              setLoadingKey(null);
            }
          }
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const handlePickSealPhoto = () => {
    pickAndUploadImage(
      'seal',
      `trip-docs/${tripId}/seal_${Date.now()}.jpg`,
      (k) => setUploadingSeal(k !== null),
      (url) => setSealPhotoUri(url)
    );
  };

  const handlePickDoc = (docKey: string, label: string) => {
    pickAndUploadImage(
      docKey,
      `trip-docs/${tripId}/${docKey}_${Date.now()}.jpg`,
      setUploadingDoc,
      (url) => setDocs((prev: any) => ({ ...prev, [docKey]: url }))
    );
  };

  // ─── Advance step ──────────────────────────────────────────────────────────
  const doAdvanceStep = async () => {
    if (currentStep >= 4 || !trip) return;
    const nextStep = TRIP_STEPS[currentStep + 1];
    setUpdating(true);

    if (currentStep === 0) await startBackgroundTracking(trip.id);
    if (currentStep === 3) await stopBackgroundTracking();

    const extraData: any = {};
    if (currentStep === 1) {
      extraData.sealCode = sealCode;
      if (sealPhotoUri) extraData.sealPhotoUrl = sealPhotoUri;
    }
    if (currentStep === 3) {
      const original = Number(trip.amount || 0);
      const delivered = Number(deliveredAmount);
      const loss = original - delivered;
      const lossPercent = original > 0 ? (loss / original) * 100 : 0;
      extraData.deliveredQuantity = delivered;
      extraData.loss = loss;
      extraData.lossPercent = Number(lossPercent.toFixed(2));
      extraData.temperature = temperature;
      extraData.density = density;
      extraData.documents = docs;
    }

    await updateTripStatus(trip.id, nextStep.apiStatus, extraData);
    setTimeline((prev) => [...prev, { step: currentStep + 1, time: new Date().toLocaleTimeString('vi-VN') }]);
    setCurrentStep(currentStep + 1);
    setUpdating(false);
  };

  const handleNextStep = () => {
    if (currentStep >= 4 || !trip) return;
    const nextStep = TRIP_STEPS[currentStep + 1];

    // Validation
    if (currentStep === 1 && !sealCode) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mã kẹp chì (Seal) trước khi tiếp tục.');
      return;
    }
    if (currentStep === 1 && !sealPhotoUri) {
      Alert.alert('Thiếu ảnh', 'Vui lòng chụp ảnh niêm chì tại kho để có bằng chứng.');
      return;
    }
    if (currentStep === 3 && !deliveredAmount) {
      Alert.alert('Thiếu số liệu', 'Vui lòng nhập số Lít THỰC GIAO để hoàn thành.');
      return;
    }
    if (currentStep === 3 && !docs.deliveryReceipt) {
      Alert.alert('Thiếu chứng từ', 'Vui lòng chụp ảnh Biên bản giao nhận có chữ ký của Đại lý.');
      return;
    }

    // Geofence check khi bấm "Đã đến trạm" hoặc "Hoàn thành"
    if (currentStep === 1 || currentStep === 3) {
      checkGeofence(trip.destination || '', () => {
        Alert.alert('Xác nhận', `Chuyển sang: "${nextStep.text}"?`, [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xác nhận', onPress: doAdvanceStep },
        ]);
      });
      return;
    }

    Alert.alert('Xác nhận', `Chuyển sang: "${nextStep.text}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xác nhận', onPress: doAdvanceStep },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: '#64748b', fontSize: 16 }}>Không tìm thấy chuyến đi</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lossLiters = Number(trip.amount || 0) - Number(deliveredAmount || 0);
  const lossPercent = Number(trip.amount || 1) > 0 ? (lossLiters / Number(trip.amount)) * 100 : 0;

  return (
    <View style={styles.container}>

      {/* Geofence Warning Modal */}
      <Modal visible={geoWarning} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="warning" size={48} color="#f59e0b" style={{ alignSelf: 'center' }} />
            <Text style={styles.modalTitle}>⚠️ Cảnh Báo Định Vị</Text>
            <Text style={styles.modalBody}>{geoMessage}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#e2e8f0' }]}
                onPress={() => { setGeoWarning(false); setPendingNextStep(null); }}
              >
                <Text style={{ color: '#0f172a', fontWeight: '700' }}>Quay lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => {
                  setGeoWarning(false);
                  if (pendingNextStep) pendingNextStep();
                  setPendingNextStep(null);
                }}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Vẫn tiếp tục</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Chuyến #{trip.id?.toString().slice(0, 6)}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Stepper */}
        <View style={styles.stepperContainer}>
          {TRIP_STEPS.map((step, idx) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepIndicator}>
                <View style={[
                  styles.stepCircle,
                  idx <= currentStep && { backgroundColor: step.color, borderColor: step.color },
                  idx === currentStep && styles.stepCircleActive,
                ]}>
                  {idx < currentStep ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : (
                    <Ionicons name={step.icon as any} size={14} color={idx <= currentStep ? '#fff' : '#94a3b8'} />
                  )}
                </View>
                {idx < TRIP_STEPS.length - 1 && (
                  <View style={[styles.stepLine, idx < currentStep && { backgroundColor: TRIP_STEPS[idx + 1].color }]} />
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepText, idx <= currentStep && { color: '#0f172a' }]}>
                  {step.text}
                </Text>
                {timeline.find((t) => t.step === idx) && (
                  <Text style={styles.stepTime}>✓ {timeline.find((t) => t.step === idx)?.time}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Trip Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Thông Tin Chuyến</Text>
          <View style={styles.infoRow}>
            <Ionicons name="business" size={18} color="#10b981" />
            <Text style={styles.infoLabel}>Kho xuất:</Text>
            <Text style={styles.infoValue}>{trip.exportWarehouse || 'Kho Xăng'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color="#ef4444" />
            <Text style={styles.infoLabel}>Điểm đến:</Text>
            <Text style={styles.infoValue}>{trip.destination || 'Chưa có'}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Ionicons name="cube" size={18} color="#0ea5e9" />
            <Text style={styles.infoLabel}>Hàng:</Text>
            <Text style={styles.infoValue}>{trip.amount || '---'}L — {trip.product || '---'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="car" size={18} color="#6366f1" />
            <Text style={styles.infoLabel}>Xe:</Text>
            <Text style={styles.infoValue}>{trip.vehiclePlate || '---'}</Text>
          </View>
        </View>

        {/* Seal Section — hiện khi bắt đầu chạy */}
        {(currentStep >= 1 || trip.sealCode) && (
          <View style={styles.inputCard}>
            <Text style={styles.inputTitle}>🔑 Niêm Chì (Seal)</Text>
            <View style={styles.sealInputRow}>
              <TextInput
                style={[styles.input, currentStep > 1 && styles.inputDisabled]}
                placeholder="Nhập mã kẹp chì tại kho..."
                value={sealCode}
                onChangeText={setSealCode}
                editable={currentStep === 1}
              />
            </View>

            {/* Seal Photo */}
            <Text style={[styles.label, { marginTop: 12 }]}>📸 Ảnh niêm chì bắt buộc</Text>
            {sealPhotoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: sealPhotoUri }} style={styles.photoPreview} />
                {currentStep === 1 && (
                  <TouchableOpacity style={styles.retakeBtn} onPress={handlePickSealPhoto}>
                    <Ionicons name="camera" size={14} color="#fff" />
                    <Text style={styles.retakeBtnText}>Chụp lại</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              currentStep === 1 && (
                <TouchableOpacity
                  style={uploadingSeal ? [styles.docBtn, { opacity: 0.5 }] : styles.docBtn}
                  onPress={handlePickSealPhoto}
                  disabled={uploadingSeal}
                >
                  {uploadingSeal ? (
                    <ActivityIndicator size="small" color="#4f46e5" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={24} color="#4f46e5" />
                      <Text style={styles.docLabel}>Chụp ảnh van kẹp chì</Text>
                    </>
                  )}
                </TouchableOpacity>
              )
            )}
          </View>
        )}

        {/* Final delivery section */}
        {(currentStep >= 3 || trip.status === 'completed') && (
          <View style={styles.inputCard}>
            <Text style={styles.inputTitle}>📊 Hoàn Tất Giao Nhận</Text>
            <Text style={styles.label}>Số Lít THỰC GIAO (Xuất: {trip.amount} L)</Text>
            <TextInput
              style={[styles.input, currentStep === 4 && styles.inputDisabled]}
              placeholder="Nhập số lít thực tế..."
              keyboardType="numeric"
              value={deliveredAmount}
              onChangeText={setDeliveredAmount}
              editable={currentStep === 3}
            />

            {deliveredAmount ? (
              <View style={[styles.lossPreview, lossLiters < 0 && { backgroundColor: '#f0fdf4' }]}>
                <Text style={[styles.lossText, lossLiters < 0 && { color: '#16a34a' }]}>
                  {lossLiters >= 0 ? `⚠️ Hao hụt: ${lossLiters.toFixed(0)} L (${lossPercent.toFixed(2)}%)` : `✅ Dư: ${Math.abs(lossLiters).toFixed(0)} L`}
                </Text>
              </View>
            ) : null}

            {/* Temp & Density */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>🌡️ Nhiệt độ (°C)</Text>
                <TextInput
                  style={[styles.input, currentStep === 4 && styles.inputDisabled]}
                  placeholder="VD: 30"
                  keyboardType="numeric"
                  value={temperature}
                  onChangeText={setTemperature}
                  editable={currentStep === 3}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>⚖️ Tỷ trọng</Text>
                <TextInput
                  style={[styles.input, currentStep === 4 && styles.inputDisabled]}
                  placeholder="VD: 0.827"
                  keyboardType="numeric"
                  value={density}
                  onChangeText={setDensity}
                  editable={currentStep === 3}
                />
              </View>
            </View>

            {/* Document photos */}
            <Text style={[styles.label, { marginTop: 16 }]}>
              📄 Ảnh chứng từ <Text style={{ color: '#ef4444' }}>(Biên bản GN bắt buộc)</Text>
            </Text>
            <View style={styles.docGrid}>
              {[
                { key: 'deliveryReceipt', label: 'Biên bản GN *', required: true },
                { key: 'lossReport', label: 'Phiếu hao hụt' },
                { key: 'exportSlip', label: 'Phiếu xuất kho' },
              ].map(doc => (
                <TouchableOpacity
                  key={doc.key}
                  style={[
                    styles.docBtn,
                    docs[doc.key] && styles.docBtnActive,
                    doc.required && !docs[doc.key] && styles.docBtnRequired,
                  ]}
                  onPress={() => currentStep === 3 && handlePickDoc(doc.key, doc.label)}
                  disabled={uploadingDoc === doc.key || currentStep !== 3}
                >
                  {uploadingDoc === doc.key ? (
                    <ActivityIndicator size="small" color="#4f46e5" />
                  ) : docs[doc.key] ? (
                    <Image source={{ uri: docs[doc.key] }} style={styles.docThumb} />
                  ) : (
                    <Ionicons name="camera" size={20} color={docs[doc.key] ? '#fff' : (doc.required ? '#ef4444' : '#4f46e5')} />
                  )}
                  <Text style={[styles.docLabel, docs[doc.key] && { color: '#fff' }]}>{doc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Button */}
      {currentStep < 4 && (
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: TRIP_STEPS[currentStep + 1]?.color || '#4f46e5' }, updating && { opacity: 0.6 }]}
          onPress={handleNextStep}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.mainBtnText}>
              {currentStep === 0 ? '🚛 BẮT ĐẦU CHẠY' :
               currentStep === 1 ? '🏁 ĐÃ ĐẾN TRẠM' :
               currentStep === 2 ? '⛽ BẮT ĐẦU BƠM' :
               '✅ HOÀN THÀNH CHUYẾN'}
            </Text>
          )}
        </TouchableOpacity>
      )}
      {currentStep === 4 && (
        <View style={[styles.mainBtn, { backgroundColor: '#10b981' }]}>
          <Text style={styles.mainBtnText}>✅ CHUYẾN ĐÃ HOÀN THÀNH</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 55, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  headerBack: { padding: 4 },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1, padding: 16 },

  // Stepper
  stepperContainer: { marginBottom: 20, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  stepRow: { flexDirection: 'row', minHeight: 56 },
  stepIndicator: { alignItems: 'center', width: 36, marginRight: 12 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { elevation: 4, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6 },
  stepLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: 4 },
  stepContent: { flex: 1, paddingTop: 5 },
  stepText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  stepTime: { color: '#10b981', fontSize: 12, marginTop: 2 },

  // Info Card
  infoCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  infoTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800', marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8, padding: 4, borderRadius: 8 },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValue: { color: '#0f172a', fontSize: 14, fontWeight: '600', flex: 1 },
  infoDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },

  // Input Card
  inputCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  inputTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  sealInputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 16 },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  label: { fontSize: 13, color: '#64748b', marginBottom: 6, fontWeight: '600' },
  lossPreview: { marginTop: 10, backgroundColor: '#fff1f2', padding: 10, borderRadius: 8 },
  lossText: { color: '#e11d48', fontWeight: 'bold', fontSize: 13 },

  // Photo 
  photoPreviewContainer: { position: 'relative', marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  photoPreview: { width: '100%', height: 160, borderRadius: 12, resizeMode: 'cover' },
  retakeBtn: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  retakeBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Doc buttons
  docGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  docBtn: { flex: 1, height: 80, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 4, overflow: 'hidden' },
  docBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  docBtnRequired: { borderColor: '#ef4444', borderWidth: 1.5 },
  docThumb: { width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover' },
  docLabel: { fontSize: 10, color: '#64748b', fontWeight: 'bold', textAlign: 'center', zIndex: 1 },

  // Bottom button
  mainBtn: { marginHorizontal: 16, marginBottom: 30, paddingVertical: 20, borderRadius: 16, alignItems: 'center', elevation: 5 },
  mainBtnText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  backBtn: { marginTop: 20, padding: 12, backgroundColor: '#e2e8f0', borderRadius: 10 },
  backBtnText: { color: '#0f172a', fontWeight: '600' },

  // Geofence Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  modalBody: { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 22 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
});
