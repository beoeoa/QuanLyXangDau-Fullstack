import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { fetchOrders } from '../../services/dataService';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

interface OrderItem {
  product: string;
  quantity: number;
  costPrice: number;
  margin: number;
  freight: number;
}

export default function SalesOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadData = async () => {
    setLoading(true);
    const data = await fetchOrders();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const formatVND = (num: number) => {
    if (!num || isNaN(num)) return '-';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + ' Tỷ';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + ' Tr';
    return num.toLocaleString('vi-VN') + 'đ';
  };

  // Tính tổng tiền đúng theo mô hình web: costPrice + margin + freight = unitPrice
  const calcOrderTotals = (order: any) => {
    const items: OrderItem[] = order.items || [];
    let totalQty = 0, totalRevenue = 0, totalCost = 0;
    items.forEach((it: any) => {
      const qty = Number(it.quantity || it.amount || 0);
      const cost = Number(it.costPrice || 20000);
      const margin = Number(it.margin || 500);
      const freight = Number(it.freight || 200);
      const unitPrice = cost + margin + freight;
      totalQty += qty;
      totalRevenue += qty * unitPrice;
      totalCost += qty * cost;
    });
    return { totalQty, totalRevenue, totalCost, profit: totalRevenue - totalCost };
  };

  const getDate = (ts: any) => {
    if (!ts) return '-';
    const d = ts?._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('vi-VN');
  };

  const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Chờ xử lý', color: '#92400e', bg: '#fef3c7' },
    processing:{ label: 'Đang xử lý', color: '#1e40af', bg: '#dbeafe' },
    dispatched:{ label: 'Đã điều xe', color: '#7c3aed', bg: '#f3e8ff' },
    completed: { label: 'Hoàn thành', color: '#166534', bg: '#dcfce7' },
    cancelled: { label: 'Đã hủy',    color: '#991b1b', bg: '#fee2e2' },
  };

  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (filterStatus !== 'all') list = list.filter(o => o.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.id || '').toLowerCase().includes(q) ||
        (o.items || []).some((i: any) => (i.product || '').toLowerCase().includes(q))
      );
    }
    // Sắp xếp mới nhất lên trên
    list.sort((a, b) => {
      const da = a.createdAt?._seconds ? a.createdAt._seconds * 1000 : new Date(a.createdAt || 0).getTime();
      const db = b.createdAt?._seconds ? b.createdAt._seconds * 1000 : new Date(b.createdAt || 0).getTime();
      return db - da;
    });
    return list;
  }, [orders, search, filterStatus]);

  // Tổng doanh số toàn bộ
  const totals = useMemo(() => {
    let rev = 0, cost = 0, qty = 0;
    orders.filter(o => o.status === 'completed').forEach(o => {
      const t = calcOrderTotals(o);
      rev += t.totalRevenue; cost += t.totalCost; qty += t.totalQty;
    });
    return { rev, cost, profit: rev - cost, qty };
  }, [orders]);

  const renderItem = ({ item }: { item: any }) => {
    const { totalQty, totalRevenue, profit } = calcOrderTotals(item);
    const st = STATUS_MAP[item.status] || STATUS_MAP.pending;

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedOrder(item)} activeOpacity={0.8}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#{(item.id || '').slice(-8).toUpperCase()}</Text>
          <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        <Text style={styles.customerName}>{item.customerName || 'Khách lẻ'}</Text>

        {/* Products list */}
        {(item.items || []).slice(0, 2).map((it: any, i: number) => (
          <View key={i} style={styles.productRow}>
            <FontAwesome5 name="gas-pump" size={12} color="#94a3b8" />
            <Text style={styles.productText} numberOfLines={1}>
              {it.product || '-'}: {Number(it.quantity || it.amount || 0).toLocaleString()} Lít
            </Text>
          </View>
        ))}
        {(item.items || []).length > 2 && (
          <Text style={styles.moreItems}>+{item.items.length - 2} sản phẩm khác</Text>
        )}

        <View style={styles.financeRow}>
          <View style={styles.financeItem}>
            <Text style={styles.finLabel}>Doanh thu</Text>
            <Text style={[styles.finValue, { color: '#0070f3' }]}>{formatVND(totalRevenue)}</Text>
          </View>
          <View style={styles.financeItem}>
            <Text style={styles.finLabel}>Lợi nhuận</Text>
            <Text style={[styles.finValue, { color: profit >= 0 ? '#52c41a' : '#ef4444' }]}>{formatVND(profit)}</Text>
          </View>
          <View style={styles.financeItem}>
            <Text style={styles.finLabel}>Tổng lít</Text>
            <Text style={styles.finValue}>{totalQty.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{getDate(item.createdAt)}</Text>
          <Text style={styles.tapHint}>Xem chi tiết ›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Modal chi tiết đơn hàng
  const renderModal = () => {
    if (!selectedOrder) return null;
    const { totalQty, totalRevenue, totalCost, profit } = calcOrderTotals(selectedOrder);
    const st = STATUS_MAP[selectedOrder.status] || STATUS_MAP.pending;

    return (
      <Modal visible={!!selectedOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Đơn #{(selectedOrder.id || '').slice(-8).toUpperCase()}</Text>
                <Text style={styles.modalCustomer}>{selectedOrder.customerName}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.statusPill, { backgroundColor: st.bg, alignSelf: 'flex-start', marginBottom: 16 }]}>
                <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
              </View>

              {/* Danh sách sản phẩm */}
              <Text style={styles.sectionTitle}>📦 Chi tiết sản phẩm</Text>
              {(selectedOrder.items || []).map((it: any, i: number) => {
                const qty = Number(it.quantity || it.amount || 0);
                const cost = Number(it.costPrice || 20000);
                const margin = Number(it.margin || 500);
                const freight = Number(it.freight || 200);
                const unit = cost + margin + freight;
                return (
                  <View key={i} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{it.product || `SP ${i + 1}`}</Text>
                      <Text style={styles.itemSub}>
                        {Number(it.quantity || it.amount || 0).toLocaleString()} Lít × {unit.toLocaleString()}đ
                      </Text>
                      <Text style={styles.itemSub}>
                        Giá nhập: {cost.toLocaleString()}đ | Biên: {margin.toLocaleString()}đ | Vận: {freight.toLocaleString()}đ
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>{formatVND(qty * unit)}</Text>
                  </View>
                );
              })}

              {/* Tổng kết */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>📦 Tổng khối lượng</Text>
                  <Text style={styles.summaryValue}>{totalQty.toLocaleString()} Lít</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>💰 Doanh thu</Text>
                  <Text style={[styles.summaryValue, { color: '#0070f3' }]}>{formatVND(totalRevenue)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>📉 Chi phí vốn</Text>
                  <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{formatVND(totalCost)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.profitRow]}>
                  <Text style={[styles.summaryLabel, { fontWeight: '900', color: '#0f172a' }]}>📈 Lợi nhuận gộp</Text>
                  <Text style={[styles.summaryValue, { color: profit >= 0 ? '#52c41a' : '#ef4444', fontSize: 18, fontWeight: '900' }]}>
                    {formatVND(profit)}
                  </Text>
                </View>
              </View>

              {selectedOrder.notes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>📝 Ghi chú</Text>
                  <Text style={styles.notesText}>{selectedOrder.notes}</Text>
                </View>
              ) : null}

              <Text style={styles.dateSmall}>Ngày tạo: {getDate(selectedOrder.createdAt)}</Text>
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedOrder(null)}>
              <Text style={styles.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Quản Lý Đơn Hàng</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={22} color="#0070f3" />
        </TouchableOpacity>
      </View>

      {/* Tổng doanh số */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 85, minHeight: 85 }} contentContainerStyle={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#0070f3' }]}>
          <Text style={[styles.statValue, { color: '#0070f3' }]}>{formatVND(totals.rev)}</Text>
          <Text style={styles.statLabel}>Doanh thu (HT)</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#52c41a' }]}>
          <Text style={[styles.statValue, { color: '#52c41a' }]}>{formatVND(totals.profit)}</Text>
          <Text style={styles.statLabel}>Lợi nhuận (HT)</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f97316' }]}>
          <Text style={[styles.statValue, { color: '#f97316' }]}>{totals.qty.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Tổng Lít (HT)</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#64748b' }]}>
          <Text style={[styles.statValue, { color: '#64748b' }]}>{orders.length}</Text>
          <Text style={styles.statLabel}>Tổng đơn</Text>
        </View>
      </ScrollView>

      {/* Tìm kiếm */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm khách hàng, mã đơn, sản phẩm..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Filter status */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'pending', label: 'Chờ xử lý' },
            { key: 'processing', label: 'Đang xử lý' },
            { key: 'dispatched', label: 'Đã điều xe' },
            { key: 'completed', label: 'Hoàn thành' },
            { key: 'cancelled', label: 'Đã hủy' },
          ].map(f => (
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
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item, i) => item.id || i.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có đơn hàng nào.</Text>}
        />
      )}

      {renderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff', elevation: 2 },
  backBtn: { marginRight: 14 },
  title: { fontSize: 20, fontWeight: '900', color: '#1a1a1a', flex: 1 },
  statsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: '#fff', alignItems: 'center' },
  statCard: { backgroundColor: '#f8fafc', borderLeftWidth: 4, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 110, height: 60, justifyContent: 'center' },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: '600' },
  searchRow: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#1e293b' },
  filterRow: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  filterBtnActive: { backgroundColor: '#0070f3' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderId: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '800' },
  customerName: { fontSize: 17, fontWeight: '900', color: '#1e293b', marginBottom: 8 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  productText: { fontSize: 12, color: '#64748b', flex: 1 },
  moreItems: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  financeRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginTop: 8 },
  financeItem: { flex: 1, alignItems: 'center' },
  finLabel: { fontSize: 10, color: '#94a3b8', marginBottom: 2 },
  finValue: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  dateText: { fontSize: 12, color: '#94a3b8' },
  tapHint: { fontSize: 12, color: '#0070f3', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 80, color: '#94a3b8', fontSize: 15 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalTitle: { fontSize: 14, color: '#94a3b8', fontWeight: '700' },
  modalCustomer: { fontSize: 22, fontWeight: '900', color: '#1e293b', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8 },
  itemName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  itemSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: '900', color: '#0070f3', marginLeft: 10 },
  summaryBox: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, marginTop: 12, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  profitRow: { borderBottomWidth: 0, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  summaryLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  notesBox: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, marginBottom: 12 },
  notesLabel: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#78350f', lineHeight: 20 },
  dateSmall: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
  closeBtn: { backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
});
