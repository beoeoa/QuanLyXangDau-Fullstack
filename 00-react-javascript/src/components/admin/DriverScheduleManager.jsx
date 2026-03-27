import { useState, useEffect } from 'react';
import { getAllAutomatedDriverTripStats } from '../../services/driverScheduleService';
import { getUsersByRole } from '../../services/userService';
import './AdminModules.css';

function DriverScheduleManager() {
    const [trips, setTrips] = useState([]);
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
            const [tripData, driverData] = await Promise.all([
                getAllAutomatedDriverTripStats(),
                getUsersByRole('driver')
            ]);
            setTrips(Array.isArray(tripData) ? tripData : []);
            setDrivers(Array.isArray(driverData) ? driverData : []);
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        }
        setLoading(false);
    };

    const filteredTrips = trips.filter(t => {
        const term = searchTerm.toLowerCase();
        const matchSearch = !term ||
            (t.assignedDriverName || '').toLowerCase().includes(term) ||
            (t.vehiclePlate || '').toLowerCase().includes(term);

        // Lấy ngày của chuyến (ưu tiên completedAt, rồi updatedAt, rồi createdAt)
        const tripDateStr = t.completedAt || t.updatedAt || t.createdAt || '';
        const tripDate = tripDateStr ? tripDateStr.substring(0, 10) : '';

        let matchDate = true;
        if (dateFrom && dateTo) {
            matchDate = tripDate >= dateFrom && tripDate <= dateTo;
        } else if (dateFrom) {
            matchDate = tripDate >= dateFrom;
        } else if (dateTo) {
            matchDate = tripDate <= dateTo;
        } else if (selectedMonth) {
            matchDate = tripDate.startsWith(selectedMonth);
        }

        return matchSearch && matchDate;
    });

    const sortedTrips = [...filteredTrips].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0);
        const dateB = new Date(b.updatedAt || b.createdAt || 0);
        return dateB - dateA;
    });

    // Bảng xếp hạng theo tháng đang chọn
    const driverStats = drivers.map(d => {
        const monthTrips = trips.filter(t => {
            if (t.assignedDriverId !== d.id) return false;
            const ds = t.completedAt || t.updatedAt || t.createdAt || '';
            return ds.startsWith(selectedMonth);
        });
        return { id: d.id, name: d.fullname || d.email, monthTrips: monthTrips.length };
    }).sort((a, b) => b.monthTrips - a.monthTrips);

    // Tổng chuyến của tháng đang chọn
    const totalTripsThisMonth = trips.filter(t => {
        const ds = t.completedAt || t.updatedAt || t.createdAt || '';
        return ds.startsWith(selectedMonth);
    }).length;

    const clearFilters = () => {
        setSearchTerm('');
        setDateFrom('');
        setDateTo('');
        const now = new Date();
        setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    };

    return (
        <div className="module-container">
            <div className="module-header">
                <h2>🗓️ Nhật ký làm việc tài xế (Tự động)</h2>
                <button className="btn-primary" onClick={loadData}>🔄 Làm mới dữ liệu</button>
            </div>

            {/* Thẻ tổng chuyến tháng */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#eaf2f8', padding: '14px 18px', borderRadius: '8px', borderLeft: '4px solid #3498db' }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>🚚 Tổng chuyến trong tháng</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2980b9' }}>{totalTripsThisMonth}</div>
                </div>
                <div style={{ background: '#eafaf1', padding: '14px 18px', borderRadius: '8px', borderLeft: '4px solid #27ae60' }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>👨‍✈️ Tài xế có chuyến</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#27ae60' }}>{driverStats.filter(d => d.monthTrips > 0).length}</div>
                </div>
                <div style={{ background: '#fef9e7', padding: '14px 18px', borderRadius: '8px', borderLeft: '4px solid #f39c12' }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>📋 Số chuyến lọc ra</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e67e22' }}>{filteredTrips.length}</div>
                </div>
            </div>

            {/* Bảng xếp hạng */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0 }}>🏆 Bảng xếp hạng tháng {selectedMonth}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                    {driverStats.slice(0, 4).map((ds, idx) => (
                        <div key={ds.id} style={{
                            background: 'white', padding: '15px', borderRadius: '8px',
                            borderLeft: `5px solid ${['#ffc107', '#6c757d', '#cd7f32', '#007bff'][idx] || '#ddd'}`
                        }}>
                            <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>HẠNG {idx + 1}</div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{ds.name}</div>
                            <div style={{ fontSize: '20px', color: '#28a745', marginTop: '5px' }}>{ds.monthTrips} chuyến</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bộ lọc nâng cao */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Tìm kiếm */}
                    <input
                        type="text"
                        placeholder="🔍 Tìm tên tài xế hoặc biển số xe..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ flex: '2', minWidth: '200px', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
                    />

                    {/* Lọc theo tháng */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>📅 Tháng:</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => { setSelectedMonth(e.target.value); setDateFrom(''); setDateTo(''); }}
                            style={{ padding: '7px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                    </div>

                    {/* Lọc theo khoảng ngày cụ thể */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Từ ngày:</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setSelectedMonth(''); }}
                            style={{ padding: '7px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Đến ngày:</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setSelectedMonth(''); }}
                            style={{ padding: '7px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                    </div>

                    <button onClick={clearFilters} style={{ padding: '8px 14px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        ✕ Xóa lọc
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">Đang tải dữ liệu...</div>
            ) : sortedTrips.length === 0 ? (
                <div className="empty-state">Chưa có dữ liệu nhật ký làm việc từ Lệnh điều động.</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Thời gian hoàn thành</th>
                                <th>Tài Xế</th>
                                <th>Xe bồn</th>
                                <th>Điểm nhận hàng</th>
                                <th>Điểm giao hàng</th>
                                <th>Sản phẩm</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTrips.map(trip => {
                                const dt = new Date(trip.updatedAt || trip.createdAt);
                                return (
                                    <tr key={trip.id}>
                                        <td><strong>{dt.toLocaleString('vi-VN')}</strong></td>
                                        <td>{trip.assignedDriverName}</td>
                                        <td>{trip.vehiclePlate}</td>
                                        <td>{trip.sourceWarehouse || 'Kho tổng'}</td>
                                        <td>{trip.destination}</td>
                                        <td>{trip.product} ({Number(trip.amount).toLocaleString()}L)</td>
                                        <td>
                                            <span style={{ background: '#d4edda', color: '#155724', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px' }}>
                                                ✅ Đã hoàn thành
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default DriverScheduleManager;
