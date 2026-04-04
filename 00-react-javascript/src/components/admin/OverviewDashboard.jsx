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
import { getAllTransactions } from '../../services/transactionService'
import { getAllOrders } from '../../services/orderService'
import { DollarSign, Wallet, TrendingUp, Truck, Users, BadgeAlert, Flame, FileWarning, Package } from 'lucide-react'
import './AdminModules.css'
import DateRangeFilter, { filterByDate } from '../shared/DateRangeFilter'

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
    const [filterFrom, setFilterFrom] = useState(null)
    const [filterTo, setFilterTo] = useState(null)

    // Raw Data for filtering
    const [rawData, setRawData] = useState({
        users: [], vehicles: [], deliveryOrders: [],
        expenses: [], transactions: [], orders: []
    })

    useEffect(() => { loadDashboard() }, [])

    const loadDashboard = async () => {
        setLoading(true)
        try {
            const [users, vehicles, deliveryOrders, expenses, transactions, orders] = await Promise.all([
                getAllUsers(),
                getAllFleetVehicles(),
                getAllDeliveryOrders(),
                getAllExpenses(),
                getAllTransactions(),
                getAllOrders()
            ])
            setRawData({ users, vehicles, deliveryOrders, expenses, transactions, orders })
        } catch (e) {
            console.error('Dashboard load error', e)
        }
        setLoading(false)
    }

    // Recalculate everything when rawData or filters change
    useEffect(() => {
        if (!rawData.users.length && !loading) return;
        calculateStats()
    }, [rawData, filterFrom, filterTo])

    const calculateStats = () => {
        const { users, vehicles, deliveryOrders, expenses, transactions, orders } = rawData;

        const ordersCache = new WeakMap();
        const getPricing = (orderId, product, reqOrders) => {
            if (!reqOrders) return { cost: 0, margin: 0, freight: 0, totalUnit: 20700 };
            let map = ordersCache.get(reqOrders);
            if (!map) {
                map = new Map();
                for (let i = 0; i < reqOrders.length; i++) {
                    map.set(reqOrders[i].id, reqOrders[i]);
                }
                ordersCache.set(reqOrders, map);
            }
            const o = map.get(orderId) || {};
            const i = (o.items || []).find(it => it.product === product) || { costPrice: 20000, margin: 500, freight: 200 };
            return {
                cost: Number(i.costPrice || 0),
                margin: Number(i.margin || 0),
                freight: Number(i.freight || 0),
                totalUnit: Number(i.costPrice || 0) + Number(i.margin || 0) + Number(i.freight || 0) || 20700
            };
        }

        // === Filtering ===
        const filteredDeliveries = filterByDate(deliveryOrders, ['updatedAt', 'createdAt'], filterFrom, filterTo)
        const filteredExpenses = filterByDate(expenses, ['date', 'createdAt'], filterFrom, filterTo)

        // === KPI Stats ===
        const completedOrders = filteredDeliveries.filter(o => o.status === 'completed')

        let revenue = 0;
        let costOfGoods = 0;
        completedOrders.forEach(o => {
            const qty = Number(o.amount) || 0;
            const p = getPricing(o.orderId, o.product, orders);
            revenue += qty * p.totalUnit;
            costOfGoods += qty * p.cost;
        })

        const approvedUsers = users.filter(u => u.isApproved !== false)
        const totalBaseSalary = approvedUsers.filter(u => u.role === 'driver').reduce((sum, d) => sum + Number(d.baseSalary || 0), 0);
        let totalFuelBonus = 0;
        let totalHaoHut = 0;

        completedOrders.forEach(o => {
            let fuelBonus = 0;
            const loss = Number(o.fuelLoss) || 0;
            const allowed = Number(o.allowedLoss) || 0.5;
            if (loss > allowed) fuelBonus = - (loss - allowed) * 100000;
            else if (loss < allowed) fuelBonus = (allowed - loss) * 50000;
            totalFuelBonus += fuelBonus;

            const p = getPricing(o.orderId, o.product, orders);
            const xuatKho = Number(o.amount || 0);
            const thucGiao = Number(o.deliveredQuantity || o.amount || 0);
            const haoHutLt = xuatKho - thucGiao;
            if (haoHutLt > 0) totalHaoHut += haoHutLt * p.cost;
        })

        const approvedExpenses = filteredExpenses.filter(e => e.status === 'approved')
        const driverExpenseCost = approvedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

        const filteredTransactions = filterByDate(transactions, ['createdAt'], filterFrom, filterTo)
        const transactionExpenses = filteredTransactions.filter(t => t.type === 'expense')
        const transactionCost = transactionExpenses.reduce((sum, t) => sum + (Number(t.totalAmount) || Number(t.amount) || 0), 0)

        // Đồng bộ với App: Cost = Giá vốn + Chi phí lái xe + Giao dịch + Hao hụt
        const cost = driverExpenseCost + transactionCost + costOfGoods + totalHaoHut;
        const netProfit = revenue - cost;

        const driverCount = approvedUsers.filter(u => u.role === 'driver').length
        const salesCount = approvedUsers.filter(u => u.role === 'sales').length
        const accountantCount = approvedUsers.filter(u => u.role === 'accountant').length
        const adminCount = approvedUsers.filter(u => u.role === 'admin').length

        const activeStatuses = ['pending', 'received', 'moving', 'arrived', 'unloading']
        const activeVehiclePlates = new Set(deliveryOrders.filter(o => activeStatuses.includes(o.status)).map(o => o.vehiclePlate))
        const activeVehicleCount = activeVehiclePlates.size

        setStats({
            totalRevenue: revenue, totalCost: cost, netProfit,
            activeVehicles: activeVehicleCount, totalVehicles: vehicles.length,
            totalEmployees: approvedUsers.length, drivers: driverCount,
            sales: salesCount, accountants: accountantCount, admins: adminCount,
        })

        // === Charts ===
        const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
        const monthlyRevenue = {}
        const monthlyCost = {}
        months.forEach(m => { monthlyRevenue[m] = 0; monthlyCost[m] = 0 })

        completedOrders.forEach(o => {
            let dateStr = o.updatedAt || o.createdAt
            if (dateStr) {
                const p = getPricing(o.orderId, o.product, orders);
                const qty = (Number(o.amount) || 0);
                let d = new Date(dateStr?._seconds ? dateStr._seconds * 1000 : dateStr)
                if (!isNaN(d)) {
                    monthlyRevenue[`T${d.getMonth() + 1}`] += qty * p.totalUnit
                    monthlyCost[`T${d.getMonth() + 1}`] += qty * p.cost
                }
            }
        })

        approvedExpenses.forEach(e => {
            let dateStr = e.date || e.createdAt
            if (dateStr) {
                let d = new Date(dateStr?._seconds ? dateStr._seconds * 1000 : dateStr)
                if (!isNaN(d)) monthlyCost[`T${d.getMonth() + 1}`] += (Number(e.amount) || 0)
            }
        })

        setRevenueChartData({
            labels: months,
            datasets: [
                { label: 'Doanh thu (Xuất)', data: months.map(m => monthlyRevenue[m]), backgroundColor: 'rgba(46, 204, 113, 0.7)', borderColor: '#27ae60', borderWidth: 1 },
                { label: 'Chi phí (Nhập)', data: months.map(m => monthlyCost[m]), backgroundColor: 'rgba(231, 76, 60, 0.7)', borderColor: '#c0392b', borderWidth: 1 }
            ]
        })

        const costMap = {}
        // Đã tính ở trên cho KPI chính

        if (costOfGoods > 0) costMap['Giá vốn hàng'] = costOfGoods;
        if ((totalBaseSalary + totalFuelBonus) > 0) costMap['Nhân sự'] = totalBaseSalary + totalFuelBonus;
        if (totalHaoHut > 0) costMap['Hao hụt'] = totalHaoHut;

        let vCost = 0, oCost = 0;
        approvedExpenses.forEach(e => {
            const t = (e.type || '').toLowerCase(), d = (e.description || '').toLowerCase();
            if (t.includes('xăng') || t.includes('dầu') || t.includes('cầu') || d.includes('xe')) vCost += Number(e.amount || 0);
            else oCost += Number(e.amount || 0);
        })
        if (vCost > 0) costMap['Chi phí Xe'] = vCost;
        if (oCost > 0) costMap['Khác'] = oCost;

        if (Object.keys(costMap).length > 0) {
            setCostChartData({
                labels: Object.keys(costMap),
                datasets: [{
                    data: Object.values(costMap),
                    backgroundColor: ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#2c3e50', '#27ae60'].slice(0, Object.keys(costMap).length),
                    borderWidth: 2
                }]
            })
        }

        // === Alerts ===
        const now = new Date(), alertList = [], DAYS_WARN = 30
        approvedUsers.forEach(u => {
            if (u.licenseExpiry) {
                const diff = Math.ceil((new Date(u.licenseExpiry) - now) / 86400000)
                if (diff <= DAYS_WARN) alertList.push({ type: 'Bằng lái', name: u.fullname || u.email, days: diff, icon: <BadgeAlert size={16} /> })
            }
        })
        vehicles.forEach(v => {
            if (v.inspectionExpiry) {
                const diff = Math.ceil((new Date(v.inspectionExpiry) - now) / 86400000)
                if (diff <= DAYS_WARN) alertList.push({ type: 'Hạn Đăng Kiểm', name: v.plateNumber || 'Xe không rõ biển', days: diff, icon: <FileWarning size={16} /> })
            }
            if (v.dangerousGoodsExpiry) {
                const diff = Math.ceil((new Date(v.dangerousGoodsExpiry) - now) / 86400000)
                if (diff <= DAYS_WARN) alertList.push({ type: 'Hạn GP Hàng Nguy Hiểm', name: v.plateNumber || 'Xe không rõ biển', days: diff, icon: <Flame size={16} /> })
            }
        })

        setAlerts(alertList.sort((a, b) => a.days - b.days))
    }

    if (loading) return <div className="loading-state">Đang tải Dashboard...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Phân Tích Kinh Doanh</h2>
                <DateRangeFilter compact onFilter={(from, to) => { setFilterFrom(from); setFilterTo(to) }} />
            </div>

            {/* ========== KPI CARDS ========== */}
            <div className="stats-grid">
                <div className="stat-card" style={{ borderLeft: '4px solid #27ae60' }}>
                    <div className="stat-icon" style={{ color: '#27ae60' }}><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <h3>Tổng Doanh Thu</h3>
                        <p className="stat-number">{stats.totalRevenue.toLocaleString()}đ</p>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #e74c3c' }}>
                    <div className="stat-icon" style={{ color: '#e74c3c' }}><Wallet size={24} /></div>
                    <div className="stat-info">
                        <h3>Tổng Chi Phí</h3>
                        <p className="stat-number">{stats.totalCost.toLocaleString()}đ</p>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #f39c12' }}>
                    <div className="stat-icon" style={{ color: '#f39c12' }}><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <h3>Lợi Nhuận Ròng</h3>
                        <p className="stat-number">{(stats.netProfit || 0).toLocaleString()}đ</p>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #3498db' }}>
                    <div className="stat-icon" style={{ color: '#3498db' }}><Truck size={24} /></div>
                    <div className="stat-info">
                        <h3>Xe Hoạt Động</h3>
                        <p className="stat-number">{stats.activeVehicles} / {stats.totalVehicles}</p>
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #9b59b6' }}>
                    <div className="stat-icon" style={{ color: '#9b59b6' }}><Users size={24} /></div>
                    <div className="stat-info">
                        <h3>Tổng Nhân Sự</h3>
                        <p className="stat-number">{stats.totalEmployees}</p>
                    </div>
                </div>
            </div>

            {/* ========== BIỂU ĐỒ ========== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
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
