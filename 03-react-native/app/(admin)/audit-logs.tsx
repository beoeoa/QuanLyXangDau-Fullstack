import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAuditLogs } from '../../services/dataService';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

export default function AuditLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchAuditLogs();
    setLogs(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const getActionIcon = (action: string) => {
    if (action?.includes('CREATE')) return 'plus-circle';
    if (action?.includes('UPDATE')) return 'pencil-circle';
    if (action?.includes('DELETE')) return 'trash-can';
    if (action?.includes('LOGIN')) return 'login';
    return 'information';
  };

  const getActionColor = (action: string) => {
    if (action?.includes('CREATE')) return '#52c41a';
    if (action?.includes('UPDATE')) return '#1890ff';
    if (action?.includes('DELETE')) return '#ff4d4f';
    if (action?.includes('LOGIN')) return '#722ed1';
    return '#64748b';
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: getActionColor(item.action) + '15' }]}>
        <MaterialCommunityIcons name={getActionIcon(item.action) as any} size={24} color={getActionColor(item.action)} />
      </View>
      <View style={styles.content}>
        <View style={styles.logHeader}>
          <Text style={styles.user}>{item.userEmail || item.userName || 'Hệ thống'}</Text>
          <Text style={styles.time}>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '-'}</Text>
        </View>
        <Text style={styles.details}>{item.details || item.action}</Text>
        <Text style={styles.date}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '-'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Nhật Ký Hệ Thống</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 100 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có lịch sử thao tác.</Text>}
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
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', elevation: 1, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.05 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  content: { flex: 1 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  user: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  time: { fontSize: 11, color: '#94a3b8' },
  details: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 8 },
  date: { fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 100, color: '#94a3b8' }
});
