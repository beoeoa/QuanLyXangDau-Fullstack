import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix lỗi icon mặc định của Leaflet trong React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

// Component con để tự động zoom bản đồ
function MapAutoFit({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [bounds, map]);
    return null;
}

// Component Input với chức năng Autocomplete từ Nominatim (OpenStreetMap)
const AutocompleteInput = ({ label, value, onChange, placeholder }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [show, setShow] = useState(false);
    const timeoutRef = useRef(null);

    const handleInput = (e) => {
        const val = e.target.value;
        onChange(val);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(async () => {
            if (val.length > 2) {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=vn&limit=5`);
                    const data = await res.json();
                    setSuggestions(data);
                    setShow(true);
                } catch (err) { console.error("Lỗi gợi ý:", err); }
            } else { setSuggestions([]); setShow(false); }
        }, 800);
    };

    return (
        <div style={{ position: 'relative', flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 'bold', display: 'block', marginBottom: 4 }}>{label}</label>
            <input type="text" value={value} onChange={handleInput} placeholder={placeholder}
                onFocus={() => { if (suggestions.length > 0) setShow(true); }}
                onBlur={() => setTimeout(() => setShow(false), 200)}
                style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', boxSizing: 'border-box', fontSize: 14 }} />
            {show && suggestions.length > 0 && (
                <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', listStyle: 'none', padding: 0, margin: 0, zIndex: 1000, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '0 0 6px 6px' }}>
                    {suggestions.map((s, i) => (
                        <li key={i} onClick={() => { onChange(s.display_name); setShow(false); }}
                            style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: 12 }}>
                            📍 {s.display_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

function RouteMap({ origin: initialOrigin, destination: initialDest }) {
    const [startPoint, setStartPoint] = useState(initialOrigin || '');
    const [endPoint, setEndPoint] = useState(initialDest || '');
    const [routeInfo, setRouteInfo] = useState({
        routeCoords: [], originCoords: null, destCoords: null,
        distance: null, duration: null,
        loading: false, error: null
    });

    const fetchRoute = async (start = startPoint, end = endPoint) => {
        if (!start || !end) return alert("Vui lòng nhập đủ Điểm đi và Điểm đến!");
        setRouteInfo(prev => ({ ...prev, loading: true, error: null }));
        try {
            // 1. Geocoding: Điểm Xuất Phát
            const resOrigin = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(start)}&countrycodes=vn`);
            const dataOrigin = await resOrigin.json();
            if (!dataOrigin?.length) throw new Error(`Không tìm thấy toạ độ: ${start}`);
            const originCoords = { lat: parseFloat(dataOrigin[0].lat), lng: parseFloat(dataOrigin[0].lon) };

            // 2. Geocoding: Điểm Đến
            const resDest = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(end)}&countrycodes=vn`);
            const dataDest = await resDest.json();
            if (!dataDest?.length) throw new Error(`Không tìm thấy toạ độ: ${end}`);
            const destCoords = { lat: parseFloat(dataDest[0].lat), lng: parseFloat(dataDest[0].lon) };

            // 3. Routing: Tìm đường đi tối ưu (OSRM miễn phí)
            const resRoute = await fetch(`https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`);
            const dataRoute = await resRoute.json();
            if (dataRoute.code !== 'Ok') throw new Error('Không thể tính toán đường đi.');

            const route = dataRoute.routes[0];
            const routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            const distanceKm = (route.distance / 1000).toFixed(1); // Mét → Km
            const durationMin = Math.ceil(route.duration / 60);     // Giây → Phút

            setRouteInfo({ routeCoords, originCoords, destCoords, distance: distanceKm, duration: durationMin, loading: false, error: null });
        } catch (err) {
            setRouteInfo(prev => ({ ...prev, loading: false, error: err.message }));
        }
    };

    // Tự động tìm đường lần đầu
    useEffect(() => {
        if (initialOrigin && initialDest) fetchRoute(initialOrigin, initialDest);
        // eslint-disable-next-line
    }, []);

    // Link Google Maps Direction (miễn phí, mở trên điện thoại/web)
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startPoint)}&destination=${encodeURIComponent(endPoint)}&travelmode=driving`;

    return (
        <div style={{ marginTop: 10, background: '#f4f6f9', padding: 15, borderRadius: 8, border: '1px solid #dcdde1' }}>
            <h4 style={{ marginTop: 0, marginBottom: 12, color: '#2c3e50' }}>📍 Tìm Đường & Tối Ưu Lộ Trình</h4>

            {/* Form nhập */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AutocompleteInput label="🟢 Điểm Xuất Phát" value={startPoint} onChange={setStartPoint} placeholder="Ví dụ: Cảng Đình Vũ, Hải Phòng" />
                <AutocompleteInput label="🔴 Điểm Đến" value={endPoint} onChange={setEndPoint} placeholder="Ví dụ: Đại lý Xăng dầu Vĩnh Niệm" />
                <button onClick={() => fetchRoute(startPoint, endPoint)} style={{ width: '100%', padding: 12, background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}>
                    🚀 TÌM ĐƯỜNG ĐI TỐI ƯU
                </button>
            </div>

            {/* Trạng thái */}
            {routeInfo.loading && <div style={{ padding: 15, textAlign: 'center', background: '#fff', borderRadius: 8, marginTop: 12, color: '#7f8c8d' }}>⏳ Đang tính toán lộ trình...</div>}
            {routeInfo.error && <div style={{ padding: 15, color: '#c0392b', background: '#fadbd8', borderRadius: 8, marginTop: 12 }}>❌ {routeInfo.error}</div>}

            {/* Thông tin khoảng cách + thời gian */}
            {routeInfo.distance && routeInfo.duration && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                    <div style={{ background: '#eaf2f8', padding: 14, borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#2980b9' }}>{routeInfo.distance} km</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Quãng đường</div>
                    </div>
                    <div style={{ background: '#fef9e7', padding: 14, borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f39c12' }}>~{routeInfo.duration} phút</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Thời gian ước tính</div>
                    </div>
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{ background: '#34495e', padding: 14, borderRadius: 8, textAlign: 'center', textDecoration: 'none', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 'bold' }}>🗺️ Mở</div>
                        <div style={{ fontSize: 11 }}>Google Maps</div>
                    </a>
                </div>
            )}

            {/* Bản đồ */}
            <div style={{ height: 350, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #ddd', marginTop: 12 }}>
                <MapContainer center={[20.8449, 106.6881]} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {routeInfo.originCoords && (
                        <Marker position={[routeInfo.originCoords.lat, routeInfo.originCoords.lng]}>
                            <Popup>🟢 <b>Xuất phát:</b><br />{startPoint}</Popup>
                        </Marker>
                    )}
                    {routeInfo.destCoords && (
                        <Marker position={[routeInfo.destCoords.lat, routeInfo.destCoords.lng]}>
                            <Popup>🔴 <b>Đích đến:</b><br />{endPoint}</Popup>
                        </Marker>
                    )}
                    {routeInfo.routeCoords.length > 0 && (
                        <>
                            <Polyline positions={routeInfo.routeCoords} color="#3498db" weight={6} opacity={0.7} />
                            <MapAutoFit bounds={routeInfo.routeCoords} />
                        </>
                    )}
                </MapContainer>
            </div>
        </div>
    );
}

export default RouteMap;
