import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

/**
 * ImportDataModal — Upload Excel/CSV → Preview → Import
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   onImport: (rows: Object[]) => Promise<void>
 *   columns: { key: string, label: string, required?: boolean }[]
 *   title: string
 *   templateData?: Object[] (dùng để tạo file mẫu)
 */
export default function ImportDataModal({ isOpen, onClose, onImport, columns, title, templateData }) {
  const [data, setData] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef()

  if (!isOpen) return null

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
        // Map column headers to keys
        const mapped = json.map((row, idx) => {
          const obj = {}
          columns.forEach(col => {
            // Try match by label or key
            obj[col.key] = row[col.label] ?? row[col.key] ?? ''
          })
          obj._row = idx + 2 // Excel row number (1-indexed + header)
          return obj
        })
        // Validate
        const errs = []
        mapped.forEach((row, i) => {
          columns.forEach(col => {
            if (col.required && !row[col.key]) {
              errs.push(`Dòng ${row._row}: Thiếu "${col.label}"`)
            }
          })
        })
        setData(mapped)
        setErrors(errs)
      } catch (err) {
        setErrors([`Lỗi đọc file: ${err.message}`])
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (errors.length > 0) {
      if (!window.confirm(`Có ${errors.length} lỗi. Vẫn import các dòng hợp lệ?`)) return
    }
    setImporting(true)
    try {
      const valid = data.filter(row => {
        return columns.every(col => !col.required || row[col.key])
      })
      await onImport(valid)
      setData([])
      setFileName('')
      onClose()
    } catch (err) {
      alert('Lỗi import: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const headers = {}
    columns.forEach(col => { headers[col.label] = templateData?.[0]?.[col.key] || '' })
    const sampleData = templateData || [headers]
    const ws = XLSX.utils.json_to_sheet(sampleData.map(row => {
      const obj = {}
      columns.forEach(col => { obj[col.label] = row[col.key] || '' })
      return obj
    }))
    // Style header width
    ws['!cols'] = columns.map(() => ({ wch: 20 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dữ liệu')
    XLSX.writeFile(wb, `mau_import_${title.replace(/\s/g, '_')}.xlsx`)
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>📥 Import: {title}</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Upload area */}
        <div style={uploadArea} onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />
          {fileName ? (
            <div><span style={{ fontSize: 28 }}>📄</span><br /><strong>{fileName}</strong><br /><span style={{ color: '#666', fontSize: 12 }}>{data.length} dòng dữ liệu</span></div>
          ) : (
            <div><span style={{ fontSize: 36 }}>📂</span><br /><strong>Kéo thả hoặc Click để chọn file</strong><br /><span style={{ color: '#999', fontSize: 12 }}>Hỗ trợ: .xlsx, .xls, .csv</span></div>
          )}
        </div>

        <button onClick={downloadTemplate} style={{ ...actionBtn, background: '#f0f4ff', color: '#1a73e8', border: '1px solid #c6d9f1', marginBottom: 10 }}>
          📝 Tải file mẫu Excel
        </button>

        {/* Errors */}
        {errors.length > 0 && (
          <div style={{ background: '#fee2e2', padding: 10, borderRadius: 6, marginBottom: 10, maxHeight: 100, overflowY: 'auto' }}>
            <strong style={{ color: '#b91c1c', fontSize: 12 }}>⚠️ {errors.length} lỗi:</strong>
            {errors.slice(0, 5).map((e, i) => <div key={i} style={{ fontSize: 11, color: '#991b1b' }}>{e}</div>)}
            {errors.length > 5 && <div style={{ fontSize: 11, color: '#999' }}>...và {errors.length - 5} lỗi khác</div>}
          </div>
        )}

        {/* Preview */}
        {data.length > 0 && (
          <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                  <th style={th}>#</th>
                  {columns.map(c => <th key={c.key} style={th}>{c.label}{c.required ? ' *' : ''}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 20).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={td}>{i + 1}</td>
                    {columns.map(c => <td key={c.key} style={{ ...td, color: c.required && !row[c.key] ? '#dc2626' : '#333' }}>{row[c.key] || '-'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 20 && <div style={{ textAlign: 'center', padding: 6, fontSize: 11, color: '#999' }}>...và {data.length - 20} dòng nữa</div>}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ ...actionBtn, background: '#f5f5f5', color: '#333', flex: 1 }}>Hủy</button>
          <button onClick={handleImport} disabled={data.length === 0 || importing}
            style={{ ...actionBtn, background: data.length > 0 ? '#1a73e8' : '#ccc', color: 'white', flex: 2 }}>
            {importing ? '⏳ Đang import...' : `📥 Import ${data.length} dòng`}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modal = { background: 'white', borderRadius: 12, padding: 24, width: 600, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }
const closeBtn = { border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }
const uploadArea = { border: '2px dashed #d1d5db', borderRadius: 8, padding: 30, textAlign: 'center', cursor: 'pointer', marginBottom: 12, transition: 'border-color 0.2s' }
const actionBtn = { padding: '10px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, width: '100%' }
const th = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11, borderBottom: '1px solid #e5e7eb' }
const td = { padding: '5px 8px', fontSize: 11 }
