import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/dataService';

const TYPE_ICONS: Record<string, { name: string; color: string }> = {
  order: { name: 'cube', color: '#0ea5e9' },
  sos: { name: 'warning', color: '#ef4444' },
  expense: { name: 'receipt', color: '#10b981' },
  system: { name: 'settings', color: '#4f46e5' },
};

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const { notifications, unreadCount, setNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifs = useCallback(async () => {
    if (user?.userId) {
      const data = await fetchNotifications(user.userId);
      setNotifications(data);
    }
  }, [user]);

  useEffect(() => {
    loadNotifs().then(() => setLoading(false));
  }, [loadNotifs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifs();
    setRefreshing(false);
  }, [loadNotifs]);

  const handleRead = async (id: string) => {
    markAsRead(id);
    await markNotificationRead(id);
  };

  const handleReadAll = async () => {
    if (!user?.userId) return;
    markAllAsRead();
    await markAllNotificationsRead(user.userId);
  };

  const renderItem = ({ item }: { item: any }) => {
    const iconInfo = TYPE_ICONS[item.type] || TYPE_ICONS.system;
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
        onPress={() => handleRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconInfo.color + '15' }]}>
          <Ionicons name={iconInfo.name as any} size={22} color={iconInfo.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifTitle, !item.isRead && { color: '#0f172a' }]} numberOfLines={1}>
            {item.title || 'Thông báo'}
          </Text>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body || ''}</Text>
          <Text style={styles.notifTime}>
            {item.createdAt?._seconds
              ? new Date(item.createdAt._seconds * 1000).toLocaleString('vi-VN')
              : '---'}
          </Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Thông Báo</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} tin chưa đọc` : 'Tất cả đã đọc'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.readAllBtn} onPress={handleReadAll}>
            <Ionicons name="checkmark-done" size={18} color="#4f46e5" />
            <Text style={styles.readAllText}>Đọc tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={50} color="#cbd5e1" />
            <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingTop: 55, paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0',
  },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },

  readAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(79,70,229,0.08)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  readAllText: { color: '#4f46e5', fontSize: 13, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 8 },

  notifCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  notifCardUnread: {
    borderColor: 'rgba(79,70,229,0.2)', backgroundColor: '#f8fafc',
    borderLeftWidth: 3, borderLeftColor: '#4f46e5',
  },

  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  notifContent: { flex: 1 },
  notifTitle: { color: '#64748b', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  notifBody: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  notifTime: { color: '#cbd5e1', fontSize: 11 },

  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#4f46e5', marginLeft: 8,
  },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 12 },
});
