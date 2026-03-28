import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchContracts } from '../../services/dataService';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

export default function ContractsScreen() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadData = async () => {
    setLoading(true);
    const data = await fetchContracts();
    setContracts(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const STATUS_COLOR: Record<string, { text: string; bg: string }> = {
    'Hiệu lực':  { text: '#166534', bg: '#dcfce7' },
    'Chờ duyệt': { text: '#92400e', bg: '#fef3c7' },
    'Hết hạn':   { text: '#991b1b', bg: '#fee2e2' },
    'Tạm ngưng': { text: '#1e40af', bg: '#dbeafe' },
  };

  const getStatusStyle = (s: string) => STATUS_COLOR[s] || { text: '#64748b', bg: '#f1f5f9' };

  const filteredContracts = useMemo(() => {
    let list = [...contracts];
    if (filterType !== 'all') list = list.filter(c => c.type === filterType);
    if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.contractNumber || '').toLowerCase().includes(q) ||
        (c.customerName || '').toLowerCase().includes(q) ||
        (c.product || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [contracts, filterType, filterStatus, search]);

  const renderItem = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.status);
    const value = Number(item.quantity || 0) * Number(item.pricePerUnit || 0);
    const isExpiringSoon = item.endDate && (() => {
      const d = new Date(item.endDate);
      const diff = d.getTime() - Date.now();
      return diff > 0 && diff < 30 * 24 * 3600 * 1000;
    })();

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.75}>
        {isExpiringSoon && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={12} color="#92400e" />
            <Text style={styles.warningText}>Sắp hết hạn trong 30 ngày</Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.contractNum}>#{item.contractNumber || item.id?.slice(-6).toUpperCase()}</Text>
            <Text style={styles.customerName}>{item.customerName}</Text>
          </View>
          <View>
            <View style={[styles.typeBadge, { backgroundColor: item.type === 'Mua' ? '#dbeafe' : '#dcfce7' }]}>
              <Text style={{ color: item.type === 'Mua' ? '#1e40af' : '#166534', fontSize: 11, fontWeight: '700' }}>
                {item.type === 'Mua' ? '📥 Mua' : '📤 Bán'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, marginTop: 4 }]}>
              <Text style={{ color: statusStyle.text, fontSize: 10, fontWeight: '700' }}>{item.status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="cube" size={14} color="#64748b" />
          <Text style={styles.infoText}>{item.product || '-'} • {Number(item.quantity || 0).toLocaleString()} Lít</Text>
        </View>
        {value > 0 && (
          <View style={styles.infoRow}>
            <Ionicons name="cash" size={14} color="#0070f3" />
            <Text style={[styles.infoText, { color: '#0070f3', fontWeight: '700' }]}>
              {value.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        )}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{item.startDate || '?'}</Text>
          <Ionicons name="arrow-forward" size={12} color="#94a3b8" />
          <Text style={[styles.dateText, item.status === 'Hết hạn' && { color: '#ef4444' }]}>
            {item.endDate || '?'}
          </Text>
        </View>
        <Text style={styles.tapHint}>Chạm để xem chi tiết ›</Text>
      </TouchableOpacity>
    );
  };

  // Modal chi tiết hợp đồng
  const renderDetailModal = () => {
    if (!selected) return null;
    const statusStyle = getStatusStyle(selected.status);
    const value = Number(selected.quantity || 0) * Number(selected.pricePerUnit || 0);

    return (
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header modal */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalContractNum}>Hợp Đồng #{selected.contractNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, alignSelf: 'flex-start', marginTop: 6 }]}>
                    <Text style={{ color: statusStyle.text, fontWeight: '700', fontSize: 12 }}>{selected.status}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Thông tin chi tiết */}
              {[
                { icon: 'person', label: 'Đối tác', value: selected.customerName },
                { icon: 'document-text', label: 'Loại hợp đồng', value: selected.type },
                { icon: 'cube', label: 'Sản phẩm', value: selected.product || '-' },
                { icon: 'water', label: 'Khối lượng', value: `${Number(selected.quantity || 0).toLocaleString()} Lít` },
                { icon: 'pricetag', label: 'Đơn giá', value: selected.pricePerUnit ? `${Number(selected.pricePerUnit).toLocaleString()}đ/Lít` : '-' },
                { icon: 'cash', label: 'Tổng giá trị', value: value > 0 ? `${value.toLocaleString('vi-VN')}đ` : '-' },
                { icon: 'calendar', label: 'Ngày bắt đầu', value: selected.startDate || '-' },
                { icon: 'calendar-outline', label: 'Ngày kết thúc', value: selected.endDate || '-' },
              ].map((row, i) => (
                <View key={i} style={styles.detailRow}>
                  <Ionicons name={row.icon as any} size={16} color="#0070f3" />
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ))}

              {selected.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>📝 Ghi chú</Text>
                  <Text style={styles.notesText}>{selected.notes}</Text>
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeModalBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Stats summary
  const stats = useMemo(() => ({
    pendingApproval: contracts.filter(c => c.status === 'Chờ duyệt').length,
    buy: contracts.filter(c => c.type === 'Mua').length,
    sell: contracts.filter(c => c.type === 'Bán').length,
    totalValue: contracts.filter(c => c.type === 'Bán').reduce((s, c) => s + (Number(c.quantity || 0) * Number(c.pricePerUnit || 0)), 0),
  }), [contracts]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Quản Lý Hợp Đồng</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={22} color="#0070f3" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 85, minHeight: 85 }} contentContainerStyle={styles.statsRow}>
        {[
          { label: 'Chờ duyệt', value: stats.pendingApproval, color: '#f59e0b' },
          { label: 'HĐ Mua', value: stats.buy, color: '#1890ff' },
          { label: 'HĐ Bán', value: stats.sell, color: '#52c41a' },
          { label: 'Tổng GT Bán', value: stats.totalValue >= 1e9 ? (stats.totalValue / 1e9).toFixed(1) + 'Tỷ' : (stats.totalValue / 1e6).toFixed(0) + 'Tr', color: '#eb2f96' },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { borderLeftColor: s.color }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm số HĐ, đối tác, sản phẩm..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterArea}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['all', 'Mua', 'Bán'].map(t => (
            <TouchableOpacity key={t} style={[styles.filterBtn, filterType === t && styles.filterBtnActive]} onPress={() => setFilterType(t)}>
              <Text style={[styles.filterText, filterType === t && { color: '#fff' }]}>{t === 'all' ? 'Tất cả' : `HĐ ${t}`}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ width: 1, backgroundColor: '#e2e8f0', marginHorizontal: 4 }} />
          {['all', 'Hiệu lực', 'Chờ duyệt', 'Hết hạn'].map(s => (
            <TouchableOpacity key={s} style={[styles.filterBtn, filterStatus === s && { backgroundColor: '#7c3aed' }]} onPress={() => setFilterStatus(s)}>
              <Text style={[styles.filterText, filterStatus === s && { color: '#fff' }]}>{s === 'all' ? 'Mọi trạng thái' : s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={filteredContracts}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có hợp đồng nào.</Text>}
        />
      )}

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff', elevation: 2 },
  backBtn: { marginRight: 14 },
  title: { fontSize: 20, fontWeight: '900', color: '#1a1a1a', flex: 1 },
  statsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: '#fff', alignItems: 'center' },
  statCard: { backgroundColor: '#f8fafc', borderLeftWidth: 4, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 90, height: 60, justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '600' },
  searchRow: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b' },
  filterArea: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  filterBtnActive: { backgroundColor: '#0070f3' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05 },
  warningBanner: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: '#fef3c7', borderRadius: 8, padding: 6, marginBottom: 10 },
  warningText: { fontSize: 11, color: '#92400e', fontWeight: '700' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  contractNum: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  customerName: { fontSize: 17, fontWeight: '900', color: '#1e293b', marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  infoRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#475569' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  dateText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  tapHint: { textAlign: 'right', fontSize: 11, color: '#0070f3', marginTop: 4, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalContractNum: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  closeBtn: { padding: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  detailLabel: { fontSize: 13, color: '#64748b', width: 110 },
  detailValue: { fontSize: 14, color: '#1e293b', fontWeight: '700', flex: 1 },
  notesBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginTop: 16 },
  notesLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  notesText: { fontSize: 13, color: '#64748b', lineHeight: 20 },
  closeModalBtn: { backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  closeModalBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  emptyText: { textAlign: 'center', marginTop: 80, color: '#94a3b8', fontSize: 15 },
});
