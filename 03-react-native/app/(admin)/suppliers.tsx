import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { fetchSuppliers } from '../../services/dataService';

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchSuppliers();
      setSuppliers(data || []);
      setLoading(false);
    };
    loadData();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.name}>🏢 {item.name}</Text>
      <View style={styles.divider} />
      <Text style={styles.detail}>SĐT: {item.phone || 'Chưa cập nhật'}</Text>
      <Text style={styles.detail}>Người LH: {item.contactPerson || 'N/A'}</Text>
      <Text style={styles.detail} numberOfLines={2}>📍 {item.address || 'Chưa có địa chỉ'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nhà Cung Cấp</Text>
      <Text style={styles.subtitle}>Tổng kho Đầu Mối lấy hàng</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 50 }} />
      ) : suppliers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có Nhà cung cấp nào trên hệ thống.</Text>
        </View>
      ) : (
        <FlatList 
          data={suppliers}
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
  name: { fontSize: 18, fontWeight: 'bold', color: '#0070f3', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 8 },
  
  detail: { fontSize: 14, color: '#555', marginBottom: 5 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' }
});
