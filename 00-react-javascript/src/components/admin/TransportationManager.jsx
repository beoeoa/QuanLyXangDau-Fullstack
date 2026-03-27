import { useState, useEffect } from 'react'
import {
    getAllVehicles,
    addVehicle,
    createDeliveryOrder,
    getAllDeliveryOrders
} from '../../services/transportationService'
import { getUsersByRole } from '../../services/userService'
import './AdminModules.css'

function TransportationManager() {
    const [vehicles, setVehicles] = useState([])
    const [drivers, setDrivers] = useState([])
    const [activeOrders, setActiveOrders] = useState([])
    const [showVehicleForm, setShowVehicleForm] = useState(false)
    const [showOrderForm, setShowOrderForm] = useState(false)

    // New Vehicle State
    const [newVehicle, setNewVehicle] = useState({
        plate: '',
        type: 'Truck',
        capacity: 0,
        fuelConsumption: 0
    })

    const [newOrder, setNewOrder] = useState({
        assignedDriverId: '',
        vehiclePlate: '',
        items: [{ product: '', amount: '', compartment: '', destination: '' }]
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const [vList, dList, oList] = await Promise.all([
            getAllVehicles(),
            getUsersByRole('driver'),
            getAllDeliveryOrders()
        ])
        setVehicles(vList)
        setDrivers(dList)
        setActiveOrders(oList.filter(o => o.status !== 'completed' && o.status !== 'cancelled'))
    }

    const handleAddVehicle = async (e) => {
        e.preventDefault()
        const res = await addVehicle(newVehicle)
        if (res.success) {
            alert('Đã thêm phương tiện!')
            setShowVehicleForm(false)
            loadData()
        }
    }

    const handleCreateOrder = async (e) => {
        e.preventDefault()

        const validItems = (newOrder.items || []).filter(i => i.product && i.amount)
        if (validItems.length === 0) {
            alert('Vui lòng nhập ít nhất 1 mặt hàng!')
            return
        }

        const uniqueDests = [...new Set(validItems.map(i => i.destination).filter(Boolean))]

        const res = await createDeliveryOrder({
            ...newOrder,
            destination: uniqueDests.join(' | '),
            items: validItems,
            product: validItems.map(i => i.product).join(', '),
            amount: validItems.reduce((sum, i) => sum + Number(i.amount), 0)
        })
        if (res.success) {
            alert('Đã tạo lệnh giao hàng!')
            setShowOrderForm(false)
            setNewOrder({ assignedDriverId: '', vehiclePlate: '', items: [{ product: '', amount: '', compartment: '', destination: '' }] })
            loadData()
        }
    }

    return (
        <div className="module-container">
            <div className="module-header">
                <h2>🚚 Quản lý Vận tải & Điều độ</h2>
                <div className="header-actions">
                    <button className="btn-primary" onClick={() => setShowVehicleForm(true)}>+ Thêm Xe</button>
                    <button className="btn-secondary" onClick={() => setShowOrderForm(true)}>+ Lệnh Điều Xe</button>
                </div>
            </div>

            <div className="content-grid">
                <section className="data-section">
                    <h3>Danh sách Phương tiện</h3>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Biển số</th>
                                <th>Loại</th>
                                <th>Dung tích</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehicles.map(v => (
                                <tr key={v.id}>
                                    <td>{v.plate}</td>
                                    <td>{v.type}</td>
                                    <td>{v.capacity} Lít</td>
                                    <td><span className={`status-badge ${v.status}`}>{v.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>

            {/* Modals for Forms */}
            {showVehicleForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Thêm xe mới</h3>
                        <form onSubmit={handleAddVehicle}>
                            <input
                                placeholder="Biển số xe"
                                value={newVehicle.plate}
                                onChange={e => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                                required
                            />
                            <input
                                type="number"
                                placeholder="Dung tích bồn (Lít)"
                                value={newVehicle.capacity}
                                onChange={e => setNewVehicle({ ...newVehicle, capacity: Number(e.target.value) })}
                                required
                            />
                            <div className="modal-buttons">
                                <button type="button" onClick={() => setShowVehicleForm(false)}>Hủy</button>
                                <button type="submit" className="btn-primary">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showOrderForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Tạo lệnh điều xe</h3>
                        <form onSubmit={handleCreateOrder}>
                            <select
                                value={newOrder.assignedDriverId}
                                onChange={e => setNewOrder({ ...newOrder, assignedDriverId: e.target.value })}
                                required
                            >
                                <option value="">Chọn Tài xế</option>
                                {drivers
                                    .filter(d => !activeOrders.some(o => o.assignedDriverId === d.id))
                                    .map(d => <option key={d.id} value={d.id}>{d.fullname} (Rảnh)</option>)}
                            </select>
                            <select
                                value={newOrder.vehiclePlate}
                                onChange={e => setNewOrder({ ...newOrder, vehiclePlate: e.target.value })}
                                required
                            >
                                <option value="">Chọn Xe</option>
                                {vehicles
                                    .filter(v => v.status === 'available' && !activeOrders.some(o => o.vehiclePlate === v.plate))
                                    .map(v => <option key={v.id} value={v.plate}>{v.plate} (Rảnh)</option>)}
                            </select>
                            <div style={{ marginBottom: 16, marginTop: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <label style={{ fontWeight: 'bold', fontSize: 13 }}>Gán Mặt Hàng & Đại lý Nhận (Khách)</label>
                                    <button type="button" onClick={() => setNewOrder({ ...newOrder, items: [...(newOrder.items || []), { product: '', amount: '', compartment: '', destination: '' }] })}
                                        className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>+ Thêm Điểm/Hầm</button>
                                </div>
                                {(newOrder.items || []).map((item, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 2fr 40px', gap: 10, marginBottom: 8, alignItems: 'center', background: '#f5f5f5', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
                                        <input type="text" placeholder="Hầm K1" value={item.compartment}
                                            onChange={e => {
                                                const n = [...newOrder.items]; n[idx].compartment = e.target.value; setNewOrder({ ...newOrder, items: n })
                                            }} style={{ margin: 0 }} />
                                        <input type="text" required placeholder="Điểm đến (Đại lý)" value={item.destination}
                                            onChange={e => {
                                                const n = [...newOrder.items]; n[idx].destination = e.target.value; setNewOrder({ ...newOrder, items: n })
                                            }} style={{ margin: 0 }} />
                                        <input type="text" required placeholder="Tên hàng" value={item.product}
                                            onChange={e => {
                                                const n = [...newOrder.items]; n[idx].product = e.target.value; setNewOrder({ ...newOrder, items: n })
                                            }} style={{ margin: 0 }} />
                                        <input type="number" required placeholder="Lít" value={item.amount}
                                            onChange={e => {
                                                const n = [...newOrder.items]; n[idx].amount = e.target.value; setNewOrder({ ...newOrder, items: n })
                                            }} style={{ margin: 0 }} />
                                        <button type="button" onClick={() => {
                                            if (newOrder.items.length === 1) return;
                                            const n = newOrder.items.filter((_, i) => i !== idx); setNewOrder({ ...newOrder, items: n })
                                        }} style={{ width: 30, height: 30, background: '#e74c3c', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0 }}>✕</button>
                                    </div>
                                ))}
                            </div>

                            <div className="modal-buttons">
                                <button type="button" onClick={() => setShowOrderForm(false)}>Hủy</button>
                                <button type="submit" className="btn-primary">Phát lệnh</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TransportationManager
