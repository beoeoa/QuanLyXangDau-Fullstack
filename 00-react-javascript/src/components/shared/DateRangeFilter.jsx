import { useState, useEffect } from 'react'

const QUICK_FILTERS = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: '7 Ngày' },
  { key: 'month', label: '30 Ngày' },
  { key: 'quarter', label: '90 Ngày' },
  { key: 'year', label: 'Năm nay' },
  { key: 'all', label: 'Tất cả' },
]

function getRange(key) {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  switch (key) {
    case 'today':
      return { from: startOfDay, to: endOfDay }
    case 'week': {
      const d = new Date(startOfDay)
      d.setDate(d.getDate() - 6)
      return { from: d, to: endOfDay }
    }
    case 'month': {
      const d = new Date(startOfDay)
      d.setDate(d.getDate() - 29)
      return { from: d, to: endOfDay }
    }
    case 'quarter': {
      const d = new Date(startOfDay)
      d.setDate(d.getDate() - 89)
      return { from: d, to: endOfDay }
    }
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay }
    case 'all':
    default:
      return { from: null, to: null }
  }
}

export function filterByDate(items, dateFields, from, to) {
  if (!from && !to) return items
  const fields = Array.isArray(dateFields) ? dateFields : [dateFields]
  return items.filter(item => {
    let raw;
    for (const field of fields) {
      if (item[field]) {
        raw = item[field];
        break;
      }
    }
    if (!raw) return false
    
    let d
    if (raw?._seconds) d = new Date(raw._seconds * 1000)
    else if (raw?.toDate) d = raw.toDate()
    else d = new Date(raw)
    
    if (isNaN(d)) return false
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })
}

export default function DateRangeFilter({ onFilter, compact }) {
  const [active, setActive] = useState('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  
  // Auto-fire "Hôm nay" trên lần mount đầu tiên một cách đúng chuẩn
  useEffect(() => {
    const { from, to } = getRange('today')
    onFilter(from, to)
  }, [])

  const handleQuick = (key) => {
    setActive(key)
    setShowCustom(false)
    const { from, to } = getRange(key)
    onFilter(from, to)
  }

  const handleCustom = () => {
    const from = customFrom ? new Date(customFrom) : null
    const to = customTo ? new Date(customTo + 'T23:59:59') : null
    setActive('custom')
    onFilter(from, to)
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
      padding: compact ? '8px 0' : '10px 14px',
      background: compact ? 'transparent' : '#f8f9fa',
      borderRadius: 8, marginBottom: compact ? 8 : 14
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', marginRight: 4 }}>📅 Lọc:</span>
      {QUICK_FILTERS.map(f => (
        <button key={f.key} onClick={() => handleQuick(f.key)} style={{
          padding: '5px 12px', border: 'none', borderRadius: 16, cursor: 'pointer',
          fontSize: 12, fontWeight: active === f.key ? 700 : 400,
          background: active === f.key ? '#1a73e8' : 'white',
          color: active === f.key ? 'white' : '#3c4043',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', transition: 'all 0.15s'
        }}>{f.label}</button>
      ))}
      <button onClick={() => setShowCustom(!showCustom)} style={{
        padding: '5px 12px', border: 'none', borderRadius: 16, cursor: 'pointer',
        fontSize: 12, fontWeight: active === 'custom' ? 700 : 400,
        background: active === 'custom' ? '#7c3aed' : 'white',
        color: active === 'custom' ? 'white' : '#3c4043',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>📆 Tùy chọn</button>
      {showCustom && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #dadce0', borderRadius: 6, fontSize: 12 }} />
          <span style={{ fontSize: 12, color: '#999' }}>→</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #dadce0', borderRadius: 6, fontSize: 12 }} />
          <button onClick={handleCustom} style={{
            padding: '5px 12px', background: '#7c3aed', color: 'white',
            border: 'none', borderRadius: 16, cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}>Áp dụng</button>
        </div>
      )}
    </div>
  )
}
