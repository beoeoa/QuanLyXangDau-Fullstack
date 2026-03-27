import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useTripStore } from '../../store/tripStore';
import { fetchDriverOrders } from '../../services/dataService';

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang chạy' },
  { key: 'pending', label: 'Chờ' },
  { key: 'completed', label: 'Hoàn thành' },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Chờ xuất phát', color: '#f59e0b', icon: 'time' },
  moving: { label: 'Đang vận chuyển', color: '#f97316', icon: 'car' },
  received: { label: 'Đã nhận hàng', color: '#0ea5e9', icon: 'cube' },
  arrived: { label: 'Đã đến trạm', color: '#6366f1', icon: 'flag' },
  unloading: { label: 'Đang bơm/xả', color: '#0ea5e9', icon: 'water' },
  completed: { label: 'Hoàn thành', color: '#10b981', icon: 'checkmark-circle' },
};

export default function TripsScreen() {
  const { user } = useAuthStore();
  const { allTrips, setAllTrips } = useTripStore();
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadTrips = useCallback(async () => {
    if (user?.userId) {
      const orders = await fetchDriverOrders(user.userId);
      if (orders) setAllTrips(orders);
    }
  }, [user]);

  useEffect(() => {
    loadTrips().then(() => setLoading(false));
  }, [loadTrips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  }, [loadTrips]);

  const filteredTrips = allTrips.filter((trip) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['moving', 'received', 'arrived', 'unloading'].includes(trip.status);
    if (filter === 'pending') return trip.status === 'pending';
    if (filter === 'completed') return trip.status === 'completed';
    return true;
  });

  const renderTrip = ({ item }: { item: any }) => {
    const info = STATUS_MAP[item.status] || STATUS_MAP.pending;
    return (
      <TouchableOpacity
        style={styles.tripCard}
        onPress={() => router.push({ pathname: '/(driver)/trip-detail', params: { tripId: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusChip, { backgroundColor: info.color + '15' }]}>
            <Ionicons name={info.icon as any} size={14} color={info.color} />
            <Text style={[styles.statusText, { color: info.color }]}>{info.label}</Text>
          </View>
          <Text style={styles.tripId}>#{item.id?.toString().slice(0, 6)}</Text>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.routeLabel} numberOfLines={1}>{item.exportWarehouse || 'Kho Xăng'}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.routeLabel} numberOfLines={1}>{item.destination || 'Chưa có điểm đến'}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>📦 {item.amount || '---'}L — {item.product || '---'}</Text>
          <Text style={styles.footerDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '---'}
          </Text>
        </View>

        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Đang tải danh sách chuyến...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chuyến Đi</Text>
        <Text style={styles.subtitle}>{allTrips.length} lệnh đi đường</Text>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={renderTrip}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={50} color="#cbd5e1" />
            <Text style={styles.emptyText}>Không có chuyến nào</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748b', marginTop: 12, fontSize: 16 },

  header: { paddingTop: 55, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    paddingVertical: 12, gap: 8, backgroundColor: '#ffffff',
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#f1f5f9',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: 'rgba(79,70,229,0.1)', borderColor: '#4f46e5',
  },
  filterText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#4f46e5' },

  listContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8 },

  tripCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  tripId: { color: '#94a3b8', fontSize: 12 },

  routeContainer: { marginBottom: 12 },
  routePoint: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  routeLine: { width: 2, height: 14, backgroundColor: '#e2e8f0', marginLeft: 4 },
  routeLabel: { color: '#0f172a', fontSize: 15, fontWeight: '600', flex: 1 },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 10,
  },
  footerText: { color: '#4f46e5', fontSize: 13, fontWeight: '600' },
  footerDate: { color: '#94a3b8', fontSize: 13 },

  arrowContainer: {
    position: 'absolute', right: 16, top: '50%',
  },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 12 },
});
