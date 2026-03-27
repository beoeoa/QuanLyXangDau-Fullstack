import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback, useMemo } from 'react';
import { fetchAllDriverExpenses, fetchDeliveryLogs, fetchOrders, fetchTransactions } from '../../services/dataService';
import { useFocusEffect, useRouter } from 'expo-router';

export default function AdminDashboardScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('day');
  const [orders, setOrders] = useState<any[]>([]);
  const [saleOrders, setSaleOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Ưu tiên render nhanh: lấy delivery-orders trước
      const dels = await fetchDeliveryLogs();
      setOrders(dels || []);
      setLoading(false);

      // Tài chính tải nền (không block UI)
      const [ords, exps, trans] = await Promise.all([
        fetchOrders(),
        fetchAllDriverExpenses(),
        fetchTransactions(),
      ]);
      setSaleOrders(ords || []);
      setExpenses(exps || []);
      setTransactions(trans || []);
    } catch (e) { console.error(e); }
    // nếu lỗi, vẫn tắt loading để UI không treo
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const activeStatuses = ['pending', 'received', 'moving', 'arrived', 'unloading'];
  const movingCount = orders.filter(o => activeStatuses.includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const issueCount = orders.filter(o => o.status === 'cancelled').length;
  const totalVolume = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const toDateSafe = (v: any): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate();
    if (v?._seconds) return new Date(v._seconds * 1000);
    if (typeof v === 'string' || typeof v === 'number') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const inPeriod = (d: Date | null, now: Date) => {
    if (!d) return period === 'year';
    
    const dTime = d.getTime();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (period === 'day') {
      // web uses startOfDay -> now, but we use startOfDay -> endOfDay to be safe
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
      return dTime >= startOfDay && dTime <= endOfDay;
    }
    
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return d.getFullYear() === now.getFullYear();
  };

  // Khởi tạo Map (nằm ngoài useMemo nhưng vì reqOrders thay đổi reference nên reference map vẫn đúng)
  const ordersCache = useMemo(() => new WeakMap(), []);

  // Pricing giống web: lấy từ Orders.items theo orderId + product nhưng tối ưu O(1)
  const getPricing = (orderId: string, product: string, reqOrders: any[]) => {
    if (!reqOrders) return { cost: 0, margin: 0, freight: 0, totalUnit: 20700 };
    let map = ordersCache.get(reqOrders);
    if (!map) {
      map = new Map();
      for (let i = 0; i < reqOrders.length; i++) map.set(reqOrders[i].id, reqOrders[i]);
      ordersCache.set(reqOrders, map);
    }
    const o = map.get(orderId) || {};
    const i = (o.items || []).find((it: any) => it.product === product) || { costPrice: 20000, margin: 500, freight: 200 };
    const cost = Number(i.costPrice || 0);
    const margin = Number(i.margin || 0);
    const freight = Number(i.freight || 0);
    return { cost, margin, freight, totalUnit: (cost + margin + freight) || 20700 };
  };

  const currentFinance = useMemo(() => {
    const now = new Date();
    // Lọc qua updatedAt, fallback createdAt
    const filteredTrips = (orders || []).filter(o => inPeriod(toDateSafe(o.updatedAt || o.createdAt), now) && o.status === 'completed');

    let revenue = 0;
    let costOfGoods = 0;
    filteredTrips.forEach(o => {
      const qty = Number(o.amount) || 0;
      const p = getPricing(o.orderId, o.product, saleOrders || []);
      revenue += qty * (p.totalUnit || 0);
      costOfGoods += qty * (p.cost || 0);
    });

    // Lọc qua date, fallback createdAt
    const approvedExpenses = (expenses || []).filter(e => e.status === 'approved' && inPeriod(toDateSafe(e.date || e.createdAt), now));
    const apCost = approvedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Lọc transactions qua createdAt
    const txExpense = (transactions || []).filter(t => t.type === 'expense' && inPeriod(toDateSafe(t.createdAt), now));
    const txCost = txExpense.reduce((s, t) => s + (Number(t.totalAmount) || Number(t.amount) || 0), 0);

    const totalCost = costOfGoods + apCost + txCost;
    return { rev: revenue, exp: totalCost, prof: revenue - totalCost };
  }, [orders, saleOrders, expenses, transactions, period]);

  const formatVND = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + ' Tỷ';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + ' Tr';
    if (num === 0) return '0đ';
    return num.toLocaleString() + 'đ';
  };

  const handleLogout = async () => {
    setShowProfile(false);
    await logout();
    router.replace('/');
  };

  const handleSwitchAccount = async () => {
    setShowProfile(false);
    await logout();
    router.replace('/');
  };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = { admin: 'Quản Trị Viên', sales: 'Nhân Viên Kinh Doanh', driver: 'Tài Xế', manager: 'Giám Đốc' };
    return map[role] || role;
  };

  // ==================== PROFILE MODAL ====================
  const renderProfileModal = () => (
    <Modal visible={showProfile} animationType="slide" transparent>
      <View style={styles.profileOverlay}>
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.profileAvatarContainer}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={50} color="#fff" />
            </View>
          </View>

          {/* Thông tin */}
          <Text style={styles.profileName}>{user?.name || 'Người dùng'}</Text>
          <View style={styles.profileRoleBadge}>
            <Text style={styles.profileRoleText}>{getRoleLabel(user?.role || '')}</Text>
          </View>

          <View style={styles.profileInfoSection}>
            <View style={styles.profileInfoRow}>
              <Ionicons name="mail" size={18} color="#0070f3" />
              <Text style={styles.profileInfoText}>{user?.email || 'Chưa có email'}</Text>
            </View>
            <View style={styles.profileInfoRow}>
              <Ionicons name="finger-print" size={18} color="#0070f3" />
              <Text style={styles.profileInfoText}>ID: {user?.userId?.slice(0, 12) || '---'}...</Text>
            </View>
            <View style={styles.profileInfoRow}>
              <Ionicons name="shield-checkmark" size={18} color={user?.isApproved ? '#52c41a' : '#ff4d4f'} />
              <Text style={styles.profileInfoText}>{user?.isApproved ? 'Tài khoản đã duyệt ✓' : 'Chưa được duyệt'}</Text>
            </View>
          </View>

          {/* Nút hành động */}
          <TouchableOpacity style={styles.switchBtn} onPress={handleSwitchAccount}>
            <Ionicons name="swap-horizontal" size={20} color="#0070f3" />
            <Text style={styles.switchBtnText}>Chuyển tài khoản</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#fff" />
            <Text style={styles.logoutBtnText}>Đăng xuất</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtnProfile} onPress={() => setShowProfile(false)}>
            <Text style={styles.closeBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerGradiant}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Xin chào, Sếp!</Text>
            <Text style={styles.userName}>{user?.name || 'Quản Trị Viên'}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => setShowProfile(true)}>
            <Ionicons name="person-circle" size={40} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.financeCard}>
          <View style={styles.filterTabs}>
            {(['day', 'month', 'year'] as const).map(p => (
              <TouchableOpacity key={p} style={[styles.tabBtn, period === p && styles.tabActive]} onPress={() => setPeriod(p)}>
                <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                  {p === 'day' ? 'Hôm nay' : p === 'month' ? 'Tháng này' : 'Năm nay'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {loading ? <ActivityIndicator size="large" color="#0A2540" style={{ marginVertical: 20 }} /> : (<>
            <Text style={styles.netProfitLabel}>Lợi Nhuận Ròng</Text>
            <Text style={styles.netProfitValue}>{formatVND(currentFinance.prof)}</Text>
            <View style={styles.financeDivider} />
            <View style={styles.financeRow}>
              <View style={styles.financeItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#e6f7ff' }]}><Ionicons name="arrow-down-circle" size={24} color="#0050b3" /></View>
                <View><Text style={styles.financeSubLabel}>Doanh Thu</Text><Text style={styles.financeSubValue}>{formatVND(currentFinance.rev)}</Text></View>
              </View>
              <View style={styles.financeItem}>
                <View style={[styles.iconCircle, { backgroundColor: '#fff1f0' }]}><Ionicons name="arrow-up-circle" size={24} color="#cf1322" /></View>
                <View><Text style={styles.financeSubLabel}>Chi Phí</Text><Text style={styles.financeSubValue}>{formatVND(currentFinance.exp)}</Text></View>
              </View>
            </View>
          </>)}
        </View>
      </View>

      <View style={styles.bodySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tình trạng phân phối (Logistics)</Text>
          <TouchableOpacity onPress={loadData}><Text style={styles.linkText}>⟳ Làm mới</Text></TouchableOpacity>
        </View>
        <View style={styles.tripStatsGrid}>
          <View style={[styles.tripCard, { borderLeftColor: '#1890ff', borderLeftWidth: 4 }]}>
            <MaterialCommunityIcons name="truck-fast" size={28} color="#1890ff" />
            <Text style={styles.tripCount}>{movingCount}</Text><Text style={styles.tripLabel}>Xe Đang Chạy</Text>
          </View>
          <View style={[styles.tripCard, { borderLeftColor: '#52c41a', borderLeftWidth: 4 }]}>
            <Ionicons name="checkmark-circle" size={28} color="#52c41a" />
            <Text style={styles.tripCount}>{completedCount}</Text><Text style={styles.tripLabel}>Đã Giao Xong</Text>
          </View>
          <View style={[styles.tripCard, { borderLeftColor: '#faad14', borderLeftWidth: 4 }]}>
            <FontAwesome5 name="gas-pump" size={24} color="#faad14" />
            <Text style={styles.tripCount}>{totalVolume >= 1000 ? Math.round(totalVolume / 1000) + 'K' : totalVolume}</Text><Text style={styles.tripLabel}>Khối lượng (Lít)</Text>
          </View>
          <View style={[styles.tripCard, { borderLeftColor: '#ff4d4f', borderLeftWidth: 4 }]}>
            <Ionicons name="warning" size={28} color="#ff4d4f" />
            <Text style={[styles.tripCount, { color: '#ff4d4f' }]}>{issueCount}</Text><Text style={styles.tripLabel}>Đơn Gặp Sự Cố</Text>
          </View>
        </View>
        <View style={styles.totalBanner}>
          <Text style={styles.totalBannerText}>📊 Tổng số lệnh: <Text style={{fontWeight:'900'}}>{orders.length}</Text></Text>
        </View>
        <View style={styles.mapBannerContainer}>
           <View style={styles.mapBannerContent}>
              <Text style={styles.mapBannerTitle}>Bản Đồ Vệ Tinh Trực Tuyến</Text>
              <Text style={styles.mapBannerDesc}>Theo dõi vị trí Live (VietMap + TrackAsia).</Text>
           </View>
           <FontAwesome5 name="map-marked-alt" size={40} color="rgba(255,255,255,0.7)" style={styles.mapBannerIcon}/>
        </View>
        <View style={{ height: 40 }}/>
      </View>

      {renderProfileModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  headerGradiant: { backgroundColor: '#0A2540', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { color: '#8bb4e5', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  userName: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  profileBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 25, padding: 2 },
  financeCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 },
  filterTabs: { flexDirection: 'row', backgroundColor: '#f0f4f8', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.05, elevation: 2 },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 13 },
  tabTextActive: { color: '#0A2540' },
  netProfitLabel: { color: '#666', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  netProfitValue: { color: '#0A2540', fontSize: 36, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  financeDivider: { height: 1.5, backgroundColor: '#f0f0f0', marginVertical: 20, marginHorizontal: 10 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  financeItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  financeSubLabel: { color: '#888', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  financeSubValue: { color: '#111', fontSize: 18, fontWeight: 'bold' },
  bodySection: { paddingHorizontal: 20, marginTop: -20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1a1a1a' },
  linkText: { color: '#1890ff', fontWeight: '600' },
  tripStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  tripCard: { backgroundColor: '#fff', width: '48%', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: {width:0,height:4}, shadowOpacity: 0.03, elevation: 2, marginBottom: 5 },
  tripCount: { fontSize: 26, fontWeight: '900', color: '#111', marginTop: 10 },
  tripLabel: { fontSize: 13, color: '#666', fontWeight: '500', marginTop: 4 },
  totalBanner: { backgroundColor: '#f0f8ff', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#d6e4f0' },
  totalBannerText: { fontSize: 14, color: '#333', textAlign: 'center' },
  mapBannerContainer: { backgroundColor: '#2a9d8f', borderRadius: 20, padding: 25, marginTop: 20, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', shadowColor: '#2a9d8f', shadowOffset: {width:0, height:8}, shadowOpacity: 0.3, elevation: 5 },
  mapBannerContent: { flex: 1, zIndex: 2 },
  mapBannerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  mapBannerDesc: { color: '#e0f7f4', fontSize: 13, lineHeight: 20 },
  mapBannerIcon: { position: 'absolute', right: -10, bottom: -10, opacity: 0.2, transform: [{ scale: 1.5 }] },

  // PROFILE MODAL
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  profileCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: {width:0,height:20}, shadowOpacity: 0.15, elevation: 10 },
  profileAvatarContainer: { marginBottom: 16 },
  profileAvatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#0A2540', justifyContent: 'center', alignItems: 'center', shadowColor: '#0A2540', shadowOffset: {width:0,height:6}, shadowOpacity: 0.3, elevation: 5 },
  profileName: { fontSize: 22, fontWeight: '900', color: '#111', marginBottom: 6 },
  profileRoleBadge: { backgroundColor: '#e6f7ff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 20 },
  profileRoleText: { color: '#0050b3', fontWeight: 'bold', fontSize: 13 },
  profileInfoSection: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, marginBottom: 20 },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  profileInfoText: { fontSize: 14, color: '#333' },
  switchBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', borderWidth: 2, borderColor: '#0070f3', borderRadius: 14, paddingVertical: 14, justifyContent: 'center', marginBottom: 12 },
  switchBtnText: { color: '#0070f3', fontWeight: 'bold', fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', backgroundColor: '#ff4d4f', borderRadius: 14, paddingVertical: 14, justifyContent: 'center', marginBottom: 12 },
  logoutBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  closeBtnProfile: { paddingVertical: 10 },
  closeBtnText: { color: '#999', fontSize: 14, fontWeight: '600' },
});
