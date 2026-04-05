import { useState, useEffect } from 'react'
import { getAllSOSReports, updateSOSStatus } from '../../services/sosReportService'

export default function SOSManager() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [viewingImage, setViewingImage] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const data = await getAllSOSReports()
    setReports(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleUpdateStatus = async (id, status) => {
    if (!window.confirm(`Xác nhận đánh dấu "${status === 'resolved' ? 'Đã xử lý' : 'Đã ghi nhận'}"?`)) return
    await updateSOSStatus(id, status)
    loadData()
  }

  const filtered = reports.filter(r => {
    if (filter === 'pending') return r.status !== 'resolved'
    if (filter === 'resolved') return r.status === 'resolved'
    return true
  })

  const urgentCount = reports.filter(r => r.status !== 'resolved').length

  const typeLabel = (type) => {
    const map = { traffic_jam: '🚗 Kẹt xe', accident: '💥 Tai nạn', breakdown: '🔧 Hỏng xe', fuel_leak: '⛽ Rò xăng', other: '❓ Khác' }
    return map[type] || type
  }

  const getTime = (ts) => {
    if (!ts) return '-'
    try { return new Date(ts).toLocaleString('vi-VN') } catch { return '-' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0 }}>🚨 Xử Lý Sự Cố Khẩn Cấp (SOS)</h2>
          {urgentCount > 0 && (
            <p style={{ margin: '4px 0 0', color: '#ef4444', fontWeight: 700 }}>⚠️ {urgentCount} sự cố chưa xử lý!</p>
          )}
        </div>
        <button onClick={loadData}
          style={{ padding: '6px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
          🔄 Làm mới
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: '🚨 Chưa xử lý' },
          { key: 'resolved', label: '✅ Đã xử lý' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
              background: filter === f.key ? '#ef4444' : '#f1f5f9',
              color: filter === f.key ? 'white' : '#64748b'
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Đang tải...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48 }}>🛡️</div>
          <p>Không có sự cố nào.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(r => {
            const isResolved = r.status === 'resolved'
            const isAck = r.status === 'acknowledged'
            return (
              <div key={r.id} style={{
                background: 'white', borderRadius: 12, padding: '16px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${isResolved ? '#94a3b8' : isAck ? '#f59e0b' : '#ef4444'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>
                      {r.driverName || 'Tài xế N/A'}
                      {r.driverPhone && (
                        <a href={`tel:${r.driverPhone}`}
                          style={{ marginLeft: 10, fontSize: 12, color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                          📞 {r.driverPhone}
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{getTime(r.createdAt)}</div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                    background: isResolved ? '#dcfce7' : isAck ? '#fef9c3' : '#fee2e2',
                    color: isResolved ? '#166534' : isAck ? '#854d0e' : '#991b1b'
                  }}>
                    {isResolved ? '✅ Đã xử lý' : isAck ? '👀 Đã ghi nhận' : '🚨 Chưa xử lý'}
                  </span>
                </div>

                <div style={{ marginTop: 10, padding: '8px 12px', background: '#fff9f9', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: '#ef4444', fontWeight: 700, whiteSpace: 'nowrap' }}>{typeLabel(r.type)}</span>
                  <span style={{ color: '#334155', fontSize: 14, lineHeight: 1.5 }}>{r.description || 'Không có mô tả'}</span>
                </div>

                {/* Ảnh hiện trường */}
                {r.photoUrl && (
                  <div style={{ marginTop: 10 }}>
                    <img src={r.photoUrl} alt="Ảnh SOS"
                      onClick={() => setViewingImage(r.photoUrl)}
                      style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid #fecaca' }} />
                    <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>Nhấp để phóng to ảnh</div>
                  </div>
                )}

                {(r.lat || r.locationName) && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                    📍 {r.locationName || `${r.lat?.toFixed(4)}, ${r.lng?.toFixed(4)}`}
                  </div>
                )}

                {!isResolved && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {!isAck && (
                      <button onClick={() => handleUpdateStatus(r.id, 'acknowledged')}
                        style={{ padding: '6px 14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                        👀 Ghi Nhận
                      </button>
                    )}
                    <button onClick={() => handleUpdateStatus(r.id, 'resolved')}
                      style={{ padding: '6px 14px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      ✅ Đánh Dấu Đã Xử Lý
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Image Viewer Overlay */}
      {viewingImage && (
        <div onClick={() => setViewingImage(null)} style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.88)', zIndex: 99999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'
        }}>
          <button onClick={() => setViewingImage(null)}
            style={{ position: 'absolute', top: 20, right: 30, background: 'none', border: 'none', color: 'white', fontSize: 34, cursor: 'pointer' }}>
            ✖
          </button>
          <img src={viewingImage} alt="SOS detail"
            style={{ maxWidth: '90%', maxHeight: '85%', objectFit: 'contain', borderRadius: 10, border: '3px solid #ef4444' }} />
          <p style={{ color: '#fca5a5', marginTop: 12, fontSize: 13 }}>Nhấp vào bất kỳ đâu để đóng</p>
        </div>
      )}
    </div>
  )
}
