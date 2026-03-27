import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { createDriverExpense } from '../../services/dataService';

const EXPENSE_TYPES = [
  { id: 'fuel', label: 'Xăng dầu', icon: 'car' },
  { id: 'toll', label: 'Phí cầu đường', icon: 'flag' },
  { id: 'meal', label: 'Ăn uống', icon: 'restaurant' },
  { id: 'repair', label: 'Sửa chữa', icon: 'construct' },
  { id: 'parking', label: 'Đậu xe', icon: 'car-sport' },
  { id: 'other', label: 'Khác', icon: 'ellipsis-horizontal' },
];

export default function ExpenseFormScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuthStore();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại chi phí');
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }

    setSending(true);
    const result = await createDriverExpense({
      driverId: user?.userId || '',
      driverName: user?.name || '',
      orderId: orderId || '',
      type: selectedType,
      amount: Number(amount),
      description: description || 'Không có mô tả',
    });
    setSending(false);

    if (result.success) {
      Alert.alert('✅ Thành công', 'Chi phí đã được ghi nhận. Chờ kế toán duyệt.');
      router.back();
    } else {
      Alert.alert('Lỗi', 'Không thể gửi chi phí. Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ghi Chi Phí Dọc Đường</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.formLabel}>Loại chi phí</Text>
        <View style={styles.typeGrid}>
          {EXPENSE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                selectedType === type.id && styles.typeCardActive,
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <Ionicons
                name={type.icon as any} size={24}
                color={selectedType === type.id ? '#4f46e5' : '#94a3b8'}
              />
              <Text style={[styles.typeLabel, selectedType === type.id && { color: '#4f46e5' }]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.formLabel}>Số tiền (VNĐ)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: 150000"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <Text style={styles.formLabel}>Mô tả (tuỳ chọn)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ghi chú thêm..."
          placeholderTextColor="#94a3b8"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        {orderId && (
          <View style={styles.linkedOrder}>
            <Ionicons name="link" size={16} color="#4f46e5" />
            <Text style={styles.linkedOrderText}>Liên kết chuyến #{orderId.toString().slice(0, 6)}</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.submitBtn, sending && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>💰 GỬI CHI PHÍ</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 55, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
  },
  headerBack: { padding: 4 },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },

  scroll: { flex: 1, padding: 16 },

  formLabel: { color: '#334155', fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 16 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '30%', backgroundColor: '#ffffff', borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  typeCardActive: { borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.06)' },
  typeLabel: { color: '#64748b', fontSize: 12, fontWeight: '600', textAlign: 'center' },

  input: {
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 14, color: '#0f172a', fontSize: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  textArea: { textAlignVertical: 'top', minHeight: 80 },

  linkedOrder: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(79,70,229,0.06)',
    padding: 10, borderRadius: 10, marginTop: 16,
  },
  linkedOrderText: { color: '#4f46e5', fontSize: 13, fontWeight: '600' },

  submitBtn: {
    marginHorizontal: 16, marginBottom: 30,
    paddingVertical: 18, borderRadius: 16, alignItems: 'center',
    backgroundColor: '#4f46e5', elevation: 5,
  },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
