import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchUsers } from '../../services/dataService';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

export default function EmployeesScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    const data = await fetchUsers();
    setUsers(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const filteredUsers = filter === 'all' ? users : users.filter(u => u.role === filter);

  const getRoleLabel = (role: string) => {
    const map: any = { admin: 'Quản trị', driver: 'Tài xế', sales: 'Kinh doanh', accountant: 'Kế toán' };
    return map[role] || role;
  };

  const getRoleColor = (role: string) => {
    const map: any = { admin: '#722ed1', driver: '#1890ff', sales: '#52c41a', accountant: '#faad14' };
    return map[role] || '#64748b';
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: getRoleColor(item.role) }]}>
        <Ionicons name="person" size={24} color="#fff" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name || 'N/A'}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>{getRoleLabel(item.role)}</Text>
        </View>
        <Text style={styles.email}>✉ {item.email || '-'}</Text>
        <Text style={styles.phone}>📞 {item.phone || '-'}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
        >
          <Ionicons name="call" size={20} color="#0070f3" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => item.email && Linking.openURL(`mailto:${item.email}`)}
        >
          <Ionicons name="mail" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Quản Lý Nhân Sự</Text>
        <Text style={styles.count}>{users.length} người</Text>
      </View>

      {/* Filter tabs - dùng ScrollView từ react-native */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 10 }}>
          {['all', 'admin', 'driver', 'sales', 'accountant'].map(r => (
            <TouchableOpacity 
              key={r} 
              style={[styles.filterBtn, filter === r && styles.filterBtnActive]} 
              onPress={() => setFilter(r)}
            >
              <Text style={[styles.filterText, filter === r && { color: '#fff' }]}>
                {r === 'all' ? 'Tất cả' : getRoleLabel(r)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 100 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có nhân viên nào.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#fff', elevation: 2 },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '900', color: '#1a1a1a', flex: 1 },
  count: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filterRow: { backgroundColor: '#fff', paddingBottom: 15, paddingHorizontal: 20 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterBtnActive: { backgroundColor: '#0070f3' },
  filterText: { fontWeight: 'bold', color: '#64748b', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.05 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 6 },
  roleText: { fontSize: 11, fontWeight: 'bold' },
  email: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  phone: { fontSize: 12, color: '#64748b' },
  actions: { gap: 8 },
  actionBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#94a3b8' }
});
