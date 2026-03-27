import { useState, useEffect } from 'react'
import { getAllFleetVehicles, addFleetVehicle, updateFleetVehicle, deleteFleetVehicle } from '../../services/fleetVehicleService'
import { getAllUsers } from '../../services/userService'
import { logAudit } from '../../services/auditLogService'
import './AdminModules.css'

function VehicleManager() {
    const [vehicles, setVehicles] = useState([])
    const [drivers, setDrivers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState(null)
    const [formData, setFormData] = useState({
        plateNumber: '',
        totalCapacity: '',
        compartments: '',
        compartmentDetails: [], // [{name:'K1', capacity:5000}, ...]
        yearOfManufacture: '',
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

    // Khi thay đổi số hầm -> tự sinh danh sách hầm
    const handleCompartmentsChange = (value) => {
        const num = parseInt(value) || 0
        const newDetails = Array.from({ length: num }, (_, i) => ({
            name: `K${i + 1}`,
            capacity: formData.compartmentDetails[i]?.capacity || ''
        }))
        setFormData(prev => ({ ...prev, compartments: value, compartmentDetails: newDetails }))
    }

    const handleCompartmentCapacityChange = (index, val) => {
        const updated = [...formData.compartmentDetails]
        updated[index] = { ...updated[index], capacity: val }
        setFormData(prev => ({ ...prev, compartmentDetails: updated }))
    }

    // Tính tổng dung tích từ các hầm
    const calcTotalFromCompartments = () => {
        return formData.compartmentDetails.reduce((sum, c) => sum + (Number(c.capacity) || 0), 0)
    }

    const resetForm = () => {
        setFormData({
            plateNumber: '', totalCapacity: '', compartments: '', compartmentDetails: [],
            yearOfManufacture: '', inspectionExpiry: '', dangerousGoodsExpiry: '', notes: '',
            assignedDriverId: '', assignedDriverName: '', vehicleImage: ''
        })
        setEditingVehicle(null)
        setShowForm(false)
    }

    const handleImageUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => setFormData(prev => ({ ...prev, vehicleImage: reader.result }))
            reader.readAsDataURL(file)
        }
    }

    const handleDriverChange = (e) => {
        const driverId = e.target.value
        const driver = drivers.find(d => d.id === driverId)
        setFormData(prev => ({ ...prev, assignedDriverId: driverId, assignedDriverName: driver ? driver.fullname : '' }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        // Kiểm tra tổng dung tích các hầm
        if (formData.compartmentDetails.length > 0) {
            const total = calcTotalFromCompartments()
            if (formData.totalCapacity && Math.abs(total - Number(formData.totalCapacity)) > 10) {
                if (!window.confirm(
                    `⚠️ Tổng các hầm (${total.toLocaleString()}L) khác với Dung tích tổng (${Number(formData.totalCapacity).toLocaleString()}L).\nBạn có muốn tự động điền tổng từ các hầm không?`
                )) return
                setFormData(prev => ({ ...prev, totalCapacity: total }))
            }
        }

        const payload = { ...formData }
        if (editingVehicle) {
            const result = await updateFleetVehicle(editingVehicle.id, payload)
            if (result.success) { await logAudit('UPDATE', `Sửa thông tin xe bồn: ${payload.plateNumber}`); alert('✅ Cập nhật xe thành công!'); resetForm(); loadVehiclesOnly() }
            else alert('❌ Lỗi: ' + result.message)
        } else {
            const result = await addFleetVehicle(payload)
            if (result.success) { await logAudit('CREATE', `Thêm xe bồn mới: ${payload.plateNumber}`); alert('✅ Thêm xe mới thành công!'); resetForm(); loadVehiclesOnly() }
            else alert('❌ Lỗi: ' + result.message)
        }
    }

    const handleEdit = (vehicle) => {
        const compDetails = vehicle.compartmentDetails || []
        // Nếu cũ chưa có compartmentDetails nhưng có compartments -> tạo form trống
        const numComp = parseInt(vehicle.compartments) || 0
        const details = compDetails.length > 0 ? compDetails : Array.from({ length: numComp }, (_, i) => ({ name: `K${i + 1}`, capacity: '' }))
        setFormData({
            plateNumber: vehicle.plateNumber || '',
            totalCapacity: vehicle.totalCapacity || '',
            compartments: vehicle.compartments || '',
            compartmentDetails: details,
            yearOfManufacture: vehicle.yearOfManufacture || '',
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
            if (result.success) {
                await logAudit('DELETE', `Xóa xe bồn ID: ${id}`);
                loadVehiclesOnly()
            } else alert('❌ Lỗi: ' + result.message)
        }
    }

    const handleExportExcel = () => {
        const tableHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8" />
                <style>
                    table { border-collapse: collapse; font-family: Arial, sans-serif; }
                    th { background-color: #1a4f8b; color: #ffffff; font-weight: bold; border: 1px solid #ddd; padding: 10px; text-align: center; }
                    td { border: 1px solid #ddd; padding: 8px; vertical-align: middle; }
                    .text { mso-number-format:"\\@"; } /* Ép kiểu Text để không bị Excel tuýt còi ####### khi cột quá hẹp hoặc biến ngày thành số */
                    .center { text-align: center; }
                    .header-title { font-size: 24px; font-weight: bold; color: #1a4f8b; text-align: left; }
                </style>
            </head>
            <body>
                <table>
                    <tr><td colspan="11" class="header-title">DANH SÁCH ĐỘI XE VẬN TẢI THƯƠNG MẠI</td></tr>
                    <tr><td colspan="11">Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}</td></tr>
                    <tr><td colspan="11"></td></tr>
                    <tr>
                        <th>STT</th>
                        <th>Biển Kiểm Soát</th>
                        <th>Dung Tích Tổng (L)</th>
                        <th>Số Hầm</th>
                        <th>Chi Tiết Các Khoang</th>
                        <th>Năm SX</th>
                        <th>Tài Xế Phụ Trách</th>
                        <th>Trạng Thái</th>
                        <th>Hạn Đăng Kiểm</th>
                        <th>Hạn GP Nguy Hiểm</th>
                        <th>Ghi Chú</th>
                    </tr>
                    ${vehicles.map((v, index) => {
                        const compInfo = (v.compartmentDetails || []).map(c => `${c.name}: ${Number(c.capacity).toLocaleString()}L`).join(' | ');
                        return `
                        <tr>
                            <td class="center">${index + 1}</td>
                            <td class="center text"><b>${v.plateNumber || ''}</b></td>
                            <td class="center">${v.totalCapacity ? Number(v.totalCapacity).toLocaleString() : ''}</td>
                            <td class="center">${v.compartments || ''}</td>
                            <td class="text">${compInfo}</td>
                            <td class="center">${v.yearOfManufacture || ''}</td>
                            <td>${v.assignedDriverName || 'Chưa gắn tài xế'}</td>
                            <td class="center">${getStatusLabel(v.status)}</td>
                            <td class="center text">${v.inspectionExpiry || ''}</td>
                            <td class="center text">${v.dangerousGoodsExpiry || ''}</td>
                            <td>${v.notes || ''}</td>
                        </tr>
                        `;
                    }).join('')}
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Danh_Sach_Xe_Bon_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    const getStatusLabel = (status) => {
        if (status === 'on_trip' || status === 'working') return 'Đang làm việc'
        if (status === 'inactive' || status === 'Nằm bãi') return 'Nằm bãi'
        return 'Hoạt động'
    }

    const getStatusBadge = (status) => {
        if (status === 'on_trip' || status === 'working' || status === 'Đang làm việc') {
            return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#cce5ff', color: '#004085' }}>🚚 Đang làm việc</span>
        }
        if (status === 'inactive' || status === 'Nằm bãi') {
            return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#f8d7da', color: '#721c24' }}>💤 Nằm bãi</span>
        }
        return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#d4edda', color: '#155724' }}>🟢 Sẵn sàng</span>
    }

    const totalComp = calcTotalFromCompartments()
    const isCompMismatch = formData.totalCapacity && formData.compartmentDetails.length > 0 && Math.abs(totalComp - Number(formData.totalCapacity)) > 10

    const filteredVehicles = vehicles.filter(v =>
        !searchTerm ||
        (v.plateNumber && v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="module-container">
            <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ margin: 0 }}>🚛 Quản Lý Xe Bồn (Fleet)</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', minWidth: 250 }}>
                        <span>🔍</span>
                        <input 
                            type="text" 
                            placeholder="Tìm Biển số, Tên tài xế..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13 }} 
                        />
                    </div>
                    <button className="btn-success" onClick={handleExportExcel} style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>
                        📥 Xuất Excel
                    </button>
                    <button className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm) }}>
                        {showForm ? '✕ Đóng' : '+ Thêm Xe Mới'}
                    </button>
                </div>
            </div>

            {/* Thống kê nhanh */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                    { label: 'Tổng xe', value: vehicles.length, color: '#3498db' },
                    { label: '🚚 Đang làm việc', value: vehicles.filter(v => v.status === 'on_trip' || v.status === 'working').length, color: '#2980b9' },
                    { label: '💤 Nằm bãi / Sẵn sàng', value: vehicles.filter(v => v.status !== 'on_trip' && v.status !== 'working').length, color: '#27ae60' },
                ].map((s, i) => (
                    <div key={i} style={{ background: 'white', padding: '14px', borderRadius: '8px', textAlign: 'center', borderLeft: `4px solid ${s.color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{s.label}</div>
                    </div>
                ))}
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
                            <label>Năm sản xuất / Nhập xe</label>
                            <input type="number" value={formData.yearOfManufacture} onChange={e => setFormData({ ...formData, yearOfManufacture: e.target.value })} placeholder="Vd: 2018" min="1990" max="2030" />
                        </div>
                        <div className="form-group">
                            <label>Số hầm chứa</label>
                            <input type="number" value={formData.compartments} onChange={e => handleCompartmentsChange(e.target.value)} placeholder="Vd: 4" min="1" max="10" />
                        </div>
                        <div className="form-group">
                            <label>
                                Dung tích tổng (Lít)
                                {formData.compartmentDetails.length > 0 && (
                                    <span style={{ fontSize: '11px', marginLeft: '8px', color: isCompMismatch ? '#e74c3c' : '#27ae60' }}>
                                        {isCompMismatch ? `⚠️ Tổng hầm: ${totalComp.toLocaleString()}L` : `✅ Tổng hầm: ${totalComp.toLocaleString()}L`}
                                    </span>
                                )}
                            </label>
                            <input type="number" value={formData.totalCapacity} onChange={e => setFormData({ ...formData, totalCapacity: e.target.value })} placeholder="Vd: 18000" />
                        </div>

                        {/* Danh sách hầm tự sinh */}
                        {formData.compartmentDetails.length > 0 && (
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>📦 Chi tiết dung tích từng hầm (Lít)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '8px' }}>
                                    {formData.compartmentDetails.map((comp, idx) => (
                                        <div key={idx} style={{ background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#3498db' }}>{comp.name}</label>
                                            <input
                                                type="number"
                                                value={comp.capacity}
                                                onChange={e => handleCompartmentCapacityChange(idx, e.target.value)}
                                                placeholder="Lít"
                                                style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {formData.compartmentDetails.length > 0 && (
                                    <div style={{ marginTop: '6px', fontSize: '13px', color: isCompMismatch ? '#e74c3c' : '#27ae60', fontWeight: 'bold' }}>
                                        {isCompMismatch
                                            ? `⚠️ Tổng các hầm (${totalComp.toLocaleString()}L) không khớp với dung tích tổng!`
                                            : `✅ Tổng các hầm: ${totalComp.toLocaleString()} Lít`}
                                    </div>
                                )}
                            </div>
                        )}

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
                            <label>Ảnh Đầu Kéo / Minh Chứng</label>
                            <input type="file" accept="image/*" onChange={handleImageUpload} />
                        </div>
                        {formData.vehicleImage && (
                            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center' }}>
                                <img src={formData.vehicleImage} alt="Vehicle" style={{ width: '100px', height: 'auto', borderRadius: '4px', border: '1px solid #ddd' }} />
                                <span style={{ marginLeft: '10px', fontSize: '12px', color: 'green' }}>✓ Đã chọn ảnh</span>
                            </div>
                        )}
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Ghi chú</label>
                            <input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Ghi chú..." />
                        </div>
                    </div>
                    <div style={{ background: '#e8f4fd', padding: '10px 14px', borderRadius: '6px', marginTop: '10px', fontSize: '13px', color: '#2980b9' }}>
                        ℹ️ <strong>Trạng thái xe được quản lý tự động:</strong> Khi tài xế bắt đầu di chuyển → 🚚 Đang làm việc. Khi hoàn thành chuyến → 💤 Sẵn sàng.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
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
                            <th>Số Hầm / Chi tiết</th>
                            <th>Năm SX</th>
                            <th>Tài xế phụ trách</th>
                            <th>Trạng Thái</th>
                            <th>Hạn Đăng Kiểm</th>
                            <th>Hành Động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVehicles.length === 0 ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>Không tìm thấy xe phù hợp.</td></tr>
                        ) : filteredVehicles.map(v => (
                            <tr key={v.id}>
                                <td>
                                    {v.vehicleImage
                                        ? <img src={v.vehicleImage} alt="xe" style={{ width: '50px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                        : '📸 C/C'
                                    }
                                </td>
                                <td><strong>{v.plateNumber}</strong></td>
                                <td>{v.totalCapacity ? Number(v.totalCapacity).toLocaleString() : '-'}</td>
                                <td>
                                    <div>{v.compartments || '-'} hầm</div>
                                    {(v.compartmentDetails || []).length > 0 && (
                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                            {v.compartmentDetails.map(c => `${c.name}:${Number(c.capacity).toLocaleString()}L`).join(' | ')}
                                        </div>
                                    )}
                                </td>
                                <td>{v.yearOfManufacture || '-'}</td>
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
