import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { fetchFuelPrices, fetchInventory } from '../../services/dataService';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

export default function PriceListScreen() {
  const router = useRouter();
  const [prices, setPrices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'price'>('date');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  const loadData = async () => {
    setLoading(true);
    const [p, inv] = await Promise.all([fetchFuelPrices(), fetchInventory()]);
    setPrices(p || []);
    setProducts(inv || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const formatVND = (num: number) => {
    if (!num) return '-';
    return Number(num).toLocaleString('vi-VN') + 'đ';
  };

  const getDate = (ts: any) => {
    if (!ts) return new Date(0);
    if (ts?._seconds) return new Date(ts._seconds * 1000);
    return new Date(ts);
  };

  // Lấy danh sách tên sản phẩm nội bộ duy nhất
  const internalProductNames = useMemo(() => {
    const fromPrices = prices.map((p: any) => p.product).filter(Boolean);
    const fromInventory = products.map((p: any) => p.name || p.productName).filter(Boolean);
    return ['all', ...Array.from(new Set([...fromPrices, ...fromInventory]))];
  }, [prices, products]);

  const filteredPrices = useMemo(() => {
    let list = [...prices];
    // Lọc theo tên SP nội bộ
    if (selectedProduct !== 'all') {
      list = list.filter(p => p.product === selectedProduct);
    }
    // Tìm kiếm
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => (p.product || '').toLowerCase().includes(q));
    }
    // Sắp xếp
    if (sortBy === 'date') {
      list.sort((a, b) => getDate(b.updatedAt || b.createdAt).getTime() - getDate(a.updatedAt || a.createdAt).getTime());
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.product || '').localeCompare(b.product || '', 'vi'));
    } else if (sortBy === 'price') {
      list.sort((a, b) => (Number(b.retailPrice) || 0) - (Number(a.retailPrice) || 0));
    }
    return list;
  }, [prices, search, sortBy, selectedProduct]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.productIcon}>
          <FontAwesome5 name="gas-pump" size={18} color={item.product?.includes('95') ? '#e74c3c' : item.product?.includes('DO') || item.product?.includes('diesel') ? '#f97316' : '#27ae60'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{item.product}</Text>
          <Text style={styles.updateTime}>
            Cập nhật: {item.updatedAt ? getDate(item.updatedAt).toLocaleDateString('vi-VN') : '-'}
          </Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Giá nhập</Text>
          <Text style={[styles.priceValue, { color: '#64748b' }]}>{formatVND(item.costPrice || item.importPrice)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Giá bán lẻ</Text>
          <Text style={[styles.priceValue, { color: '#e74c3c' }]}>{formatVND(item.retailPrice)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Giá buôn</Text>
          <Text style={[styles.priceValue, { color: '#0070f3' }]}>{formatVND(item.wholesalePrice)}</Text>
        </View>
      </View>

      {item.retailPrice && item.costPrice && (
        <View style={styles.marginRow}>
          <Text style={styles.marginLabel}>Biên lợi nhuận:</Text>
          <Text style={styles.marginValue}>
            {formatVND(Number(item.retailPrice) - Number(item.costPrice))} / Lít
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Bảng Giá Xăng Dầu</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={22} color="#0070f3" />
        </TouchableOpacity>
      </View>

      {/* Thanh tìm kiếm */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên sản phẩm..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close" size={18} color="#94a3b8" /></TouchableOpacity> : null}
        </View>
      </View>

      {/* Sắp xếp */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sắp xếp:</Text>
        {[
          { key: 'date', label: 'Mới nhất' },
          { key: 'name', label: 'Tên A-Z' },
          { key: 'price', label: 'Giá cao' },
        ].map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sortBtn, sortBy === s.key && styles.sortBtnActive]}
            onPress={() => setSortBy(s.key as any)}
          >
            <Text style={[styles.sortText, sortBy === s.key && { color: '#fff' }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Danh sách sản phẩm nội bộ */}
      <View style={styles.productFilterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {internalProductNames.map(name => (
            <TouchableOpacity
              key={name}
              style={[styles.productFilterBtn, selectedProduct === name && styles.productFilterBtnActive]}
              onPress={() => setSelectedProduct(name)}
            >
              <Text style={[styles.productFilterText, selectedProduct === name && { color: '#fff' }]}>
                {name === 'all' ? '📋 Tất cả' : name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0070f3" style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={filteredPrices}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có dữ liệu giá.</Text>}
          ListFooterComponent={
            products.length > 0 ? (
              <View style={styles.inventorySection}>
                <Text style={styles.inventoryTitle}>📦 Sản phẩm kho nội bộ ({products.length})</Text>
                {products.map((p, i) => (
                  <View key={i} style={styles.inventoryRow}>
                    <Text style={styles.inventoryName}>{p.name || p.productName || '-'}</Text>
                    <Text style={styles.inventoryQty}>{Number(p.quantity || p.amount || 0).toLocaleString()} Lít</Text>
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff', elevation: 2 },
  backBtn: { marginRight: 14 },
  title: { fontSize: 20, fontWeight: '900', color: '#1a1a1a', flex: 1 },
  searchRow: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b' },
  sortRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  sortLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: '#f1f5f9' },
  sortBtnActive: { backgroundColor: '#0070f3' },
  sortText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  productFilterRow: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  productFilterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  productFilterBtnActive: { backgroundColor: '#7c3aed' },
  productFilterText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  productIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  productName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  updateTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  priceItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 28, backgroundColor: '#e2e8f0' },
  priceLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: '600' },
  priceValue: { fontSize: 15, fontWeight: '800' },
  marginRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  marginLabel: { fontSize: 12, color: '#64748b' },
  marginValue: { fontSize: 13, fontWeight: '700', color: '#52c41a' },
  inventorySection: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 8 },
  inventoryTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  inventoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  inventoryName: { fontSize: 14, color: '#334155', fontWeight: '600' },
  inventoryQty: { fontSize: 13, color: '#0070f3', fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 80, color: '#94a3b8', fontSize: 15 },
});
