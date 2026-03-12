import { useState, useEffect, useRef } from 'react'
import { getNotificationsByUser, markAsRead, markAllAsRead } from '../services/notificationService'

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
            case 'order': return '📦'
            case 'delivery': return '🚛'
            case 'expense': return '💰'
            case 'sos': return '🆘'
            case 'system': return '⚙️'
            default: return '🔔'
        }
    }

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => setOpen(!open)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 20,
                position: 'relative', padding: '4px 8px'
            }}>
                🔔
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
                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 20 }}>{typeIcon(n.type)}</span>
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
            `}</style>
        </div>
    )
}

export default NotificationBell
