import { useState, useEffect } from 'react'
import { getAllFleetVehicles, addFleetVehicle, updateFleetVehicle, deleteFleetVehicle } from '../../services/fleetVehicleService'
import { getAllUsers } from '../../services/userService'
import './AdminModules.css'

function VehicleManager() {
    const [vehicles, setVehicles] = useState([])
    const [drivers, setDrivers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState(null)
    const [formData, setFormData] = useState({
        plateNumber: '',
        totalCapacity: '',
        compartments: '',
        status: 'active',
        inspectionExpiry: '',
        dangerousGoodsExpiry: '',
        notes: '',
        assignedDriverId: '',
        assignedDriverName: '',
        vehicleImage: ''
    })

    useEffect(() => { loadData() }, [])

    const loadData = async () => {
        setLoading(true)
        const [vehiclesData, usersData] = await Promise.all([
            getAllFleetVehicles(),
            getAllUsers()
        ])
        setVehicles(vehiclesData)
        // Lọc danh sách tài xế đã duyệt
        const driverList = usersData.filter(u => u.role === 'driver' && u.isApproved !== false)
        setDrivers(driverList)
        setLoading(false)
    }

    const loadVehiclesOnly = async () => {
        setLoading(true)
        const data = await getAllFleetVehicles()
        setVehicles(data)
        setLoading(false)
    }

    const resetForm = () => {
        setFormData({
            plateNumber: '', totalCapacity: '', compartments: '',
            status: 'active', inspectionExpiry: '', dangerousGoodsExpiry: '', notes: '',
            assignedDriverId: '', assignedDriverName: '', vehicleImage: ''
        })
        setEditingVehicle(null)
        setShowForm(false)
    }

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, vehicleImage: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDriverChange = (e) => {
        const driverId = e.target.value;
        const driver = drivers.find(d => d.id === driverId);
        setFormData(prev => ({
            ...prev,
            assignedDriverId: driverId,
            assignedDriverName: driver ? driver.fullname : ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (editingVehicle) {
            const result = await updateFleetVehicle(editingVehicle.id, formData)
            if (result.success) {
                alert('✅ Cập nhật xe thành công!')
                resetForm()
                loadVehiclesOnly()
            } else alert('❌ Lỗi: ' + result.message)
        } else {
            const result = await addFleetVehicle(formData)
            if (result.success) {
                alert('✅ Thêm xe mới thành công!')
                resetForm()
                loadVehiclesOnly()
            } else alert('❌ Lỗi: ' + result.message)
        }
    }

    const handleEdit = (vehicle) => {
        setFormData({
            plateNumber: vehicle.plateNumber || '',
            totalCapacity: vehicle.totalCapacity || '',
            compartments: vehicle.compartments || '',
            status: vehicle.status || 'active',
            inspectionExpiry: vehicle.inspectionExpiry || '',
            dangerousGoodsExpiry: vehicle.dangerousGoodsExpiry || '',
            notes: vehicle.notes || '',
            assignedDriverId: vehicle.assignedDriverId || '',
            assignedDriverName: vehicle.assignedDriverName || '',
            vehicleImage: vehicle.vehicleImage || ''
        })
        setEditingVehicle(vehicle)
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Xác nhận xóa xe bồn này?')) {
            const result = await deleteFleetVehicle(id)
            if (result.success) loadVehiclesOnly()
            else alert('❌ Lỗi: ' + result.message)
        }
    }

    const handleExportExcel = () => {
        const headers = ['Biển số xe', 'Dung tích tổng (Lít)', 'Số hầm', 'Trạng thái', 'Hạn đăng kiểm', 'Hạn GP Hàng nguy hiểm', 'Tài xế phụ trách', 'Ghi chú'];
        const csvRows = [];
        csvRows.push(headers.join(','));

        vehicles.forEach(v => {
            const row = [
                `"${v.plateNumber || ''}"`,
                v.totalCapacity || '',
                v.compartments || '',
                v.status === 'active' || v.status === 'Hoạt động' ? 'Hoạt động' : (v.status === 'working' ? 'Đang làm việc' : 'Nằm bãi'),
                `"${v.inspectionExpiry || ''}"`,
                `"${v.dangerousGoodsExpiry || ''}"`,
                `"${v.assignedDriverName || ''}"`,
                `"${v.notes || ''}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'Danh_sach_xe_bon.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const getStatusBadge = (status) => {
        if (status === 'active' || status === 'Hoạt động') {
            return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#d4edda', color: '#155724' }}>🟢 Hoạt động</span>
        }
        if (status === 'working' || status === 'Đang làm việc') {
            return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#cce5ff', color: '#004085' }}>🚚 Đang làm việc</span>
        }
        return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#f8d7da', color: '#721c24' }}>🔴 Nằm bãi</span>
    }

    return (
        <div className="module-container">
            <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2>🚛 Quản Lý Xe Bồn (Fleet)</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-success" onClick={handleExportExcel} style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>
                        📥 Xuất Excel
                    </button>
                    <button className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm) }}>
                        {showForm ? '✕ Đóng' : '+ Thêm Xe Mới'}
                    </button>
                </div>
            </div>

            {/* Form thêm/sửa */}
            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h4 style={{ marginTop: 0 }}>{editingVehicle ? '✏️ Sửa thông tin xe' : '➕ Thêm xe bồn mới'}</h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Biển số xe (*)</label>
                            <input type="text" value={formData.plateNumber} onChange={e => setFormData({ ...formData, plateNumber: e.target.value })} required placeholder="Vd: 15C-12345" />
                        </div>
                        <div className="form-group">
                            <label>Dung tích tổng (Lít)</label>
                            <input type="number" value={formData.totalCapacity} onChange={e => setFormData({ ...formData, totalCapacity: e.target.value })} placeholder="Vd: 18000" />
                        </div>
                        <div className="form-group">
                            <label>Số hầm chứa</label>
                            <input type="number" value={formData.compartments} onChange={e => setFormData({ ...formData, compartments: e.target.value })} placeholder="Vd: 4" />
                        </div>
                        <div className="form-group">
                            <label>Trạng thái</label>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                <option value="active">🟢 Hoạt động</option>
                                <option value="inactive">🔴 Nằm bãi</option>
                                <option value="working">🚚 Đang làm việc</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Hạn Đăng Kiểm</label>
                            <input type="date" value={formData.inspectionExpiry} onChange={e => setFormData({ ...formData, inspectionExpiry: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Hạn GP Hàng Nguy Hiểm</label>
                            <input type="date" value={formData.dangerousGoodsExpiry} onChange={e => setFormData({ ...formData, dangerousGoodsExpiry: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Tài xế phụ trách</label>
                            <select value={formData.assignedDriverId} onChange={handleDriverChange}>
                                <option value="">-- Chưa gắn tài xế --</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.fullname} ({d.phone || 'Chưa có SĐT'})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Ảnh Đầu Kéo / Minh Chứng (Base64)</label>
                            <input type="file" accept="image/*" onChange={handleImageUpload} />
                        </div>
                        {formData.vehicleImage && (
                            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center' }}>
                                <img src={formData.vehicleImage} alt="Vehicle" style={{ width: '100px', height: 'auto', borderRadius: '4px', border: '1px solid #ddd' }} />
                                {formData.vehicleImage.startsWith('data:image') && <span style={{ marginLeft: '10px', fontSize: '12px', color: 'green' }}>✓ Đã chọn ảnh</span>}
                            </div>
                        )}
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Ghi chú</label>
                            <input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Ghi chú..." />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="submit" className="btn-primary">{editingVehicle ? '💾 Cập nhật' : '➕ Thêm xe'}</button>
                        <button type="button" className="btn-delete" onClick={resetForm}>Hủy</button>
                    </div>
                </form>
            )}

            {/* Danh sách xe */}
            {loading ? (
                <div className="loading-state">Đang tải danh sách xe...</div>
            ) : vehicles.length === 0 ? (
                <div className="empty-state"><p>Chưa có xe bồn nào trong hệ thống.</p></div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Ảnh</th>
                            <th>Biển Số</th>
                            <th>Dung Tích (L)</th>
                            <th>Số Hầm</th>
                            <th>Tài xế phụ trách</th>
                            <th>Trạng Thái</th>
                            <th>Hạn Đăng Kiểm</th>
                            <th>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.map(v => (
                            <tr key={v.id}>
                                <td>
                                    {v.vehicleImage ?
                                        <img src={v.vehicleImage} alt="xe" style={{ width: '50px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                        : '📸 C/C'
                                    }
                                </td>
                                <td><strong>{v.plateNumber}</strong></td>
                                <td>{v.totalCapacity ? Number(v.totalCapacity).toLocaleString() : '-'}</td>
                                <td>{v.compartments || '-'}</td>
                                <td>{v.assignedDriverName || 'Chưa gắn'}</td>
                                <td>{getStatusBadge(v.status)}</td>
                                <td>{v.inspectionExpiry || '-'}</td>
                                <td>
                                    <div className="btn-group">
                                        <button className="btn-primary" onClick={() => handleEdit(v)} style={{ fontSize: '12px', padding: '5px 10px' }}>✏️ Sửa</button>
                                        <button className="btn-delete" onClick={() => handleDelete(v.id)} style={{ fontSize: '12px', padding: '5px 10px' }}>🗑️ Xóa</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

export default VehicleManager
