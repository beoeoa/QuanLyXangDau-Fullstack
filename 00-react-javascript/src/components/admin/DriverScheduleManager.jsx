import { useState, useEffect, useMemo } from 'react';
import { getAllDeliveryOrders } from '../../services/transportationService';
import { getUsersByRole } from '../../services/userService';
import './AdminModules.css';

function DriverScheduleManager() {
    const [allOrders, setAllOrders] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [orderData, driverData] = await Promise.all([
                getAllDeliveryOrders(),
                getUsersByRole('driver')
            ]);
            setAllOrders(Array.isArray(orderData) ? orderData : []);
            setDrivers(Array.isArray(driverData) ? driverData : []);
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        }
        setLoading(false);
    };

    // Helper tính khoàng thời gian
    const formatDuration = (ms) => {
        if (!ms || ms < 0) return '-';
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            const remainH = hours % 24;
            return `${days} ngày ${remainH}g`;
        }
        if (hours > 0) return `${hours}g ${minutes}p`;
        return `${minutes} phút`;
    };

    // Helper xử lý Date an toàn
    const getSafeDateMs = (d) => {
        if (!d) return null;
        if (d._seconds) return d._seconds * 1000;
        if (d.seconds) return d.seconds * 1000;
        const p = new Date(d);
        if (isNaN(p.getTime())) return null;
        return p.getTime();
    };

    // XỬ LÝ DỮ LIỆU ĐỂ TÍNH TOÁN (Dùng useMemo để không lag)
    const { processedTrips, driverStats, activeDrivers, warningDrivers, topDrivers } = useMemo(() => {
        const nowMs = Date.now();
        const tripsByDriver = {};
        
        // Nhóm các lệnh theo từng tài xế & Lọc trip hợp lệ
        const validOrders = allOrders.filter(o => o.assignedDriverId).map(o => {
            const tStartMs = getSafeDateMs(o.createdAt) || 0;
            const tEndMs = (o.status === 'completed' || o.status === 'cancelled') 
                       ? getSafeDateMs(o.updatedAt)
                       : null;
            return { ...o, tStart: tStartMs, tEnd: tEndMs };
        }).sort((a, b) => a.tStart - b.tStart); // Sort tăng dần thời gian nhận lệnh

        // Map danh sách chuyến cho từng tài xế để tính khoảng nghĩ (interval)
        validOrders.forEach(o => {
            if (!tripsByDriver[o.assignedDriverId]) tripsByDriver[o.assignedDriverId] = [];
            const driverTrips = tripsByDriver[o.assignedDriverId];
            
            // Tìm chuyến liền trước (đã hoàn thành)
            let lastTripInfo = null;
            if (driverTrips.length > 0) {
                const prev = driverTrips[driverTrips.length - 1];
                if (prev.tEnd) {
                    const idleMs = o.tStart - prev.tEnd;
                    lastTripInfo = idleMs > 0 ? idleMs : null;
                }
            }

            // Thời lượng chuyến
            const durationMs = o.tEnd ? (o.tEnd - o.tStart) : null;

            const extendedOrder = {
                ...o,
                durationMs,
                idleBeforeMs: lastTripInfo
            };
            driverTrips.push(extendedOrder);
        });

        // Duỗi array trips
        const allProcessedTrips = Object.values(tripsByDriver).flat().sort((a, b) => (b.tEnd || b.tStart) - (a.tEnd || a.tStart));

        // TÍNH TOÁN STATUS TÀI XẾ
        const stats = drivers.map(d => {
            const dTrips = tripsByDriver[d.id] || [];
            
            // Chuyến đang chạy
            const activeTrip = dTrips.find(t => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'new');
            
            // Chuyến đã hoàn thành tháng này
            const monthTrips = dTrips.filter(t => {
                if (t.status !== 'completed' || !t.tEnd) return false;
                try {
                    const dateStr = new Date(t.tEnd).toISOString();
                    return dateStr.startsWith(selectedMonth);
                } catch(e) { return false; }
            });

            // Tìm chuyến hoàn thành cuối cùng
            const completedTrips = dTrips.filter(t => t.status === 'completed' && t.tEnd).sort((a, b) => b.tEnd - a.tEnd);
            const lastCompleted = completedTrips[0];
            
            let idleSinceMs = null;
            if (!activeTrip && lastCompleted) {
                idleSinceMs = nowMs - lastCompleted.tEnd;
            }

            return {
                id: d.id,
                name: d.fullname || d.email,
                activeTrip,
                monthTripCount: monthTrips.length,
                lastCompleted,
                idleSinceMs,
            };
        });

        const activeList = stats.filter(s => s.activeTrip);
        // Cảnh báo nếu idle > 2 ngày (172800000 ms) hoặc chưa có chuyến nào
        const warningList = stats.filter(s => !s.activeTrip && (s.idleSinceMs > 172800000 || !s.lastCompleted)).sort((a, b) => (b.idleSinceMs || Infinity) - (a.idleSinceMs || Infinity));
        const topList = [...stats].filter(s => s.monthTripCount > 0).sort((a, b) => b.monthTripCount - a.monthTripCount).slice(0, 5);

        return { processedTrips: allProcessedTrips, driverStats: stats, activeDrivers: activeList, warningDrivers: warningList, topDrivers: topList };
    }, [allOrders, drivers, selectedMonth]);

    // LỌC BẢNG NHẬT KÝ
    const filteredAndSortedTrips = processedTrips.filter(t => {
        const term = searchTerm.toLowerCase();
        const matchSearch = !term ||
            (t.assignedDriverName || '').toLowerCase().includes(term) ||
            (t.vehiclePlate || '').toLowerCase().includes(term);

        const tripDateObjMs = t.tEnd || t.tStart;
        let matchDate = true;
        
        if (tripDateObjMs) {
            try {
                const tripDate = new Date(tripDateObjMs).toISOString().substring(0, 10);
                if (dateFrom && dateTo) {
                    matchDate = tripDate >= dateFrom && tripDate <= dateTo;
                } else if (dateFrom) {
                    matchDate = tripDate >= dateFrom;
                } else if (dateTo) {
                    matchDate = tripDate <= dateTo;
                } else if (selectedMonth) {
                    matchDate = tripDate.startsWith(selectedMonth);
                }
            } catch(e) { matchDate = false; }
        } else {
            matchDate = !dateFrom && !dateTo && !selectedMonth; // Nếu filter trống thì pass
        }

        return matchSearch && matchDate;
    });

    const clearFilters = () => {
        setSearchTerm(''); setDateFrom(''); setDateTo('');
        const now = new Date();
        setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    };

    return (
        <div className="module-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>🚦 Trung Tâm Giám Sát Lái Xe Toàn Diện</h2>
                <button className="btn-primary" onClick={loadData}>🔄 Làm mới dữ liệu</button>
            </div>

            {loading ? (
                <div className="loading-state">Đang phân tích dữ liệu...</div>
            ) : (
                <>
                    {/* BẢNG PHÂN CỰC HOẠT ĐỘNG */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                        
                        {/* CỘT 1: ĐANG BẬN */}
                        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ background: '#3498db', color: 'white', padding: '12px 15px', fontWeight: 'bold' }}>
                                🚚 Đang Vận Hành ({activeDrivers.length})
                            </div>
                            <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                                {activeDrivers.length === 0 ? <div style={{ color: '#999', fontSize: 13 }}>Không có xe nào đang chạy.</div> : 
                                    activeDrivers.map(d => (
                                        <div key={d.id} style={{ background: '#f5f9fc', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #3498db' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: 14 }}>{d.name}</div>
                                            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>📌 Đi: {d.activeTrip.destination}</div>
                                            <div style={{ fontSize: 12, color: '#f39c12', fontWeight: 'bold' }}>Trạng thái: {d.activeTrip.status}</div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* CỘT 2: CẢNH BÁO LƯỜI / TRỐNG LỊCH */}
                        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ background: '#e74c3c', color: 'white', padding: '12px 15px', fontWeight: 'bold' }}>
                                🔴 Cảnh báo Trống lịch / Lâu không đi ({warningDrivers.length})
                            </div>
                            <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                                {warningDrivers.length === 0 ? <div style={{ color: '#27ae60', fontSize: 13, fontWeight: 'bold' }}>Quá tuyệt vời! Tất cả tài xế đều được việc.</div> :
                                    warningDrivers.map(d => (
                                        <div key={d.id} style={{ background: '#fdf2f2', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #e74c3c' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: 14 }}>{d.name}</div>
                                            {!d.lastCompleted ? (
                                                <div style={{ fontSize: 12, color: '#c0392b', marginTop: 4 }}>⚠️ Chưa chạy chuyến nào!</div>
                                            ) : (
                                                <div style={{ fontSize: 12, color: '#c0392b', marginTop: 4 }}>
                                                    ⏳ Đã nằm bãi: <strong>{formatDuration(d.idleSinceMs)}</strong>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* CỘT 3: TOP CHĂM CHỈ */}
                        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ background: '#27ae60', color: 'white', padding: '12px 15px', fontWeight: 'bold' }}>
                                🔥 Năng suất tháng {selectedMonth.split('-')[1] || selectedMonth}
                            </div>
                            <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                                {topDrivers.length === 0 ? <div style={{ color: '#999', fontSize: 13 }}>Chưa có ai hoàn thành chuyến nào.</div> :
                                    topDrivers.map((d, i) => (
                                        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4fbf6', padding: '10px', borderRadius: '6px', borderLeft: `3px solid ${i === 0 ? '#f1c40f' : '#2ecc71'}` }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: 14 }}>{i+1}. {d.name}</div>
                                                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                                                    {d.lastCompleted && d.lastCompleted.tEnd ? `Lần cuối: ${formatDuration(Date.now() - d.lastCompleted.tEnd)} trước` : ''}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#27ae60' }}>{d.monthTripCount}</div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>

                    {/* BỘ LỌC */}
                    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: 16 }}>📋 Chi tiết Nhật Ký Các Lệnh Điều Động / Chuyến Hàng</h3>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <input type="text" placeholder="🔍 Tên tài xế, xe..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                style={{ flex: '1', minWidth: '150px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Tháng:</label>
                                <input type="month" value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setDateFrom(''); setDateTo(''); }}
                                    style={{ padding: '7px', border: '1px solid #ddd', borderRadius: '6px' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Từ ngày:</label>
                                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setSelectedMonth(''); }}
                                    style={{ padding: '7px', border: '1px solid #ddd', borderRadius: '6px' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Đến:</label>
                                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setSelectedMonth(''); }}
                                    style={{ padding: '7px', border: '1px solid #ddd', borderRadius: '6px' }} />
                            </div>
                            <button onClick={clearFilters} style={{ padding: '8px 14px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Xóa lọc</button>
                        </div>
                    </div>

                    {/* BẢNG DETAILS */}
                    {filteredAndSortedTrips.length === 0 ? (
                        <div className="empty-state">Không có dữ liệu phù hợp.</div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table" style={{ fontSize: 13 }}>
                                <thead>
                                    <tr>
                                        <th>Tài Xế & Xe</th>
                                        <th>Hành Trình</th>
                                        <th>Giờ Đi (Bắt Đầu)</th>
                                        <th>Giờ Về (Hoàn Thành)</th>
                                        <th style={{ background: '#f5f5f5' }}>⏱️ Thời Lượng Chuyến</th>
                                        <th style={{ background: '#eaf2f8' }}>☕ Nghỉ So Với Chuyến Trước</th>
                                        <th>Trạng Thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedTrips.map(trip => {
                                        const dtStart = trip.tStart ? new Date(trip.tStart).toLocaleString('vi-VN') : '-';
                                        const dtEnd = trip.tEnd ? new Date(trip.tEnd).toLocaleString('vi-VN') : 'Đang xử lý';
                                        const isCompleted = trip.status === 'completed';
                                        
                                        // Cảnh báo ép tua nếu nghỉ quá ít (dưới 4 tiếng = 14400000ms)
                                        const isOverworked = trip.idleBeforeMs && trip.idleBeforeMs < 14400000;

                                        return (
                                            <tr key={trip.id} style={{ background: isCompleted ? 'transparent' : '#fffcf5' }}>
                                                <td>
                                                    <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>{trip.assignedDriverName}</div>
                                                    <div style={{ color: '#666', fontSize: 12 }}>{trip.vehiclePlate}</div>
                                                </td>
                                                <td>
                                                    <div>Kho: {trip.sourceWarehouse || 'Kho Tổng'}</div>
                                                    <div style={{ fontWeight: 'bold', color: '#2980b9' }}>→ {trip.destination || '-'}</div>
                                                    <div style={{ fontSize: 11, color: '#7f8c8d' }}>{trip.product}</div>
                                                </td>
                                                <td>{dtStart}</td>
                                                <td style={{ fontWeight: isCompleted ? 'bold' : 'normal', color: isCompleted ? '#27ae60' : '#888' }}>
                                                    {dtEnd}
                                                </td>
                                                <td style={{ background: '#fdfdfd', textAlign: 'center', fontWeight: 'bold', color: '#8e44ad' }}>
                                                    {formatDuration(trip.durationMs)}
                                                </td>
                                                <td style={{ background: '#f8fcff', textAlign: 'center', color: isOverworked ? '#c0392b' : '#34495e', fontWeight: isOverworked ? 'bold' : 'normal' }}>
                                                    {trip.idleBeforeMs ? formatDuration(trip.idleBeforeMs) : 'Chuyến đầu tiên / Ko rõ'}
                                                    {isOverworked && <span title="Nghỉ quá ngắn" style={{ marginLeft: 4 }}>⚠️</span>}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{ 
                                                        background: isCompleted ? '#d4edda' : '#fff3cd', 
                                                        color: isCompleted ? '#155724' : '#856404', 
                                                        padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '11px' 
                                                    }}>
                                                        {trip.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default DriverScheduleManager;
