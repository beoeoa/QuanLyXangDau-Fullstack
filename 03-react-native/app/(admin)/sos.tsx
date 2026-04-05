import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchSOSReports, updateSOSStatus } from '../../services/dataService';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

export default function SOSReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    const data = await fetchSOSReports();
    setReports(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const filtered = useMemo(() => {
    if (filter === 'all') return reports;
    if (filter === 'pending') return reports.filter(r => r.status !== 'resolved');
    return reports.filter(r => r.status === 'resolved');
  }, [reports, filter]);

  const handleCall = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('Không có SĐT', 'Tài xế chưa cung cấp số điện thoại.');
  };

  const handleResolve = async (item: any) => {
    Alert.alert('Tiếp nhận & Xử lý', `Đánh dấu SOS của ${item.driverName || 'tài xế'} là đã xử lý?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          await updateSOSStatus(item.id, 'resolved');
          loadData();
        },
      },
    ]);
  };

  const getTime = (ts: any) => {
    if (!ts) return '-';
    const d = ts?._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('vi-VN');
  };

  const urgentCount = reports.filter(r => r.status !== 'resolved').length;

  const renderItem = ({ item }: { item: any }) => {
    const isResolved = item.status === 'resolved';
    return (
      <View style={[styles.card, isResolved && styles.cardResolved]}>
        <View style={styles.cardHeader}>
          <View style={styles.driverInfo}>
            <View style={[styles.avatar, isResolved && { backgroundColor: '#94a3b8' }]}>
              <Ionicons name={isResolved ? 'checkmark' : 'warning'} size={22} color="#fff" />
            </View>
            <View>
              <Text style={styles.driverName}>{item.driverName || 'Tài xế N/A'}</Text>
              <Text style={styles.time}>{getTime(item.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isResolved ? '#dcfce7' : '#fee2e2' }]}>
            <Text style={{ color: isResolved ? '#166534' : '#ef4444', fontWeight: '800', fontSize: 11 }}>
              {isResolved ? '✅ Đã xử lý' : '🚨 KHẨN CẤP'}
            </Text>
          </View>
        </View>

        <View style={styles.messageBox}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#ef4444" />
          <Text style={styles.message}>{item.message || item.description || 'Không có tin nhắn SOS'}</Text>
        </View>

        {!!item.photoUrl && (
          <Image source={{ uri: item.photoUrl }} style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: 12, backgroundColor: '#f1f5f9' }} resizeMode="cover" />
        )}

        {(item.locationName || item.lat) && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color="#64748b" />
            <Text style={styles.locationText}>
              {item.locationName || `${item.lat?.toFixed(4)}, ${item.lng?.toFixed(4)}`}
            </Text>
          </View>
        )}

        {item.vehiclePlate && (
          <View style={styles.locationRow}>
            <Ionicons name="car" size={14} color="#64748b" />
            <Text style={styles.locationText}>Xe: {item.vehiclePlate}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0070f3' }]}
            onPress={() => handleCall(item.driverPhone)}
          >
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>GỌI TÀI XẾ</Text>
          </TouchableOpacity>
          {!isResolved && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#52c41a' }]}
              onPress={() => handleResolve(item)}
            >
              <Ionicons name="checkmark-done" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>XỬ LÝ XONG</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Báo Cáo Sự Cố SOS</Text>
          {urgentCount > 0 && (
            <Text style={styles.urgentBanner}>🚨 {urgentCount} sự cố chưa xử lý!</Text>
          )}
        </View>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: '🚨 Chưa xử lý' },
          { key: 'resolved', label: '✅ Đã xử lý' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 100 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Ionicons name="shield-checkmark" size={56} color="#dcfce7" />
              <Text style={styles.emptyText}>Không có sự cố nào.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff9f9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff', elevation: 2 },
  backBtn: { marginRight: 14 },
  title: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  urgentBanner: { fontSize: 12, color: '#ef4444', fontWeight: '700', marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#fee2e2' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterBtnActive: { backgroundColor: '#ef4444' },
  filterText: { fontWeight: '700', color: '#64748b', fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, elevation: 3, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  cardResolved: { borderLeftColor: '#94a3b8', shadowColor: '#000', shadowOpacity: 0.04 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  driverName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  time: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  messageBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#fff9f9', borderRadius: 10, padding: 10, marginBottom: 8 },
  message: { fontSize: 14, color: '#334155', flex: 1, lineHeight: 20 },
  locationRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
  locationText: { fontSize: 12, color: '#64748b' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, height: 42, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontSize: 15 },
});
