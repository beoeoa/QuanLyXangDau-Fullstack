import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useCallback, useMemo } from 'react';
import { fetchAllDriverExpenses, fetchDeliveryLogs, fetchOrders, fetchTransactions, fetchFleetVehicles, fetchUsers, fetchMonthlyRevenue } from '../../services/dataService';
import { useFocusEffect, useRouter } from 'expo-router';

export default function AdminDashboardScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('day');
  const [refDate, setRefDate] = useState(new Date());
  const [orders, setOrders] = useState<any[]>([]);
  const [saleOrders, setSaleOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<{label:string;rev:number;exp:number}[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Ưu tiên render nhanh: lấy delivery-orders trước
      const dels = await fetchDeliveryLogs();
      setOrders(dels || []);
      setLoading(false);

      // Tài chính + Nhân sự + Xe tải nền (không block UI)
      const [ords, exps, trans, vhcs, usrs] = await Promise.all([
        fetchOrders(),
        fetchAllDriverExpenses(),
        fetchTransactions(),
        fetchFleetVehicles(),
        fetchUsers(),
      ]);
      setSaleOrders(ords || []);
      setExpenses(exps || []);
      setTransactions(trans || []);
      setVehicles(vhcs || []);
      setAllUsers(usrs || []);

      // Load biểu đồ lợi nhuận 6 tháng từ dữ liệu thực
      const monthly = await fetchMonthlyRevenue();
      setMonthlyData(monthly as any || []);
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

  // Nhân sự
  const approvedUsers = allUsers.filter((u: any) => u.isApproved !== false);
  const driverCount = approvedUsers.filter((u: any) => u.role === 'driver').length;
  const salesCount = approvedUsers.filter((u: any) => u.role === 'sales').length;
  const accountantCount = approvedUsers.filter((u: any) => u.role === 'accountant').length;

  // Đội xe
  const totalVehicles = vehicles.length;
  const activeVehiclePlates = new Set(orders.filter(o => activeStatuses.includes(o.status)).map(o => o.vehiclePlate));
  const activeVehicleCount = activeVehiclePlates.size;

  // 5 đơn gần nhất
  const recentOrders = [...orders]
    .sort((a, b) => {
      const da = new Date(a.updatedAt?._seconds ? a.updatedAt._seconds * 1000 : (a.updatedAt || a.createdAt || 0)).getTime();
      const db = new Date(b.updatedAt?._seconds ? b.updatedAt._seconds * 1000 : (b.updatedAt || b.createdAt || 0)).getTime();
      return db - da;
    })
    .slice(0, 5);

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

  const handlePrev = () => {
    const d = new Date(refDate);
    if (period === 'day') d.setDate(d.getDate() - 1);
    else if (period === 'month') d.setMonth(d.getMonth() - 1);
    else d.setFullYear(d.getFullYear() - 1);
    setRefDate(d);
  };

  const handleNext = () => {
    const d = new Date(refDate);
    if (period === 'day') d.setDate(d.getDate() + 1);
    else if (period === 'month') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    setRefDate(d);
  };

  const inPeriod = (d: Date | null, ref: Date) => {
    if (!d) return period === 'year';
    
    const dTime = d.getTime();
    const startOfDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();

    if (period === 'day') {
      const endOfDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59).getTime();
      return dTime >= startOfDay && dTime <= endOfDay;
    }
    
    if (period === 'month') return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
    return d.getFullYear() === ref.getFullYear();
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
    const totalUnit = cost + margin + freight;
    return { cost, margin, freight, totalUnit: totalUnit || 20700 };
  };

  const currentFinance = useMemo(() => {
    const now = refDate;
    const filteredTrips = (orders || []).filter(o => inPeriod(toDateSafe(o.updatedAt || o.createdAt), now) && o.status === 'completed');

    let revenue = 0;
    let costOfGoods = 0;
    let totalHaoHut = 0;

    filteredTrips.forEach(o => {
      const qty = Number(o.amount) || 0;
      const p = getPricing(o.orderId, o.product, saleOrders || []);
      revenue += qty * p.totalUnit;
      costOfGoods += qty * p.cost;

      // Tính hao hụt (giống Web logic)
      const xuatKho = Number(o.amount || 0);
      const thucGiao = Number(o.deliveredQuantity || o.amount || 0);
      const haoHutLt = xuatKho - thucGiao;
      if (haoHutLt > 0) totalHaoHut += haoHutLt * p.cost;
    });

    const approvedExpenses = (expenses || []).filter(e => e.status === 'approved' && inPeriod(toDateSafe(e.date || e.createdAt), now));
    const apCost = approvedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const txExpense = (transactions || []).filter(t => t.type === 'expense' && inPeriod(toDateSafe(t.createdAt), now));
    const txCost = txExpense.reduce((s, t) => s + (Number(t.totalAmount) || Number(t.amount) || 0), 0);

    const totalCost = costOfGoods + apCost + txCost + totalHaoHut;
    return { rev: revenue, exp: totalCost, prof: revenue - totalCost };
  }, [orders, saleOrders, expenses, transactions, period, refDate]);

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
              <TouchableOpacity key={p} style={[styles.tabBtn, period === p && styles.tabActive]} onPress={() => { setPeriod(p); setRefDate(new Date()); }}>
                <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                  {p === 'day' ? 'Hàng ngày' : p === 'month' ? 'Hàng tháng' : 'Hàng năm'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Navigator chọn thời gian */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
            <TouchableOpacity onPress={handlePrev} style={{ padding: 6, backgroundColor: '#fff', borderRadius: 8 }}>
              <Ionicons name="chevron-back" size={20} color="#0070f3" />
            </TouchableOpacity>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>
              {period === 'day' ? refDate.toLocaleDateString('vi-VN') : period === 'month' ? `Tháng ${refDate.getMonth() + 1}/${refDate.getFullYear()}` : `Năm ${refDate.getFullYear()}`}
            </Text>
            <TouchableOpacity onPress={handleNext} style={{ padding: 6, backgroundColor: '#fff', borderRadius: 8 }}>
              <Ionicons name="chevron-forward" size={20} color="#0070f3" />
            </TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator size="large" color="#0A2540" style={{ marginVertical: 20 }} /> : (<>
            <Text style={styles.netProfitLabel}>
              Lợi Nhuận Ròng
            </Text>
            <Text style={[styles.netProfitValue, { color: currentFinance.prof >= 0 ? '#0070f3' : '#ef4444' }]}>
              {formatVND(currentFinance.prof)}
            </Text>

            {/* 3 chỉ số chi tiết theo kỳ */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 8 }}>
              <View style={{ flex: 1, backgroundColor: '#e0f2fe', borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 10, color: '#0369a1', fontWeight: '700', marginBottom: 3 }}>DOANH THU</Text>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0070f3' }}>{formatVND(currentFinance.rev)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#fee2e2', borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 10, color: '#991b1b', fontWeight: '700', marginBottom: 3 }}>CHI PHÍ</Text>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#ef4444' }}>{formatVND(currentFinance.exp)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: currentFinance.prof >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 12, padding: 10 }}>
                <Text style={{ fontSize: 10, color: currentFinance.prof >= 0 ? '#166534' : '#991b1b', fontWeight: '700', marginBottom: 3 }}>LỢI NHUẬN</Text>
                <Text style={{ fontSize: 13, fontWeight: '900', color: currentFinance.prof >= 0 ? '#16a34a' : '#ef4444' }}>
                  {formatVND(currentFinance.prof)}
                </Text>
              </View>
            </View>

            <View style={styles.financeDivider} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Lợi nhuận ròng - 6 tháng gần nhất</Text>
            {/* Biểu đồ 6 tháng - dữ liệu thực */}
            {(() => {
              const chartData = monthlyData.length > 0 ? monthlyData : [
                { label: 'T1', rev: 0, exp: 0 }, { label: 'T2', rev: 0, exp: 0 },
                { label: 'T3', rev: 0, exp: 0 }, { label: 'T4', rev: 0, exp: 0 },
                { label: 'T5', rev: 0, exp: 0 }, { label: 'T6', rev: 0, exp: 0 },
              ];
              const maxProfit = Math.max(...chartData.map(d => Math.max(d.rev - d.exp, 0)), 1);
              return (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, paddingBottom: 10 }}>
                  {chartData.map((bar, i) => {
                    const profit = bar.rev - bar.exp;
                    const heightPct = profit > 0 ? Math.round((profit / maxProfit) * 100) : 3;
                    const isLast = i === chartData.length - 1;
                    return (
                      <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 8, color: '#94a3b8', marginBottom: 2 }}>
                          {profit > 0 ? (profit >= 1e6 ? (profit/1e6).toFixed(0)+'M' : (profit/1000).toFixed(0)+'K') : ''}
                        </Text>
                        <View style={{
                          width: 22,
                          height: `${heightPct}%`,
                          backgroundColor: profit < 0 ? '#ff4d4f' : (isLast ? '#0070f3' : '#93c5fd'),
                          borderRadius: 6,
                          marginBottom: 8
                        }} />
                        <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold' }}>{bar.label}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}

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

        {/* ===== CHỨC NĂNG QUẢN TRỊ ===== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chức năng quản trị</Text>
        </View>
        <View style={styles.utilGrid}>
          {[
            { id: 'sales-orders', label: 'Đơn hàng', icon: 'clipboard-list', color: '#1890ff' },
            { id: 'price-list', label: 'Bảng giá', icon: 'tag', color: '#faad14' },
            { id: 'contracts', label: 'Hợp đồng', icon: 'file-contract', color: '#52c41a' },
            { id: 'employees', label: 'Nhân sự', icon: 'users', color: '#722ed1' },
            { id: 'work-diary', label: 'Nhật ký chạy', icon: 'calendar-alt', color: '#13c2c2' },
            { id: 'audit-logs', label: 'Lịch sử HT', icon: 'history', color: '#eb2f96' },
            { id: 'approvals', label: 'Duyệt User', icon: 'user-check', color: '#fa8c16' },
            { id: 'sos', label: 'Sự cố SOS', icon: 'exclamation-triangle', color: '#f5222d' },
          ].map(util => (
            <TouchableOpacity key={util.id} style={styles.utilCard} onPress={() => router.push(`/(admin)/${util.id}` as any)}>
              <View style={[styles.utilIconBox, { backgroundColor: util.color + '15' }]}>
                <FontAwesome5 name={util.icon} size={20} color={util.color} />
              </View>
              <Text style={styles.utilLabel}>{util.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== NHÂN SỰ ===== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nhân sự hệ thống</Text>
          <Text style={{color:'#64748b', fontSize: 12, fontWeight:'600'}}>{approvedUsers.length} người</Text>
        </View>
        <View style={styles.tripStatsGrid}>
          <View style={[styles.tripCard, { borderLeftColor: '#1890ff', borderLeftWidth: 4 }]}>
            <FontAwesome5 name="truck" size={22} color="#1890ff" />
            <Text style={styles.tripCount}>{driverCount}</Text><Text style={styles.tripLabel}>Tài Xế</Text>
          </View>
          <View style={[styles.tripCard, { borderLeftColor: '#52c41a', borderLeftWidth: 4 }]}>
            <Ionicons name="briefcase" size={24} color="#52c41a" />
            <Text style={styles.tripCount}>{salesCount}</Text><Text style={styles.tripLabel}>Kinh Doanh</Text>
          </View>
          <View style={[styles.tripCard, { borderLeftColor: '#faad14', borderLeftWidth: 4 }]}>
            <Ionicons name="calculator" size={24} color="#faad14" />
            <Text style={styles.tripCount}>{accountantCount}</Text><Text style={styles.tripLabel}>Kế Toán</Text>
          </View>
          <View style={[styles.tripCard, { borderLeftColor: '#722ed1', borderLeftWidth: 4 }]}>
            <MaterialCommunityIcons name="truck-trailer" size={26} color="#722ed1" />
            <Text style={styles.tripCount}>{activeVehicleCount}/{totalVehicles}</Text><Text style={styles.tripLabel}>Xe Hoạt Động</Text>
          </View>
        </View>

        {/* ===== ĐƠN HÀNG GẦN ĐÂY ===== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Đơn hàng gần đây</Text>
        </View>
        {recentOrders.length === 0 ? (
          <View style={styles.totalBanner}><Text style={styles.totalBannerText}>Chưa có đơn hàng nào.</Text></View>
        ) : (
          <View style={{ gap: 10 }}>
            {recentOrders.map((o, idx) => {
              const statusMap: Record<string, {label: string, color: string, bg: string}> = {
                pending: { label: 'Chờ nhận', color: '#95a5a6', bg: '#f0f0f0' },
                received: { label: 'Đã nhận', color: '#3498db', bg: '#e3f2fd' },
                moving: { label: 'Đang chạy', color: '#f39c12', bg: '#fff8e1' },
                arrived: { label: 'Đã đến', color: '#9b59b6', bg: '#f3e5f5' },
                unloading: { label: 'Đang xả', color: '#e67e22', bg: '#fff3e0' },
                completed: { label: 'Hoàn thành', color: '#27ae60', bg: '#e8f5e9' },
                cancelled: { label: 'Hủy', color: '#e74c3c', bg: '#ffebee' },
              };
              const st = statusMap[o.status] || statusMap.pending;
              const dt = new Date(o.updatedAt?._seconds ? o.updatedAt._seconds * 1000 : (o.updatedAt || o.createdAt || 0));
              const dateStr = !isNaN(dt.getTime()) ? dt.toLocaleDateString('vi-VN') : '';
              return (
                <View key={o.id || idx} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.04, elevation: 1 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: st.bg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <FontAwesome5 name="gas-pump" size={18} color={st.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: '#111', fontSize: 14 }} numberOfLines={1}>{o.vehiclePlate || 'N/A'} • {o.product || 'Xăng'}</Text>
                    <Text style={{ color: '#888', fontSize: 12, marginTop: 2 }} numberOfLines={1}>👤 {o.assignedDriverName || 'Chưa gán'} • {Number(o.amount || 0).toLocaleString()}L • {dateStr}</Text>
                  </View>
                  <View style={{ backgroundColor: st.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                    <Text style={{ color: st.color, fontWeight: '800', fontSize: 11 }}>{st.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

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

  // UTILITIES GRID
  utilGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  utilCard: { backgroundColor: '#fff', width: '23%', aspectRatio: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center', padding: 8, elevation: 2, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.05 },
  utilIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  utilLabel: { fontSize: 10, fontWeight: 'bold', color: '#475569', textAlign: 'center' },
});
