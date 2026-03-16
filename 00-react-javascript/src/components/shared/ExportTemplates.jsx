/**
 * ExportTemplates.jsx
 * Tất cả mẫu phiếu chuyên nghiệp của CTY TNHH DV TM VẬN TẢI 88
 * Bao gồm: Phiếu Xuất Kho, Lệnh Điều Xe, Phiếu Chi, Bảng Lương, Biên Bản Hao Hụt
 */

const COMPANY = {
  name: 'CÔNG TY TNHH DỊCH VỤ THƯƠNG MẠI VẬN TẢI 88',
  shortName: 'CTY VẬN TẢI 88',
  address: 'Số 40 đường Trực Cát 2, P. Vĩnh Niệm, Q. Lê Chân, TP. Hải Phòng',
  phone: '0225.3xxx.xxx',
  mst: '0202133771',
  stk: '18085888 - NH TMCP Á Châu - CN Gò Mây, TP HCM',
}

const fmtDate = (d) => {
  if (!d) d = new Date()
  if (typeof d === 'string') d = new Date(d)
  if (d?._seconds) d = new Date(d._seconds * 1000)
  if (d?.toDate) d = d.toDate()
  return {
    dd: String(d.getDate()).padStart(2, '0'),
    mm: String(d.getMonth() + 1).padStart(2, '0'),
    yyyy: d.getFullYear(),
    full: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }
}

const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN')

const logoSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60">
  <rect width="120" height="60" rx="8" fill="#1a237e"/>
  <text x="60" y="25" text-anchor="middle" fill="#FFD600" font-size="18" font-weight="bold" font-family="Arial">VT 88</text>
  <text x="60" y="42" text-anchor="middle" fill="white" font-size="8" font-family="Arial">VẬN TẢI XĂNG DẦU</text>
  <text x="60" y="52" text-anchor="middle" fill="#aaa" font-size="6" font-family="Arial">HẢI PHÒNG</text>
</svg>`

const baseCSS = `
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: 'Times New Roman', serif; font-size: 13px; margin: 0; padding: 20px; color: #000; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
  .header-left { max-width: 60%; }
  .header-right { text-align: right; }
  .company-name { font-weight: bold; font-size: 13px; text-transform: uppercase; color: #1a237e; }
  .company-info { font-size: 11px; color: #333; line-height: 1.4; }
  .form-code { font-weight: bold; font-size: 12px; }
  .form-note { font-style: italic; font-size: 10px; color: #555; }
  .title { text-align: center; margin: 20px 0 10px; }
  .title h1 { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; }
  .title p { font-size: 12px; font-style: italic; margin: 4px 0 0; }
  .info-line { line-height: 1.8; margin-bottom: 12px; font-size: 13px; }
  table.dt { width: 100%; border-collapse: collapse; margin: 12px 0; }
  table.dt th, table.dt td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
  table.dt th { background: #f5f5f5; font-weight: bold; text-align: center; }
  .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 30px; }
  .signatures > div { width: 22%; }
  .sig-title { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
  .sig-note { font-style: italic; font-size: 10px; margin-bottom: 60px; }
  .sig-date { font-style: italic; font-size: 11px; text-align: right; margin-bottom: 10px; }
  .stamp { display: inline-block; border-radius: 50%; width: 80px; height: 80px; border: 2px solid #c00; color: #c00; transform: rotate(-15deg); font-size: 8px; font-weight: bold; padding-top: 20px; box-sizing: border-box; text-align: center; line-height: 1.3; }
  .total-row { font-weight: bold; background: #fafafa; }
  @media print { body { padding: 0; } }
`

const headerHTML = (formCode, formNote) => `
  <div class="header">
    <div class="header-left">
      ${logoSVG}
      <div class="company-name" style="margin-top:6px">${COMPANY.name}</div>
      <div class="company-info">${COMPANY.address}<br>ĐT: ${COMPANY.phone} | MST: ${COMPANY.mst}</div>
    </div>
    <div class="header-right">
      ${formCode ? `<div class="form-code">${formCode}</div>` : ''}
      ${formNote ? `<div class="form-note">${formNote}</div>` : ''}
    </div>
  </div>
`

const sigDateHTML = (d) => {
  const { dd, mm, yyyy } = fmtDate(d)
  return `<div class="sig-date">Ngày ${dd} tháng ${mm} năm ${yyyy}</div>`
}

const openPrint = (html) => {
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 600)
}

// ==========================================
// 1. PHIẾU XUẤT KHO (Mẫu 02-VT)
// ==========================================
export const exportPhieuXuatKho = (order, deliveryOrder) => {
  const now = new Date()
  const { dd, mm, yyyy } = fmtDate(now)
  const qty = Number(order.quantity || order.amount || 0)
  const price = 20181
  const total = qty * price

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Phiếu Xuất Kho</title>
  <style>${baseCSS}</style></head><body>
  ${headerHTML('Mẫu số: 02-VT', '(Ban hành theo T.tư số 200/2014/TT-BTC<br>ngày 22/12/2014 của Bộ Tài chính)')}
  <div class="title">
    <div class="stamp" style="position:relative; display:inline-block; margin-bottom:10px">M.S.D.N: ${COMPANY.mst}<br>${COMPANY.shortName}<br>TP. HẢI PHÒNG</div>
    <h1>PHIẾU XUẤT KHO</h1>
    <p>Ngày ${dd} tháng ${mm} năm ${yyyy}<br>Số: PXK-${String(Math.floor(Math.random()*900)+100)}</p>
  </div>
  <div class="info-line">
    Họ tên người nhận hàng: <strong>${deliveryOrder?.assignedDriverName || '_______________'}</strong><br>
    Lý do xuất kho: Giao hàng cho đại lý <strong>${order.customerName || deliveryOrder?.destination || '_______________'}</strong><br>
    Xuất tại kho: <strong>${deliveryOrder?.sourceWarehouse || 'Kho Hàng Hóa'}</strong> &nbsp;&nbsp; Xe: <strong>${deliveryOrder?.vehiclePlate || '_______________'}</strong>
  </div>
  <table class="dt">
    <thead>
      <tr><th rowspan="2" width="5%">STT</th><th rowspan="2" width="30%">Tên hàng hóa</th><th rowspan="2" width="8%">Mã số</th><th rowspan="2" width="8%">ĐVT</th>
      <th colspan="2" width="20%">Số lượng</th><th rowspan="2" width="12%">Đơn giá</th><th rowspan="2" width="17%">Thành tiền</th></tr>
      <tr><th>Yêu cầu</th><th>Thực xuất</th></tr>
    </thead>
    <tbody>
      <tr><td style="text-align:center">1</td><td>${order.product || 'Dầu Diesel 0.05S'}</td><td>DO</td><td>Lít</td>
      <td style="text-align:right">${fmtMoney(qty)}</td><td style="text-align:right"></td>
      <td style="text-align:right">${fmtMoney(price)}</td><td style="text-align:right">${fmtMoney(total)}</td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr class="total-row"><td colspan="7" style="text-align:right">Cộng:</td><td style="text-align:right">${fmtMoney(total)}</td></tr>
    </tbody>
  </table>
  <p><em>Tổng số tiền (viết bằng chữ): .......................................................</em></p>
  <p><em>Số chứng từ gốc kèm theo: ........................</em></p>
  ${sigDateHTML(now)}
  <div class="signatures">
    <div><div class="sig-title">Người lập phiếu</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Người nhận hàng</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Thủ kho</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Kế toán trưởng</div><div class="sig-note">(Ký, họ tên)</div></div>
  </div>
  </body></html>`

  openPrint(html)
}

// ==========================================
// 2. LỆNH ĐIỀU XE (Mẫu nội bộ CTY 88)
// ==========================================
export const exportLenhDieuXe = (deliveryOrder) => {
  const now = new Date()
  const { dd, mm, yyyy } = fmtDate(now)
  const soLenh = `LDX-${yyyy}${mm}${String(Math.floor(Math.random()*900)+100)}`

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Lệnh Điều Xe</title>
  <style>${baseCSS}
    .ldx-box { border: 2px solid #1a237e; border-radius: 8px; padding: 16px; margin: 10px 0; }
    .ldx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; line-height: 2; }
    .ldx-grid strong { color: #1a237e; }
    .priority { display: inline-block; padding: 3px 12px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .priority-high { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .priority-normal { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
  </style></head><body>
  ${headerHTML('', '')}
  <div class="title" style="border: 3px double #1a237e; padding: 10px; margin: 15px 0;">
    <h1 style="color: #1a237e; letter-spacing: 3px;">LỆNH ĐIỀU XE</h1>
    <p>Số: <strong>${soLenh}</strong> &nbsp;—&nbsp; Ngày ${dd}/${mm}/${yyyy}</p>
  </div>

  <div class="ldx-box">
    <div class="ldx-grid">
      <div>🚛 <strong>Biển số xe:</strong> ${deliveryOrder.vehiclePlate || '_______________'}</div>
      <div>👤 <strong>Tài xế:</strong> ${deliveryOrder.assignedDriverName || '_______________'}</div>
      <div>📦 <strong>Loại hàng:</strong> ${deliveryOrder.product || '_______________'}</div>
      <div>⚖️ <strong>Khối lượng:</strong> ${fmtMoney(deliveryOrder.amount || 0)} Lít</div>
      <div>🏭 <strong>Kho xuất:</strong> ${deliveryOrder.sourceWarehouse || '_______________'}</div>
      <div>📍 <strong>Điểm giao:</strong> ${deliveryOrder.destination || '_______________'}</div>
      <div>🔒 <strong>Mã seal:</strong> ${deliveryOrder.sealCode || 'Chưa niêm'}</div>
      <div>⏰ <strong>Thời gian xuất:</strong> ${dd}/${mm}/${yyyy} - ${new Date().toLocaleTimeString('vi-VN')}</div>
    </div>
  </div>

  <div style="margin: 15px 0; padding: 12px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px;">
    <strong style="color: #92400e;">📋 YÊU CẦU THỰC HIỆN:</strong>
    <ol style="font-size: 12px; line-height: 1.8; margin: 8px 0 0; padding-left: 20px;">
      <li>Kiểm tra xe, bồn chứa trước khi xuất phát</li>
      <li>Niêm phong seal theo đúng mã số trên lệnh</li>
      <li>Di chuyển theo đúng lộ trình đã được phê duyệt</li>
      <li>Giao hàng đúng đại lý, lấy xác nhận ký biên bản</li>
      <li>Báo cáo hao hụt (nếu có vượt 0.5%) ngay khi phát hiện</li>
      <li>Upload chứng từ (biên bản giao nhận, phiếu hao hụt) lên hệ thống</li>
    </ol>
  </div>

  <table class="dt" style="margin-top: 15px;">
    <tr><th width="50%" style="background:#1a237e; color:white;">NGƯỜI LẬP LỆNH</th><th width="50%" style="background:#1a237e; color:white;">GIÁM ĐỐC PHÊ DUYỆT</th></tr>
    <tr>
      <td style="height:80px; text-align:center; vertical-align:bottom; font-style:italic; font-size:11px;">(Ký, ghi rõ họ tên)</td>
      <td style="height:80px; text-align:center; vertical-align:bottom; font-style:italic; font-size:11px;">(Ký, đóng dấu)</td>
    </tr>
  </table>
  <div style="text-align:center; margin-top:10px; font-size:10px; color:#999; border-top:1px dashed #ccc; padding-top:8px;">
    ${COMPANY.name} — ${COMPANY.address}<br>Mẫu nội bộ — Lưu hành nội bộ
  </div>
  </body></html>`

  openPrint(html)
}

// ==========================================
// 3. PHIẾU CHI (Mẫu 02-TT)
// ==========================================
export const exportPhieuChi = (expense) => {
  const now = new Date()
  const { dd, mm, yyyy } = fmtDate(now)
  const amount = Number(expense.amount || 0)

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Phiếu Chi</title>
  <style>${baseCSS}</style></head><body>
  ${headerHTML('Mẫu số: 02-TT', '(Ban hành theo T.tư số 200/2014/TT-BTC<br>ngày 22/12/2014 của Bộ Tài chính)')}
  <div class="title">
    <h1>PHIẾU CHI</h1>
    <p>Ngày ${dd} tháng ${mm} năm ${yyyy}<br>Số: PC-${String(Math.floor(Math.random()*900)+100)}</p>
    <table style="position:absolute; top:0; right:20px; font-size:11px; border-collapse:collapse;">
      <tr><td style="border:1px solid #000; padding:4px 10px; font-weight:bold;">Nợ</td><td style="border:1px solid #000; padding:4px 10px;">642</td></tr>
      <tr><td style="border:1px solid #000; padding:4px 10px; font-weight:bold;">Có</td><td style="border:1px solid #000; padding:4px 10px;">111</td></tr>
    </table>
  </div>
  <div class="info-line">
    Họ tên người nhận tiền: <strong>${expense.driverName || '_______________'}</strong><br>
    Địa chỉ: Tài xế ${COMPANY.shortName}<br>
    Lý do chi: <strong>${expense.type || 'Chi phí vận hành'} — ${expense.description || ''}</strong><br>
    Số tiền: <strong style="color:#c00; font-size:16px;">${fmtMoney(amount)} ₫</strong><br>
    <em>(Viết bằng chữ: ................................................................)</em><br>
    Kèm theo: ${expense.receiptImage ? '01 chứng từ gốc (ảnh biên lai)' : '......... chứng từ gốc'}
  </div>
  ${sigDateHTML(now)}
  <div class="signatures" style="justify-content: space-around;">
    <div><div class="sig-title">Giám đốc</div><div class="sig-note">(Ký, họ tên, đóng dấu)</div></div>
    <div><div class="sig-title">Kế toán trưởng</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Thủ quỹ</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Người nhận tiền</div><div class="sig-note">(Ký, họ tên)</div></div>
  </div>
  <div style="margin-top:20px; font-size:10px; color:#888; text-align:center; border-top:1px dashed #ccc; padding-top:6px;">
    Đã nhận đủ số tiền (viết bằng chữ): ................................................................
  </div>
  </body></html>`

  openPrint(html)
}

// ==========================================
// 4. BẢNG TỔNG HỢP LƯƠNG
// ==========================================
export const exportBangLuong = (payrollData, month, year) => {
  const now = new Date()
  const { dd, mm: curMm, yyyy: curYyyy } = fmtDate(now)
  const m = month || curMm
  const y = year || curYyyy

  let rows = ''
  let totalBase = 0, totalBonus = 0, totalPenalty = 0, grandTotal = 0

  payrollData.forEach((d, i) => {
    const bonus = d.fuelBonus >= 0 ? d.fuelBonus : 0
    const penalty = d.fuelBonus < 0 ? Math.abs(d.fuelBonus) : 0
    totalBase += d.baseSalary
    totalBonus += bonus
    totalPenalty += penalty
    grandTotal += d.total
    rows += `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${d.fullname || d.email}</td>
      <td style="text-align:center">${d.tripCount}</td>
      <td style="text-align:right">${fmtMoney(d.totalKm)}</td>
      <td style="text-align:right">${fmtMoney(d.baseSalary)}</td>
      <td style="text-align:right; color:green">${bonus > 0 ? '+' + fmtMoney(bonus) : '-'}</td>
      <td style="text-align:right; color:red">${penalty > 0 ? '-' + fmtMoney(penalty) : '-'}</td>
      <td style="text-align:right; font-weight:bold">${fmtMoney(d.total)}</td>
      <td style="text-align:center"></td>
    </tr>`
  })

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bảng Tổng Hợp Lương</title>
  <style>${baseCSS}
    table.dt td, table.dt th { font-size: 11px; }
  </style></head><body>
  ${headerHTML('', '')}
  <div class="title">
    <h1>BẢNG TỔNG HỢP THANH TOÁN LƯƠNG TÀI XẾ</h1>
    <p>Tháng ${m} năm ${y}</p>
  </div>
  <table class="dt">
    <thead>
      <tr>
        <th width="4%">STT</th><th width="18%">Họ tên tài xế</th><th width="8%">Số chuyến</th>
        <th width="10%">Tổng km</th><th width="14%">Lương cơ bản</th>
        <th width="12%">Thưởng tiết kiệm</th><th width="12%">Phạt hao hụt</th>
        <th width="14%">THỰC LĨNH</th><th width="8%">Ký nhận</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="4" style="text-align:right; font-weight:bold;">TỔNG CỘNG:</td>
        <td style="text-align:right">${fmtMoney(totalBase)}</td>
        <td style="text-align:right; color:green">${fmtMoney(totalBonus)}</td>
        <td style="text-align:right; color:red">${fmtMoney(totalPenalty)}</td>
        <td style="text-align:right; font-weight:bold; font-size:13px;">${fmtMoney(grandTotal)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <p style="font-style:italic; font-size:11px;">Tổng số tiền: ................................................................ đồng.</p>
  ${sigDateHTML(now)}
  <div class="signatures" style="justify-content: space-around;">
    <div><div class="sig-title">Người lập bảng</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Kế toán trưởng</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Giám đốc</div><div class="sig-note">(Ký, họ tên, đóng dấu)</div></div>
  </div>
  </body></html>`

  openPrint(html)
}

// ==========================================
// 5. BIÊN BẢN KIỂM KÊ HAO HỤT
// ==========================================
export const exportBienBanHaoHut = (deliveryOrder) => {
  const now = new Date()
  const { dd, mm, yyyy } = fmtDate(now)
  const amountOut = Number(deliveryOrder.amount || 0)
  const delivered = Number(deliveryOrder.deliveredAmount || amountOut)
  const loss = amountOut - delivered
  const lossPct = amountOut > 0 ? ((loss / amountOut) * 100).toFixed(2) : 0
  const allowedPct = 0.5
  const isOverLimit = lossPct > allowedPct

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Biên Bản Kiểm Kê Hao Hụt</title>
  <style>${baseCSS}
    .result-box { padding: 14px; border-radius: 8px; margin: 12px 0; font-size: 13px; }
    .result-ok { background: #d1fae5; border: 1px solid #6ee7b7; }
    .result-warn { background: #fee2e2; border: 1px solid #fca5a5; }
  </style></head><body>
  ${headerHTML('', '')}
  <div class="title" style="border-bottom: 2px solid #1a237e; padding-bottom:10px;">
    <h1>BIÊN BẢN KIỂM KÊ HAO HỤT</h1>
    <p>Số: BBHH-${String(Math.floor(Math.random()*900)+100)} &nbsp;—&nbsp; Ngày ${dd}/${mm}/${yyyy}</p>
  </div>

  <div class="info-line">
    Căn cứ: Lệnh điều xe cho chuyến giao hàng<br>
    Chúng tôi gồm:<br>
    &nbsp;&nbsp;1. Đại diện Kế toán: ..............................<br>
    &nbsp;&nbsp;2. Đại diện Thủ kho: ..............................<br>
    &nbsp;&nbsp;3. Tài xế: <strong>${deliveryOrder.assignedDriverName || '_______________'}</strong><br>
    Cùng tiến hành kiểm kê hao hụt xăng dầu chuyến giao hàng sau:
  </div>

  <table class="dt">
    <tr><th width="35%">Thông tin</th><th width="65%">Chi tiết</th></tr>
    <tr><td><strong>Biển số xe</strong></td><td>${deliveryOrder.vehiclePlate || '-'}</td></tr>
    <tr><td><strong>Loại hàng</strong></td><td>${deliveryOrder.product || '-'}</td></tr>
    <tr><td><strong>Đại lý nhận</strong></td><td>${deliveryOrder.destination || '-'}</td></tr>
    <tr><td><strong>Mã Seal</strong></td><td>${deliveryOrder.sealCode || 'N/A'}</td></tr>
    <tr><td><strong>Số lượng xuất kho</strong></td><td style="font-weight:bold">${fmtMoney(amountOut)} Lít</td></tr>
    <tr><td><strong>Số lượng thực giao</strong></td><td style="font-weight:bold">${fmtMoney(delivered)} Lít</td></tr>
    <tr><td><strong>Hao hụt</strong></td><td style="font-weight:bold; color:${isOverLimit ? '#c00' : '#059669'}">${fmtMoney(loss)} Lít (${lossPct}%)</td></tr>
    <tr><td><strong>Mức cho phép</strong></td><td>${allowedPct}%</td></tr>
  </table>

  <div class="result-box ${isOverLimit ? 'result-warn' : 'result-ok'}">
    ${isOverLimit
      ? `⚠️ <strong>HAO HỤT VƯỢT MỨC CHO PHÉP:</strong> Vượt ${(lossPct - allowedPct).toFixed(2)}%. Tài xế cần giải trình nguyên nhân và chịu trách nhiệm bồi thường theo quy định công ty.`
      : `✅ <strong>HAO HỤT TRONG MỨC CHO PHÉP:</strong> Hao hụt ${lossPct}% nằm trong giới hạn ${allowedPct}%. Không phát sinh bồi thường.`
    }
  </div>

  <div style="margin: 15px 0;">
    <strong>Nguyên nhân hao hụt:</strong><br>
    <div style="border: 1px solid #ccc; min-height: 60px; padding: 8px; border-radius: 4px; margin-top: 4px;">
      ${deliveryOrder.lossReason || '(Ghi rõ nguyên nhân nếu vượt mức cho phép)'}
    </div>
  </div>

  ${sigDateHTML(now)}
  <div class="signatures" style="justify-content: space-around;">
    <div><div class="sig-title">Kế toán</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Thủ kho</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Tài xế</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Giám đốc</div><div class="sig-note">(Ký, duyệt)</div></div>
  </div>
  </body></html>`

  openPrint(html)
}

// ==========================================
// 6. GIẤY ĐỀ NGHỊ THANH TOÁN + BẢNG KÊ (AR — Đòi nợ khách)
// ==========================================
export const exportDeNghiThanhToan = (customer, trips, month, year) => {
  const now = new Date()
  const { dd, mm: curMm, yyyy: curYyyy } = fmtDate(now)
  const m = month || curMm
  const y = year || curYyyy

  let rows = ''
  let totalAmount = 0
  const validTrips = (trips || []).filter(t => t.status === 'completed' || t.approvalStatus === 'approved')

  validTrips.forEach((t, i) => {
    const qty = Number(t.deliveredQuantity || t.amount || 0)
    const price = Number(t.unitPrice || 20181)
    const subtotal = qty * price
    totalAmount += subtotal
    const tripDate = fmtDate(t.completedAt || t.createdAt)
    rows += `<tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${tripDate.full}</td>
      <td>${t.vehiclePlate || '-'}</td>
      <td>${t.assignedDriverName || '-'}</td>
      <td>${t.product || 'Dầu Diesel'}</td>
      <td style="text-align:right">${fmtMoney(qty)}</td>
      <td style="text-align:right">${fmtMoney(price)}</td>
      <td style="text-align:right;font-weight:bold">${fmtMoney(subtotal)}</td>
    </tr>`
  })

  const vat = Math.round(totalAmount * 0.08)
  const grandTotal = totalAmount + vat

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Đề Nghị Thanh Toán</title>
  <style>${baseCSS}
    .customer-box { background:#f0f4ff; border:1px solid #93c5fd; border-radius:8px; padding:14px; margin:12px 0; }
    .highlight-total { font-size:18px; color:#b91c1c; font-weight:bold; }
  </style></head><body>
  ${headerHTML('Mẫu 03-AR', 'Nội bộ CTY VẬN TẢI 88')}
  <div class="title">
    <div class="stamp" style="display:inline-block;margin-bottom:8px">M.S.D.N: ${COMPANY.mst}<br>${COMPANY.shortName}<br>TP. HẢI PHÒNG</div>
    <h1>GIẤY ĐỀ NGHỊ THANH TOÁN</h1>
    <p>Số: ĐNTT-${y}${m}${String(Math.floor(Math.random()*90)+10)}<br>Ngày ${dd} tháng ${curMm} năm ${curYyyy}</p>
  </div>

  <div class="info-line">
    Kính gửi: <strong>${customer?.name || '_______________'}</strong><br>
    MST: <strong>${customer?.taxCode || customer?.mst || '_______________'}</strong><br>
    Địa chỉ: ${customer?.address || '_______________'}<br>
    Người liên hệ: ${customer?.contactPerson || '_______________'} — ĐT: ${customer?.phone || '_______________'}
  </div>

  <div class="customer-box">
    <strong>Căn cứ:</strong> Hợp đồng nguyên tắc vận chuyển xăng dầu đã ký giữa hai bên.<br>
    <strong>Nội dung:</strong> Đề nghị thanh toán cước vận chuyển xăng dầu tháng ${m}/${y}.<br>
    <strong>Số chuyến đã hoàn thành:</strong> ${validTrips.length} chuyến
  </div>

  <h3 style="margin:15px 0 5px">📋 BẢNG KÊ CHI TIẾT CÁC CHUYẾN GIAO HÀNG</h3>
  <table class="dt">
    <thead>
      <tr>
        <th width="4%">STT</th><th width="10%">Ngày</th><th width="10%">Biển xe</th>
        <th width="14%">Tài xế</th><th width="14%">Sản phẩm</th>
        <th width="12%">Số lượng (L)</th><th width="12%">Đơn giá</th><th width="14%">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="8" style="text-align:center;color:#999">Chưa có chuyến nào</td></tr>'}
      <tr class="total-row"><td colspan="7" style="text-align:right">Cộng tiền hàng:</td><td style="text-align:right">${fmtMoney(totalAmount)}</td></tr>
      <tr class="total-row"><td colspan="7" style="text-align:right">Thuế GTGT (8%):</td><td style="text-align:right">${fmtMoney(vat)}</td></tr>
      <tr class="total-row"><td colspan="7" style="text-align:right;font-size:14px"><strong>TỔNG THANH TOÁN:</strong></td><td style="text-align:right" class="highlight-total">${fmtMoney(grandTotal)} ₫</td></tr>
    </tbody>
  </table>

  <p style="font-style:italic;font-size:12px">Số tiền bằng chữ: ................................................................ đồng.</p>

  <div style="margin:12px 0;padding:10px;background:#fff7ed;border:1px solid #fb923c;border-radius:6px;font-size:12px">
    <strong>💳 Thông tin chuyển khoản:</strong><br>
    Tên TK: ${COMPANY.name}<br>
    STK: ${COMPANY.stk}<br>
    Nội dung CK: TT cước VC T${m}/${y} — ${customer?.name || 'Tên KH'}
  </div>

  ${sigDateHTML(now)}
  <div class="signatures" style="justify-content:space-around">
    <div><div class="sig-title">Người lập</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Kế toán trưởng</div><div class="sig-note">(Ký, họ tên)</div></div>
    <div><div class="sig-title">Giám đốc</div><div class="sig-note">(Ký, đóng dấu)</div></div>
    <div><div class="sig-title">Đại diện KH xác nhận</div><div class="sig-note">(Ký, đóng dấu)</div></div>
  </div>
  </body></html>`

  openPrint(html)
}

// ==========================================
// 7. HỢP ĐỒNG NGUYÊN TẮC VẬN CHUYỂN (Sales)
// ==========================================
export const exportHopDongNguyenTac = (customer) => {
  const now = new Date()
  const { dd, mm, yyyy } = fmtDate(now)
  const soHD = `HĐNT-${yyyy}/${String(Math.floor(Math.random()*90)+10)}`

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Hợp Đồng Nguyên Tắc</title>
  <style>${baseCSS}
    .article { margin: 14px 0; }
    .article h3 { font-size: 14px; margin: 0 0 6px; color: #1a237e; text-transform: uppercase; }
    .article p, .article li { font-size: 13px; line-height: 1.7; }
    .party-box { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 14px 0; }
    .party { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .party h4 { margin: 0 0 8px; color: #1e40af; }
  </style></head><body>
  <div style="text-align:center; margin-bottom:20px">
    ${logoSVG}
    <div style="font-size:11px;color:#666;margin-top:4px">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br><strong>Độc lập — Tự do — Hạnh phúc</strong></div>
  </div>

  <div class="title" style="border:3px double #1a237e; padding:12px">
    <h1 style="color:#1a237e">HỢP ĐỒNG NGUYÊN TẮC<br>VẬN CHUYỂN XĂNG DẦU</h1>
    <p>Số: <strong>${soHD}</strong><br>Ngày ${dd} tháng ${mm} năm ${yyyy}</p>
  </div>

  <div class="party-box">
    <div class="party">
      <h4>BÊN A (Bên vận chuyển):</h4>
      <div style="font-size:12px;line-height:1.8">
        <strong>${COMPANY.name}</strong><br>
        Địa chỉ: ${COMPANY.address}<br>
        MST: ${COMPANY.mst}<br>
        ĐT: ${COMPANY.phone}<br>
        STK: ${COMPANY.stk}<br>
        Đại diện: Ông/Bà ......................... — Chức vụ: Giám đốc
      </div>
    </div>
    <div class="party">
      <h4>BÊN B (Bên thuê vận chuyển):</h4>
      <div style="font-size:12px;line-height:1.8">
        <strong>${customer?.name || '_______________'}</strong><br>
        Địa chỉ: ${customer?.address || '_______________'}<br>
        MST: ${customer?.taxCode || customer?.mst || '_______________'}<br>
        ĐT: ${customer?.phone || '_______________'}<br>
        STK: ........................................<br>
        Đại diện: ${customer?.contactPerson || '.........................'} — Chức vụ: ${customer?.contactTitle || '...................'}
      </div>
    </div>
  </div>

  <div class="article"><h3>Điều 1: Đối tượng hợp đồng</h3>
    <p>Bên A cung cấp dịch vụ vận chuyển xăng dầu từ kho đầu nguồn đến các điểm giao hàng theo yêu cầu của Bên B. Các sản phẩm vận chuyển bao gồm: Dầu Diesel 0.05S, Xăng RON 95-V, Xăng E5 RON 92.</p></div>

  <div class="article"><h3>Điều 2: Phương thức đặt hàng</h3>
    <p>Bên B đặt hàng qua điện thoại, email, hoặc hệ thống quản lý trực tuyến của Bên A. Đơn hàng cần ghi rõ: Loại sản phẩm, Số lượng (Lít), Điểm giao, Thời gian yêu cầu giao.</p></div>

  <div class="article"><h3>Điều 3: Giá cước vận chuyển</h3>
    <p>Giá cước được thỏa thuận theo Phụ lục đính kèm. Giá chưa bao gồm thuế GTGT 8%. Điều chỉnh giá khi có biến động giá xăng dầu đầu nguồn trên 5%.</p></div>

  <div class="article"><h3>Điều 4: Thanh toán</h3>
    <p>Thanh toán theo kỳ: 30 ngày kể từ ngày giao hàng cuối cùng trong tháng. Hình thức: Chuyển khoản ngân hàng. Bên A xuất hóa đơn GTGT theo quy định.</p></div>

  <div class="article"><h3>Điều 5: Định mức hao hụt</h3>
    <p>Mức hao hụt cho phép: <strong>0.5%</strong> trên tổng số lượng xuất kho. Hao hụt vượt mức do Bên A chịu trách nhiệm bồi thường.</p></div>

  <div class="article"><h3>Điều 6: Trách nhiệm các bên</h3>
    <p><strong>Bên A:</strong> Đảm bảo xe bồn đạt chuẩn an toàn, giao hàng đúng số lượng và chất lượng, cung cấp đầy đủ chứng từ.</p>
    <p><strong>Bên B:</strong> Thanh toán đúng hạn, cung cấp địa chỉ giao chính xác, cử người nhận và ký biên bản giao nhận.</p></div>

  <div class="article"><h3>Điều 7: Hiệu lực</h3>
    <p>Hợp đồng có hiệu lực từ ngày ký đến hết ngày 31/12/${yyyy}. Tự động gia hạn thêm 1 năm nếu không có văn bản chấm dứt trước 30 ngày.</p></div>

  <div style="margin-top:30px">
    <table style="width:100%;border:none">
      <tr>
        <td style="width:50%;text-align:center;vertical-align:top;padding:10px">
          <strong style="color:#1a237e">ĐẠI DIỆN BÊN A</strong><br>
          <em style="font-size:11px">(Ký tên, đóng dấu)</em><br><br><br><br><br><br>
          <strong>Giám đốc ${COMPANY.shortName}</strong>
        </td>
        <td style="width:50%;text-align:center;vertical-align:top;padding:10px">
          <strong style="color:#1a237e">ĐẠI DIỆN BÊN B</strong><br>
          <em style="font-size:11px">(Ký tên, đóng dấu)</em><br><br><br><br><br><br>
          <strong>${customer?.contactPerson || '_______________'}</strong>
        </td>
      </tr>
    </table>
  </div>
  </body></html>`

  openPrint(html)
}

// ==========================================
// 8. ỦY NHIỆM CHI (KT → Ngân hàng)
// ==========================================
export const exportUyNhiemChi = (payment) => {
  const now = new Date()
  const { dd, mm, yyyy } = fmtDate(now)
  const amount = Number(payment?.amount || 0)

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ủy Nhiệm Chi</title>
  <style>${baseCSS}
    .unc-box { border: 2px solid #1a237e; border-radius: 6px; padding: 0; margin: 14px 0; }
    .unc-row { display: grid; grid-template-columns: 160px 1fr; border-bottom: 1px solid #e5e7eb; }
    .unc-row:last-child { border-bottom: none; }
    .unc-label { background: #f0f4ff; padding: 8px 12px; font-weight: bold; font-size: 12px; color: #1e3a5f; border-right: 1px solid #e5e7eb; }
    .unc-value { padding: 8px 12px; font-size: 13px; }
    .bank-header { background: #1a237e; color: white; padding: 10px 14px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center; }
  </style></head><body>
  <div class="bank-header">
    <div>
      <strong style="font-size:15px">NGÂN HÀNG THƯƠNG MẠI</strong><br>
      <span style="font-size:11px">Chi nhánh: ________________________</span>
    </div>
    <div style="text-align:right;font-size:11px">
      Mẫu số: S4a-NH<br>(Ban hành theo QĐ 1789/QĐ-NHNN)
    </div>
  </div>

  <div class="title" style="margin:20px 0 15px">
    <h1 style="letter-spacing:3px">ỦY NHIỆM CHI</h1>
    <p>Số: UNC-${yyyy}${mm}${String(Math.floor(Math.random()*900)+100)}<br>Ngày ${dd} tháng ${mm} năm ${yyyy}</p>
  </div>

  <div class="unc-box">
    <div style="background:#dbeafe;padding:8px 12px;font-weight:bold;font-size:13px;color:#1e40af;border-bottom:1px solid #93c5fd">
      👤 THÔNG TIN NGƯỜI CHUYỂN (Bên A)
    </div>
    <div class="unc-row"><div class="unc-label">Tên đơn vị</div><div class="unc-value"><strong>${COMPANY.name}</strong></div></div>
    <div class="unc-row"><div class="unc-label">Số tài khoản</div><div class="unc-value">${COMPANY.stk}</div></div>
    <div class="unc-row"><div class="unc-label">MST</div><div class="unc-value">${COMPANY.mst}</div></div>
  </div>

  <div class="unc-box">
    <div style="background:#dcfce7;padding:8px 12px;font-weight:bold;font-size:13px;color:#166534;border-bottom:1px solid #86efac">
      🏢 THÔNG TIN NGƯỜI NHẬN (Bên B)
    </div>
    <div class="unc-row"><div class="unc-label">Tên đơn vị</div><div class="unc-value"><strong>${payment?.recipientName || '_______________'}</strong></div></div>
    <div class="unc-row"><div class="unc-label">Số tài khoản</div><div class="unc-value">${payment?.recipientAccount || '_______________'}</div></div>
    <div class="unc-row"><div class="unc-label">Ngân hàng</div><div class="unc-value">${payment?.recipientBank || '_______________'}</div></div>
  </div>

  <div class="unc-box">
    <div style="background:#fef3c7;padding:8px 12px;font-weight:bold;font-size:13px;color:#92400e;border-bottom:1px solid #fbbf24">
      💰 NỘI DUNG CHUYỂN KHOẢN
    </div>
    <div class="unc-row"><div class="unc-label">Số tiền bằng số</div><div class="unc-value" style="font-size:18px;font-weight:bold;color:#b91c1c">${fmtMoney(amount)} ₫</div></div>
    <div class="unc-row"><div class="unc-label">Số tiền bằng chữ</div><div class="unc-value"><em>................................................................</em></div></div>
    <div class="unc-row"><div class="unc-label">Nội dung CK</div><div class="unc-value">${payment?.content || 'Thanh toán theo hợp đồng'}</div></div>
  </div>

  ${sigDateHTML(now)}
  <table style="width:100%;border:none;margin-top:15px">
    <tr>
      <td style="width:33%;text-align:center"><strong>Kế toán trưởng</strong><br><em style="font-size:10px">(Ký, họ tên)</em><br><br><br><br></td>
      <td style="width:33%;text-align:center"><strong>Chủ tài khoản</strong><br><em style="font-size:10px">(Ký, họ tên, đóng dấu)</em><br><br><br><br></td>
      <td style="width:33%;text-align:center"><strong>Ngân hàng A</strong><br><em style="font-size:10px">(Ký, đóng dấu)</em><br><br><br><br></td>
    </tr>
  </table>
  <div style="text-align:center;font-size:9px;color:#999;border-top:1px dashed #ccc;padding-top:6px;margin-top:10px">
    Phiếu này có giá trị khi có đủ chữ ký và con dấu — ${COMPANY.name}
  </div>
  </body></html>`

  openPrint(html)
}

// ==========================================
// 9. XUẤT EXCEL — BÁO CÁO KẾT QUẢ KINH DOANH (P&L)
// ==========================================
export const exportPnLExcel = (revenue = 0, expenses = {}, month, year) => {
  const m = month || new Date().getMonth() + 1
  const y = year || new Date().getFullYear()

  const fuelCost = Number(expenses.fuel || 0)
  const driverSalary = Number(expenses.salary || 0)
  const botCost = Number(expenses.bot || 0)
  const repairCost = Number(expenses.repair || 0)
  const officeCost = Number(expenses.office || 0)
  const otherCost = Number(expenses.other || 0)
  const totalExpense = fuelCost + driverSalary + botCost + repairCost + officeCost + otherCost
  const grossProfit = revenue - fuelCost
  const netProfit = revenue - totalExpense
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0

  // Use xlsx library
  try {
    const XLSX = window.XLSX || require('xlsx')

    const data = [
      [COMPANY.name],
      [COMPANY.address],
      [''],
      [`BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH — Tháng ${m}/${y}`],
      [''],
      ['CHỈ TIÊU', 'SỐ TIỀN (VNĐ)', 'TỶ LỆ (%)'],
      ['I. DOANH THU', '', ''],
      ['  Doanh thu cước vận chuyển', revenue, '100%'],
      [''],
      ['II. GIÁ VỐN', '', ''],
      ['  Chi phí xăng dầu', fuelCost, revenue > 0 ? ((fuelCost/revenue)*100).toFixed(1)+'%' : '0%'],
      ['  LỢI NHUẬN GỘP', grossProfit, revenue > 0 ? ((grossProfit/revenue)*100).toFixed(1)+'%' : '0%'],
      [''],
      ['III. CHI PHÍ HOẠT ĐỘNG', '', ''],
      ['  Lương tài xế', driverSalary, revenue > 0 ? ((driverSalary/revenue)*100).toFixed(1)+'%' : '0%'],
      ['  Phí BOT / Cầu đường', botCost, revenue > 0 ? ((botCost/revenue)*100).toFixed(1)+'%' : '0%'],
      ['  Sửa chữa / Bảo dưỡng xe', repairCost, ''],
      ['  Chi phí văn phòng', officeCost, ''],
      ['  Chi phí khác', otherCost, ''],
      ['  TỔNG CHI PHÍ', totalExpense, revenue > 0 ? ((totalExpense/revenue)*100).toFixed(1)+'%' : '0%'],
      [''],
      ['IV. LỢI NHUẬN THUẦN', netProfit, profitMargin + '%'],
      [''],
      [`Ngày xuất: ${fmtDate().full}`],
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `P&L T${m}-${y}`)
    XLSX.writeFile(wb, `BaoCao_KQKD_T${m}_${y}.xlsx`)
  } catch (err) {
    alert('Cần cài thư viện xlsx: npm install xlsx\n' + err.message)
  }
}
