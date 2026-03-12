import { useState, useEffect } from 'react'
import {
    getAllUsers,
    updateUser,
    deleteUser
} from '../../services/userService'
import Profile from '../Profile'
import './AdminModules.css'

const API_URL = 'http://localhost:8080/api'

// Component tĩnh để xem thống kê tài xế
function DriverStatsView({ driver, onClose }) {
    const [shipments, setShipments] = useState([])
    const [expenses, setExpenses] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [tripRes, expenseRes] = await Promise.all([
                    fetch(`${API_URL}/delivery-orders/driver-stats/${driver.id}`),
                    fetch(`${API_URL}/driver-expenses/driver/${driver.id}`)
                ]);
                const tripData = await tripRes.json();
                const expenseData = await expenseRes.json();
                setShipments(Array.isArray(tripData) ? tripData : []);
                setExpenses(Array.isArray(expenseData) ? expenseData : []);
            } catch (e) {
                console.error("Lỗi lấy dữ liệu tài xế", e);
            }
            setLoading(false);
        }
        fetchStats();
    }, [driver.id]);

    if (loading) return <div style={{ padding: 20, background: 'white', borderRadius: 8 }}>Đang tải thống kê...</div>;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthSchedules = shipments.filter(s => {
        const d = new Date(s.updatedAt || s.createdAt || 0);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalTrips = monthSchedules.length; // Mỗi record trong driver-stats là 1 chuyến completed

    const monthExpenses = expenses.filter(e => {
        const d = new Date(e.createdAt || e.date || 0);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && e.status === 'approved';
    });

    const totalExpense = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const baseSalary = Number(driver.baseSalary || 8000000); // Lương cứng mặc định 8tr nếu không có
    const tripBonus = totalTrips * 300000; // Mỗi chuyến 300k
    const totalSalary = baseSalary + tripBonus;

    return (
        <div style={{ background: 'white', padding: 20, borderRadius: 8, maxWidth: 800, width: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0 }}>📊 Thống Kê Tài Xế: {driver.fullname} (Tháng {currentMonth + 1}/{currentYear})</h3>
                <button onClick={onClose} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: 20 }}>✖</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8, textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 24 }}>🚚</div>
                    <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1565c0' }}>{totalTrips}</div>
                    <div style={{ fontSize: 13, color: '#555' }}>Chuyến đi trong tháng</div>
                </div>
                <div style={{ background: '#e8f5e9', padding: 16, borderRadius: 8, textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 24 }}>💸</div>
                    <div style={{ fontSize: 22, fontWeight: 'bold', color: '#2e7d32' }}>{totalSalary.toLocaleString()} đ</div>
                    <div style={{ fontSize: 13, color: '#555' }}>Lương / Thu nhập định mức</div>
                </div>
                <div style={{ background: '#fff3e0', padding: 16, borderRadius: 8, textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 24 }}>🧾</div>
                    <div style={{ fontSize: 22, fontWeight: 'bold', color: '#e65100' }}>{totalExpense.toLocaleString()} đ</div>
                    <div style={{ fontSize: 13, color: '#555' }}>Chi phí theo dọc đường</div>
                </div>
            </div>

            <h4 style={{ margin: '0 0 10px 0' }}>🚛 Nhật Ký Làm Việc Gần Đây</h4>
            {shipments.length === 0 ? (
                <p style={{ color: '#666', fontSize: 14 }}>Chưa có nhật ký làm việc nào.</p>
            ) : (
                <table className="data-table" style={{ fontSize: 13, marginBottom: 20 }}>
                    <thead>
                        <tr>
                            <th>Ngày Đi</th>
                            <th>Ngày Về</th>
                            <th>Số Chuyến</th>
                            <th>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shipments.slice(0, 5).map(s => {
                            const dt = new Date(s.updatedAt || s.createdAt);
                            return (
                                <tr key={s.id}>
                                    <td>{dt.toLocaleDateString('vi-VN')}</td>
                                    <td>{s.destination || '-'}</td>
                                    <td><strong>1</strong></td>
                                    <td>{s.product} ({s.amount}L)</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
        </div>
    )
}

function EmployeeManager() {
    const [users, setUsers] = useState([])
    const [statsDriver, setStatsDriver] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('pending') // 'pending', 'approved'
    const [editingUser, setEditingUser] = useState(null) // State mở Modal sửa user

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        setLoading(true)
        const data = await getAllUsers()
        setUsers(data)
        setLoading(false)
    }

    const handleApprove = async (userId, role) => {
        const result = await updateUser(userId, {
            isApproved: true,
            role: role
        })

        if (result.success) {
            alert('✅ Đã duyệt tài khoản thành công!')
            loadUsers()
        } else {
            alert('❌ Lỗi: ' + result.message)
        }
    }

    const handleReject = async (userId) => {
        if (window.confirm('Bạn có chắc chắn muốn từ chối và xóa tài khoản này?')) {
            const result = await deleteUser(userId)
            if (result.success) {
                loadUsers()
            } else {
                alert('❌ Lỗi: ' + result.message)
            }
        }
    }

    const handleUpdateRole = async (userId, newRole) => {
        if (window.confirm(`Xác nhận đổi role thành ${newRole}?`)) {
            const result = await updateUser(userId, { role: newRole })
            if (result.success) {
                loadUsers()
            } else {
                alert('❌ Lỗi: ' + result.message)
            }
        }
    }

    const handleExportExcel = () => {
        // Tạo tiêu đề CSV
        const headers = ['Mã NV', 'Họ Tên', 'Email', 'SĐT', 'Vai trò', 'Lương cơ bản'];
        const csvRows = [];
        csvRows.push(headers.join(','));

        // Thêm dữ liệu từng user
        approvedUsers.forEach(user => {
            const row = [
                user.employeeId || '',
                `"${user.fullname || ''}"`,
                user.email || '',
                `"${user.phone || ''}"`,
                getRoleName(user.role),
                user.baseSalary || ''
            ];
            csvRows.push(row.join(','));
        });

        // Kèm BOM UTF-8 để Excel đọc tiếng Việt có dấu tốt
        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'Danh_sach_nhan_vien.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const pendingUsers = users.filter(u => u.isApproved === false && u.role !== 'admin')
    const approvedUsers = users.filter(u => u.isApproved !== false) // Includes those without isApproved field (legacy admins)

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'admin': return 'badge-admin'
            case 'driver': return 'badge-driver'
            case 'sales': return 'badge-sales'
            case 'accountant': return 'badge-accountant'
            default: return 'badge-pending'
        }
    }

    const getRoleName = (role) => {
        switch (role) {
            case 'admin': return 'Quản Trị Viên'
            case 'driver': return 'Tài Xế'
            case 'sales': return 'Bán Hàng'
            case 'accountant': return 'Kế Toán'
            case 'pending': return 'Đang Chờ'
            default: return role
        }
    }

    return (
        <div className="module-container">
            <div className="module-header">
                <h2>👥 Quản lý Nhân Viên</h2>
            </div>

            <div className="tabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <button
                        className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        Chờ Duyệt ({pendingUsers.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('approved')}
                    >
                        Nhân Viên ({approvedUsers.length})
                    </button>
                </div>
                {activeTab === 'approved' && (
                    <button
                        className="btn-success"
                        onClick={handleExportExcel}
                        style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}
                    >
                        📥 Xuất Excel
                    </button>
                )}
            </div>

            {loading ? (
                <div className="loading-state">Đang tải dữ liệu...</div>
            ) : activeTab === 'pending' ? (
                // TAB: CHỜ DUYỆT
                pendingUsers.length === 0 ? (
                    <div className="empty-state">
                        <p>Không có tài khoản nào đang chờ duyệt.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {pendingUsers.map(user => (
                            <div key={user.id} style={{
                                background: 'white', padding: '20px', borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex',
                                justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{user.fullname || 'Chưa cập nhật tên'}</h3>
                                    <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                                        📧 {user.email} <br />
                                        📱 {user.phone || 'Chưa cập nhật SĐT'} <br />
                                        🏠 {user.address || 'Chưa cập nhật địa chỉ'}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <label style={{ fontSize: '13px', fontWeight: '500' }}>Gán vai trò:</label>
                                        <select
                                            className="role-select"
                                            id={`role-${user.id}`}
                                            defaultValue="driver"
                                        >
                                            <option value="driver">Tài xế (Driver)</option>
                                            <option value="sales">Bán hàng (Sales)</option>
                                            <option value="accountant">Kế toán (Accountant)</option>
                                        </select>
                                    </div>

                                    <div className="btn-group">
                                        <button
                                            className="btn-approve"
                                            onClick={() => {
                                                const role = document.getElementById(`role-${user.id}`).value
                                                handleApprove(user.id, role)
                                            }}
                                        >✓ Duyệt Tài Khoản</button>
                                        <button className="btn-reject" onClick={() => handleReject(user.id)}>✗ Từ Chối</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                // TAB: ĐÃ DUYỆT
                approvedUsers.length === 0 ? (
                    <div className="empty-state"><p>Chưa có nhân viên nào.</p></div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Ảnh</th>
                                <th>Họ Tên</th>
                                <th>Thông tin liên hệ</th>
                                <th>Vai trò</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approvedUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <img
                                            src={user.photoURL || 'https://via.placeholder.com/40'}
                                            alt="Avatar"
                                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    </td>
                                    <td>
                                        <strong>{user.fullname}</strong>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{user.employeeId || 'Chưa cấp mã'}</div>
                                    </td>
                                    <td style={{ fontSize: '13px' }}>
                                        <div>📧 {user.email}</div>
                                        {user.phone && <div>📱 {user.phone}</div>}
                                    </td>
                                    <td>
                                        <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                                            {getRoleName(user.role)}
                                        </span>
                                    </td>
                                    <td>
                                        {user.role !== 'admin' && ( // Không cho phép sửa/xóa admin chính
                                            <div className="btn-group" style={{ flexDirection: 'column', width: 'fit-content' }}>
                                                <select
                                                    className="role-select"
                                                    value={user.role}
                                                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                >
                                                    <option value="driver">Tài xế</option>
                                                    <option value="sales">Bán hàng</option>
                                                    <option value="accountant">Kế toán</option>
                                                </select>
                                                <button className="btn-primary" onClick={() => setEditingUser(user)} style={{ width: '100%', marginTop: '4px' }}>Chi tiết & Sửa</button>
                                                {user.role === 'driver' && (
                                                    <button className="btn-success" onClick={() => setStatsDriver(user)} style={{ width: '100%', marginTop: '4px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4, padding: '5px', cursor: 'pointer' }}>📊 Thống Kê</button>
                                                )}
                                                <button className="btn-delete" onClick={() => handleReject(user.id)} style={{ width: '100%', marginTop: '4px' }}>Xóa</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            )}

            {/* Modal Thống Kê Tài Xế */}
            {statsDriver && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <DriverStatsView driver={statsDriver} onClose={() => setStatsDriver(null)} />
                </div>
            )}

            {/* Modal Edit Nhân Viên (Dành Cho Admin) */}
            {editingUser && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="modal-content" style={{
                        background: 'white', padding: '20px', borderRadius: '8px',
                        width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3>Chỉnh Sửa Hồ Sơ Nhân Sự: {editingUser.fullname || editingUser.email}</h3>
                            <button onClick={() => { setEditingUser(null); loadUsers(); }} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '20px' }}>✖</button>
                        </div>
                        {/* Gọi Component Profile dùng chung, nhưng truyền vào user đang được chọn, Admin sẽ có thể tự sửa mọi trường */}
                        <Profile currentUser={{ ...editingUser, role: 'admin' }} />
                    </div>
                </div>
            )}
        </div>
    )
}

export default EmployeeManager
