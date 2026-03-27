import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Keyboard } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchTrackAsiaAddress, saveLocation, getSavedLocations } from '../../services/trackAsiaService';
import { useTripStore } from '../../store/tripStore';

export default function LocationSearchScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: 'start' | 'end' }>();
  const { currentLocation, customStartPoint, customEndPoint, setCustomPoints } = useTripStore();
  
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [savedLocs, setSavedLocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    const locs = await getSavedLocations();
    setSavedLocs(locs);
  };

  const handleSearch = async (text: string) => {
    setKeyword(text);
    if (text.length < 3) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    const data = await searchTrackAsiaAddress(
      text, 
      currentLocation?.latitude, 
      currentLocation?.longitude
    );
    setResults(data);
    setLoading(false);
  };

  const handleSelectLocation = (item: any) => {
    Keyboard.dismiss();
    if (item.lat && item.lng) {
      const point = { lat: item.lat, lng: item.lng, name: item.name || item.address };
      
      if (type === 'start') {
        setCustomPoints(point, customEndPoint);
      } else {
        setCustomPoints(customStartPoint, point);
      }
      
      router.back();
    }
  };

  const handleSaveLocation = async (item: any) => {
    const fresh = await saveLocation(item.name || item.address, item.lat, item.lng, item.address);
    setSavedLocs(fresh);
    alert('Đã lưu địa điểm!');
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectLocation(item)}>
      <View style={styles.iconBox}>
        <Ionicons name="location" size={20} color="#64748b" />
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name || item.address}</Text>
        <Text style={styles.resultAddress} numberOfLines={2}>{item.address}</Text>
      </View>
      <TouchableOpacity style={styles.saveBtn} onPress={() => handleSaveLocation(item)}>
        <Ionicons name="bookmark-outline" size={22} color="#4f46e5" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Search */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder={type === 'start' ? 'Tìm điểm đi...' : 'Tìm điểm đến...'}
          placeholderTextColor="#94a3b8"
          value={keyword}
          onChangeText={handleSearch}
          autoFocus
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color="#4f46e5" style={{ marginTop: 20 }} />
        ) : keyword.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>TrackAsia không tìm thấy kết quả.</Text>
            }
          />
        ) : (
          <View style={styles.savedSection}>
            <TouchableOpacity 
              style={styles.currentLocBtn}
              onPress={() => {
                if (currentLocation) {
                  handleSelectLocation({ lat: currentLocation.latitude, lng: currentLocation.longitude, name: 'Vị trí hiện tại' });
                } else {
                  alert('Chưa nhận được tín hiệu GPS');
                }
              }}
            >
              <Ionicons name="locate" size={20} color="#4f46e5" />
              <Text style={styles.currentLocText}>Chọn Vị trí hiện tại</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>ĐỊA ĐIỂM ĐÃ LƯU</Text>
            {savedLocs.length === 0 ? (
              <View style={styles.emptySaved}>
                <Ionicons name="bookmarks-outline" size={40} color="#cbd5e1" />
                <Text style={styles.emptySavedText}>Bạn chưa lưu địa điểm nào</Text>
              </View>
            ) : (
              <FlatList
                data={savedLocs}
                keyExtractor={(it) => it.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectLocation(item)}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(79,70,229,0.1)' }]}>
                      <Ionicons name="bookmark" size={20} color="#4f46e5" />
                    </View>
                    <View style={styles.resultContent}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 55, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0',
  },
  backBtn: { marginRight: 12 },
  searchInput: {
    flex: 1, fontSize: 16, color: '#0f172a',
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  clearBtn: { position: 'absolute', right: 30, top: 68 },

  body: { flex: 1 },
  listContent: { padding: 16 },

  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 12,
    padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  resultContent: { flex: 1 },
  resultName: { color: '#0f172a', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  resultAddress: { color: '#64748b', fontSize: 13 },
  saveBtn: { padding: 8 },

  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 20 },

  savedSection: { padding: 16, flex: 1 },
  currentLocBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(79,70,229,0.1)', paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 12, marginBottom: 24,
  },
  currentLocText: { color: '#4f46e5', fontSize: 15, fontWeight: '700' },

  sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: '800', marginBottom: 16, letterSpacing: 1 },
  emptySaved: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: -50 },
  emptySavedText: { color: '#94a3b8', fontSize: 15, marginTop: 12 },
});
