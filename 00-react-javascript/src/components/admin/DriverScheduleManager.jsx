import { useState, useEffect } from 'react';
import { getAllAutomatedDriverTripStats } from '../../services/driverScheduleService';
import { getUsersByRole } from '../../services/userService';
import './AdminModules.css';

function DriverScheduleManager() {
    const [trips, setTrips] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState(''); // YYYY-MM
    
    useEffect(() => {
        loadData();
    }, []);

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
        const matchName = (t.assignedDriverName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchDate = dateFilter ? (t.createdAt && t.createdAt.startsWith(dateFilter)) : true;
        return matchName && matchDate;
    });

    const sortedTrips = [...filteredTrips].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Mới nhất lên đầu
    });

    // Gom nhóm theo tài xế để xem tổng chuyến trong tháng hiện tại
    const driverStats = drivers.map(d => {
        const driverTrips = trips.filter(t => t.assignedDriverId === d.id);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthTrips = driverTrips.filter(t => {
            const dt = new Date(t.createdAt);
            return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear;
        });

        return {
            id: d.id,
            name: d.fullname || d.email,
            totalTrips: driverTrips.length,
            monthTrips: monthTrips.length
        };
    }).sort((a, b) => b.monthTrips - a.monthTrips);

    return (
        <div className="module-container">
            <div className="module-header">
                <h2>🗓️ Nhật ký làm việc tài xế (Tự động)</h2>
                <button className="btn-primary" onClick={loadData}>🔄 Làm mới dữ liệu</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '30px' }}>
                <div className="stats-card" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                    <h3 style={{ marginTop: 0 }}>🏆 Bảng xếp hạng chuyến đi trong tháng</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                        {driverStats.slice(0, 4).map((ds, idx) => (
                            <div key={ds.id} style={{ 
                                background: 'white', padding: '15px', borderRadius: '8px', 
                                borderLeft: `5px solid ${['#ffc107', '#6c757d', '#cd7f32', '#007bff'][idx] || '#ddd'}`
                            }}>
                                <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>{idx === 0 ? 'HẠNG 1' : `HẠNG ${idx + 1}`}</div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{ds.name}</div>
                                <div style={{ fontSize: '20px', color: '#28a745', marginTop: '5px' }}>{ds.monthTrips} chuyến</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="filters" style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '8px', alignItems: 'center' }}>
                <input 
                    type="text" 
                    placeholder="Tìm theo tên tài xế..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Lọc tháng:</label>
                    <input 
                        type="month" 
                        value={dateFilter} 
                        onChange={(e) => setDateFilter(e.target.value)} 
                        style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
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
                                        <td>{trip.product} ({trip.amount}L)</td>
                                        <td>
                                            <span className="badge badge-success" style={{background: '#d4edda', color: '#155724', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold'}}>
                                                Đã hoàn thành
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
