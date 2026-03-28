import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { fetchDeliveryLogs } from '../services/dataService';

const VIETMAP_SVC_KEY = 'b0196ed21449e7a1466290aba7590b63459a35eacc591d48';

// NOTE: Không geocode hàng loạt vì sẽ làm load rất lâu.
// Fleet tracking chuẩn phải dựa vào GPS thực (`currentLocation`) do tài xế đẩy lên.

interface MarkerInfo {
  lat: number; lng: number;
  plate: string; driver: string;
  statusLabel: string; dest: string;
  emoji: string; color: string;
  id: string;
  status: string;
  hasGps: boolean;
}

export default function AdminLiveMap() {
  const [markers, setMarkers] = useState<MarkerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [missingGpsCount, setMissingGpsCount] = useState(0);
  const [selectedMarker, setSelectedMarker] = useState<MarkerInfo | null>(null);
  const webRef = useRef<WebView>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await fetchDeliveryLogs();
        const active = (data || []).filter((o: any) => !['completed', 'cancelled'].includes(o.status));
        setActiveCount(active.length);

        const results: MarkerInfo[] = [];
        let missing = 0;
        for (const order of active) {
          const dest = order.items && Array.isArray(order.items) && order.items.length > 0
            ? [...new Set(order.items.map((it: any) => it.destination).filter(Boolean))].join(', ')
            : (order.destination || '');
          
          const coords = order?.currentLocation || { lat: 0, lng: 0 };
          
          // Ưu tiên đọc từ currentLocation (Cấu trúc mới bạn vừa sửa ở Backend)
          let finalLat = coords.lat || (order?.currentLat != null ? parseFloat(order.currentLat) : 0);
          let finalLng = coords.lng || (order?.currentLng != null ? parseFloat(order.currentLng) : 0);
          let isLastKnown = false;

          if (!finalLat || !finalLng) {
            // Thử lấy từ locationHistory (Mảng lịch sử tọa độ)
            const history = order.locationHistory;
            if (Array.isArray(history) && history.length > 0) {
              const last = history[history.length - 1];
              if (last?.lat && last?.lng) {
                finalLat = last.lat;
                finalLng = last.lng;
                isLastKnown = true;
              }
            }
          }

          const hasGps = Boolean(finalLat && finalLng);
          
          // Tính thời gian cập nhật cuối (dùng lastLocationUpdate)
          const timeField = order.lastLocationUpdate || order.updatedAt || order.createdAt || Date.now();
          const updatedAt = timeField?._seconds ? new Date(timeField._seconds * 1000) : new Date(timeField);
          const diffMs = Date.now() - updatedAt.getTime();
          const diffMin = Math.floor(diffMs / 60000);
          const isStale = diffMin > 5; // Quá 5 phút coi như mất tín hiệu thực tế

          if (!hasGps) {
            missing += 1;
          }

          const statusMap: Record<string, string> = { moving: 'Đang chạy', received: 'Đã nhận', unloading: 'Đang xả', arrived: 'Đã đến', pending: 'Chờ nhận' };
          const emojiMap: Record<string, string> = { moving: '🚛', unloading: '⛽', arrived: '📍', received: '✅', pending: '📋' };
          const colorMap: Record<string, string> = { moving: '#f39c12', unloading: '#e67e22', arrived: '#9b59b6', received: '#3498db', pending: '#95a5a6' };
          
          const statusLabel = isLastKnown
            ? `Vị trí cuối (${diffMin}ph trước)` 
            : (isStale ? `Mất tín hiệu (${diffMin}ph)` : (statusMap[order.status] || 'N/A'));
          const emoji = isLastKnown ? '📍' : (isStale ? '⚠️' : (emojiMap[order.status] || '📋'));
          const color = isLastKnown ? '#94a3b8' : (isStale ? '#e67e22' : (colorMap[order.status] || '#95a5a6'));
          
          results.push({
            id: order.id || `${order.vehiclePlate || ''}-${order.assignedDriverId || ''}`,
            lat: finalLat, lng: finalLng, 
            hasGps: hasGps && !isStale && !isLastKnown,
            plate: (order.vehiclePlate || 'N/A').replace(/'/g, ''),
            driver: (order.assignedDriverName || 'Chưa gán').replace(/'/g, ''),
            statusLabel,
            dest: dest.replace(/'/g, '').replace(/"/g, ''),
            emoji,
            color,
            status: order.status || 'pending',
          });
        }
        if (!alive) return;
        setMarkers(results);
        setMissingGpsCount(missing);
        setLastUpdated(new Date());
      } catch (e) { console.error('Map error:', e); }
      if (alive) setLoading(false);
    };
    load();
    const t = setInterval(load, 10000); // refresh 10s
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Tính Center (Chỉ tính xe có tọa độ thực)
  const validMarkers = markers.filter(m => m.lat !== 0);
  const cLat = validMarkers.length > 0 ? validMarkers.reduce((s, m) => s + m.lat, 0) / validMarkers.length : 20.8449;
  const cLng = validMarkers.length > 0 ? validMarkers.reduce((s, m) => s + m.lng, 0) / validMarkers.length : 106.6297;
  const zoom = validMarkers.length === 1 ? 14 : validMarkers.length > 1 ? 11 : 9;

  // Vẽ TẤT CẢ xe có tọa độ (kể cả vị trí cuối đã biết)
  const markersJS = markers.filter(m => m.lat !== 0).map(m => `
    (function(){
      var marker = L.marker([${m.lat}, ${m.lng}], {
        icon: L.divIcon({ 
          className: 'custom-pin', 
          html: '<div style="font-size:32px; filter:drop-shadow(0px 4px 6px rgba(0,0,0,0.3)); opacity: ${m.hasGps ? 1 : 0.55}">${m.emoji}</div>', 
          iconSize: [40, 40], 
          iconAnchor: [20, 36] 
        })
      }).addTo(map);
      marker.on('click', function() {
        window.ReactNativeWebView.postMessage("${m.id}");
      });
      window._markers = window._markers || {};
      window._markers["${m.id}"] = marker;
    })();
  `).join('\n');

  // Bản đồ Raster của Google Maps (Giao thông bản địa - Chi tiết + Nhẹ + Ngon nhất trên Mobile WebView)
  // Không dùng Vector WebGL (TrackAsia/MapboxGL) vì Expo Go trên Android thường xuyên bị lỗi trắng GPU Render
  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100vw; height: 100vh; background-color: #e5e3df; }
    .custom-pin { background: none !important; border: none !important; }
    .leaflet-popup-content-wrapper { border-radius: 16px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important; padding: 4px; }
    .leaflet-popup-content { margin: 12px 14px !important; }
    .leaflet-popup-tip { background: #fff; }
    .leaflet-control-attribution { display: none !important; } 
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${cLat}, ${cLng}], ${zoom});
    window._markers = {};
    
    // Tích hợp Google Maps Streets (Chuẩn giao thông VN, thay thế hoàn hảo cho OSM thô rải)
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}', {
      maxZoom: 20
    }).addTo(map);

    // Zoom controls custom position
    L.control.zoom({ position: 'topright' }).addTo(map);

    ${markersJS}
    
    ${markers.filter(m => m.hasGps).length > 1 ? `map.fitBounds([${markers.filter(m => m.hasGps).map(m => `[${m.lat},${m.lng}]`).join(',')}], {padding: [50, 50], maxZoom: 14});` : ''}

    window.focusMarker = function(id){
      try{
        var mk = window._markers && window._markers[id];
        if(!mk) return false;
        map.setView(mk.getLatLng(), Math.max(map.getZoom(), 14), { animate:true });
        mk.openPopup();
        return true;
      }catch(e){ return false; }
    }
  </script>
</body>
</html>
  `;

  const statusSummary = useMemo(() => {
    const s: Record<string, number> = {};
    markers.forEach(m => { s[m.status] = (s[m.status] || 0) + 1; });
    return s;
  }, [markers]);

  const statusLabel = (st: string) => {
    const map: Record<string, string> = { moving: 'Đang chạy', received: 'Đã nhận', arrived: 'Đã đến', unloading: 'Đang xả', pending: 'Chờ nhận' };
    return map[st] || st;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0070f3" />
        <Text style={styles.loadingText}>Đang lấy tọa độ VietMap GPS...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          🔴 Fleet Live Map • {activeCount} xe hoạt động{missingGpsCount ? ` • ${missingGpsCount} chưa có GPS` : ''}{lastUpdated ? ` • ${lastUpdated.toLocaleTimeString('vi-VN')}` : ''}
        </Text>
      </View>
      <View style={styles.legendRow}>
        {Object.entries(statusSummary).map(([k, v]) => (
          <View key={k} style={styles.legendItem}>
            <Text style={styles.legendKey}>{statusLabel(k)}</Text>
            <Text style={styles.legendVal}>{v}</Text>
          </View>
        ))}
      </View>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={(event) => {
          const id = event.nativeEvent.data;
          const mk = markers.find(x => x.id === id);
          if (mk) {
            setSelectedMarker(mk);
            webRef.current?.injectJavaScript(`window.focusMarker && window.focusMarker('${mk.id}'); true;`);
          }
        }}
      />
      <View style={styles.fleetList}>
        <View style={styles.fleetHeader}>
          <Text style={styles.fleetTitle}>Danh sách xe</Text>
          <Text style={styles.fleetHint}>Chạm để xem vị trí + trạng thái</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 10 }}>
          {markers.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => {
                setSelectedMarker(m);
                webRef.current?.injectJavaScript(`window.focusMarker && window.focusMarker('${m.id}'); true;`);
              }}
              style={[styles.fleetCard, { borderColor: m.color }]}
            >
              <Text style={styles.fleetPlate}>{m.emoji} {m.plate}</Text>
              <Text style={[styles.fleetStatus, { color: m.color }]}>{m.statusLabel}</Text>
              <Text style={styles.fleetDriver} numberOfLines={1}>👤 {m.driver}</Text>
              {!m.hasGps && <Text style={{fontSize: 10, color: '#e74c3c', marginTop: 4, fontWeight: 'bold'}}>Không thể Map</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedMarker && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalPlate}>{selectedMarker.emoji} {selectedMarker.plate}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: selectedMarker.color + '20' }]}>
                    <Text style={{ color: selectedMarker.color, fontWeight: '800', fontSize: 12 }}>{selectedMarker.statusLabel}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedMarker(null)} style={{ padding: 5 }}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalInfoRow}>
                <Ionicons name="person" size={18} color="#0070f3" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.modalInfoLabel}>Tài xế phụ trách</Text>
                  <Text style={styles.modalInfoValue}>{selectedMarker.driver}</Text>
                </View>
              </View>

              <View style={styles.modalInfoRow}>
                <Ionicons name="location" size={18} color="#e67e22" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.modalInfoLabel}>Đích đến / Khách hàng</Text>
                  <Text style={styles.modalInfoValue}>{selectedMarker.dest || 'Chưa rõ'}</Text>
                </View>
              </View>

              <View style={[styles.modalInfoRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="map" size={18} color="#52c41a" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.modalInfoLabel}>Tọa độ GPS Live</Text>
                  {selectedMarker.lat ? (
                    <Text style={styles.modalInfoValue}>{selectedMarker.lat.toFixed(5)}, {selectedMarker.lng.toFixed(5)}</Text>
                  ) : (
                    <Text style={[styles.modalInfoValue, { color: '#e74c3c' }]}>Chưa có tọa độ</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedMarker(null)}>
                <Text style={styles.closeBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666', fontWeight: '500' },
  banner: { backgroundColor: '#1a1a2e', paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', elevation: 4 },
  bannerText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#0b1220' },
  legendItem: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', gap: 8, alignItems: 'center' },
  legendKey: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 12 },
  legendVal: { color: '#fff', fontWeight: '900', fontSize: 12 },
  fleetList: { backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 10, paddingBottom: 14 },
  fleetHeader: { paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  fleetTitle: { fontWeight: '900', fontSize: 14, color: '#0f172a' },
  fleetHint: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  fleetCard: { width: 180, borderWidth: 2, borderRadius: 14, padding: 10, backgroundColor: '#f8fafc' },
  fleetPlate: { fontWeight: '900', color: '#0f172a' },
  fleetStatus: { fontWeight: '900', marginTop: 4 },
  fleetDriver: { marginTop: 6, color: '#334155', fontSize: 12, fontWeight: '600' },
  // Modal Style
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, width: '100%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalPlate: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6, alignSelf: 'flex-start' },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalInfoLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  modalInfoValue: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginTop: 2 },
  closeBtn: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
});
