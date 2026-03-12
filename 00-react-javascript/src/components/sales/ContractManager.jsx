import { useState, useEffect } from 'react'
import { getAllContracts, addContract, updateContract, deleteContract } from '../../services/contractService'
import '../Dashboard.css'

const CONTRACT_TYPES = ['Mua', 'Bán']
const CONTRACT_STATUSES = ['Hiệu lực', 'Hết hạn', 'Tạm ngưng']

function ContractManager() {
    const [contracts, setContracts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({
        contractNumber: '', type: 'Mua', customerName: '', product: '',
        quantity: '', pricePerUnit: '', startDate: '', endDate: '', status: 'Hiệu lực', notes: ''
    })

    const load = async () => {
        setLoading(true)
        const data = await getAllContracts()
        setContracts(Array.isArray(data) ? data : [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const resetForm = () => {
        setForm({ contractNumber: '', type: 'Mua', customerName: '', product: '', quantity: '', pricePerUnit: '', startDate: '', endDate: '', status: 'Hiệu lực', notes: '' })
        setEditing(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (editing) await updateContract(editing, form)
        else await addContract(form)
        setShowForm(false)
        resetForm()
        load()
    }

    const handleEdit = (c) => {
        setForm({
            contractNumber: c.contractNumber || '', type: c.type || 'Mua',
            customerName: c.customerName || '', product: c.product || '',
            quantity: c.quantity || '', pricePerUnit: c.pricePerUnit || '',
            startDate: c.startDate || '', endDate: c.endDate || '',
            status: c.status || 'Hiệu lực', notes: c.notes || ''
        })
        setEditing(c.id)
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Xóa hợp đồng này?')) { await deleteContract(id); load() }
    }

    const statusColor = (s) => s === 'Hiệu lực' ? '#27ae60' : s === 'Hết hạn' ? '#e74c3c' : '#f39c12'

    if (loading) return <div className="loading-state">Đang tải hợp đồng...</div>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <h2>📝 Quản Lý Hợp Đồng</h2>
                <button onClick={() => { setShowForm(!showForm); resetForm() }}
                    style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    {showForm ? '✕ Đóng' : '+ Tạo Hợp Đồng'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, marginBottom: 16 }}>
                    <h4 style={{ marginTop: 0 }}>{editing ? '✏️ Sửa Hợp Đồng' : '➕ Tạo Hợp Đồng Mới'}</h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Số hợp đồng *</label>
                            <input required value={form.contractNumber} onChange={e => setForm({ ...form, contractNumber: e.target.value })} placeholder="VD: HD-2024-001" />
                        </div>
                        <div className="form-group">
                            <label>Loại *</label>
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Khách hàng / NCC *</label>
                            <input required value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Tên đối tác" />
                        </div>
                        <div className="form-group">
                            <label>Sản phẩm</label>
                            <input value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="VD: Xăng RON 95" />
                        </div>
                        <div className="form-group">
                            <label>Khối lượng (Lít)</label>
                            <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="VD: 50000" />
                        </div>
                        <div className="form-group">
                            <label>Đơn giá (đ/lít)</label>
                            <input type="number" value={form.pricePerUnit} onChange={e => setForm({ ...form, pricePerUnit: e.target.value })} placeholder="VD: 22000" />
                        </div>
                        <div className="form-group">
                            <label>Ngày bắt đầu</label>
                            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Ngày kết thúc</label>
                            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Trạng thái</label>
                            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                {CONTRACT_STATUSES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Ghi chú</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Điều khoản, ghi chú..." />
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

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                {[
                    { label: 'Hợp đồng Mua', value: contracts.filter(c => c.type === 'Mua').length, color: '#3498db' },
                    { label: 'Hợp đồng Bán', value: contracts.filter(c => c.type === 'Bán').length, color: '#27ae60' },
                    { label: 'Tổng giá trị', value: contracts.reduce((s, c) => s + (Number(c.quantity || 0) * Number(c.pricePerUnit || 0)), 0).toLocaleString() + '₫', color: '#f39c12' }
                ].map((s, i) => (
                    <div key={i} style={{ background: 'white', padding: 16, borderRadius: 8, textAlign: 'center', borderLeft: `4px solid ${s.color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: 22, fontWeight: 'bold', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 13, color: '#666' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                            <th style={{ padding: 10, textAlign: 'left' }}>Số HĐ</th>
                            <th>Loại</th><th>Đối tác</th><th>Sản phẩm</th>
                            <th>SL (L)</th><th>Đơn giá</th><th>Giá trị</th>
                            <th>Thời hạn</th><th>TT</th><th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.length === 0 ? (
                            <tr><td colSpan="10" style={{ padding: 20, textAlign: 'center', color: '#999' }}>Chưa có hợp đồng nào.</td></tr>
                        ) : contracts.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: 10 }}><strong>{c.contractNumber}</strong></td>
                                <td style={{ textAlign: 'center' }}><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: c.type === 'Mua' ? '#cce5ff' : '#d4edda' }}>{c.type}</span></td>
                                <td>{c.customerName}</td>
                                <td style={{ textAlign: 'center' }}>{c.product || '-'}</td>
                                <td style={{ textAlign: 'center' }}>{c.quantity ? Number(c.quantity).toLocaleString() : '-'}</td>
                                <td style={{ textAlign: 'center' }}>{c.pricePerUnit ? Number(c.pricePerUnit).toLocaleString() : '-'}</td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#2c3e50' }}>{c.quantity && c.pricePerUnit ? (Number(c.quantity) * Number(c.pricePerUnit)).toLocaleString() + '₫' : '-'}</td>
                                <td style={{ textAlign: 'center', fontSize: 12 }}>{c.startDate || '?'} → {c.endDate || '?'}</td>
                                <td style={{ textAlign: 'center' }}><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, color: 'white', background: statusColor(c.status) }}>{c.status}</span></td>
                                <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => handleEdit(c)} style={{ padding: '4px 10px', background: '#f39c12', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>✏️</button>
                                    <button onClick={() => handleDelete(c.id)} style={{ padding: '4px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ContractManager
