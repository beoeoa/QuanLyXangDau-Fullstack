import { useState, useEffect } from 'react'
import { getAllContracts, addContract, updateContract, deleteContract } from '../../services/contractService'
import { getAllCustomers } from '../../services/customerService'
import '../Dashboard.css'

const CONTRACT_TYPES = ['Bán']
const CONTRACT_STATUSES = ['Chờ duyệt', 'Hiệu lực', 'Hết hạn', 'Tạm ngưng']

function ContractManager() {
    const [contracts, setContracts] = useState([])
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({
        contractNumber: '', type: 'Bán', customerName: '', product: '',
        quantity: '', pricePerUnit: '', startDate: '', endDate: '', status: 'Chờ duyệt', notes: ''
    })

    const load = async () => {
        setLoading(true)
        const [contractsData, customersData] = await Promise.all([
            getAllContracts(),
            getAllCustomers()
        ])
        setContracts(Array.isArray(contractsData) ? contractsData : [])
        setCustomers(Array.isArray(customersData) ? customersData : [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const resetForm = () => {
        setForm({ contractNumber: '', type: 'Bán', customerName: '', product: '', quantity: '', pricePerUnit: '', startDate: '', endDate: '', status: 'Chờ duyệt', notes: '' })
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
            contractNumber: c.contractNumber || '', type: 'Bán',
            customerName: c.customerName || '', product: c.product || '',
            quantity: c.quantity || '', pricePerUnit: c.pricePerUnit || '',
            startDate: c.startDate || '', endDate: c.endDate || '',
            status: c.status || 'Chờ duyệt', notes: c.notes || ''
        })
        setEditing(c.id)
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Xóa hợp đồng này?')) { await deleteContract(id); load() }
    }

    const statusColor = (s) => s === 'Hiệu lực' ? '#27ae60' : s === 'Hết hạn' ? '#e74c3c' : '#f39c12'

    const filteredContracts = contracts.filter(c => c.type === 'Bán' && (!searchTerm ||
        (c.customerName && c.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.contractNumber && c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    ));

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
                            <select disabled value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Đại lý (Khách hàng) *</label>
                            <select required value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })}>
                                <option value="">-- Chọn Đại Lý --</option>
                                {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
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
                            <select disabled value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ backgroundColor: '#eeeeee' }}>
                                {CONTRACT_STATUSES.map(s => <option key={s}>{s}</option>)}
                            </select>
                            <small style={{ color: '#e67e22', display: 'block', marginTop: 4 }}>* Cần Giám đốc duyệt để kích hoạt</small>
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
                    { label: 'Hợp đồng Chờ Duyệt', value: contracts.filter(c => c.type === 'Bán' && c.status === 'Chờ duyệt').length, color: '#f39c12' },
                    { label: 'Hợp đồng Bán (Tổng)', value: contracts.filter(c => c.type === 'Bán').length, color: '#27ae60' },
                    { label: 'Doanh số dự kiến', value: contracts.filter(c => c.type === 'Bán').reduce((s, c) => s + (Number(c.quantity || 0) * Number(c.pricePerUnit || 0)), 0).toLocaleString() + '₫', color: '#8e44ad' }
                ].map((s, i) => (
                    <div key={i} style={{ background: 'white', padding: 16, borderRadius: 8, textAlign: 'center', borderLeft: `4px solid ${s.color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: 22, fontWeight: 'bold', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 13, color: '#666' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Thanh tìm kiếm */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '6px 16px', borderRadius: 8, border: '1px solid #ddd', flex: 1, maxWidth: 450, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <span>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Tìm theo Tên đối tác hoặc Số Hợp Đồng..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        style={{ border: 'none', outline: 'none', width: '100%', padding: '6px 0', fontSize: 14 }} 
                    />
                </div>
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
                        {filteredContracts.length === 0 ? (
                            <tr><td colSpan="10" style={{ padding: 20, textAlign: 'center', color: '#999' }}>Chưa có hợp đồng nào phù hợp.</td></tr>
                        ) : filteredContracts.map(c => (
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
