import { useMemo, useRef, useState } from 'react'

export default function ARConfirmPaymentModal({ isOpen, trip, onClose, onConfirm }) {
  const fileRef = useRef(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sender, setSender] = useState('')
  const [amount, setAmount] = useState('')
  const [content, setContent] = useState('')

  const title = useMemo(() => {
    if (!trip) return 'Xác nhận thu'
    return `Xác nhận thu — ${trip.destination || 'Khách hàng'} — Xe ${trip.vehiclePlate || ''}`
  }, [trip])

  if (!isOpen) return null

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
  }

  const handleClose = () => {
    setImageFile(null)
    setImagePreview(null)
    setSender('')
    setAmount('')
    setContent('')
    onClose?.()
  }

  const handleConfirm = async () => {
    const n = Number(String(amount).replace(/\./g, '').replace(/,/g, '.')) || 0
    if (n <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ.')
      return
    }
    await onConfirm?.({ amount: n, sender, content, receiptImage: imagePreview || '' })
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Split-screen: ảnh UNC/biên lai bên trái, nhập tay bên phải.
            </div>
          </div>
          <button onClick={handleClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* LEFT */}
          <div style={panel}>
            <div style={panelTitle}>📷 Ảnh UNC khách gửi</div>
            <div style={{ padding: 10 }}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 10,
                  padding: 14,
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: '#f8fafc',
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="unc" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 8 }} />
                ) : (
                  <div>
                    <div style={{ fontSize: 34 }}>🏦</div>
                    <div style={{ fontWeight: 700 }}>Bấm để tải ảnh UNC</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Không dùng OCR — kế toán nhập tay để đảm bảo đúng.</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={panel}>
            <div style={panelTitle}>✍️ Nhập dữ liệu xác nhận thu</div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label="Người chuyển (tuỳ chọn)">
                <input value={sender} onChange={(e) => setSender(e.target.value)} style={input} placeholder="VD: CÔNG TY A / Nguyễn Văn B" />
              </Field>
              <Field label="Số tiền thu (VNĐ) *">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} style={input} placeholder="VD: 12,500,000" inputMode="numeric" />
              </Field>
              <Field label="Nội dung CK (tuỳ chọn)">
                <input value={content} onChange={(e) => setContent(e.target.value)} style={input} placeholder="VD: TT cước VC tháng 03/2026" />
              </Field>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={handleClose} style={{ ...btn, background: '#f1f5f9', color: '#0f172a', flex: 1 }}>Hủy</button>
                <button onClick={handleConfirm} style={{ ...btn, background: '#059669', color: 'white', flex: 2, fontWeight: 800 }}>✅ Xác nhận thu</button>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Gợi ý Fleetbase: Trạng thái hóa đơn sẽ tự lên <strong>Partially Paid/Paid</strong> theo tổng tiền đã thu.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.55)',
  zIndex: 1200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 14,
}

const modal = {
  width: 'min(980px, 96vw)',
  background: 'white',
  borderRadius: 14,
  boxShadow: '0 16px 50px rgba(0,0,0,0.25)',
  overflow: 'hidden',
}

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '14px 16px',
  borderBottom: '1px solid #e2e8f0',
  background: '#ffffff',
}

const closeBtn = {
  border: 'none',
  background: 'transparent',
  fontSize: 20,
  cursor: 'pointer',
  color: '#64748b',
}

const panel = {
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  overflow: 'hidden',
  margin: 14,
}

const panelTitle = {
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 900,
  background: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
  color: '#0f172a',
}

const input = {
  width: '100%',
  padding: '10px 10px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  outline: 'none',
  fontSize: 13,
  boxSizing: 'border-box',
}

const btn = {
  padding: '10px 12px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
}

