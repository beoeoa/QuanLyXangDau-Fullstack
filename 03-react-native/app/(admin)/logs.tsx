import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { fetchDeliveryLogs } from '../../services/dataService';

export default function LogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      const data = await fetchDeliveryLogs();
      // Ưu tiên hiển thị chuyến đã hoàn thành hoặc tất cả nếu cần
      const completedLogs = data?.filter((d: any) => d.status === 'completed' || d.status === 'delivered') || [];
      // Nếu không có chuyến nào hoàn thành thì lấy tạm tất cả để có data Demo
      setLogs(completedLogs.length > 0 ? completedLogs : (data || []));
      setLoading(false);
    };
    loadLogs();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.logCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.logTitle}>Mã Chuyến: #{item.id?.toString().slice(0,4) || 'N/A'}</Text>
        <Text style={styles.date}>{item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString('vi-VN') : 'Mới'}</Text>
      </View>
      <Text style={styles.detailText}>Tài xế: <Text style={{fontWeight: 'bold'}}>{item.driverName || 'Chưa phân công'}</Text></Text>
      <Text style={styles.detailText}>Khách hàng: {item.customerName || 'N/A'}</Text>
      <Text style={styles.detailText}>Hàng hóa: {item.plannedVolume || 0} Lít - {item.productName || 'Xăng dầu'}</Text>
      
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>
          {item.status === 'completed' || item.status === 'delivered' ? '✅ Đã giao thành công' : '⏳ Đang xử lý'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nhật ký làm việc (Dữ liệu thực)</Text>
      <Text style={styles.subtitle}>Danh sách các chuyến đi được đồng bộ trực tiếp từ máy chủ Node.js</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 50 }} />
      ) : logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có thông tin chuyến đi nào.</Text>
        </View>
      ) : (
        <FlatList 
          data={logs}
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
  
  logCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, elevation: 2, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  logTitle: { fontSize: 16, fontWeight: 'bold', color: '#0070f3' },
  date: { fontSize: 14, color: '#888' },
  
  detailText: { fontSize: 15, color: '#444', marginBottom: 4 },
  
  statusBadge: { backgroundColor: '#e6f7ff', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  statusText: { color: '#0050b3', fontWeight: 'bold', fontSize: 13 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' }
});
