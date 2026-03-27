import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { fetchCustomers } from '../../services/dataService';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchCustomers();
      setCustomers(data || []);
      setLoading(false);
    };
    loadData();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.typeBadge}>{item.type === 'agency' ? 'Đại Lý' : 'Cửa Hàng'}</Text>
      </View>
      <Text style={styles.detail}>SĐT: {item.phone || 'Chưa cập nhật'}</Text>
      <Text style={styles.detail}>Sức chứa kho: {item.capacity ? `${item.capacity} Lít` : 'N/A'}</Text>
      <Text style={styles.detail} numberOfLines={2}>📍 {item.address || 'Chưa có địa chỉ'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Danh bạ Khách hàng</Text>
      <Text style={styles.subtitle}>Danh sách Đại Lý nhập xăng dầu</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 50 }} />
      ) : customers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có đại lý nào trên hệ thống.</Text>
        </View>
      ) : (
        <FlatList 
          data={customers}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#0070f3', flex: 1 },
  typeBadge: { backgroundColor: '#f6ffed', borderColor: '#b7eb8f', borderWidth: 1, color: '#52c41a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12, fontWeight: 'bold' },
  
  detail: { fontSize: 14, color: '#555', marginBottom: 5 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' }
});
