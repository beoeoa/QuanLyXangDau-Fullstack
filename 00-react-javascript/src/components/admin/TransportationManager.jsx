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

    // New Order State
    const [newOrder, setNewOrder] = useState({
        assignedDriverId: '',
        vehiclePlate: '',
        destination: '',
        product: '',
        amount: 0
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
        const res = await createDeliveryOrder(newOrder)
        if (res.success) {
            alert('Đã tạo lệnh giao hàng!')
            setShowOrderForm(false)
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
                            <input
                                placeholder="Điểm đến"
                                value={newOrder.destination}
                                onChange={e => setNewOrder({ ...newOrder, destination: e.target.value })}
                                required
                            />
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
