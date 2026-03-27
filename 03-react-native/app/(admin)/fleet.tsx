import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { fetchFleetVehicles, fetchDeliveryLogs } from '../../services/dataService';
import { useFocusEffect } from 'expo-router';

export default function FleetScreen() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehicleData, ordersData] = await Promise.all([
        fetchFleetVehicles(),
        fetchDeliveryLogs()
      ]);
      
      const vList = vehicleData || [];
      const oList = ordersData || [];
      
      // Cross-reference: Tìm xe nào đang có đơn hoạt động
      const activeStatuses = ['pending', 'received', 'moving', 'arrived', 'unloading'];
      const activeOrders = oList.filter((o: any) => activeStatuses.includes(o.status));
      
      // Map: biển số xe → đơn hàng đang hoạt động
      const plateToOrder: Record<string, any> = {};
      activeOrders.forEach((o: any) => {
        if (o.vehiclePlate) plateToOrder[o.vehiclePlate] = o;
      });
      
      // Gắn trạng thái thực tế vào từng xe
      const enriched = vList.map((v: any) => {
        const plate = v.plateNumber || v.plate || '';
        const activeOrder = plateToOrder[plate];
        
        let realStatus = v.status; // Giữ nguyên status gốc từ DB
        let statusLabel = '';
        let statusColor = '';
        let statusBg = '';
        let orderInfo = null;
        
        if (activeOrder) {
          // Xe này đang có đơn hàng hoạt động → ghi đè trạng thái
          const orderStatus = activeOrder.status;
          if (orderStatus === 'moving') {
            statusLabel = '🚛 Đang chạy'; statusColor = '#d97706'; statusBg = '#fef3c7';
          } else if (orderStatus === 'unloading') {
            statusLabel = '⛽ Đang xả hàng'; statusColor = '#c2410c'; statusBg = '#ffedd5';
          } else if (orderStatus === 'arrived') {
            statusLabel = '📍 Đã đến nơi'; statusColor = '#7c3aed'; statusBg = '#f3e8ff';
          } else if (orderStatus === 'received') {
            statusLabel = '✅ Đã nhận hàng'; statusColor = '#0369a1'; statusBg = '#e0f2fe';
          } else {
            statusLabel = '📋 Có lệnh chờ'; statusColor = '#6b7280'; statusBg = '#f3f4f6';
          }
          orderInfo = {
            driver: activeOrder.assignedDriverName,
            dest: activeOrder.destination || (activeOrder.items?.[0]?.destination),
          };
        } else if (v.status === 'maintenance') {
          statusLabel = '🔧 Bảo trì'; statusColor = '#dc2626'; statusBg = '#fee2e2';
        } else {
          statusLabel = '✅ Sẵn sàng'; statusColor = '#0050b3'; statusBg = '#e6f7ff';
        }
        
        return { ...v, statusLabel, statusColor, statusBg, orderInfo };
      });
      
      // Sắp xếp: xe đang chạy lên trên, sẵn sàng ở giữa, bảo trì ở dưới
      enriched.sort((a: any, b: any) => {
        const priority = (v: any) => v.orderInfo ? 0 : v.status === 'maintenance' ? 2 : 1;
        return priority(a) - priority(b);
      });
      
      setVehicles(enriched);
    } catch (e) {
      console.error('Fleet load error:', e);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const renderItem = ({ item }: { item: any }) => {
    const plate = item.plateNumber || item.plate || 'N/A';
    const capacity = item.totalCapacity || item.capacity || null;
    const driver = item.orderInfo?.driver || item.assignedDriver || null;
    const regExpiry = item.registrationExpiry || null;

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.plate}>🚛 {plate}</Text>
          <Text style={[styles.statusBadge, { backgroundColor: item.statusBg, color: item.statusColor }]}>
            {item.statusLabel}
          </Text>
        </View>
        
        <Text style={styles.detail}>Sức chứa (Tải trọng): {capacity ? `${Number(capacity).toLocaleString()} Lít` : 'N/A'}</Text>
        <Text style={styles.detail}>Tài xế chuyên trách: <Text style={{fontWeight: 'bold'}}>{driver || 'Chưa gán'}</Text></Text>
        <Text style={styles.detail}>Hạn Đăng kiểm: {regExpiry ? new Date(regExpiry).toLocaleDateString('vi-VN') : 'N/A'}</Text>
        {item.compartments ? <Text style={styles.detail}>Số khoang: {item.compartments}</Text> : null}
        
        {item.orderInfo?.dest ? (
          <View style={styles.activeOrderBanner}>
            <Text style={styles.activeOrderText}>📍 Đang giao → {item.orderInfo.dest}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quản lý Đội Xe (Fleet)</Text>
      <Text style={styles.subtitle}>Tình trạng xe bồn thời gian thực • {vehicles.length} xe</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 50 }} />
      ) : vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có phương tiện nào trên hệ thống.</Text>
        </View>
      ) : (
        <FlatList 
          data={vehicles}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f4f8' },
  title: { fontSize: 24, fontWeight: '900', color: '#1a1a1a', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, elevation: 2, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  plate: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, fontSize: 13, fontWeight: 'bold', overflow: 'hidden' },
  
  detail: { fontSize: 15, color: '#555', marginBottom: 6 },

  activeOrderBanner: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 8, padding: 10, marginTop: 8 },
  activeOrderText: { fontSize: 13, color: '#c2410c', fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' }
});
