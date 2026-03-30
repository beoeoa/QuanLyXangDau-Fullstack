import { useState, useEffect } from 'react'
import { getAllShipments, createShipment, updateShipment, deleteShipment, getGovWarehouses } from '../../services/shipmentService'
import '../Dashboard.css'

const PRODUCTS = ['Xăng RON 95-III', 'Xăng E5 RON 92', 'Dầu Diesel 0.05S', 'Dầu Diesel 0.001S', 'Dầu KO', 'Dầu Mazut']
const STATUSES = [
    { key: 'pending', label: '⏳ Chờ lấy hàng', color: '#f39c12' },
    { key: 'loading', label: '🔄 Đang lấy hàng', color: '#3498db' },
    { key: 'loaded', label: '✅ Đã lấy hàng', color: '#2ecc71' },
    { key: 'in_transit', label: '🚚 Đang vận chuyển', color: '#9b59b6' },
    { key: 'delivered', label: '📦 Đã giao', color: '#27ae60' },
    { key: 'completed', label: '🏁 Hoàn thành', color: '#2c3e50' }
]

function ShipmentManager({ vehicles = [], drivers = [] }) {
    const [shipments, setShipments] = useState([])
    const [warehouses, setWarehouses] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)
    const [filterStatus, setFilterStatus] = useState('')
    const [form, setForm] = useState({
        sourceWarehouse: '', product: '', quantity: '', sealCode: '',
        vehiclePlate: '', driverName: '', driverId: '', destination: '',
        status: 'pending', notes: '', deliveredQuantity: ''
    })

    const [aiSuggestions, setAiSuggestions] = useState(null)
    const [loadingAI, setLoadingAI] = useState(false)

    const load = async () => {
        setLoading(true)
        const [data, wh] = await Promise.all([getAllShipments(), getGovWarehouses()])
        setShipments(Array.isArray(data) ? data : [])
        setWarehouses(Array.isArray(wh) ? wh : [])
        setLoading(false)
    }

    const fetchAISuggestions = async () => {
        if (!form.quantity) {
            alert('Vui lòng nhập Số lượng xuất (Lít) trước khi dùng AI!');
            return;
        }
        setLoadingAI(true);
        import('../../services/shipmentService').then(async (mod) => {
            const data = await mod.getAIDispatchSuggestions(form.quantity, form.destination || '');
            setAiSuggestions(data);
            setLoadingAI(false);
        }).catch(() => {
            alert('Có lỗi tải thư viện AI');
            setLoadingAI(false);
        })
    }

    useEffect(() => { load() }, [])

    const resetForm = () => {
        setForm({ sourceWarehouse: '', product: '', quantity: '', sealCode: '', vehiclePlate: '', driverName: '', driverId: '', destination: '', status: 'pending', notes: '', deliveredQuantity: '' })
        setEditing(null)
        setAiSuggestions(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (editing) await updateShipment(editing, form)
        else await createShipment(form)
        setShowForm(false); resetForm(); load()
    }

    const handleEdit = (s) => {
        setForm({
            sourceWarehouse: s.sourceWarehouse || '', product: s.product || '', quantity: s.quantity || '',
            sealCode: s.sealCode || '', vehiclePlate: s.vehiclePlate || '', driverName: s.driverName || '',
            driverId: s.driverId || '', destination: s.destination || '', status: s.status || 'pending',
            notes: s.notes || '', deliveredQuantity: s.deliveredQuantity || ''
        })
        setEditing(s.id); setShowForm(true); setAiSuggestions(null)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Xóa chuyến hàng này?')) { await deleteShipment(id); load() }
    }

    const handleStatusChange = async (id, newStatus) => {
        await updateShipment(id, { status: newStatus })
        load()
    }

    const getStatusInfo = (key) => STATUSES.find(s => s.key === key) || { label: key, color: '#999' }
    const filteredShipments = filterStatus ? shipments.filter(s => s.status === filterStatus) : shipments

    // Stats
    const totalQuantity = shipments.reduce((s, sh) => s + Number(sh.quantity || 0), 0)
    const totalDelivered = shipments.filter(s => s.status === 'delivered' || s.status === 'completed')
        .reduce((s, sh) => s + Number(sh.deliveredQuantity || sh.quantity || 0), 0)
    const totalLoss = shipments.filter(s => s.deliveredQuantity)
        .reduce((s, sh) => s + (Number(sh.quantity || 0) - Number(sh.deliveredQuantity || 0)), 0)
    const inTransit = shipments.filter(s => s.status === 'in_transit' || s.status === 'loading' || s.status === 'loaded').length

    if (loading) return <div className="loading-state">Đang tải chuyến hàng...</div>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <h2>🚛 Quản Lý Chuyến Hàng</h2>
                <button onClick={() => { setShowForm(!showForm); resetForm() }}
                    style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    {showForm ? '✕ Đóng' : '+ Tạo Chuyến Hàng'}
                </button>
            </div>

            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                {[
                    { icon: '⛽', label: 'Tổng xuất (L)', value: totalQuantity.toLocaleString(), color: '#3498db' },
                    { icon: '📦', label: 'Đã giao (L)', value: totalDelivered.toLocaleString(), color: '#27ae60' },
                    { icon: '📉', label: 'Hao hụt (L)', value: totalLoss.toLocaleString(), color: totalLoss > 0 ? '#e74c3c' : '#27ae60' },
                    { icon: '🚚', label: 'Đang vận chuyển', value: inTransit, color: '#f39c12' }
                ].map((s, i) => (
                    <div key={i} style={{ background: 'white', padding: 16, borderRadius: 8, textAlign: 'center', borderLeft: `4px solid ${s.color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: 24 }}>{s.icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 'bold', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, marginBottom: 16 }}>
                    <h4 style={{ marginTop: 0 }}>{editing ? '✏️ Sửa Chuyến Hàng' : '➕ Tạo Chuyến Hàng Mới'}</h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Kho nguồn (Nhà nước) *</label>
                            <select required value={form.sourceWarehouse} onChange={e => setForm({ ...form, sourceWarehouse: e.target.value })}>
                                <option value="">-- Chọn kho --</option>
                                {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Sản phẩm *</label>
                            <select required value={form.product} onChange={e => setForm({ ...form, product: e.target.value })}>
                                <option value="">-- Chọn --</option>
                                {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Số lượng xuất (Lít) *</label>
                            <input type="number" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="VD: 15000" />
                        </div>
                        <div className="form-group">
                            <label>Số Seal niêm phong</label>
                            <input value={form.sealCode} onChange={e => setForm({ ...form, sealCode: e.target.value })} placeholder="VD: SEAL-2024-0892" />
                        </div>
                        
                        {/* AI DISPATCHING WIDGET */}
                        <div style={{ gridColumn: '1 / -1', background: '#e1f5fe', padding: 12, borderRadius: 8, marginTop: 8, marginBottom: 8, border: '1px solid #81d4fa' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ color: '#0277bd', fontSize: 14 }}>🤖 Hệ thống Gợi ý Điều Phối (AI Dispatching)</strong>
                                <button type="button" onClick={fetchAISuggestions} disabled={loadingAI} style={{ background: '#0288d1', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>
                                    {loadingAI ? 'Đang phân tích...' : '✨ Tìm Xe & Tài xế Tối ưu'}
                                </button>
                            </div>
                            {aiSuggestions && aiSuggestions.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    {aiSuggestions.map((sg, idx) => (
                                        <div key={idx} style={{ background: '#fff', padding: 8, borderRadius: 6, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                            <div>
                                                <div style={{ fontSize: 14 }}><strong>Tài xế:</strong> {sg.driverName} | <strong>Xe:</strong> {sg.vehiclePlate} ({sg.vehicleCapacity}L)</div>
                                                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>💡 Lý do: {sg.reason}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ background: '#4caf50', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 'bold' }}>Điểm: {sg.score}</span>
                                                <button type="button" onClick={() => {
                                                    const d = drivers.find(dr => dr.id === sg.driverId);
                                                    setForm({ ...form, vehiclePlate: sg.vehiclePlate, driverId: sg.driverId, driverName: d?.name || sg.driverName });
                                                    setAiSuggestions(null);
                                                }} style={{ background: '#f39c12', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>Áp dụng</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {aiSuggestions && aiSuggestions.length === 0 && (
                                <div style={{ marginTop: 12, color: '#c0392b', fontSize: 13, fontWeight: 'bold' }}>Không tìm thấy Xe / Tài xế nào đang rảnh đủ tải trọng!</div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Biển số xe bồn *</label>
                            <select required value={form.vehiclePlate} onChange={e => setForm({ ...form, vehiclePlate: e.target.value })}>
                                <option value="">-- Chọn xe --</option>
                                {vehicles.map(v => <option key={v.id} value={v.plateNumber || v.plate}>{v.plateNumber || v.plate} ({v.capacity || '?'}L)</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Tài xế *</label>
                            <select required value={form.driverId} onChange={e => {
                                const d = drivers.find(dr => dr.id === e.target.value)
                                setForm({ ...form, driverId: e.target.value, driverName: d?.name || '' })
                            }}>
                                <option value="">-- Chọn tài xế --</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Điểm giao (Đại lý / Cây xăng) *</label>
                            <input required value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="VD: CHXD Lê Hồng Phong" />
                        </div>
                        <div className="form-group">
                            <label>Trạng thái</label>
                            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </select>
                        </div>
                        {(form.status === 'delivered' || form.status === 'completed') && (
                            <div className="form-group">
                                <label>Số lít thực giao</label>
                                <input type="number" value={form.deliveredQuantity} onChange={e => setForm({ ...form, deliveredQuantity: e.target.value })} placeholder="VD: 14850" />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Ghi chú</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú thêm..." />
                        </div>
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <button type="submit" style={{ padding: '8px 20px', background: editing ? '#f39c12' : '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            {editing ? '💾 Cập nhật' : '💾 Lưu'}
                        </button>
                        <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                            style={{ padding: '8px 20px', background: '#777', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Hủy</button>
                    </div>
                </form>
            )}

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <button onClick={() => setFilterStatus('')}
                    style={{ padding: '4px 12px', borderRadius: 15, border: filterStatus === '' ? '2px solid #3498db' : '1px solid #ddd', background: filterStatus === '' ? '#e3f2fd' : 'white', cursor: 'pointer', fontSize: 12 }}>
                    Tất cả ({shipments.length})
                </button>
                {STATUSES.map(s => {
                    const count = shipments.filter(sh => sh.status === s.key).length
                    return (
                        <button key={s.key} onClick={() => setFilterStatus(s.key)}
                            style={{ padding: '4px 12px', borderRadius: 15, border: filterStatus === s.key ? `2px solid ${s.color}` : '1px solid #ddd', background: filterStatus === s.key ? s.color + '20' : 'white', cursor: 'pointer', fontSize: 12 }}>
                            {s.label} ({count})
                        </button>
                    )
                })}
            </div>

            {/* Table */}
            <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                            <th style={{ padding: 10, textAlign: 'left' }}>Kho nguồn</th>
                            <th>Hàng</th><th>Xuất (L)</th><th>Giao (L)</th><th>Hao hụt</th>
                            <th>Seal</th><th>Xe</th><th>Tài xế</th><th>Điểm giao</th>
                            <th>Trạng thái</th><th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredShipments.length === 0 ? (
                            <tr><td colSpan="11" style={{ padding: 20, textAlign: 'center', color: '#999' }}>Chưa có chuyến hàng.</td></tr>
                        ) : filteredShipments.map(s => {
                            const status = getStatusInfo(s.status)
                            const loss = s.deliveredQuantity ? Number(s.quantity || 0) - Number(s.deliveredQuantity) : null
                            const lossPercent = loss !== null && Number(s.quantity) > 0 ? ((loss / Number(s.quantity)) * 100).toFixed(2) : null
                            return (
                                <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: 10 }}><strong>📍 {s.sourceWarehouse}</strong></td>
                                    <td style={{ textAlign: 'center' }}>{s.product}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{Number(s.quantity || 0).toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>{s.deliveredQuantity ? Number(s.deliveredQuantity).toLocaleString() : '-'}</td>
                                    <td style={{ textAlign: 'center', color: loss > 0 ? '#e74c3c' : '#27ae60', fontWeight: loss !== null ? 'bold' : 'normal' }}>
                                        {loss !== null ? `${loss.toLocaleString()}L (${lossPercent}%)` : '-'}
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: 12 }}>{s.sealCode || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{s.vehiclePlate || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{s.driverName || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{s.destination || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <select value={s.status} onChange={e => handleStatusChange(s.id, e.target.value)}
                                            style={{ padding: '3px 6px', borderRadius: 6, border: `2px solid ${status.color}`, background: status.color + '15', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                            {STATUSES.map(st => <option key={st.key} value={st.key}>{st.label}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => handleEdit(s)} style={{ padding: '4px 8px', background: '#f39c12', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>✏️</button>
                                        <button onClick={() => handleDelete(s.id)} style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ShipmentManager
