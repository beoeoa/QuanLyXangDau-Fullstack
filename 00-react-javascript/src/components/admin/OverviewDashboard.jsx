import { useState, useEffect } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement
} from 'chart.js'
import { getAllUsers } from '../../services/userService'
import { getAllFleetVehicles } from '../../services/fleetVehicleService'
import { getAllDeliveryOrders } from '../../services/transportationService'
import { getAllExpenses } from '../../services/driverExpenseService'
import './AdminModules.css'

// Đăng ký Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

function OverviewDashboard() {
    const [stats, setStats] = useState({
        totalRevenue: 0, totalCost: 0,
        activeVehicles: 0, totalVehicles: 0,
        totalEmployees: 0, drivers: 0, sales: 0, accountants: 0, admins: 0,
        products: 0, transactions: 0
    })
    const [revenueChartData, setRevenueChartData] = useState(null)
    const [costChartData, setCostChartData] = useState(null)
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadDashboard() }, [])

    const loadDashboard = async () => {
        setLoading(true)
        try {
            const [users, vehicles, deliveryOrders, expenses] = await Promise.all([
                getAllUsers(),
                getAllFleetVehicles(),
                getAllDeliveryOrders(),
                getAllExpenses()
            ])

            // === KPI Stats ===
            const completedOrders = deliveryOrders.filter(o => o.status === 'completed')
            const revenue = completedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0) * 20000, 0) // Doanh thu tương tự bên kế toán

            const approvedExpenses = expenses.filter(e => e.status === 'approved')
            const cost = approvedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

            const approvedUsers = users.filter(u => u.isApproved !== false)
            const driverCount = approvedUsers.filter(u => u.role === 'driver').length
            const salesCount = approvedUsers.filter(u => u.role === 'sales').length
            const accountantCount = approvedUsers.filter(u => u.role === 'accountant').length
            const adminCount = approvedUsers.filter(u => u.role === 'admin').length

            // Xe hoạt động = xe đang có lệnh ở các trạng thái chưa hoàn thành (đồng bộ với STATUS_STEPS trong DriverDashboard)
            const activeStatuses = ['pending', 'received', 'moving', 'arrived', 'unloading']
            const activeVehiclePlates = new Set(deliveryOrders.filter(o => activeStatuses.includes(o.status)).map(o => o.vehiclePlate))
            const activeVehicleCount = activeVehiclePlates.size

            setStats({
                totalRevenue: revenue, totalCost: cost,
                activeVehicles: activeVehicleCount, totalVehicles: vehicles.length,
                totalEmployees: approvedUsers.length, drivers: driverCount,
                sales: salesCount, accountants: accountantCount, admins: adminCount,
            })

            // === Biểu đồ Doanh thu theo tháng ===
            const monthlyRevenue = {}
            const monthlyCost = {}
            const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
            months.forEach(m => { monthlyRevenue[m] = 0; monthlyCost[m] = 0 })

            completedOrders.forEach(o => {
                let dateStr = o.updatedAt || o.createdAt
                if (dateStr) {
                    let d = new Date(dateStr?._seconds ? dateStr._seconds * 1000 : dateStr)
                    if (!isNaN(d)) {
                        const mKey = `T${d.getMonth() + 1}`
                        monthlyRevenue[mKey] += (Number(o.amount) || 0) * 20000
                    }
                }
            })

            approvedExpenses.forEach(e => {
                let dateStr = e.date || e.createdAt
                if (dateStr) {
                    let d = new Date(dateStr?._seconds ? dateStr._seconds * 1000 : dateStr)
                    if (!isNaN(d)) {
                        const mKey = `T${d.getMonth() + 1}`
                        monthlyCost[mKey] += (Number(e.amount) || 0)
                    }
                }
            })

            setRevenueChartData({
                labels: months,
                datasets: [
                    {
                        label: 'Doanh thu (Xuất)',
                        data: months.map(m => monthlyRevenue[m]),
                        backgroundColor: 'rgba(46, 204, 113, 0.7)',
                        borderColor: '#27ae60',
                        borderWidth: 1
                    },
                    {
                        label: 'Chi phí (Nhập)',
                        data: months.map(m => monthlyCost[m]),
                        backgroundColor: 'rgba(231, 76, 60, 0.7)',
                        borderColor: '#c0392b',
                        borderWidth: 1
                    }
                ]
            })

            // === Biểu đồ Tròn chi phí ===
            setCostChartData({
                labels: ['Mua Dầu (Nhập kho)', 'Cầu đường (BOT)', 'Bảo dưỡng xe', 'Quỹ lương'],
                datasets: [{
                    data: [cost * 0.6, cost * 0.15, cost * 0.1, cost * 0.15],
                    backgroundColor: ['#e74c3c', '#f39c12', '#3498db', '#9b59b6'],
                    borderWidth: 2
                }]
            })

            // === Cảnh báo giấy tờ hết hạn ===
            const now = new Date()
            const alertList = []
            const DAYS_WARN = 30

            approvedUsers.forEach(u => {
                if (u.licenseExpiry) {
                    const exp = new Date(u.licenseExpiry)
                    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
                    if (diff <= DAYS_WARN && diff > 0) {
                        alertList.push({ type: 'Bằng lái', name: u.fullname || u.email, days: diff, icon: '🪪' })
                    } else if (diff <= 0) {
                        alertList.push({ type: 'Bằng lái (ĐÃ HẾT HẠN)', name: u.fullname || u.email, days: diff, icon: '🪪' })
                    }
                }
                if (u.pcccExpiry) {
                    const exp = new Date(u.pcccExpiry)
                    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
                    if (diff <= DAYS_WARN && diff > 0) {
                        alertList.push({ type: 'Chứng chỉ PCCC', name: u.fullname || u.email, days: diff, icon: '🧯' })
                    } else if (diff <= 0) {
                        alertList.push({ type: 'PCCC (ĐÃ HẾT HẠN)', name: u.fullname || u.email, days: diff, icon: '🧯' })
                    }
                }
            })

            vehicles.forEach(v => {
                if (v.inspectionExpiry) {
                    const exp = new Date(v.inspectionExpiry)
                    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
                    if (diff <= DAYS_WARN && diff > 0) {
                        alertList.push({ type: 'Đăng kiểm xe', name: `Xe ${v.plateNumber}`, days: diff, icon: '🚛' })
                    } else if (diff <= 0) {
                        alertList.push({ type: 'Đăng kiểm (ĐÃ HẾT HẠN)', name: `Xe ${v.plateNumber}`, days: diff, icon: '🚛' })
                    }
                }
                if (v.dangerousGoodsExpiry) {
                    const exp = new Date(v.dangerousGoodsExpiry)
                    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
                    if (diff <= DAYS_WARN && diff > 0) {
                        alertList.push({ type: 'GP Vận chuyển hàng nguy hiểm', name: `Xe ${v.plateNumber}`, days: diff, icon: '⚠️' })
                    } else if (diff <= 0) {
                        alertList.push({ type: 'GP Hàng nguy hiểm (ĐÃ HẾT HẠN)', name: `Xe ${v.plateNumber}`, days: diff, icon: '⚠️' })
                    }
                }
            })

            alertList.sort((a, b) => a.days - b.days)
            setAlerts(alertList)

        } catch (e) {
            console.error('Dashboard load error', e)
        }
        setLoading(false)
    }

    if (loading) return <div className="loading-state">Đang tải Dashboard...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ========== KPI CARDS ========== */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="stat-card" style={{ borderLeft: '4px solid #27ae60' }}>
                    <div className="stat-icon" style={{ color: '#27ae60' }}>💰</div>
                    <div className="stat-info">
                        <h3>Tổng Doanh Thu</h3>
                        <p className="stat-number">{stats.totalRevenue.toLocaleString()}đ</p>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #e74c3c' }}>
                    <div className="stat-icon" style={{ color: '#e74c3c' }}>💸</div>
                    <div className="stat-info">
                        <h3>Tổng Chi Phí</h3>
                        <p className="stat-number">{stats.totalCost.toLocaleString()}đ</p>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #3498db' }}>
                    <div className="stat-icon" style={{ color: '#3498db' }}>🚚</div>
                    <div className="stat-info">
                        <h3>Xe Hoạt Động</h3>
                        <p className="stat-number">{stats.activeVehicles} / {stats.totalVehicles}</p>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #9b59b6' }}>
                    <div className="stat-icon" style={{ color: '#9b59b6' }}>👥</div>
                    <div className="stat-info">
                        <h3>Tổng Nhân Sự</h3>
                        <p className="stat-number">{stats.totalEmployees}</p>
                    </div>
                </div>
            </div>

            {/* ========== BIỂU ĐỒ ========== */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginTop: 0 }}>📊 Doanh Thu & Chi Phí Theo Tháng</h3>
                    {revenueChartData && (
                        <Bar data={revenueChartData} options={{
                            responsive: true,
                            plugins: { legend: { position: 'top' } },
                            scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + 'đ' } } }
                        }} />
                    )}
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginTop: 0 }}>📈 Cơ cấu Chi Phí</h3>
                    {costChartData && (
                        <Doughnut data={costChartData} options={{
                            responsive: true,
                            plugins: { legend: { position: 'bottom' } },
                        }} />
                    )}
                </div>
            </div>

            {/* ========== TỔNG QUAN NHÂN SỰ ========== */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0 }}>👥 Tổng Quan Nhân Sự</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                    <div style={{ textAlign: 'center', padding: '15px', background: '#eaf2f8', borderRadius: '8px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2980b9' }}>{stats.drivers}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>🚗 Tài Xế</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '15px', background: '#fef9e7', borderRadius: '8px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f39c12' }}>{stats.sales}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>🛒 Sale</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '15px', background: '#f5eef8', borderRadius: '8px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#8e44ad' }}>{stats.accountants}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>📒 Kế Toán</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '15px', background: '#eafaf1', borderRadius: '8px' }}>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#27ae60' }}>{stats.admins}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>👑 Admin</div>
                    </div>
                </div>
            </div>

            {/* ========== CẢNH BÁO GIẤY TỜ HẾT HẠN ========== */}
            <div style={{ background: alerts.length > 0 ? '#fff5f5' : 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: alerts.length > 0 ? '2px solid #e74c3c' : 'none' }}>
                <h3 style={{ marginTop: 0, color: '#c0392b' }}>🔴 Cảnh Báo Giấy Tờ Sắp Hết Hạn</h3>
                {alerts.length === 0 ? (
                    <p style={{ color: '#27ae60' }}>✅ Không có giấy tờ nào sắp hết hạn. Hệ thống hoạt động bình thường!</p>
                ) : (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {alerts.map((a, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 15px', backgroundColor: a.days <= 0 ? '#fce4e4' : '#fff8e1',
                                borderRadius: '6px', borderLeft: a.days <= 0 ? '4px solid #e74c3c' : '4px solid #f39c12'
                            }}>
                                <div>
                                    <span style={{ fontSize: '16px', marginRight: '8px' }}>{a.icon}</span>
                                    <strong>{a.name}</strong> — {a.type}
                                </div>
                                <span style={{
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold',
                                    backgroundColor: a.days <= 0 ? '#e74c3c' : '#f39c12',
                                    color: 'white'
                                }}>
                                    {a.days <= 0 ? 'ĐÃ HẾT HẠN' : `Còn ${a.days} ngày`}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default OverviewDashboard
