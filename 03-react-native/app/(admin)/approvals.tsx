import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { fetchUsers } from '../../services/dataService';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

export default function ApprovalsScreen() {
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchUsers();
    // Giả lập lọc các user chưa được duyệt (status !== 'approved' hoặc role chưa gán)
    const pending = (data || []).filter((u: any) => !u.isApproved);
    setPendingUsers(pending);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleApprove = (user: any) => {
    Alert.alert('Xác nhận', `Duyệt tài khoản cho ${user.name}?`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Duyệt', onPress: () => Alert.alert('Thành công', 'Đã duyệt tài khoản.') }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name || 'N/A'}</Text>
        <Text style={styles.email}>✉ {item.email}</Text>
        <Text style={styles.role}>Vai trò yêu cầu: {item.role || 'Chưa gán'}</Text>
      </View>
      <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
        <Ionicons name="checkmark-circle" size={24} color="#fff" />
        <Text style={styles.approveBtnText}>DUYỆT</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Duyệt Tài Khoản Mới</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 100 }} />
      ) : (
        <FlatList
          data={pendingUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Không có yêu cầu duyệt mới.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#fff', elevation: 2 },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 15, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  email: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  role: { fontSize: 12, fontWeight: 'bold', color: '#0070f3' },
  approveBtn: { backgroundColor: '#52c41a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', gap: 4 },
  approveBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#94a3b8' }
});
