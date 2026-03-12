import { useState, useEffect } from 'react'
import { getAllPrices, addPrice, updatePrice, deletePrice } from '../../services/priceService'
import './AdminModules.css'

const API_URL = 'http://localhost:8080/api'

const PRODUCTS = [
    'Xăng RON 95-III', 'Xăng RON 95-V', 'Xăng E5 RON 92',
    'Dầu Diesel 0.05S', 'Dầu Diesel 0.001S', 'Dầu KO', 'Dầu Mazut'
]

function PriceManager() {
    const [prices, setPrices] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({ product: '', retailPrice: '', wholesalePrice: '', discount: '', effectiveDate: '' })
    const [syncing, setSyncing] = useState(false)
    const [syncMeta, setSyncMeta] = useState(null)

    const load = async () => {
        setLoading(true)
        const data = await getAllPrices()
        setPrices(Array.isArray(data) ? data : [])
        setLoading(false)
    }

    const loadSyncMeta = async () => {
        try {
            const res = await fetch(`${API_URL}/fuel-prices/sync-meta`)
            const data = await res.json()
            setSyncMeta(data)
        } catch (e) { /* ignore */ }
    }

    useEffect(() => { load(); loadSyncMeta() }, [])

    const handleSync = async () => {
        if (syncing) return
        setSyncing(true)
        try {
            const res = await fetch(`${API_URL}/fuel-prices/sync`, { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                alert(`✅ Đã đồng bộ ${data.count} loại xăng dầu theo giá Nhà nước!`)
                load()
                loadSyncMeta()
            } else {
                alert('❌ Lỗi đồng bộ: ' + (data.message || 'Không xác định'))
            }
        } catch (e) {
            alert('❌ Lỗi kết nối: ' + e.message)
        }
        setSyncing(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (editing) {
            await updatePrice(editing, form)
        } else {
            await addPrice(form)
        }
        setShowForm(false)
        setEditing(null)
        setForm({ product: '', retailPrice: '', wholesalePrice: '', discount: '', effectiveDate: '' })
        load()
    }

    const handleEdit = (p) => {
        setForm({
            product: p.product || '',
            retailPrice: p.retailPrice || '',
            wholesalePrice: p.wholesalePrice || '',
            discount: p.discount || '',
            effectiveDate: p.effectiveDate || ''
        })
        setEditing(p.id)
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Xóa bảng giá này?')) {
            await deletePrice(id)
            load()
        }
    }

    const formatSyncTime = (ts) => {
        if (!ts) return 'Chưa đồng bộ'
        const d = new Date(ts?._seconds ? ts._seconds * 1000 : ts)
        if (isNaN(d)) return 'N/A'
        return d.toLocaleString('vi-VN')
    }

    const getLatestPrices = (priceList) => {
        const productMap = {};
        // Sắp xếp giảm dần theo thời gian hiệu lực
        const sorted = [...priceList].sort((a, b) => {
            return new Date(b.effectiveDate || 0) - new Date(a.effectiveDate || 0);
        });
        
        // Chỉ lấy bản ghi mới nhất cho mỗi loại sản phẩm
        sorted.forEach(p => {
            if (!productMap[p.product]) {
                productMap[p.product] = p;
            }
        });
        
        return Object.values(productMap);
    };

    // Chia giá thành 2 nhóm: Nhà nước (isGovPrice) vs Nội bộ
    const govPrices = getLatestPrices(prices.filter(p => p.isGovPrice));
    const customPrices = getLatestPrices(prices.filter(p => !p.isGovPrice));

    if (loading) return <div className="loading-state">Đang tải bảng giá...</div>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <h2>💰 Bảng Giá Xăng Dầu</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleSync} disabled={syncing}
                        style={{
                            padding: '8px 16px', background: syncing ? '#95a5a6' : '#27ae60', color: 'white',
                            border: 'none', borderRadius: 6, cursor: syncing ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6
                        }}>
                        {syncing ? '⏳ Đang đồng bộ...' : '🔄 Đồng bộ giá Nhà nước'}
                    </button>
                    <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ product: '', retailPrice: '', wholesalePrice: '', discount: '', effectiveDate: '' }) }}
                        style={{ padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        {showForm ? '✕ Đóng' : '+ Thêm giá nội bộ'}
                    </button>
                </div>
            </div>

            {/* Sync status banner */}
            <div style={{
                background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                padding: '12px 16px', borderRadius: 8, marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                border: '1px solid #a5d6a7'
            }}>
                <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#2e7d32' }}>
                        🏛️ Giá Bộ Công Thương (tự động cập nhật mỗi 2 giờ)
                    </span>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        Lần sync: <strong>{formatSyncTime(syncMeta?.lastSyncAt)}</strong>
                        {syncMeta?.source && <> | Nguồn: <strong>{syncMeta.source === 'api' ? '🌐 API online' : '📋 Giá BCT mặc định'}</strong></>}
                    </div>
                </div>
                <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: syncMeta?.lastSyncAt ? '#4caf50' : '#ff9800',
                    animation: 'pulse-notif 2s infinite',
                    boxShadow: syncMeta?.lastSyncAt ? '0 0 8px rgba(76,175,80,0.5)' : '0 0 8px rgba(255,152,0,0.5)'
                }} title={syncMeta?.lastSyncAt ? 'Đang hoạt động' : 'Chưa đồng bộ'} />
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, marginBottom: 16 }}>
                    <h4 style={{ marginTop: 0 }}>{editing ? '✏️ Sửa Bảng Giá' : '➕ Thêm Giá Nội Bộ (chiết khấu, thỏa thuận)'}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Loại sản phẩm *</label>
                            <select required value={form.product} onChange={e => setForm({ ...form, product: e.target.value })}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginTop: 4 }}>
                                <option value="">-- Chọn --</option>
                                {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Ngày hiệu lực *</label>
                            <input type="date" required value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Giá bán lẻ (đ/lít) *</label>
                            <input type="number" required value={form.retailPrice} onChange={e => setForm({ ...form, retailPrice: e.target.value })}
                                placeholder="Vd: 22200"
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Giá bán buôn (đ/lít)</label>
                            <input type="number" value={form.wholesalePrice} onChange={e => setForm({ ...form, wholesalePrice: e.target.value })}
                                placeholder="Vd: 21500"
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                        <div>
                            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Chiết khấu (đ/lít)</label>
                            <input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })}
                                placeholder="Vd: 500"
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginTop: 4 }} />
                        </div>
                    </div>
                    <button type="submit" style={{ marginTop: 12, padding: '8px 20px', background: editing ? '#f39c12' : '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                        {editing ? '💾 Cập nhật' : '💾 Lưu'}
                    </button>
                    {editing && (
                        <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                            style={{ marginLeft: 8, padding: '8px 20px', background: '#777', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Hủy</button>
                    )}
                </form>
            )}

            {/* BẢNG GIÁ NHÀ NƯỚC */}
            {govPrices.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        🏛️ Giá Nhà Nước (Bộ Công Thương)
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}>Auto-sync</span>
                    </h3>
                    <div className="table-responsive">
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <thead>
                                <tr style={{ background: '#e8f5e9' }}>
                                    <th style={{ padding: 10, textAlign: 'left' }}>Sản phẩm</th>
                                    <th>Giá bán lẻ (đ/lít)</th>
                                    <th>Giá buôn (đ/lít)</th>
                                    <th>Ngày hiệu lực</th>
                                    <th>Nguồn</th>
                                </tr>
                            </thead>
                            <tbody>
                                {govPrices.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: 10 }}><strong>⛽ {p.product}</strong></td>
                                        <td style={{ textAlign: 'center', color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }}>{Number(p.retailPrice || 0).toLocaleString()}</td>
                                        <td style={{ textAlign: 'center' }}>{p.wholesalePrice ? Number(p.wholesalePrice).toLocaleString() : '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{p.effectiveDate || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: p.source === 'api' ? '#e3f2fd' : '#fff3e0', color: p.source === 'api' ? '#1565c0' : '#e65100' }}>
                                                {p.source === 'api' ? '🌐 API' : '📋 Mặc định'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* BẢNG GIÁ NỘI BỘ / TÙY CHỈNH */}
            <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                📋 Giá Nội Bộ / Thỏa Thuận
                <span style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>— Chiết khấu cho đại lý, giá hợp đồng...</span>
            </h3>
            <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                            <th style={{ padding: 10, textAlign: 'left' }}>Sản phẩm</th>
                            <th>Giá bán lẻ (đ/lít)</th>
                            <th>Giá buôn (đ/lít)</th>
                            <th>Chiết khấu</th>
                            <th>Ngày hiệu lực</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customPrices.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: 20, textAlign: 'center', color: '#999' }}>Chưa có giá nội bộ. Bấm "+ Thêm giá nội bộ" để thêm.</td></tr>
                        ) : customPrices.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: 10 }}><strong>{p.product}</strong></td>
                                <td style={{ textAlign: 'center', color: '#e74c3c', fontWeight: 'bold' }}>{Number(p.retailPrice || 0).toLocaleString()}</td>
                                <td style={{ textAlign: 'center' }}>{p.wholesalePrice ? Number(p.wholesalePrice).toLocaleString() : '-'}</td>
                                <td style={{ textAlign: 'center' }}>{p.discount ? Number(p.discount).toLocaleString() : '-'}</td>
                                <td style={{ textAlign: 'center' }}>{p.effectiveDate || '-'}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <button onClick={() => handleEdit(p)} style={{ padding: '4px 10px', background: '#f39c12', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>✏️</button>
                                    <button onClick={() => handleDelete(p.id)} style={{ padding: '4px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default PriceManager
