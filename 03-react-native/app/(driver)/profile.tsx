import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { fetchDriverStats, fetchDriverExpenses, fetchDriverSchedules } from '../../services/dataService';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'expenses' | 'schedule'>('stats');

  useEffect(() => {
    const load = async () => {
      if (user?.userId) {
        const [s, e, sc] = await Promise.all([
          fetchDriverStats(user.userId),
          fetchDriverExpenses(user.userId),
          fetchDriverSchedules(user.userId),
        ]);

        // Backend trả về mảng các chuyến completed → tính toán stats
        if (Array.isArray(s)) {
          setStats({
            totalTrips: s.length,
            completedTrips: s.length,  // API chỉ trả completed
            totalDistance: s.reduce((sum: number, trip: any) => sum + (trip.distance || 0), 0),
            totalRevenue: s.reduce((sum: number, trip: any) => sum + (trip.amount || 0), 0),
          });
        } else if (s) {
          setStats(s);
        }

        setExpenses(e || []);
        setSchedules(sc || []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#4f46e5" />
          </View>
          <Text style={styles.userName}>{user?.name || 'Tài xế'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#10b981" />
            <Text style={styles.roleText}>{user?.role === 'driver' ? 'Tài Xế' : user?.role || 'User'}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        {!loading && stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalTrips || 0}</Text>
              <Text style={styles.statLabel}>Chuyến</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.completedTrips || 0}</Text>
              <Text style={styles.statLabel}>Hoàn thành</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#0ea5e9' }]}>{stats.totalDistance || 0}</Text>
              <Text style={styles.statLabel}>Km</Text>
            </View>
          </View>
        )}

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          {[
            { key: 'stats' as const, label: 'Tổng quan', icon: 'bar-chart' },
            { key: 'expenses' as const, label: 'Chi phí', icon: 'receipt' },
            { key: 'schedule' as const, label: 'Lịch trình', icon: 'calendar' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? '#4f46e5' : '#94a3b8'} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {loading ? (
          <ActivityIndicator color="#4f46e5" style={{ marginTop: 30 }} />
        ) : activeTab === 'stats' ? (
          <View style={styles.section}>
            {stats ? (
              <>
                <View style={styles.salaryCard}>
                  <View>
                    <Text style={styles.salaryLabel}>Lương tạm tính (Tháng này)</Text>
                    <Text style={styles.salaryValue}>{(stats.completedTrips * 500000).toLocaleString('vi-VN')}đ</Text>
                  </View>
                  <Ionicons name="wallet" size={32} color="#fff" opacity={0.3} />
                </View>

                <InfoRow icon="checkmark-circle" label="Chuyến hoàn thành" value={`${stats.completedTrips || 0} chuyến`} />
                <InfoRow icon="speedometer" label="Tổng km" value={`${stats.totalDistance || 0} km`} />
                <InfoRow icon="trending-up" label="Tổng khối lượng" value={stats.totalRevenue ? `${Number(stats.totalRevenue).toLocaleString('vi-VN')} Lít` : '---'} />
                
                <View style={[styles.infoRow, { marginTop: 15, borderStyle: 'dashed', borderColor: '#cbd5e1' }]}>
                   <Ionicons name="information-circle" size={18} color="#64748b" />
                   <Text style={{ fontSize: 12, color: '#64748b', flex: 1 }}>* Lương tính theo định mức 500.000đ/chuyến hoàn thành.</Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>Chưa có dữ liệu thống kê</Text>
            )}
          </View>
        ) : activeTab === 'expenses' ? (
          <View style={styles.section}>
            {expenses.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có chi phí nào</Text>
            ) : (
              expenses.slice(0, 10).map((exp: any) => (
                <View key={exp.id} style={styles.listCard}>
                  <View style={styles.listCardLeft}>
                    <Text style={styles.listCardTitle}>{exp.type || 'Chi phí'}</Text>
                    <Text style={styles.listCardSub}>{exp.description || '---'}</Text>
                    {exp.status === 'rejected' && exp.rejectionReason && (
                        <Text style={styles.rejectionText}>Lý do: {exp.rejectionReason}</Text>
                    )}
                  </View>
                  <View style={styles.listCardRight}>
                    <Text style={styles.listCardAmount}>
                      {Number(exp.amount || 0).toLocaleString('vi-VN')}đ
                    </Text>
                    <View style={[styles.statusDot, {
                      backgroundColor: exp.status === 'approved' ? '#10b981' : exp.status === 'rejected' ? '#ef4444' : '#f59e0b'
                    }]}>
                      <Text style={styles.statusDotText}>
                        {exp.status === 'approved' ? 'Đã duyệt' : exp.status === 'rejected' ? 'Từ chối' : 'Chờ'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            {schedules.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có lịch trình</Text>
            ) : (
              schedules.slice(0, 10).map((sch: any) => (
                <View key={sch.id} style={styles.listCard}>
                  <Ionicons name="calendar-outline" size={20} color="#0ea5e9" />
                  <View style={styles.listCardLeft}>
                    <Text style={styles.listCardTitle}>{sch.title || 'Lịch trình'}</Text>
                    <Text style={styles.listCardSub}>
                      {sch.date ? new Date(sch.date).toLocaleDateString('vi-VN') : '---'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Đăng xuất khỏi thiết bị</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={20} color="#4f46e5" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  profileHeader: {
    alignItems: 'center', paddingTop: 55, paddingBottom: 20,
    borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(79,70,229,0.08)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#4f46e5', marginBottom: 12,
  },
  userName: { color: '#0f172a', fontSize: 22, fontWeight: '800' },
  userEmail: { color: '#64748b', fontSize: 14, marginTop: 4 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.08)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginTop: 8,
  },
  roleText: { color: '#10b981', fontSize: 13, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    paddingVertical: 16, gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 14,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
  },
  statNumber: { color: '#4f46e5', fontSize: 26, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 12, marginTop: 4 },

  tabRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    marginBottom: 8, gap: 8,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  tabActive: { borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.06)' },
  tabText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#4f46e5' },

  section: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 30, fontSize: 15 },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  infoLabel: { color: '#64748b', fontSize: 14, flex: 1 },
  infoValue: { color: '#0f172a', fontSize: 14, fontWeight: '700' },

  listCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 14, marginBottom: 8, gap: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  listCardLeft: { flex: 1 },
  listCardTitle: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  listCardSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  listCardRight: { alignItems: 'flex-end' },
  listCardAmount: { color: '#0ea5e9', fontSize: 15, fontWeight: '700' },
  statusDot: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  statusDotText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, marginHorizontal: 16, marginBottom: 30,
    borderRadius: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#fecaca',
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },

  salaryCard: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#4f46e5', borderRadius: 16, padding: 20, marginBottom: 15,
    elevation: 4, shadowColor: '#4f46e5', shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8
  },
  salaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  salaryValue: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  rejectionText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold', marginTop: 4, fontStyle: 'italic' },
});
