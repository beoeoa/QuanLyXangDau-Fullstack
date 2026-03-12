import { useState, useEffect } from 'react'
import { getAuditLogs } from '../../services/auditLogService'
import './AdminModules.css'

function AuditLogManager() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => { loadLogs() }, [])

    const loadLogs = async () => {
        setLoading(true)
        const data = await getAuditLogs(200)
        setLogs(data)
        setLoading(false)
    }

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return '#27ae60'
            case 'UPDATE': return '#f39c12'
            case 'DELETE': return '#e74c3c'
            case 'LOGIN': return '#3498db'
            default: return '#7f8c8d'
        }
    }

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATE': return '➕'
            case 'UPDATE': return '✏️'
            case 'DELETE': return '🗑️'
            case 'LOGIN': return '🔑'
            default: return '📋'
        }
    }

    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
            (log.userName || '').toLowerCase().includes(term) ||
            (log.action || '').toLowerCase().includes(term) ||
            (log.details || '').toLowerCase().includes(term)
        )
    })

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A'
        const d = new Date(timestamp)
        if (isNaN(d)) return 'N/A'
        return d.toLocaleString('vi-VN')
    }

    return (
        <div className="module-container">
            <div className="module-header">
                <h2>📋 Nhật Ký Hệ Thống (Audit Log)</h2>
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="🔍 Tìm kiếm theo tên người dùng, hành động, chi tiết..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                />
                <button className="btn-primary" onClick={loadLogs} style={{ padding: '10px 20px' }}>
                    🔄 Tải lại
                </button>
            </div>

            {loading ? (
                <div className="loading-state">Đang tải nhật ký...</div>
            ) : filteredLogs.length === 0 ? (
                <div className="empty-state">
                    <p>Chưa có nhật ký nào được ghi nhận.</p>
                    <p style={{ fontSize: '13px', color: '#999' }}>Nhật ký sẽ tự động được ghi khi có thao tác Thêm/Sửa/Xóa trên hệ thống.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                    {filteredLogs.map(log => (
                        <div key={log.id} style={{
                            display: 'flex', alignItems: 'center', gap: '15px',
                            padding: '12px 16px', background: 'white', borderRadius: '6px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            borderLeft: `4px solid ${getActionColor(log.action)}`
                        }}>
                            <span style={{ fontSize: '20px' }}>{getActionIcon(log.action)}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                                        fontSize: '11px', fontWeight: 'bold', color: 'white',
                                        backgroundColor: getActionColor(log.action), marginRight: '8px'
                                    }}>
                                        {log.action}
                                    </span>
                                    {log.details}
                                </div>
                                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                                    👤 {log.userName || 'Hệ thống'} — 🕐 {formatDate(log.timestamp)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default AuditLogManager
