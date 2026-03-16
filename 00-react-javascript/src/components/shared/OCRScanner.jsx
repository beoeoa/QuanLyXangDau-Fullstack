import { useState, useRef } from 'react'
import { createWorker } from 'tesseract.js'

/**
 * OCRScanner v2 — Enterprise Edition
 * - Human-in-the-loop: Ảnh gốc bên trái, Form sửa bên phải
 * - Chế độ: invoice | receipt | order | gpdkkd | vat_invoice | bank_transfer
 */
export default function OCRScanner({ isOpen, onClose, onResult, mode = 'invoice' }) {
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [rawText, setRawText] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [editData, setEditData] = useState({})
  const [step, setStep] = useState('upload') // upload | scanning | verify
  const fileRef = useRef()

  if (!isOpen) return null

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
    setRawText('')
    setParsedData(null)
    setEditData({})
    setStep('upload')
  }

  const handleScan = async () => {
    if (!image) return
    setScanning(true)
    setStep('scanning')
    setProgress(0)

    try {
      const worker = await createWorker('vie', 1, {
        logger: m => { if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100)) }
      })
      const { data: { text } } = await worker.recognize(image)
      await worker.terminate()

      setRawText(text)
      const parsed = parseOCRText(text, mode)
      setParsedData(parsed)
      setEditData({ ...parsed })
      setStep('verify')
    } catch (err) {
      alert('Lỗi OCR: ' + err.message)
      setStep('upload')
    } finally {
      setScanning(false)
    }
  }

  // === PARSE theo từng mode ===
  const parseOCRText = (text, mode) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const result = {}
    const fullText = text.toLowerCase()

    // Common patterns
    const P = {
      mst: /(?:MST|mã số thuế|M\.S\.T)[:\s]*([0-9\-]+)/i,
      quantity: /(?:số lượng|S\.Lượng|SL)[:\s]*([\d.,]+)/i,
      price: /(?:đơn giá|Đ\.Giá|giá)[:\s]*([\d.,]+)/i,
      total: /(?:thành tiền|tổng|cộng tiền|T\.Tiền)[:\s]*([\d.,]+)/i,
      vat: /(?:thuế|VAT|GTGT)[:\s]*([\d.,]+)/i,
      grandTotal: /(?:tổng thanh toán|tổng cộng|TỔNG)[:\s]*([\d.,]+)/i,
      date: /(?:ngày|Ngày)[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
      invoiceNo: /(?:số|Số|No)[:\.\s]*(\d+)/i,
    }

    // Extract common fields
    lines.forEach(line => {
      if (P.mst.test(line)) result.mst = line.match(P.mst)[1]
      if (P.date.test(line)) {
        const m = line.match(P.date)
        result.date = `${m[1]}/${m[2]}/${m[3]}`
      }
      if (P.invoiceNo.test(line) && !result.invoiceNo) result.invoiceNo = line.match(P.invoiceNo)[1]
      if (P.quantity.test(line)) result.quantity = parseViNumber(line.match(P.quantity)[1])
      if (P.price.test(line)) result.price = parseViNumber(line.match(P.price)[1])
      if (P.total.test(line)) result.total = parseViNumber(line.match(P.total)[1])
      if (P.grandTotal.test(line)) result.grandTotal = parseViNumber(line.match(P.grandTotal)[1])
      if (P.vat.test(line)) result.vat = parseViNumber(line.match(P.vat)[1])
    })

    // Detect product
    if (fullText.includes('diesel') || fullText.includes('do 0.05') || fullText.includes('dầu')) result.product = 'Dầu Diesel 0.05S'
    else if (fullText.includes('ron 95') || fullText.includes('a95')) result.product = 'Xăng RON 95-V'
    else if (fullText.includes('ron 92') || fullText.includes('e5')) result.product = 'Xăng E5 RON 92'

    // === MODE: GPĐKKD ===
    if (mode === 'gpdkkd') {
      const companyLine = lines.find(l => /CÔNG TY|CTY|DOANH NGHIỆP/i.test(l))
      if (companyLine) result.companyName = companyLine.replace(/^.*?(CÔNG TY|CTY|DOANH NGHIỆP)/i, '$1').trim()
      const addrLine = lines.find(l => /địa chỉ|Đ\/c|Trụ sở/i.test(l))
      if (addrLine) result.address = addrLine.replace(/^.*?(địa chỉ|Đ\/c|Trụ sở)[:\s]*/i, '').trim()
      const phoneLine = lines.find(l => /điện thoại|ĐT|Tel|Phone/i.test(l))
      if (phoneLine) {
        const phone = phoneLine.match(/[\d\.\-\s]{8,}/)?.[0]
        if (phone) result.phone = phone.trim()
      }
      const repLine = lines.find(l => /đại diện|người đại diện|giám đốc/i.test(l))
      if (repLine) result.representative = repLine.replace(/^.*?(đại diện|người đại diện|giám đốc)[:\s]*/i, '').trim()
      return { companyName: result.companyName || '', taxCode: result.mst || '', address: result.address || '', phone: result.phone || '', representative: result.representative || '' }
    }

    // === MODE: Hóa đơn VAT ===
    if (mode === 'vat_invoice') {
      const sellerLine = lines.find(l => /đơn vị bán|người bán/i.test(l))
      if (sellerLine) result.sellerName = sellerLine.replace(/^.*?(đơn vị bán|người bán)[:\s]*/i, '').trim()
      return {
        sellerName: result.sellerName || '', sellerMST: result.mst || '',
        invoiceNo: result.invoiceNo || '', date: result.date || '',
        product: result.product || '', quantity: result.quantity || 0,
        price: result.price || 0, total: result.total || 0,
        vat: result.vat || 0, grandTotal: result.grandTotal || 0
      }
    }

    // === MODE: Ủy Nhiệm Chi / Biên lai ngân hàng ===
    if (mode === 'bank_transfer') {
      const amountLine = lines.find(l => /số tiền|Amount/i.test(l))
      if (amountLine) {
        const nums = amountLine.match(/[\d.,]+/g)?.map(parseViNumber).filter(n => n > 1000) || []
        if (nums.length > 0) result.amount = Math.max(...nums)
      }
      const contentLine = lines.find(l => /nội dung|diễn giải|Reference/i.test(l))
      if (contentLine) result.content = contentLine.replace(/^.*?(nội dung|diễn giải|Reference)[:\s]*/i, '').trim()
      const senderLine = lines.find(l => /người chuyển|Bên A|Người gửi/i.test(l))
      if (senderLine) result.sender = senderLine.replace(/^.*?(người chuyển|Bên A|Người gửi)[:\s]*/i, '').trim()
      if (!result.amount) {
        const allNums = text.match(/[\d.,]+/g)?.map(parseViNumber).filter(n => n > 100000) || []
        if (allNums.length > 0) result.amount = Math.max(...allNums)
      }
      return { sender: result.sender || '', amount: result.amount || 0, date: result.date || '', content: result.content || '', transactionNo: result.invoiceNo || '' }
    }

    // === MODE: Biên lai chi phí (receipt) ===
    if (mode === 'receipt') {
      const allNums = text.match(/[\d.,]+/g)?.map(parseViNumber).filter(n => n > 0) || []
      if (!result.total && allNums.length > 0) { result.total = Math.max(...allNums); result.amount = result.total }
      if (fullText.includes('bot') || fullText.includes('phí đường') || fullText.includes('trạm thu')) result.type = 'BOT'
      else if (fullText.includes('xăng') || fullText.includes('dầu')) result.type = 'fuel'
      else if (fullText.includes('ăn') || fullText.includes('cơm')) result.type = 'Ăn uống'
      else result.type = 'other'
      result.description = lines.slice(0, 2).join(' ').substring(0, 100)
      return { type: result.type, amount: result.amount || result.total || 0, description: result.description || '' }
    }

    // === MODE: Đơn hàng (order) ===
    if (mode === 'order') {
      const companyLine = lines.find(l => /CÔNG TY|CTY|ĐẠI LÝ/i.test(l))
      if (companyLine) result.customerName = companyLine
      return { customerName: result.customerName || '', product: result.product || '', quantity: result.quantity || 0, date: result.date || '' }
    }

    // === MODE: Hóa đơn mua vào (invoice) — mặc định ===
    return { invoiceNo: result.invoiceNo || '', date: result.date || '', mst: result.mst || '', product: result.product || '', quantity: result.quantity || 0, price: result.price || 0, total: result.total || 0, grandTotal: result.grandTotal || 0 }
  }

  const parseViNumber = (str) => {
    if (!str) return 0
    const cleaned = str.replace(/\./g, '').replace(/,/g, '.')
    return Number(cleaned) || 0
  }

  const handleFieldChange = (key, value) => {
    setEditData(prev => ({ ...prev, [key]: value }))
  }

  const handleConfirm = () => {
    // Convert numeric fields
    const finalData = { ...editData }
    const numericFields = ['quantity', 'price', 'total', 'grandTotal', 'vat', 'amount']
    numericFields.forEach(f => { if (finalData[f] !== undefined) finalData[f] = Number(finalData[f]) || 0 })
    onResult(finalData)
    handleReset()
    onClose()
  }

  const handleReset = () => {
    setImage(null); setImagePreview(null); setRawText(''); setParsedData(null); setEditData({}); setStep('upload')
  }

  const getModeConfig = () => {
    const configs = {
      invoice: { label: 'Hóa đơn mua vào', icon: '🧾', fields: [
        { key: 'invoiceNo', label: 'Số hóa đơn' }, { key: 'date', label: 'Ngày' }, { key: 'mst', label: 'MST người bán' },
        { key: 'product', label: 'Sản phẩm' }, { key: 'quantity', label: 'Số lượng', type: 'number' },
        { key: 'price', label: 'Đơn giá', type: 'number' }, { key: 'total', label: 'Thành tiền', type: 'number' }, { key: 'grandTotal', label: 'Tổng thanh toán', type: 'number' },
      ]},
      receipt: { label: 'Biên lai chi phí', icon: '🧾', fields: [
        { key: 'type', label: 'Loại chi phí', select: ['BOT', 'fuel', 'Ăn uống', 'other'] },
        { key: 'amount', label: 'Số tiền', type: 'number' }, { key: 'description', label: 'Mô tả' },
      ]},
      order: { label: 'Đơn đặt hàng', icon: '📦', fields: [
        { key: 'customerName', label: 'Khách hàng' }, { key: 'product', label: 'Sản phẩm' },
        { key: 'quantity', label: 'Số lượng (Lít)', type: 'number' }, { key: 'date', label: 'Ngày giao' },
      ]},
      gpdkkd: { label: 'Giấy phép ĐKKD', icon: '🏢', fields: [
        { key: 'companyName', label: 'Tên công ty' }, { key: 'taxCode', label: 'Mã số thuế' },
        { key: 'address', label: 'Địa chỉ' }, { key: 'phone', label: 'Điện thoại' }, { key: 'representative', label: 'Người đại diện' },
      ]},
      vat_invoice: { label: 'Hóa đơn GTGT (VAT)', icon: '📜', fields: [
        { key: 'sellerName', label: 'Đơn vị bán' }, { key: 'sellerMST', label: 'MST người bán' },
        { key: 'invoiceNo', label: 'Số HĐ' }, { key: 'date', label: 'Ngày' },
        { key: 'product', label: 'Sản phẩm' }, { key: 'quantity', label: 'Số lượng', type: 'number' },
        { key: 'price', label: 'Đơn giá', type: 'number' }, { key: 'total', label: 'Tiền trước thuế', type: 'number' },
        { key: 'vat', label: 'Tiền thuế GTGT', type: 'number' }, { key: 'grandTotal', label: 'Tổng cộng', type: 'number' },
      ]},
      bank_transfer: { label: 'Ủy nhiệm chi / Biên lai NH', icon: '🏦', fields: [
        { key: 'sender', label: 'Người chuyển' }, { key: 'amount', label: 'Số tiền', type: 'number' },
        { key: 'date', label: 'Ngày' }, { key: 'content', label: 'Nội dung CK' }, { key: 'transactionNo', label: 'Số GD' },
      ]},
    }
    return configs[mode] || configs.invoice
  }

  const config = getModeConfig()

  // ===================== RENDER =====================
  return (
    <div style={overlay}>
      <div style={{ ...modal, width: step === 'verify' ? 900 : 500 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '2px solid #e5e7eb', paddingBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17 }}>{config.icon} OCR: Quét {config.label}</h3>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
              {step === 'upload' && 'Bước 1/3: Upload ảnh chứng từ'}
              {step === 'scanning' && 'Bước 2/3: Đang nhận diện...'}
              {step === 'verify' && '⚠️ Bước 3/3: XÁC NHẬN — Hãy kiểm tra và sửa lại trước khi lưu!'}
            </div>
          </div>
          <button onClick={() => { handleReset(); onClose() }} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <>
            <div style={{ background: '#eff6ff', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#1e40af' }}>
              💡 <strong>Hướng dẫn:</strong> Chụp ảnh rõ nét → Upload → Hệ thống nhận diện → <strong style={{ color: '#dc2626' }}>Bạn kiểm tra + sửa lại</strong> → Xác nhận lưu
            </div>

            <div style={uploadBox} onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" capture="camera" onChange={handleFile} style={{ display: 'none' }} />
              {imagePreview ? (
                <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6 }} />
              ) : (
                <div>
                  <div style={{ fontSize: 40 }}>📷</div>
                  <strong>Chụp hoặc chọn ảnh chứng từ</strong>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Hỗ trợ: JPG, PNG, WEBP</div>
                </div>
              )}
            </div>

            <button onClick={handleScan} disabled={!image}
              style={{ ...scanBtn, opacity: !image ? 0.5 : 1 }}>
              🔬 BẮT ĐẦU QUÉT OCR
            </button>
          </>
        )}

        {/* Step 2: Scanning */}
        {step === 'scanning' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>🔬</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Đang nhận diện chữ tiếng Việt...</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#7c3aed', marginBottom: 16 }}>{progress}%</div>
            <div style={{ background: '#f3f4f6', borderRadius: 8, overflow: 'hidden', height: 8 }}>
              <div style={{ background: 'linear-gradient(90deg, #7c3aed, #6d28d9)', height: '100%', width: `${progress}%`, transition: 'width 0.3s', borderRadius: 8 }} />
            </div>
          </div>
        )}

        {/* Step 3: Human Verification — Side by side */}
        {step === 'verify' && (
          <>
            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
              ⚠️ <strong>QUAN TRỌNG:</strong> OCR có thể nhận diện SAI. Hãy nhìn ảnh gốc bên trái và <strong>kiểm tra kỹ từng ô</strong> bên phải trước khi bấm Xác nhận!
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
              {/* LEFT: Ảnh gốc */}
              <div style={{ border: '2px solid #d1d5db', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: '#f9fafb', padding: '6px 10px', fontWeight: 700, fontSize: 12, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                  📷 ẢNH GỐC (Tham khảo)
                </div>
                <div style={{ padding: 8 }}>
                  <img src={imagePreview} alt="original" style={{ width: '100%', borderRadius: 6 }} />
                </div>
                <details style={{ padding: '4px 8px 8px', fontSize: 11 }}>
                  <summary style={{ cursor: 'pointer', color: '#6b7280', fontWeight: 600 }}>📝 Xem text thô</summary>
                  <pre style={{ background: '#f9fafb', padding: 8, borderRadius: 4, whiteSpace: 'pre-wrap', fontSize: 10, maxHeight: 120, overflowY: 'auto', marginTop: 4 }}>{rawText}</pre>
                </details>
              </div>

              {/* RIGHT: Form chỉnh sửa */}
              <div style={{ border: '2px solid #7c3aed', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: '#f5f3ff', padding: '6px 10px', fontWeight: 700, fontSize: 12, color: '#5b21b6', borderBottom: '1px solid #ddd6fe' }}>
                  ✏️ DỮ LIỆU NHẬN DIỆN (Sửa nếu sai)
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {config.fields.map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 2 }}>
                        {f.label}
                        {editData[f.key] !== parsedData?.[f.key] && editData[f.key] !== undefined && (
                          <span style={{ color: '#f59e0b', marginLeft: 4 }}>(đã sửa)</span>
                        )}
                      </label>
                      {f.select ? (
                        <select value={editData[f.key] || ''} onChange={e => handleFieldChange(f.key, e.target.value)}
                          style={inputStyle}>
                          {f.select.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          type={f.type || 'text'}
                          value={editData[f.key] ?? ''}
                          onChange={e => handleFieldChange(f.key, e.target.value)}
                          style={{
                            ...inputStyle,
                            borderColor: editData[f.key] ? '#a78bfa' : '#fca5a5',
                            background: editData[f.key] ? '#faf5ff' : '#fff5f5',
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setStep('upload'); setParsedData(null); setEditData({}) }}
                style={{ ...actionBtn, background: '#f3f4f6', color: '#374151', flex: 1 }}>
                🔄 Quét lại
              </button>
              <button onClick={() => { handleReset(); onClose() }}
                style={{ ...actionBtn, background: '#fee2e2', color: '#dc2626', flex: 1 }}>
                ❌ Hủy bỏ
              </button>
              <button onClick={handleConfirm}
                style={{ ...actionBtn, background: '#059669', color: 'white', flex: 2, fontWeight: 700 }}>
                ✅ XÁC NHẬN & LƯU
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modal = { background: 'white', borderRadius: 14, padding: 24, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)', transition: 'width 0.3s' }
const uploadBox = { border: '2px dashed #d1d5db', borderRadius: 10, padding: 28, textAlign: 'center', cursor: 'pointer', marginBottom: 12, transition: 'border-color 0.2s' }
const scanBtn = { width: '100%', padding: 14, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none', borderRadius: 24, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 12 }
const actionBtn = { padding: '11px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }
const inputStyle = { width: '100%', padding: '6px 8px', borderRadius: 5, border: '1.5px solid #d1d5db', fontSize: 13, boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }
