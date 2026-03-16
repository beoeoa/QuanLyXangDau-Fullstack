import React, { useState, useEffect, useRef } from 'react';
import trackasia from 'trackasia-gl';
import 'trackasia-gl/dist/trackasia-gl.css';
import { saveRoute, getUserRoutes, deleteRoute as deleteRouteApi, getRouteById } from '../../services/routeService';
import { auth } from '../../firebase';

const TRACKASIA_API_KEY = '9cb71773659040a8af8b9d0b56ed01e032';
const STYLE_URL = `https://maps.track-asia.com/styles/v1/streets.json?key=${TRACKASIA_API_KEY}`;

// ========== TABS ==========
const TABS = { SEARCH: 'search', TRACKING: 'tracking', HISTORY: 'history', SHARE: 'share' };

const RouteMap = ({ origin: initialOrigin, destination: initialDest }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const startMarkerRef = useRef(null);
    const endMarkerRef = useRef(null);
    const trackingMarkersRef = useRef([]);
    const trackingLineRef = useRef(null);
    const gpsWatchRef = useRef(null);

    const [activeTab, setActiveTab] = useState(TABS.SEARCH);
    const [startPoint, setStartPoint] = useState({ name: initialOrigin || '', coords: null });
    const [endPoint, setEndPoint] = useState({ name: initialDest || '', coords: null });
    const [routeInfo, setRouteInfo] = useState({ distance: '', duration: '' });
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [searchResults, setSearchResults] = useState({ start: [], end: [] });
    const [activeSearch, setActiveSearch] = useState(null);
    const [loading, setLoading] = useState(false);
    const searchTimer = useRef(null);

    // Tracking state
    const [isTracking, setIsTracking] = useState(false);
    const [trackingPoints, setTrackingPoints] = useState([]);
    const [trackingStartTime, setTrackingStartTime] = useState(null);
    const [trackingElapsed, setTrackingElapsed] = useState(0);
    const [trackingDistance, setTrackingDistance] = useState(0);
    const trackingIntervalRef = useRef(null);

    // History state
    const [savedRoutes, setSavedRoutes] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Share / view shared state
    const [shareLink, setShareLink] = useState('');
    const [shareRouteId, setShareRouteId] = useState('');
    const [viewingShared, setViewingShared] = useState(null);

    // Save modal
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [routeName, setRouteName] = useState('');
    const [routeNote, setRouteNote] = useState('');

    // Toast notification
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // ========== GEOCODING ==========
    const geocode = async (query) => {
        if (!query) return null;
        try {
            const res = await fetch(`https://maps.track-asia.com/api/v1/autocomplete?text=${encodeURIComponent(query)}&key=${TRACKASIA_API_KEY}`);
            const data = await res.json();
            return data.features?.[0] || null;
        } catch (err) {
            console.error('Geocode error:', err);
            return null;
        }
    };

    // ========== SEARCH ==========
    const handleSearch = (query, type) => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!query || query.length < 2) {
            setSearchResults(prev => ({ ...prev, [type]: [] }));
            return;
        }
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://maps.track-asia.com/api/v1/autocomplete?text=${encodeURIComponent(query)}&key=${TRACKASIA_API_KEY}`);
                const data = await res.json();
                if (data.features) setSearchResults(prev => ({ ...prev, [type]: data.features }));
            } catch (err) {
                console.error('Search error:', err);
            }
        }, 300);
    };

    const selectResult = (feature, type) => {
        const coords = feature.geometry.coordinates;
        const name = feature.properties.label;
        if (type === 'start') setStartPoint({ name, coords });
        else setEndPoint({ name, coords });
        setSearchResults(prev => ({ ...prev, [type]: [] }));
        setActiveSearch(null);
        if (map.current) map.current.flyTo({ center: coords, zoom: 14 });
        updateMarker(coords, type);
    };

    const updateMarker = (coords, type) => {
        if (!map.current) return;
        if (type === 'start') {
            if (startMarkerRef.current) startMarkerRef.current.remove();
            const el = createMarkerEl('🟢', '#34a853');
            startMarkerRef.current = new trackasia.Marker({ element: el })
                .setLngLat(coords)
                .setPopup(new trackasia.Popup({ offset: 25 }).setText('Điểm đi'))
                .addTo(map.current);
        } else {
            if (endMarkerRef.current) endMarkerRef.current.remove();
            const el = createMarkerEl('🔴', '#d93025');
            endMarkerRef.current = new trackasia.Marker({ element: el })
                .setLngLat(coords)
                .setPopup(new trackasia.Popup({ offset: 25 }).setText('Điểm đến'))
                .addTo(map.current);
        }
    };

    const createMarkerEl = (emoji, shadowColor) => {
        const el = document.createElement('div');
        // Add absolute positioning and translation to center the bottom of the emoji on the exact coordinate
        el.style.cssText = `font-size: 28px; cursor: pointer; filter: drop-shadow(0 2px 4px ${shadowColor}); transition: transform 0.2s; position: absolute; transform: translate(-50%, -100%);`;
        el.textContent = emoji;
        el.onmouseenter = () => el.style.transform = 'translate(-50%, -100%) scale(1.3)';
        el.onmouseleave = () => el.style.transform = 'translate(-50%, -100%) scale(1)';
        return el;
    };

    // ========== ROUTING ==========
    const handleRouteSearch = async (sCoords, eCoords) => {
        const sc = sCoords || startPoint.coords;
        const ec = eCoords || endPoint.coords;
        if (!sc || !ec) { showToast('Vui lòng chọn điểm đi và điểm đến!', 'error'); return; }

        setLoading(true);
        const coordsStr = `${sc[0]},${sc[1]};${ec[0]},${ec[1]}`;
        try {
            const res = await fetch(`https://maps.track-asia.com/route/v1/car/${coordsStr}.json?key=${TRACKASIA_API_KEY}&overview=full&geometries=geojson`);
            const data = await res.json();
            if (data.routes?.length > 0) {
                const route = data.routes[0];
                const distKm = (route.distance / 1000).toFixed(1);
                const durMin = Math.round(route.duration / 60);
                setRouteInfo({ distance: `${distKm} km`, duration: `${durMin} phút` });
                setRouteGeometry(route.geometry);
                drawRoute(route.geometry);
                showToast(`Tìm thấy tuyến đường: ${distKm}km - ${durMin} phút`);
            } else {
                showToast('Không tìm thấy tuyến đường!', 'error');
            }
        } catch (err) {
            showToast('Lỗi tìm đường. Thử lại!', 'error');
        } finally {
            setLoading(false);
        }
    };

    const drawRoute = (geometry) => {
        if (!map.current) return;
        const geojson = { type: 'Feature', geometry };
        if (map.current.getSource('route')) {
            map.current.getSource('route').setData(geojson);
        } else {
            map.current.addSource('route', { type: 'geojson', data: geojson });
            map.current.addLayer({
                id: 'route-border', type: 'line', source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#0b57d0', 'line-width': 10, 'line-opacity': 0.3 }
            });
            map.current.addLayer({
                id: 'route', type: 'line', source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#1a73e8', 'line-width': 5, 'line-opacity': 0.9 }
            });
        }
        const bounds = geometry.coordinates.reduce(
            (acc, c) => acc.extend(c),
            new trackasia.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0])
        );
        map.current.fitBounds(bounds, { padding: 80 });
    };

    // ========== GPS TRACKING ==========
    const haversine = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const startTracking = () => {
        if (!navigator.geolocation) { showToast('Trình duyệt không hỗ trợ GPS!', 'error'); return; }
        setIsTracking(true);
        setTrackingPoints([]);
        setTrackingDistance(0);
        setTrackingStartTime(Date.now());
        setTrackingElapsed(0);

        // Clear old tracking visuals
        trackingMarkersRef.current.forEach(m => m.remove());
        trackingMarkersRef.current = [];

        trackingIntervalRef.current = setInterval(() => {
            setTrackingElapsed(prev => prev + 1);
        }, 1000);

        gpsWatchRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, speed, accuracy } = pos.coords;
                const time = new Date().toLocaleTimeString();
                const newPt = { lat: latitude, lng: longitude, speed: speed || 0, accuracy, time, ts: Date.now() };

                setTrackingPoints(prev => {
                    const updated = [...prev, newPt];
                    // Calculate distance
                    if (updated.length >= 2) {
                        const last = updated[updated.length - 2];
                        const d = haversine(last.lat, last.lng, newPt.lat, newPt.lng);
                        setTrackingDistance(prevD => prevD + d);
                    }
                    // Map Matching (Snap to road)
                    if (map.current && updated.length >= 2) {
                        // Debounce matching API to avoid rate limits (every 3 seconds or min 3 points)
                        if (updated.length % 3 === 0) {
                            fetchMatchedRoute(updated);
                        } else if (!map.current.getSource('matched-tracking-line')) {
                            // Fallback to straight line until we have enough points for matching
                            const coords = updated.map(p => [p.lng, p.lat]);
                            drawMatchedLine(coords);
                        }
                    }
                    return updated;
                });

                // Update driver position marker
                if (map.current) {
                    // Remove old position marker
                    if (trackingMarkersRef.current.length > 0) {
                        trackingMarkersRef.current[trackingMarkersRef.current.length - 1]?.remove();
                    }
                    const el = document.createElement('div');
                    el.innerHTML = '🚗';
                    el.style.cssText = 'font-size: 32px; filter: drop-shadow(0 2px 6px rgba(0,200,83,0.5)); animation: pulse 1.5s infinite;';
                    const marker = new trackasia.Marker({ element: el })
                        .setLngLat([longitude, latitude])
                        .addTo(map.current);
                    trackingMarkersRef.current.push(marker);
                    map.current.easeTo({ center: [longitude, latitude], zoom: 16, duration: 800 });
                }
            },
            (err) => { showToast('Lỗi GPS: ' + err.message, 'error'); },
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        );
        showToast('🛰️ Bắt đầu theo dõi GPS...');
    };

    const fetchMatchedRoute = async (points) => {
        // TrackAsia Matching API requires mapbox / osrm format: lng,lat;lng,lat
        // Max 100 coordinates per request, so we take the last 50 points to be safe
        const recentPoints = points.slice(-50);
        if (recentPoints.length < 2) return;

        const coordsStr = recentPoints.map(p => `${p.lng},${p.lat}`).join(';');
        // Radius indicates the GPS accuracy (meters). Snaps points within this radius.
        const radiusStr = recentPoints.map(() => '30').join(';'); 

        try {
            const res = await fetch(`https://maps.track-asia.com/match/v1/car/${coordsStr}.json?key=${TRACKASIA_API_KEY}&geometries=geojson&radiuses=${radiusStr}&overview=full`);
            const data = await res.json();
            
            if (data.matchings && data.matchings.length > 0) {
                // Combine all matchings geometries if there are multiple segments
                let allMatchedCoords = [];
                data.matchings.forEach(m => {
                    if (m.geometry && m.geometry.coordinates) {
                        allMatchedCoords = allMatchedCoords.concat(m.geometry.coordinates);
                    }
                });
                if (allMatchedCoords.length > 0) {
                    drawMatchedLine(allMatchedCoords);
                }
            }
        } catch (err) {
            console.warn('Map matching fallback:', err);
            // Fallback to straight lines if matching fails
            const coords = points.map(p => [p.lng, p.lat]);
            drawMatchedLine(coords);
        }
    };

    const drawMatchedLine = (coords) => {
        if (!map.current) return;
        const lineGeojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };
        if (map.current.getSource('matched-tracking-line')) {
            map.current.getSource('matched-tracking-line').setData(lineGeojson);
        } else {
            map.current.addSource('matched-tracking-line', { type: 'geojson', data: lineGeojson });
            map.current.addLayer({
                id: 'matched-tracking-line-border', type: 'line', source: 'matched-tracking-line',
                paint: { 'line-color': '#00c853', 'line-width': 8, 'line-opacity': 0.25 }
            });
            map.current.addLayer({
                id: 'matched-tracking-line', type: 'line', source: 'matched-tracking-line',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': '#00c853', 'line-width': 4, 'line-opacity': 0.85 }
            });
        }
    };

    const stopTracking = () => {
        setIsTracking(false);
        if (gpsWatchRef.current) navigator.geolocation.clearWatch(gpsWatchRef.current);
        if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
        showToast('⏹️ Đã dừng theo dõi');
    };

    const recordCurrentPoint = () => {
        if (!map.current) return;
        const center = map.current.getCenter();
        const newPt = { lat: center.lat, lng: center.lng, time: new Date().toLocaleTimeString(), ts: Date.now() };
        setTrackingPoints(prev => [...prev, newPt]);
        const el = document.createElement('div');
        el.innerHTML = '📍';
        el.style.cssText = 'font-size: 22px; cursor: pointer;';
        new trackasia.Marker({ element: el })
            .setLngLat([newPt.lng, newPt.lat])
            .setPopup(new trackasia.Popup().setHTML(`<b>Điểm ghi nhận</b><br/>${newPt.time}`))
            .addTo(map.current);
        showToast(`📍 Đã ghi điểm: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
    };

    // ========== SAVE ROUTE ==========
    const openSaveModal = () => {
        if (!startPoint.name && trackingPoints.length === 0) {
            showToast('Không có dữ liệu để lưu!', 'error');
            return;
        }
        setRouteName(startPoint.name && endPoint.name ? `${startPoint.name} → ${endPoint.name}` : `Hành trình ${new Date().toLocaleDateString('vi-VN')}`);
        setShowSaveModal(true);
    };

    const handleSaveRoute = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) { showToast('Vui lòng đăng nhập!', 'error'); return; }

        const payload = {
            userId,
            name: routeName || 'Chưa đặt tên',
            note: routeNote,
            origin: startPoint.name || '',
            destination: endPoint.name || '',
            originCoords: startPoint.coords,
            destinationCoords: endPoint.coords,
            distance: routeInfo.distance || `${trackingDistance.toFixed(1)} km`,
            duration: routeInfo.duration || formatElapsed(trackingElapsed),
            points: trackingPoints,
            routeGeometry: routeGeometry,
            type: isTracking || trackingPoints.length > 0 ? 'tracking' : 'search',
            timestamp: new Date().toISOString()
        };

        try {
            const res = await saveRoute(payload);
            if (res.success || res.id) {
                showToast('✅ Đã lưu lộ trình thành công!');
                setShowSaveModal(false);
                setRouteName('');
                setRouteNote('');
                // Auto-generate share link
                if (res.id) setShareLink(`${window.location.origin}/share-route/${res.id}`);
            } else {
                showToast('Lỗi lưu: ' + (res.message || ''), 'error');
            }
        } catch (err) {
            showToast('Lỗi: ' + err.message, 'error');
        }
    };

    // ========== LOAD HISTORY ==========
    const loadHistory = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) { showToast('Vui lòng đăng nhập!', 'error'); return; }
        setLoadingHistory(true);
        try {
            const routes = await getUserRoutes(userId);
            setSavedRoutes(Array.isArray(routes) ? routes : []);
        } catch { setSavedRoutes([]); }
        finally { setLoadingHistory(false); }
    };

    const viewSavedRoute = (route) => {
        // Restore route on map
        if (route.originCoords) { setStartPoint({ name: route.origin, coords: route.originCoords }); updateMarker(route.originCoords, 'start'); }
        if (route.destinationCoords) { setEndPoint({ name: route.destination, coords: route.destinationCoords }); updateMarker(route.destinationCoords, 'end'); }
        if (route.routeGeometry) {
            drawRoute(route.routeGeometry);
            setRouteInfo({ distance: route.distance, duration: route.duration });
        }
        // Draw tracking points if any
        if (route.points?.length > 0 && map.current) {
            route.points.forEach(p => {
                const el = document.createElement('div');
                el.innerHTML = '📍';
                el.style.cssText = 'font-size: 16px;';
                new trackasia.Marker({ element: el })
                    .setLngLat([p.lng, p.lat])
                    .addTo(map.current);
            });
            if (route.points.length >= 2) {
                const coords = route.points.map(p => [p.lng, p.lat]);
                const lineGeojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };
                if (map.current.getSource('matched-tracking-line')) {
                    map.current.getSource('matched-tracking-line').setData(lineGeojson);
                } else {
                    map.current.addSource('matched-tracking-line', { type: 'geojson', data: lineGeojson });
                    map.current.addLayer({
                        id: 'matched-tracking-line', type: 'line', source: 'matched-tracking-line',
                        paint: { 'line-color': '#00c853', 'line-width': 4 }
                    });
                }
            }
        }
        setActiveTab(TABS.SEARCH);
        showToast('Đã hiển thị lộ trình đã lưu');
    };

    const handleDeleteRoute = async (routeId) => {
        if (!window.confirm('Xóa lộ trình này?')) return;
        try {
            await deleteRouteApi(routeId);
            setSavedRoutes(prev => prev.filter(r => r.id !== routeId));
            showToast('Đã xóa lộ trình');
        } catch (err) { showToast('Lỗi xóa', 'error'); }
    };

    // ========== SHARE ==========
    const handleShareRoute = async () => {
        if (!startPoint.name && trackingPoints.length === 0) {
            showToast('Không có dữ liệu để chia sẻ!', 'error'); return;
        }
        // Save first, then share
        const userId = auth.currentUser?.uid || 'guest';
        const payload = {
            userId,
            name: startPoint.name && endPoint.name ? `${startPoint.name} → ${endPoint.name}` : 'Chia sẻ hành trình',
            origin: startPoint.name, destination: endPoint.name,
            originCoords: startPoint.coords, destinationCoords: endPoint.coords,
            distance: routeInfo.distance, duration: routeInfo.duration,
            points: trackingPoints, routeGeometry, type: 'shared',
            timestamp: new Date().toISOString()
        };
        try {
            const res = await saveRoute(payload);
            if (res.id) {
                const link = `${window.location.origin}/share-route/${res.id}`;
                setShareLink(link);
                try { await navigator.clipboard.writeText(link); } catch {}
                showToast('🔗 Link chia sẻ đã sao chép!');
            }
        } catch (err) { showToast('Lỗi chia sẻ', 'error'); }
    };

    const loadSharedRoute = async () => {
        if (!shareRouteId.trim()) return;
        try {
            const route = await getRouteById(shareRouteId.trim());
            if (route) {
                setViewingShared(route);
                viewSavedRoute(route);
                showToast('Đã tải lộ trình chia sẻ!');
            } else { showToast('Không tìm thấy lộ trình!', 'error'); }
        } catch { showToast('Lỗi tải lộ trình', 'error'); }
    };

    // ========== FORMAT HELPERS ==========
    const formatElapsed = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const formatDate = (ts) => {
        if (!ts) return '';
        try {
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    // ========== INIT MAP ==========
    useEffect(() => {
        if (map.current) return;
        map.current = new trackasia.Map({
            container: mapContainer.current,
            style: STYLE_URL,
            center: [105.8542, 21.0285],
            zoom: 12
        });
        map.current.addControl(new trackasia.NavigationControl(), 'top-right');
        map.current.addControl(new trackasia.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true
        }), 'top-right');

        map.current.on('load', async () => {
            if (initialOrigin) {
                const feat = await geocode(initialOrigin);
                if (feat) { setStartPoint({ name: feat.properties.label, coords: feat.geometry.coordinates }); updateMarker(feat.geometry.coordinates, 'start'); }
            }
            if (initialDest) {
                const feat = await geocode(initialDest);
                if (feat) { setEndPoint({ name: feat.properties.label, coords: feat.geometry.coordinates }); updateMarker(feat.geometry.coordinates, 'end'); }
            }
        });

        map.current.on('error', (e) => console.warn('Map error:', e));
        return () => { if (map.current) map.current.remove(); map.current = null; };
    }, []);

    // Auto-route when both points are set via props
    useEffect(() => {
        if (startPoint.coords && endPoint.coords && !routeInfo.distance) {
            handleRouteSearch(startPoint.coords, endPoint.coords);
        }
    }, [startPoint.coords, endPoint.coords]);

    // Load history when tab changes
    useEffect(() => {
        if (activeTab === TABS.HISTORY) loadHistory();
    }, [activeTab]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (gpsWatchRef.current) navigator.geolocation.clearWatch(gpsWatchRef.current);
            if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
        };
    }, []);

    // ========== RENDER ==========
    return (
        <div style={{ display: 'flex', height: '90vh', backgroundColor: '#f0f2f5', position: 'relative' }}>
            {/* ===== SIDE PANEL ===== */}
            <div style={panelStyle}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #1a73e8, #0b57d0)', padding: '16px 18px', borderRadius: '12px 12px 0 0', margin: '-18px -18px 16px -18px' }}>
                    <h2 style={{ color: 'white', fontSize: 17, margin: 0, fontWeight: 700 }}>🗺️ Bản đồ Tài xế</h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: '4px 0 0 0' }}>TrackAsia Maps — Quản lý hành trình</p>
                </div>

                {/* Tab Bar */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f5f5f5', borderRadius: 8, padding: 3 }}>
                    {[
                        { key: TABS.SEARCH, icon: '🔍', label: 'Tìm đường' },
                        { key: TABS.TRACKING, icon: '🛰️', label: 'GPS' },
                        { key: TABS.HISTORY, icon: '📋', label: 'Lịch sử' },
                        { key: TABS.SHARE, icon: '🔗', label: 'Chia sẻ' },
                    ].map(tab => (
                        <button key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                flex: 1, padding: '8px 4px', border: 'none', borderRadius: 6, cursor: 'pointer',
                                fontSize: 11, fontWeight: activeTab === tab.key ? 700 : 400, transition: 'all 0.2s',
                                backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
                                color: activeTab === tab.key ? '#1a73e8' : '#5f6368',
                                boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none'
                            }}>
                            {tab.icon}<br />{tab.label}
                        </button>
                    ))}
                </div>

                {/* ===== TAB: SEARCH ===== */}
                {activeTab === TABS.SEARCH && (
                    <div>
                        {/* Start */}
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                            <div style={{ position: 'absolute', left: 12, top: 12, fontSize: 16 }}>🟢</div>
                            <input style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Nhập điểm đi..."
                                value={startPoint.name}
                                onChange={e => { setStartPoint({ ...startPoint, name: e.target.value, coords: null }); handleSearch(e.target.value, 'start'); setActiveSearch('start'); }}
                                onFocus={() => setActiveSearch('start')} />
                            {activeSearch === 'start' && searchResults.start.length > 0 && (
                                <div style={dropdownStyle}>
                                    {searchResults.start.map((f, i) => (
                                        <div key={i} style={resultItemStyle} onClick={() => selectResult(f, 'start')}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e8f0fe'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                                            <span style={{ marginRight: 8 }}>📍</span>
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: 13 }}>{f.properties.name}</div>
                                                <div style={{ fontSize: 11, color: '#70757a' }}>{f.properties.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Swap button */}
                        <div style={{ textAlign: 'center', margin: '-4px 0' }}>
                            <button onClick={() => { const tmp = { ...startPoint }; setStartPoint({ ...endPoint }); setEndPoint(tmp); }}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, padding: 4 }} title="Đổi chiều">🔄</button>
                        </div>

                        {/* End */}
                        <div style={{ position: 'relative', marginBottom: 14 }}>
                            <div style={{ position: 'absolute', left: 12, top: 12, fontSize: 16 }}>🔴</div>
                            <input style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Nhập điểm đến..."
                                value={endPoint.name}
                                onChange={e => { setEndPoint({ ...endPoint, name: e.target.value, coords: null }); handleSearch(e.target.value, 'end'); setActiveSearch('end'); }}
                                onFocus={() => setActiveSearch('end')} />
                            {activeSearch === 'end' && searchResults.end.length > 0 && (
                                <div style={dropdownStyle}>
                                    {searchResults.end.map((f, i) => (
                                        <div key={i} style={resultItemStyle} onClick={() => selectResult(f, 'end')}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e8f0fe'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                                            <span style={{ marginRight: 8 }}>📍</span>
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: 13 }}>{f.properties.name}</div>
                                                <div style={{ fontSize: 11, color: '#70757a' }}>{f.properties.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={() => handleRouteSearch()} style={primaryBtn} disabled={loading}>
                            {loading ? '⏳ Đang tìm đường...' : '🚗 TÌM ĐƯỜNG ĐI'}
                        </button>

                        {/* Route Info Card */}
                        {routeInfo.distance && (
                            <div style={routeInfoCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: '#1a73e8' }}>⏱ {routeInfo.duration}</div>
                                        <div style={{ fontSize: 14, color: '#5f6368', marginTop: 2 }}>📏 {routeInfo.distance}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <button onClick={openSaveModal} style={miniBtn}>💾 Lưu</button>
                                        <button onClick={handleShareRoute} style={miniBtn}>🔗 Chia sẻ</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== TAB: GPS TRACKING ===== */}
                {activeTab === TABS.TRACKING && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            {!isTracking ? (
                                <button onClick={startTracking} style={{ ...primaryBtn, background: 'linear-gradient(135deg, #00c853, #00e676)' }}>
                                    🛰️ BẮT ĐẦU THEO DÕI GPS
                                </button>
                            ) : (
                                <button onClick={stopTracking} style={{ ...primaryBtn, background: 'linear-gradient(135deg, #d93025, #ea4335)' }}>
                                    ⏹️ DỪNG THEO DÕI
                                </button>
                            )}
                        </div>

                        {/* Tracking Stats */}
                        {(isTracking || trackingPoints.length > 0) && (
                            <div style={trackingStatsCard}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div style={statBox}>
                                        <div style={{ fontSize: 11, color: '#70757a' }}>⏱ Thời gian</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#1a73e8' }}>{formatElapsed(trackingElapsed)}</div>
                                    </div>
                                    <div style={statBox}>
                                        <div style={{ fontSize: 11, color: '#70757a' }}>📏 Quãng đường</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#00c853' }}>{trackingDistance.toFixed(1)} km</div>
                                    </div>
                                    <div style={statBox}>
                                        <div style={{ fontSize: 11, color: '#70757a' }}>📍 Điểm GPS</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#ff6d00' }}>{trackingPoints.length}</div>
                                    </div>
                                    <div style={statBox}>
                                        <div style={{ fontSize: 11, color: '#70757a' }}>🚗 Tốc độ TB</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>
                                            {trackingElapsed > 0 ? ((trackingDistance / trackingElapsed) * 3600).toFixed(0) : 0} km/h
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button onClick={recordCurrentPoint} style={{ ...secondaryBtn, flex: 1 }}>📍 Ghi điểm</button>
                            <button onClick={openSaveModal} style={{ ...secondaryBtn, flex: 1 }}>💾 Lưu hành trình</button>
                        </div>

                        {/* Tracking Points List */}
                        {trackingPoints.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <div style={{ fontWeight: 600, fontSize: 12, color: '#3c4043', paddingBottom: 6, borderBottom: '1px solid #eee' }}>
                                    📌 Các điểm đã ghi ({trackingPoints.length})
                                </div>
                                <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 6 }}>
                                    {trackingPoints.slice(-20).reverse().map((p, i) => (
                                        <div key={p.ts || i} style={{ fontSize: 11, padding: '4px 0', color: '#5f6368', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>📍 {p.lat.toFixed(4)}, {p.lng.toFixed(4)}</span>
                                            <span style={{ color: '#9aa0a6' }}>{p.time}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== TAB: HISTORY ===== */}
                {activeTab === TABS.HISTORY && (
                    <div>
                        <button onClick={loadHistory} style={{ ...secondaryBtn, width: '100%', marginBottom: 12 }}>
                            {loadingHistory ? '⏳ Đang tải...' : '🔄 Tải lại lịch sử'}
                        </button>

                        {savedRoutes.length === 0 && !loadingHistory && (
                            <div style={{ textAlign: 'center', padding: 30, color: '#9aa0a6' }}>
                                <div style={{ fontSize: 40 }}>📭</div>
                                <div style={{ marginTop: 8, fontSize: 13 }}>Chưa có lộ trình nào được lưu</div>
                            </div>
                        )}

                        <div style={{ maxHeight: 'calc(85vh - 250px)', overflowY: 'auto' }}>
                            {savedRoutes.map(route => (
                                <div key={route.id} style={historyCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#202124' }}>
                                                {route.type === 'tracking' ? '🛰️' : '🗺️'} {route.name || `${route.origin} → ${route.destination}`}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#5f6368', marginTop: 4 }}>
                                                {route.origin && <span>📍 {route.origin}</span>}
                                                {route.destination && <span> → {route.destination}</span>}
                                            </div>
                                            <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11 }}>
                                                {route.distance && <span style={{ color: '#1a73e8', fontWeight: 600 }}>📏 {route.distance}</span>}
                                                {route.duration && <span style={{ color: '#00c853', fontWeight: 600 }}>⏱ {route.duration}</span>}
                                                {route.points?.length > 0 && <span style={{ color: '#ff6d00' }}>📍 {route.points.length} điểm</span>}
                                            </div>
                                            <div style={{ fontSize: 10, color: '#9aa0a6', marginTop: 4 }}>{formatDate(route.createdAt || route.timestamp)}</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                                            <button onClick={() => viewSavedRoute(route)} style={iconBtn} title="Xem">👁️</button>
                                            <button onClick={() => { const link = `${window.location.origin}/share-route/${route.id}`; navigator.clipboard.writeText(link); showToast('Đã sao chép link!'); }} style={iconBtn} title="Chia sẻ">🔗</button>
                                            <button onClick={() => handleDeleteRoute(route.id)} style={{ ...iconBtn, color: '#d93025' }} title="Xóa">🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ===== TAB: SHARE ===== */}
                {activeTab === TABS.SHARE && (
                    <div>
                        {/* Share current */}
                        <div style={{ marginBottom: 20 }}>
                            <h3 style={{ fontSize: 14, color: '#202124', margin: '0 0 10px 0' }}>📤 Chia sẻ hành trình hiện tại</h3>
                            <button onClick={handleShareRoute} style={{ ...primaryBtn, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                                🔗 TẠO LINK CHIA SẺ
                            </button>
                            {shareLink && (
                                <div style={{ marginTop: 10, padding: 10, backgroundColor: '#f3e8ff', borderRadius: 8, fontSize: 12 }}>
                                    <div style={{ fontWeight: 600, color: '#6d28d9', marginBottom: 4 }}>Link chia sẻ:</div>
                                    <div style={{ wordBreak: 'break-all', color: '#5f6368', marginBottom: 6 }}>{shareLink}</div>
                                    <button onClick={() => { navigator.clipboard.writeText(shareLink); showToast('Đã sao chép!'); }}
                                        style={{ ...secondaryBtn, width: '100%', fontSize: 12 }}>📋 Sao chép link</button>
                                </div>
                            )}
                        </div>

                        {/* View shared */}
                        <div>
                            <h3 style={{ fontSize: 14, color: '#202124', margin: '0 0 10px 0' }}>📥 Xem lộ trình được chia sẻ</h3>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input style={{ ...inputStyle, flex: 1 }} placeholder="Nhập ID lộ trình..."
                                    value={shareRouteId} onChange={e => setShareRouteId(e.target.value)} />
                                <button onClick={loadSharedRoute} style={{ ...secondaryBtn, padding: '8px 16px' }}>Xem</button>
                            </div>
                            {viewingShared && (
                                <div style={{ marginTop: 10, padding: 10, backgroundColor: '#e8f5e9', borderRadius: 8, fontSize: 12 }}>
                                    <div style={{ fontWeight: 600, color: '#00c853' }}>✅ {viewingShared.name}</div>
                                    <div style={{ color: '#5f6368', marginTop: 4 }}>{viewingShared.origin} → {viewingShared.destination}</div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                        <span>📏 {viewingShared.distance}</span>
                                        <span>⏱ {viewingShared.duration}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ===== MAP ===== */}
            <div ref={mapContainer} style={{ flex: 1 }} />

            {/* ===== SAVE MODAL ===== */}
            {showSaveModal && (
                <div style={modalOverlay}>
                    <div style={modalCard}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#202124' }}>💾 Lưu lộ trình</h3>
                        <label style={labelStyle}>Tên lộ trình</label>
                        <input style={{ ...inputStyle, marginBottom: 10 }} value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="VD: Hà Nội → Hải Phòng" />
                        <label style={labelStyle}>Ghi chú</label>
                        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={routeNote} onChange={e => setRouteNote(e.target.value)} placeholder="Ghi chú thêm..." />
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            <button onClick={() => setShowSaveModal(false)} style={{ ...secondaryBtn, flex: 1 }}>Hủy</button>
                            <button onClick={handleSaveRoute} style={{ ...primaryBtn, flex: 1, padding: 10 }}>💾 Lưu ngay</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== TOAST ===== */}
            {toast.show && (
                <div style={{
                    position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
                    padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                    color: 'white', zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                    background: toast.type === 'error' ? 'linear-gradient(135deg, #d93025, #ea4335)' : 'linear-gradient(135deg, #1a73e8, #0b57d0)',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    {toast.message}
                </div>
            )}

            {/* CSS Animation */}
            <style>{`
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            `}</style>
        </div>
    );
};

// ========== STYLES ==========
const panelStyle = {
    position: 'absolute', top: 16, left: 16, width: 380, backgroundColor: 'white', borderRadius: 12,
    boxShadow: '0 6px 24px rgba(0,0,0,0.15)', zIndex: 10, padding: 18,
    display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto'
};
const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #dadce0',
    fontSize: 14, boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s',
};
const dropdownStyle = {
    position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white',
    border: '1px solid #dadce0', borderRadius: 8, zIndex: 20, maxHeight: 240, overflowY: 'auto',
    boxShadow: '0 6px 16px rgba(0,0,0,0.12)'
};
const resultItemStyle = {
    padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f5f5f5',
    backgroundColor: 'white', transition: 'background 0.15s', display: 'flex', alignItems: 'center'
};
const primaryBtn = {
    width: '100%', padding: 13, backgroundColor: '#1a73e8', color: 'white',
    border: 'none', borderRadius: 24, fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'all 0.2s',
    background: 'linear-gradient(135deg, #1a73e8, #0b57d0)'
};
const secondaryBtn = {
    padding: '8px 12px', backgroundColor: 'white', color: '#3c4043',
    border: '1px solid #dadce0', borderRadius: 20, fontSize: 12, cursor: 'pointer',
    fontWeight: 500, transition: 'all 0.2s'
};
const miniBtn = {
    padding: '6px 12px', backgroundColor: 'white', color: '#3c4043',
    border: '1px solid #dadce0', borderRadius: 16, fontSize: 11, cursor: 'pointer', fontWeight: 500
};
const iconBtn = {
    padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 16
};
const routeInfoCard = {
    marginTop: 16, padding: 14, background: 'linear-gradient(135deg, #e8f0fe, #d2e3fc)',
    borderRadius: 10, border: '1px solid #c6d9f1'
};
const trackingStatsCard = {
    padding: 14, background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    borderRadius: 10, border: '1px solid #bbf7d0'
};
const statBox = {
    textAlign: 'center', padding: 8, backgroundColor: 'white', borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
};
const historyCard = {
    padding: 12, marginBottom: 8, backgroundColor: '#fafafa', borderRadius: 10,
    border: '1px solid #e8eaed', transition: 'box-shadow 0.2s',
};
const modalOverlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const modalCard = {
    backgroundColor: 'white', borderRadius: 16, padding: 24, width: 380,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto'
};
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#5f6368', marginBottom: 4, display: 'block' };

export default RouteMap;
