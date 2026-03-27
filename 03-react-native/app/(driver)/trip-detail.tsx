import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useTripStore } from '../../store/tripStore';
import { fetchDriverOrders, updateTripStatus } from '../../services/dataService';
import { startBackgroundTracking, stopBackgroundTracking } from '../../services/locationService';

const TRIP_STEPS = [
  { id: 0, text: 'Sẵn sàng', apiStatus: 'pending', icon: 'time', color: '#f59e0b' },
  { id: 1, text: 'Đang vận chuyển', apiStatus: 'moving', icon: 'car', color: '#f97316' },
  { id: 2, text: 'Đã đến trạm', apiStatus: 'arrived', icon: 'flag', color: '#6366f1' },
  { id: 3, text: 'Đang bơm/xả', apiStatus: 'unloading', icon: 'water', color: '#0ea5e9' },
  { id: 4, text: 'Hoàn thành', apiStatus: 'completed', icon: 'checkmark-circle', color: '#10b981' },
];

export default function TripDetailScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuthStore();
  const [trip, setTrip] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [timeline, setTimeline] = useState<{ step: number; time: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      if (user?.userId) {
        const orders = await fetchDriverOrders(user.userId);
        const found = orders?.find((o: any) => o.id === tripId);
        if (found) {
          setTrip(found);
          const stepIdx = TRIP_STEPS.findIndex((s) => s.apiStatus === found.status);
          setCurrentStep(stepIdx >= 0 ? stepIdx : 0);

          // Load existing status history into timeline
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

  const handleNextStep = () => {
    if (currentStep >= 4 || !trip) return;
    const nextStep = TRIP_STEPS[currentStep + 1];

    Alert.alert(
      'Xác nhận chuyển trạng thái',
      `Chuyển sang: "${nextStep.text}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setUpdating(true);

            if (currentStep === 0 && trip.id) await startBackgroundTracking(trip.id);
            if (currentStep === 3) await stopBackgroundTracking();

            await updateTripStatus(trip.id, nextStep.apiStatus);

            setTimeline((prev) => [...prev, {
              step: currentStep + 1,
              time: new Date().toLocaleTimeString('vi-VN'),
            }]);
            setCurrentStep(currentStep + 1);
            setUpdating(false);
          },
        },
      ]
    );
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

  return (
    <View style={styles.container}>
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
                  <Text style={styles.stepTime}>
                    ✓ {timeline.find((t) => t.step === idx)?.time}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Trip Info Card */}
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
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color="#f59e0b" />
            <Text style={styles.infoLabel}>Ngày tạo:</Text>
            <Text style={styles.infoValue}>
              {trip.createdAt ? new Date(trip.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay'}
            </Text>
          </View>
        </View>

        {/* Items detail if available */}
        {trip.items && Array.isArray(trip.items) && trip.items.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Chi Tiết Hầm/Điểm ({trip.items.length})</Text>
            {trip.items.map((item: any, idx: number) => (
              <View key={idx} style={[styles.infoRow, { backgroundColor: '#f8fafc' }]}>
                <Text style={[styles.infoLabel, { color: '#6366f1', fontWeight: '700' }]}>
                  {item.compartment || `K${idx + 1}`}
                </Text>
                <Text style={styles.infoValue}>
                  {item.product} • {item.amount}L → {item.destination}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(driver)/camera')}
          >
            <Ionicons name="camera" size={28} color="#4f46e5" />
            <Text style={styles.actionLabel}>Chụp Niêm Chì</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push({ pathname: '/(driver)/expense-form', params: { orderId: trip.id } })}
          >
            <Ionicons name="receipt" size={28} color="#0ea5e9" />
            <Text style={styles.actionLabel}>Ghi Chi Phí</Text>
          </TouchableOpacity>
        </View>
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

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 55, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
  },
  headerBack: { padding: 4 },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },

  scroll: { flex: 1, padding: 16 },

  stepperContainer: { marginBottom: 20, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  stepRow: { flexDirection: 'row', minHeight: 56 },
  stepIndicator: { alignItems: 'center', width: 36, marginRight: 12 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0',
    justifyContent: 'center', alignItems: 'center',
  },
  stepCircleActive: {
    elevation: 4,
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6,
  },
  stepLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: 4 },
  stepContent: { flex: 1, paddingTop: 5 },
  stepText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  stepTime: { color: '#10b981', fontSize: 12, marginTop: 2 },

  infoCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  infoTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800', marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8, padding: 4, borderRadius: 8 },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValue: { color: '#0f172a', fontSize: 14, fontWeight: '600', flex: 1 },
  infoDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  actionLabel: { color: '#334155', fontSize: 13, fontWeight: '600' },

  mainBtn: {
    marginHorizontal: 16, marginBottom: 30,
    paddingVertical: 20, borderRadius: 16, alignItems: 'center',
    elevation: 5,
  },
  mainBtnText: { color: '#fff', fontSize: 20, fontWeight: '900' },

  backBtn: { marginTop: 20, padding: 12, backgroundColor: '#e2e8f0', borderRadius: 10 },
  backBtnText: { color: '#0f172a', fontWeight: '600' },
});
