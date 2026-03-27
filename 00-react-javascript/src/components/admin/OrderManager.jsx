import { useState, useEffect } from 'react'
import { getAllOrders } from '../../services/orderService'

function OrderManager() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('')
    
    // Thêm các state lọc
    const [searchQuery, setSearchQuery] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const load = async () => {
        setLoading(true)
        try {
            const data = await getAllOrders()
            // Sắp xếp đơn mới lên đầu
            const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
                const dateA = a.updatedAt || a.createdAt || 0
                const dateB = b.updatedAt || b.createdAt || 0
                return dateB - dateA
            })
            setOrders(sortedData)
        } catch (error) {
            console.error('Lỗi khi tải đơn hàng:', error)
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const filteredOrders = orders.filter(o => {
        if (filterStatus && o.status !== filterStatus) return false
        
        const d = o.requestDate || ''
        if (startDate && d < startDate) return false
        if (endDate && d > endDate) return false

        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            const idMatch = o.id?.toLowerCase().includes(q)
            const nameMatch = o.customerName?.toLowerCase().includes(q)
            if (!idMatch && !nameMatch) return false
        }

        return true
    })

    if (loading) return <div className="loading-state">Đang tải danh sách đơn hàng...</div>

    return (
        <div style={{ padding: '20px' }}>
            <h2>📋 Giám Sát Đơn Hàng (Chỉ Xem)</h2>
            <p style={{ color: '#666', marginBottom: 20 }}>Quản trị viên có thể theo dõi toàn bộ đơn hàng do bộ phận Sales tạo và điều phối.</p>

            {/* Thanh tìm kiếm */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 15, flexWrap: 'wrap', alignItems: 'center', background: '#f8f9fa', padding: '15px', borderRadius: 8 }}>
                <input 
                    type="text" 
                    placeholder="🔍 Tìm mã ĐH hoặc Tên khách..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', minWidth: 250, fontSize: 13 }}
                />
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
                    title="Từ ngày"
                />
                <span style={{ fontSize: 13, color: '#666' }}>đến</span>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: '8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13 }}
                    title="Đến ngày"
                />
                <button 
                   onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setFilterStatus('') }}
                   style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#e74c3c', color: 'white', cursor: 'pointer', fontSize: 13 }}>
                   ✕ Xóa Lọc
                </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <button onClick={() => setFilterStatus('')}
                    style={{ padding: '6px 14px', borderRadius: 20, border: filterStatus === '' ? '2px solid #2980b9' : '1px solid #ddd', background: filterStatus === '' ? '#eaf2f8' : 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                    Tất cả ({orders.length})
                </button>
                <button onClick={() => setFilterStatus('new')}
                    style={{ padding: '6px 14px', borderRadius: 20, border: filterStatus === 'new' ? '2px solid #3498db' : '1px solid #ddd', background: filterStatus === 'new' ? '#ebf5fb' : 'white', cursor: 'pointer' }}>
                    Mới ({orders.filter(o => o.status === 'new').length})
                </button>
                <button onClick={() => setFilterStatus('dispatched')}
                    style={{ padding: '6px 14px', borderRadius: 20, border: filterStatus === 'dispatched' ? '2px solid #f39c12' : '1px solid #ddd', background: filterStatus === 'dispatched' ? '#fef5e7' : 'white', cursor: 'pointer' }}>
                    Đã lên lệnh ({orders.filter(o => o.status === 'dispatched').length})
                </button>
                <button onClick={() => setFilterStatus('completed')}
                    style={{ padding: '6px 14px', borderRadius: 20, border: filterStatus === 'completed' ? '2px solid #27ae60' : '1px solid #ddd', background: filterStatus === 'completed' ? '#eafaf1' : 'white', cursor: 'pointer' }}>
                    Đã hoàn thành ({orders.filter(o => o.status === 'completed').length})
                </button>
            </div>

            <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: 12 }}>Mã ĐH</th>
                            <th>Khách hàng</th>
                            <th>Hàng hóa</th>
                            <th style={{ textAlign: 'center' }}>Số lượng</th>
                            <th style={{ textAlign: 'right' }}>Giá vốn (Tiền hàng)</th>
                            <th style={{ textAlign: 'right' }}>Cước VT</th>
                            <th style={{ textAlign: 'right' }}>Lợi nhuận</th>
                            <th style={{ textAlign: 'right', paddingRight: 12 }}>Tổng giá trị</th>
                            <th style={{ textAlign: 'center' }}>Trạng thái</th>
                            <th>Ngày YC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length === 0 ? (
                            <tr><td colSpan="10" style={{ padding: 30, textAlign: 'center', color: '#999' }}>Chưa có đơn hàng nào trong hệ thống.</td></tr>
                        ) : filteredOrders.map(o => {
                            let totalQty = 0;
                            let totalCost = 0;
                            let totalFreight = 0;
                            let totalMargin = 0;
                            let totalValue = 0;

                            if (o.items && o.items.length > 0) {
                                o.items.forEach(i => {
                                    const qty = Number(i.quantity) || 0;
                                    const c = Number(i.costPrice) || 0;
                                    const m = Number(i.margin) || 0;
                                    const f = Number(i.freight) || 0;
                                    totalQty += qty;
                                    totalCost += qty * c;
                                    totalFreight += qty * f;
                                    totalMargin += qty * m;
                                    totalValue += qty * (c + m + f);
                                });
                            } else {
                                totalQty = Number(o.quantity) || 0;
                                totalCost = totalQty * 20000;
                                totalFreight = totalQty * 200;
                                totalMargin = totalQty * 500;
                                totalValue = totalQty * 20700;
                            }

                            return (
                                <tr key={o.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: 12, color: '#7f8c8d', fontSize: 13 }}>{o.id?.slice(-6).toUpperCase()}</td>
                                    <td><strong>{o.customerName}</strong></td>
                                    <td>
                                        {o.items ? o.items.map((i, idx) => <div key={idx} style={{ fontSize: 12, background: '#ecf0f1', display: 'inline-block', padding: '2px 6px', borderRadius: 4, margin: '2px 2px 0 0' }}>{i.product}</div>) : o.product}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#2980b9' }}>{totalQty.toLocaleString()} L</td>
                                    <td style={{ textAlign: 'right' }}>{totalCost.toLocaleString()} ₫</td>
                                    <td style={{ textAlign: 'right', color: '#e67e22' }}>{totalFreight.toLocaleString()} ₫</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#8e44ad' }}>{totalMargin.toLocaleString()} ₫</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#27ae60', paddingRight: 12 }}>{totalValue.toLocaleString()} ₫</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 'bold',
                                            background: o.status === 'new' ? '#cce5ff' : o.status === 'dispatched' ? '#fff3cd' : '#d4edda',
                                            color: o.status === 'new' ? '#004085' : o.status === 'dispatched' ? '#856404' : '#155724'
                                        }}>
                                            {o.status === 'new' ? 'Mới' : o.status === 'dispatched' ? 'Đã Điều Vận' : 'Hoàn Thành'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 13, color: '#666' }}>{o.requestDate || '-'}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default OrderManager
