import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchDeliveryLogs } from '../../services/dataService';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Chờ nhận', color: '#92400e', bg: '#fef3c7' },
  received:  { label: 'Đã nhận',  color: '#1e40af', bg: '#dbeafe' },
  moving:    { label: 'Đang chạy', color: '#92400e', bg: '#fef3c7' },
  arrived:   { label: 'Đã đến',   color: '#6b21a8', bg: '#f3e8ff' },
  unloading: { label: 'Đang xả',  color: '#c2410c', bg: '#ffedd5' },
  completed: { label: 'Đã giao',  color: '#166534', bg: '#dcfce7' },
  cancelled: { label: 'Hủy',      color: '#991b1b', bg: '#fee2e2' },
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchDeliveryLogs();
    setOrders(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const filteredOrders = filter === 'all' ? orders
    : filter === 'active' ? orders.filter(o => !['completed', 'cancelled'].includes(o.status))
    : orders.filter(o => o.status === 'completed');

  const activeCount = orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length;

  const getOrderProduct = (item: any) => {
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
      const totalAmt = item.items.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
      const names = [...new Set(item.items.map((i: any) => i.product).filter(Boolean))];
      return `${totalAmt.toLocaleString()} Lít - ${names.join(', ')}`;
    }
    return `${Number(item.amount || 0).toLocaleString()} Lít - ${item.product || 'N/A'}`;
  };

  const getDestination = (item: any) => {
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
      const dests = [...new Set(item.items.map((i: any) => i.destination).filter(Boolean))];
      return dests.join(' | ') || item.destination || 'Chưa rõ';
    }
    return item.destination || 'Chưa rõ';
  };

  const renderItem = ({ item }: { item: any }) => {
    const st = STATUS_MAP[item.status] || STATUS_MAP.pending;
    return (
      <View style={styles.orderCard}>
        <View style={styles.header}>
          <Text style={styles.orderId}>Lệnh #{item.id?.toString().slice(0, 6) || '---'}</Text>
          <Text style={[styles.badge, { backgroundColor: st.bg, color: st.color }]}>{st.label}</Text>
        </View>
        <Text style={styles.product}>{getOrderProduct(item)}</Text>
        <View style={styles.routeBox}>
          <Ionicons name="location-outline" size={16} color="#0070f3" />
          <Text style={styles.routeText} numberOfLines={2}>{getDestination(item)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>🚛 {item.vehiclePlate || 'Chưa gán xe'}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.driver}>Tài xế: {item.assignedDriverName || 'Chưa nhận'}</Text>
          <TouchableOpacity onPress={() => setSelectedOrder(item)}>
             <Text style={styles.detailText}>Chi tiết ›</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ===================== MODAL CHI TIẾT ĐƠN HÀNG =====================
  const renderDetailModal = () => {
    if (!selectedOrder) return null;
    const o = selectedOrder;
    const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
    const items = o.items && Array.isArray(o.items) ? o.items : [];

    return (
      <Modal visible={!!selectedOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📋 Chi tiết Lệnh #{o.id?.toString().slice(0, 8)}</Text>
                <TouchableOpacity onPress={() => setSelectedOrder(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
              </View>

              <View style={[styles.modalStatusBar, { backgroundColor: st.bg }]}>
                <Text style={[styles.modalStatusText, { color: st.color }]}>Trạng thái: {st.label}</Text>
              </View>

              {/* Thông tin chung */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Thông tin chung</Text>
                <Text style={styles.modalRow}>🚛 Biển số xe: <Text style={{fontWeight:'bold'}}>{o.vehiclePlate || '-'}</Text></Text>
                <Text style={styles.modalRow}>👤 Tài xế: <Text style={{fontWeight:'bold'}}>{o.assignedDriverName || 'Chưa gán'}</Text></Text>
                <Text style={styles.modalRow}>🏭 Kho xuất: <Text style={{fontWeight:'bold'}}>{o.sourceWarehouse || '-'}</Text></Text>
                <Text style={styles.modalRow}>📅 Ngày tạo: <Text style={{fontWeight:'bold'}}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '-'}</Text></Text>
              </View>

              {/* Danh sách hàng hóa */}
              {items.length > 0 ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Danh sách hàng hóa ({items.length} mặt hàng)</Text>
                  {items.map((it: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemIdx}>Khoang {it.compartment || idx + 1}</Text>
                      <Text style={styles.itemName}>{it.product || 'N/A'}</Text>
                      <Text style={styles.itemAmount}>{Number(it.amount || 0).toLocaleString()} L</Text>
                      <Text style={styles.itemDest}>→ {it.destination || '-'}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Hàng hóa</Text>
                  <Text style={styles.modalRow}>⛽ {o.product || 'N/A'} — {Number(o.amount || 0).toLocaleString()} Lít</Text>
                  <Text style={styles.modalRow}>📍 Đến: {o.destination || '-'}</Text>
                </View>
              )}

              {/* Lịch sử trạng thái */}
              {o.statusHistory && Array.isArray(o.statusHistory) && o.statusHistory.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Lịch sử trạng thái</Text>
                  {o.statusHistory.map((h: any, idx: number) => (
                    <Text key={idx} style={styles.historyRow}>
                      • {(STATUS_MAP[h.status] || {label: h.status}).label} — {h.timestamp ? new Date(h.timestamp).toLocaleString('vi-VN') : ''}
                    </Text>
                  ))}
                </View>
              )}

            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedOrder(null)}>
              <Text style={styles.modalCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Theo dõi Lệnh Đi Đường</Text>
      
      <View style={styles.filterRow}>
         <TouchableOpacity style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]} onPress={() => setFilter('all')}>
           <Text style={[styles.filterText, filter === 'all' && {color: '#fff'}]}>Tất cả ({orders.length})</Text>
         </TouchableOpacity>
         <TouchableOpacity style={[styles.filterBtn, filter === 'active' && styles.filterBtnActive]} onPress={() => setFilter('active')}>
           <Text style={[styles.filterText, filter === 'active' && {color: '#fff'}]}>Đang chạy ({activeCount})</Text>
         </TouchableOpacity>
         <TouchableOpacity style={[styles.filterBtn, filter === 'completed' && styles.filterBtnActive]} onPress={() => setFilter('completed')}>
           <Text style={[styles.filterText, filter === 'completed' && {color: '#fff'}]}>Đã giao</Text>
         </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 50 }} />
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyBox}><Text style={styles.emptyText}>Không có lệnh nào.</Text></View>
      ) : (
        <FlatList 
          data={filteredOrders} 
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#1a1a1a', marginBottom: 15 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0' },
  filterBtnActive: { backgroundColor: '#0070f3' },
  filterText: { fontWeight: '600', color: '#475569' },

  orderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset:{width:0,height:2}, shadowOpacity: 0.05 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  product: { fontSize: 17, color: '#0070f3', fontWeight: 'bold', marginBottom: 10 },
  routeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 10 },
  routeText: { marginLeft: 8, color: '#334155', fontWeight: '500', flex: 1 },
  infoRow: { marginBottom: 10 },
  infoText: { fontSize: 13, color: '#64748b' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  driver: { color: '#64748b', fontWeight: '500' },
  detailText: { color: '#0070f3', fontWeight: 'bold', fontSize: 15 },

  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#888' },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  modalClose: { fontSize: 22, color: '#999', padding: 5 },
  modalStatusBar: { padding: 12, borderRadius: 12, marginBottom: 16 },
  modalStatusText: { fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  modalSection: { marginBottom: 20, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14 },
  modalSectionTitle: { fontSize: 15, fontWeight: '800', color: '#333', marginBottom: 10 },
  modalRow: { fontSize: 14, color: '#444', marginBottom: 6, lineHeight: 22 },
  itemRow: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  itemIdx: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#0070f3', marginTop: 2 },
  itemAmount: { fontSize: 14, color: '#333', marginTop: 2 },
  itemDest: { fontSize: 13, color: '#666', marginTop: 2 },
  historyRow: { fontSize: 13, color: '#555', marginBottom: 4 },
  modalCloseBtn: { backgroundColor: '#0070f3', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  modalCloseBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
