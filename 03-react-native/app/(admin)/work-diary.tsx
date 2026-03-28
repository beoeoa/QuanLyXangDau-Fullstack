import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { fetchDeliveryLogs } from '../../services/dataService';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

// Nhật ký làm việc lấy từ delivery-orders - đây là nguồn dữ liệu đúng, sync với web
export default function WorkDiaryScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const loadData = async () => {
    setLoading(true);
    // Dùng delivery-orders giống TransportationManager trên web
    const data = await fetchDeliveryLogs();
    setOrders(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    pending:    { label: 'Chờ xuất phát', color: '#856404', bg: '#fff3cd' },
    received:   { label: 'Đã nhận lệnh',  color: '#0c63e4', bg: '#cfe2ff' },
    moving:     { label: 'Đang vận chuyển', color: '#f97316', bg: '#fff7ed' },
    arrived:    { label: 'Đã đến nơi',    color: '#7c3aed', bg: '#f3e8ff' },
    unloading:  { label: 'Đang bơm/xả',  color: '#0ea5e9', bg: '#e0f2fe' },
    completed:  { label: 'Hoàn thành',   color: '#166534', bg: '#dcfce7' },
    cancelled:  { label: 'Đã huỷ',       color: '#991b1b', bg: '#fee2e2' },
  };

  const FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'active', label: 'Đang chạy' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'pending', label: 'Chờ xuất' },
  ];

  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return ['moving', 'received', 'arrived', 'unloading'].includes(o.status);
    return o.status === filterStatus;
  });

  const getTimeAgo = (ts: any): string => {
    if (!ts) return '--:--';
    const date = ts?._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getDateStr = (ts: any): string => {
    if (!ts) return '-';
    const date = ts?._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN');
  };

  const renderItem = ({ item }: { item: any }) => {
    const st = STATUS_MAP[item.status] || STATUS_MAP.pending;
    const destinations = item.items?.length > 0
      ? [...new Set(item.items.map((i: any) => i.destination).filter(Boolean))].join(' • ')
      : item.destination || 'N/A';
    const products = item.items?.length > 0
      ? [...new Set(item.items.map((i: any) => i.product).filter(Boolean))].join(', ')
      : item.product || '-';
    const totalLit = item.items?.length > 0
      ? item.items.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0)
      : Number(item.amount) || 0;

    return (
      <View style={styles.card}>
        {/* Header: Tài xế + biển số */}
        <View style={styles.cardHeader}>
          <View style={styles.driverRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
            <View>
              <Text style={styles.driverName}>{item.assignedDriverName || 'Chưa gán tài xế'}</Text>
              <Text style={styles.plate}>🚛 {item.vehiclePlate || '-'}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        {/* Tuyến đường */}
        <View style={styles.routeBox}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.routeLabel} numberOfLines={1}>
              {item.exportWarehouse || 'Kho xuất'}
            </Text>
          </View>
          <View style={styles.vertLine} />
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <Text style={[styles.routeLabel, { fontWeight: '700' }]} numberOfLines={2}>
              {destinations}
            </Text>
          </View>
        </View>

        {/* Hàng hoá + thời gian */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerProduct}>⛽ {products}</Text>
            <Text style={styles.footerAmount}>{totalLit.toLocaleString()} Lít</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerDate}>{getDateStr(item.updatedAt || item.createdAt)}</Text>
            <Text style={styles.footerTime}>{getTimeAgo(item.updatedAt || item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Nhật Ký Làm Việc</Text>
          <Text style={styles.subtitle}>{filteredOrders.length} lệnh điều xe</Text>
        </View>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={22} color="#0070f3" />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filterStatus === f.key && styles.filterBtnActive]}
              onPress={() => setFilterStatus(f.key)}
            >
              <Text style={[styles.filterText, filterStatus === f.key && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 100 }} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Ionicons name="document-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Không có lệnh điều xe nào.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff', elevation: 2 },
  backBtn: { marginRight: 14 },
  title: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  filterRow: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterBtnActive: { backgroundColor: '#0070f3' },
  filterText: { fontWeight: '700', color: '#64748b', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0070f3', justifyContent: 'center', alignItems: 'center' },
  driverName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  plate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '800' },
  routeBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  vertLine: { width: 1, height: 8, backgroundColor: '#cbd5e1', marginLeft: 3.5, marginVertical: 3 },
  routeLabel: { fontSize: 13, color: '#334155', flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  footerProduct: { fontSize: 13, color: '#475569', marginBottom: 2 },
  footerAmount: { fontSize: 14, fontWeight: '800', color: '#0070f3' },
  footerDate: { fontSize: 12, color: '#94a3b8' },
  footerTime: { fontSize: 11, color: '#94a3b8' },
  emptyText: { color: '#94a3b8', marginTop: 12, fontSize: 15 },
});
