import { useState, useEffect, useRef } from 'react'
import trackasia from 'trackasia-gl'
import 'trackasia-gl/dist/trackasia-gl.css'
import { getAllDeliveryOrders } from '../../services/transportationService'

const TRACKASIA_API_KEY = '9cb71773659040a8af8b9d0b56ed01e032'
const STYLE_URL = `https://maps.track-asia.com/styles/v1/streets.json?key=${TRACKASIA_API_KEY}`

const VIETMAP_SVC_KEY = 'b0196ed21449e7a1466290aba7590b63459a35eacc591d48'

const STATUS_CONFIG = {
    pending: { label: 'Chờ nhận hàng', color: '#95a5a6', emoji: '📋', bg: '#f8f9fa' },
    received: { label: 'Đã nhận hàng', color: '#3498db', emoji: '✅', bg: '#cce5ff' },
    moving: { label: 'Đang di chuyển', color: '#f39c12', emoji: '🚚', bg: '#fff3cd' },
    arrived: { label: 'Đã đến điểm giao', color: '#9b59b6', emoji: '📍', bg: '#f3e8ff' },
    unloading: { label: 'Đang xả hàng', color: '#e67e22', emoji: '⛽', bg: '#fde8d8' },
    completed: { label: 'Hoàn thành', color: '#27ae60', emoji: '🏁', bg: '#d4edda' },
}

const decodePolyline = (str, precision = 5) => {
    let index = 0, lat = 0, lng = 0, coordinates = [];
    let shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision);
    while (index < str.length) {
        byte = null; shift = 0; result = 0;
        do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        shift = result = 0;
        do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += latitude_change; lng += longitude_change;
        coordinates.push([lng / factor, lat / factor]); // Trả về dạng [lng, lat] cho GeoJSON
    }
    return coordinates;
};

const geocode = async (query) => {
    if (!query || query.length < 2) return null;
    try {
        const res = await fetch(`https://maps.vietmap.vn/api/search/v3?apikey=${VIETMAP_SVC_KEY}&text=${encodeURIComponent(query)}`);
        const searchData = await res.json();
        if (searchData && searchData.length > 0 && searchData[0].ref_id) {
            const placeRes = await fetch(`https://maps.vietmap.vn/api/place/v3?apikey=${VIETMAP_SVC_KEY}&refid=${searchData[0].ref_id}`);
            const placeData = await placeRes.json();
            if (placeData.lat && placeData.lng) {
                return [placeData.lng, placeData.lat];
            }
        }
        return null;
    } catch { return null; }
}

function LiveTrackingMap() {
    const mapContainer = useRef(null)
    const map = useRef(null)
    const markersRef = useRef([]) // lưu tất cả Marker đang hiển thị
    const routeLinesRef = useRef([]) // lưu source id của route lines

    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [lastRefresh, setLastRefresh] = useState(new Date())
    const [autoRefresh, setAutoRefresh] = useState(true)

    // Load dữ liệu các lệnh điều động đang hoạt động
    const loadOrders = async () => {
        setLoading(true)
        const data = await getAllDeliveryOrders()
        const active = Array.isArray(data) ? data.filter(o => o.status !== 'cancelled') : []
        setOrders(active)
        setLastRefresh(new Date())
        setLoading(false)
    }

    // Khởi tạo Map
    useEffect(() => {
        if (map.current) return
        map.current = new trackasia.Map({
            container: mapContainer.current,
            style: STYLE_URL,
            center: [106.6297, 20.8449], // Trung tâm Hải Phòng
            zoom: 9
        })
        map.current.addControl(new trackasia.NavigationControl(), 'top-right')
        map.current.addControl(new trackasia.ScaleControl(), 'bottom-left')
        map.current.on('error', e => console.warn('Map error:', e))

        return () => { if (map.current) { map.current.remove(); map.current = null } }
    }, [])

    useEffect(() => { loadOrders() }, [])

    // Auto-refresh mỗi 10 giây (Tăng tốc để thấy xe chạy sát thực tế)
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(loadOrders, 10000)
        return () => clearInterval(interval)
    }, [autoRefresh])

    // Vẽ markers và routes lên bản đồ khi orders thay đổi
    useEffect(() => {
        if (!map.current || orders.length === 0) return
        drawAllOnMap()
    }, [orders])

    // Fly to order khi click danh sách
    useEffect(() => {
        if (!selectedOrder || !map.current) return
        const fly = async () => {
            const gpsLat = selectedOrder.currentLat != null ? parseFloat(selectedOrder.currentLat)
                         : selectedOrder.currentLocation?.lat != null ? parseFloat(selectedOrder.currentLocation.lat)
                         : null;
            const gpsLng = selectedOrder.currentLng != null ? parseFloat(selectedOrder.currentLng)
                         : selectedOrder.currentLocation?.lng != null ? parseFloat(selectedOrder.currentLocation.lng)
                         : null;

            let centerCoords = null;
            if (gpsLat && gpsLng) {
                // 1. Tọa độ thực tế hiện tại
                centerCoords = [gpsLng, gpsLat];
            } else if (selectedOrder.locationHistory && selectedOrder.locationHistory.length > 0) {
                // 2. Lần cuối cùng phát tín hiệu
                const lastHistory = selectedOrder.locationHistory[selectedOrder.locationHistory.length - 1];
                centerCoords = [parseFloat(lastHistory.lng), parseFloat(lastHistory.lat)];
            } else if (selectedOrder.status === 'pending' || selectedOrder.status === 'received') {
                // 3. Chưa xuất phát
                centerCoords = await geocode(selectedOrder.sourceWarehouse || selectedOrder.exportWarehouse || 'Cảng Đình Vũ, Hải Phòng');
            } else {
                // 4. Nếu mất dấu hoàn toàn thì trỏ về đích đến
                centerCoords = await geocode(selectedOrder.destination);
            }

            if (centerCoords) {
                map.current.flyTo({ center: centerCoords, zoom: 14, speed: 1.5 })
            }
        }
        fly()
    }, [selectedOrder])

    const drawAllOnMap = async () => {
        if (!map.current || !map.current.isStyleLoaded()) {
            setTimeout(drawAllOnMap, 500)
            return
        }

        // Xóa markers cũ
        markersRef.current.forEach(m => m.remove())
        markersRef.current = []

        // Xóa route sources cũ
        routeLinesRef.current.forEach(id => {
            if (map.current.getLayer(id)) map.current.removeLayer(id)
            if (map.current.getLayer(id + '-border')) map.current.removeLayer(id + '-border')
            if (map.current.getSource(id)) map.current.removeSource(id)
        })
        routeLinesRef.current = []

        const activeOrders = filterStatus === 'all'
            ? orders.filter(o => o.status !== 'completed')
            : orders.filter(o => o.status === filterStatus)

        for (const order of activeOrders) {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending

            // ===== BƯỚC 1: LẤY TOẠ ĐỘ THẬT TỪ DATABASE =====
            const gpsLat = order.currentLat != null ? parseFloat(order.currentLat)
                : order.currentLocation?.lat != null ? parseFloat(order.currentLocation.lat)
                    : null;
            const gpsLng = order.currentLng != null ? parseFloat(order.currentLng)
                : order.currentLocation?.lng != null ? parseFloat(order.currentLocation.lng)
                    : null;

            // ===== BƯỚC 2: VẼ MARKER XE NGAY LẬP TỨC (Độc lập, không phụ thuộc vào Route) =====
            const elTruck = document.createElement('div')
            elTruck.style.cssText = `font-size: 28px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4)); transform: translate(-50%, -50%); z-index: 20; cursor: pointer;`
            elTruck.innerHTML = '🚛'
            elTruck.title = `Xe: ${order.vehiclePlate} | GPS: ${gpsLat ? gpsLat.toFixed(4) + ',' + gpsLng.toFixed(4) : 'Chưa có'}`

            const lastUpdate = order.lastLocationUpdate
                ? (order.lastLocationUpdate._seconds
                    ? new Date(order.lastLocationUpdate._seconds * 1000).toLocaleTimeString('vi-VN')
                    : new Date(order.lastLocationUpdate).toLocaleTimeString('vi-VN'))
                : 'Chưa có';

            const popupTruck = new trackasia.Popup({ offset: 20, closeButton: false })
                .setHTML(`
                    <div style="font-family:sans-serif; min-width:200px; padding:4px;">
                        <div style="font-weight:700; color:#e67e22; font-size:14px; margin-bottom:6px;">🚛 ${order.vehiclePlate || '?'}</div>
                        <div style="font-size:12px; margin:2px 0;"><b>👤</b> ${order.assignedDriverName || '-'}</div>
                        <div style="font-size:12px; margin:2px 0;"><b>📦</b> ${order.product || '-'} · ${Number(order.amount || 0).toLocaleString()}L</div>
                        <hr style="border:none;border-top:1px solid #eee; margin:6px 0;"/>
                        <div style="font-size:11px; color:${gpsLat ? '#27ae60' : '#e74c3c'};">
                            📍 GPS: ${gpsLat ? `${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}` : '<b>Chưa có tín hiệu</b>'}
                        </div>
                        <div style="font-size:11px; color:#999;">🕒 Cập nhật: ${lastUpdate}</div>
                    </div>
                `)

            // Đặt marker xe tại vị trí GPS thật nếu có, ngược lại fallback theo trạng thái
            const warehouseCoords = await geocode(order.sourceWarehouse || order.exportWarehouse || 'Cảng Đình Vũ, Hải Phòng')

            let truckPos = null;
            if (gpsLat && gpsLng) {
                // 1. Ưu tiên GPS thật từ điện thoại
                truckPos = [gpsLng, gpsLat];
            } else if (order.locationHistory && order.locationHistory.length > 0) {
                // 2. Lần cuối cùng phát tín hiệu
                const lastHistory = order.locationHistory[order.locationHistory.length - 1];
                truckPos = [parseFloat(lastHistory.lng), parseFloat(lastHistory.lat)];
            } else if (order.status === 'pending' || order.status === 'received') {
                // 3. Chưa xuất phát → xe đang ở KHO XUẤT
                truckPos = warehouseCoords;
            } else if (order.status === 'arrived' || order.status === 'unloading' || order.status === 'completed') {
                // 4. Nếu đã đến mà không có gps thì giả định ở trạm
                truckPos = await geocode(order.destination);
            }

            if (truckPos) {
                const truckMarker = new trackasia.Marker({ element: elTruck })
                    .setLngLat(truckPos)
                    .setPopup(popupTruck)
                    .addTo(map.current)
                markersRef.current.push(truckMarker)
            }

            // Marker điểm điểm kho xuất (🏭) nếu đang ở trạng thái chờ/di chuyển
            if (warehouseCoords && order.status !== 'arrived' && order.status !== 'unloading' && order.status !== 'completed') {
                const elWH = document.createElement('div')
                elWH.style.cssText = `font-size: 18px; transform: translate(-50%, -100%); cursor: default; opacity: 0.7;`
                elWH.innerHTML = '🏭'
                elWH.title = `Kho xuất: ${order.sourceWarehouse || order.exportWarehouse || ''}`
                const whMarker = new trackasia.Marker({ element: elWH })
                    .setLngLat(warehouseCoords)
                    .addTo(map.current)
                markersRef.current.push(whMarker)
            }

            // ===== BƯỚC 3: VẼ ĐIỂM ĐẾN & TUYẾN ĐƯỜNG (Trang trí, không ảnh hưởng vị trí xe) =====
            const destCoords = await geocode(order.destination)
            if (destCoords) {
                const el = document.createElement('div')
                el.style.cssText = `font-size: 28px; cursor: pointer; filter: drop-shadow(0 2px 4px ${cfg.color}); position: absolute; transform: translate(-50%, -100%);`
                el.textContent = cfg.emoji
                el.title = `→ ${order.destination}`
                const markerDest = new trackasia.Marker({ element: el })
                    .setLngLat(destCoords)
                    .addTo(map.current)
                el.addEventListener('click', () => { setSelectedOrder(order); map.current.flyTo({ center: destCoords, zoom: 13 }) })
                markersRef.current.push(markerDest)

                // Vẽ Route nếu px đang moving
                if (order.status === 'moving' || order.status === 'pending') {
                    const originPos = gpsLat && gpsLng ? [gpsLng, gpsLat] : await geocode(order.sourceWarehouse || 'Cảng Đình Vũ, Hải Phòng')
                    if (originPos) {
                        try {
                            const res = await fetch(`https://maps.vietmap.vn/api/route?api-version=1.1&apikey=${VIETMAP_SVC_KEY}&vehicle=car&point=${originPos[1]},${originPos[0]}&point=${destCoords[1]},${destCoords[0]}`)
                            const routeData = await res.json()
                            if (routeData.paths?.length > 0) {
                                const decodedCoords = decodePolyline(routeData.paths[0].points)
                                const sourceId = `route-${order.id}-${Date.now()}` // ID duy nhất mỗi lần vẽ
                                map.current.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: decodedCoords } } })
                                map.current.addLayer({ id: sourceId + '-bg', type: 'line', source: sourceId, paint: { 'line-color': cfg.color, 'line-width': 8, 'line-opacity': 0.12 } })
                                map.current.addLayer({ id: sourceId, type: 'line', source: sourceId, paint: { 'line-color': cfg.color, 'line-width': 3, 'line-dasharray': [2, 1] } })
                                routeLinesRef.current.push(sourceId)
                            }
                        } catch { }
                    }
                }
            }
        }
    }

    // Vẽ lại khi filter thay đổi
    useEffect(() => {
        if (orders.length > 0) drawAllOnMap()
    }, [filterStatus])

    const getStatusCounts = () => {
        const counts = {}
        orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })
        return counts
    }
    const counts = getStatusCounts()
    const activeCount = orders.filter(o => o.status !== 'completed').length

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: 0 }}>
            {/* Panel bên trái */}
            <div style={{
                width: '340px', minWidth: '300px', background: '#fff', overflowY: 'auto',
                borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #2c3e50, #3498db)', padding: '16px 18px', color: 'white' }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>🗺️ Giám sát Hành trình</h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: 11, opacity: 0.8 }}>
                        Cập nhật: {lastRefresh.toLocaleTimeString('vi-VN')}
                    </p>
                </div>

                {/* Thống kê nhanh */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px' }}>
                    <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f39c12' }}>{activeCount}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>🚚 Đang di chuyển</div>
                    </div>
                    <div style={{ background: '#d4edda', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#27ae60' }}>{counts.completed || 0}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>✅ Hoàn thành hôm nay</div>
                    </div>
                </div>

                {/* Bộ lọc trạng thái */}
                <div style={{ padding: '0 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button
                        onClick={() => setFilterStatus('all')}
                        style={{ padding: '5px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filterStatus === 'all' ? 'bold' : 'normal', background: filterStatus === 'all' ? '#2c3e50' : '#f0f0f0', color: filterStatus === 'all' ? 'white' : '#333' }}>
                        Đang chạy ({activeCount})
                    </button>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button key={key}
                            onClick={() => setFilterStatus(key)}
                            style={{ padding: '5px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filterStatus === key ? 'bold' : 'normal', background: filterStatus === key ? cfg.color : '#f0f0f0', color: filterStatus === key ? 'white' : '#333' }}>
                            {cfg.emoji} {counts[key] || 0}
                        </button>
                    ))}
                </div>

                {/* Điều khiển */}
                <div style={{ padding: '0 12px 12px', display: 'flex', gap: '8px' }}>
                    <button onClick={loadOrders} disabled={loading}
                        style={{ flex: 1, padding: '8px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 13 }}>
                        {loading ? '⏳ Đang tải...' : '🔄 Làm mới'}
                    </button>
                    <button
                        onClick={() => setAutoRefresh(v => !v)}
                        style={{ padding: '8px 12px', background: autoRefresh ? '#27ae60' : '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 12 }}>
                        {autoRefresh ? '⏱ Tự động' : '⏸ Dừng'}
                    </button>
                </div>

                {/* Danh sách các lệnh */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>⏳ Đang tải dữ liệu...</div>
                    ) : orders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                            <div style={{ fontSize: '36px' }}>🛣️</div>
                            <div style={{ marginTop: '8px' }}>Không có lệnh vận chuyển nào</div>
                        </div>
                    ) : (
                        (filterStatus === 'all' ? orders.filter(o => o.status !== 'completed') : orders.filter(o => o.status === filterStatus))
                            .map(order => {
                                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                                return (
                                    <div key={order.id}
                                        style={{
                                            padding: '12px', borderRadius: '8px', marginBottom: '8px',
                                            border: `2px solid ${selectedOrder?.id === order.id ? cfg.color : '#e0e0e0'}`,
                                            background: selectedOrder?.id === order.id ? '#f8f9fa' : 'white',
                                            transition: 'all 0.2s', overflow: 'hidden'
                                        }}>
                                        {/* Phần thu gọn (Luôn hiện) */}
                                        <div onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                                            style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: 14 }}>🚛 {order.vehiclePlate || '-'}</span>
                                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: '10px', background: cfg.bg, color: cfg.color, fontWeight: 'bold', border: `1px solid ${cfg.color}` }}>
                                                    {cfg.emoji} {cfg.label}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                                                <div>👤 {order.assignedDriverName || 'Chưa gán'}</div>
                                                <div>📍 {order.sourceWarehouse || 'Kho'} → {order.destination || 'Đại lý'}</div>
                                                <div>⛽ {order.product} — {Number(order.amount || 0).toLocaleString()}L</div>
                                            </div>

                                            {/* Thanh tiến trình ngang (Chỉ hiện khi chưa mở chi tiết) */}
                                            {selectedOrder?.id !== order.id && (() => {
                                                const steps = ['pending', 'received', 'moving', 'arrived', 'unloading', 'completed']
                                                const curr = steps.indexOf(order.status)
                                                return (
                                                    <div style={{ display: 'flex', gap: '3px', marginTop: '10px' }}>
                                                        {steps.map((s, i) => (
                                                            <div key={s} style={{
                                                                flex: 1, height: '4px', borderRadius: '2px',
                                                                background: i <= curr ? STATUS_CONFIG[s]?.color || '#27ae60' : '#e0e0e0'
                                                            }} title={STATUS_CONFIG[s]?.label} />
                                                        ))}
                                                    </div>
                                                )
                                            })()}
                                        </div>

                                        {/* Phần Chi tiết Timeline kiểu Shopee (Chỉ hiện khi Click) */}
                                        {selectedOrder?.id === order.id && (
                                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #ccc' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: 13, color: '#333', marginBottom: '12px' }}>📝 Thông tin hành trình</div>

                                                {/* Timeline dọc */}
                                                <div style={{ paddingLeft: '8px' }}>
                                                    {(order.statusHistory || [{ status: order.status, timestamp: order.updatedAt || order.createdAt }])
                                                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                                        .map((history, idx, arr) => {
                                                            const hCfg = STATUS_CONFIG[history.status] || STATUS_CONFIG.pending;
                                                            const isLast = idx === arr.length - 1;
                                                            const isFirst = idx === 0; // Trạng thái mới nhất

                                                            // Format thời gian
                                                            let timeStr = '';
                                                            try {
                                                                const d = new Date(history.timestamp?._seconds ? history.timestamp._seconds * 1000 : history.timestamp);
                                                                if (!isNaN(d)) {
                                                                    timeStr = d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
                                                                }
                                                            } catch (e) { }

                                                            return (
                                                                <div key={idx} style={{ display: 'flex', position: 'relative', paddingBottom: isLast ? '0' : '16px' }}>
                                                                    {/* Cột line và dot */}
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '12px', minWidth: '20px' }}>
                                                                        <div style={{
                                                                            width: isFirst ? '12px' : '8px',
                                                                            height: isFirst ? '12px' : '8px',
                                                                            borderRadius: '50%',
                                                                            background: isFirst ? hCfg.color : '#ccc',
                                                                            boxShadow: isFirst ? `0 0 0 3px ${hCfg.bg}` : 'none',
                                                                            zIndex: 2,
                                                                            marginTop: '4px'
                                                                        }} />
                                                                        {!isLast && <div style={{
                                                                            width: '2px',
                                                                            flex: 1,
                                                                            background: isFirst ? hCfg.color : '#e0e0e0',
                                                                            margin: '2px 0'
                                                                        }} />}
                                                                    </div>

                                                                    {/* Nội dung */}
                                                                    <div style={{ flex: 1, paddingTop: '1px' }}>
                                                                        <div style={{ fontSize: 13, fontWeight: isFirst ? 'bold' : 'normal', color: isFirst ? hCfg.color : '#666' }}>
                                                                            {hCfg.label}
                                                                        </div>
                                                                        {timeStr && <div style={{ fontSize: 11, color: '#999', marginTop: '2px' }}>{timeStr}</div>}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                    )}
                </div>
            </div>

            {/* Bản đồ */}
            <div style={{ flex: 1, position: 'relative' }}>
                <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

                {/* Legend */}
                <div style={{
                    position: 'absolute', bottom: '30px', right: '10px', background: 'white',
                    borderRadius: '8px', padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 12
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: 13 }}>Chú thích trạng thái</div>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span>{cfg.emoji}</span>
                            <span style={{ color: cfg.color, fontWeight: 'bold' }}>{cfg.label}</span>
                        </div>
                    ))}
                    <div style={{ marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '8px', color: '#999', fontSize: 11 }}>
                        <div>── Đường đi dự kiến (Powered by VietMap)</div>
                        <div>- - Đang di chuyển</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LiveTrackingMap
