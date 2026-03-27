import { useState, useEffect, useRef } from 'react'
import { getNotificationsByUser, markAsRead, markAllAsRead } from '../services/notificationService'
import { Bell, Package, Truck, Wallet, AlertTriangle, Settings } from 'lucide-react'

function NotificationBell({ userId }) {
    const [notifications, setNotifications] = useState([])
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    const load = async () => {
        if (!userId) return
        const data = await getNotificationsByUser(userId)
        setNotifications(Array.isArray(data) ? data : [])
    }

    useEffect(() => {
        load()
        // Polling mỗi 30s
        const interval = setInterval(load, 30000)
        return () => clearInterval(interval)
    }, [userId])

    // Đóng dropdown khi click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const unread = notifications.filter(n => !n.isRead).length

    const handleRead = async (id) => {
        await markAsRead(id)
        load()
    }

    const handleReadAll = async () => {
        await markAllAsRead(userId)
        load()
    }

    const timeAgo = (ts) => {
        if (!ts) return ''
        const d = new Date(ts?._seconds ? ts._seconds * 1000 : ts)
        const diff = Math.floor((Date.now() - d) / 60000)
        if (diff < 1) return 'Vừa xong'
        if (diff < 60) return `${diff} phút trước`
        if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`
        return `${Math.floor(diff / 1440)} ngày trước`
    }

    const typeIcon = (type) => {
        switch (type) {
            case 'order': return <Package size={18} color="#3b82f6" />
            case 'delivery': return <Truck size={18} color="#10b981" />
            case 'expense': return <Wallet size={18} color="#f59e0b" />
            case 'sos': return <AlertTriangle size={18} color="#ef4444" />
            case 'system': return <Settings size={18} color="#64748b" />
            default: return <Bell size={18} color="#64748b" />
        }
    }

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button onClick={() => setOpen(!open)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                position: 'relative', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#475569', transition: 'color 0.2s', borderRadius: '50%'
            }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.background = 'none'}>
                <Bell size={22} className={unread > 0 ? "bell-ringing" : ""} />
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: -2, right: -2, background: '#e74c3c',
                        color: 'white', fontSize: 10, fontWeight: 'bold', borderRadius: '50%',
                        width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'pulse-notif 2s infinite'
                    }}>{unread}</span>
                )}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, width: 340, maxHeight: 420,
                    background: 'white', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    zIndex: 1000, overflow: 'hidden', border: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <strong style={{ fontSize: 15 }}>🔔 Thông báo</strong>
                        {unread > 0 && (
                            <button onClick={handleReadAll} style={{
                                background: 'none', border: 'none', color: '#3498db',
                                cursor: 'pointer', fontSize: 12, fontWeight: 600
                            }}>Đọc tất cả</button>
                        )}
                    </div>
                    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>
                                Chưa có thông báo
                            </div>
                        ) : notifications.slice(0, 20).map(n => (
                            <div key={n.id} onClick={() => !n.isRead && handleRead(n.id)}
                                style={{
                                    padding: '10px 16px', borderBottom: '1px solid #f8f8f8',
                                    cursor: n.isRead ? 'default' : 'pointer',
                                    background: n.isRead ? 'white' : '#f0f7ff',
                                    transition: 'background 0.2s ease'
                                }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', display: 'flex' }}>
                                        {typeIcon(n.type)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: n.isRead ? 400 : 600, color: '#2c3e50' }}>{n.title || 'Thông báo'}</div>
                                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{n.message}</div>
                                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                                    </div>
                                    {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3498db', marginTop: 4, flexShrink: 0 }} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse-notif {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
                @keyframes ring-bell {
                    0% { transform: rotate(0); }
                    10% { transform: rotate(15deg); }
                    20% { transform: rotate(-10deg); }
                    30% { transform: rotate(5deg); }
                    40% { transform: rotate(-5deg); }
                    50% { transform: rotate(0); }
                    100% { transform: rotate(0); }
                }
                .bell-ringing {
                    animation: ring-bell 2s infinite ease-in-out;
                    color: #2563eb;
                }
            `}</style>
        </div>
    )
}

export default NotificationBell
