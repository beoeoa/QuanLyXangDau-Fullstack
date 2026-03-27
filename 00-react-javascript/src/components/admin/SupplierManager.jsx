import { useState, useEffect } from 'react'
import {
    getAllSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier
} from '../../services/supplierService'
import { logAudit } from '../../services/auditLogService'
import './AdminModules.css'

function SupplierManager() {
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState(null)

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        note: ''
    })

    useEffect(() => {
        loadSuppliers()
    }, [])

    const loadSuppliers = async () => {
        setLoading(true)
        const data = await getAllSuppliers()
        setSuppliers(data)
        setLoading(false)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleCreate = () => {
        setFormData({ name: '', phone: '', email: '', address: '', note: '' })
        setEditingId(null)
        setShowModal(true)
    }

    const handleEdit = (supplier) => {
        setFormData({
            name: supplier.name,
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            note: supplier.note || ''
        })
        setEditingId(supplier.id)
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) {
            const result = await deleteSupplier(id)
            if (result.success) {
                await logAudit('DELETE', `Xóa nhà cung cấp ID: ${id}`);
                loadSuppliers()
            } else {
                alert('Lỗi khi xóa: ' + result.message)
            }
        }
    }

    const handleExportExcel = () => {
        const tableHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8" />
                <style>
                    table { border-collapse: collapse; font-family: Arial, sans-serif; }
                    th { background-color: #27ae60; color: #ffffff; font-weight: bold; border: 1px solid #ddd; padding: 10px; text-align: center; }
                    td { border: 1px solid #ddd; padding: 8px; vertical-align: middle; }
                    .text { mso-number-format:"\\@"; } 
                    .center { text-align: center; }
                    .header-title { font-size: 24px; font-weight: bold; color: #27ae60; text-align: left; }
                </style>
            </head>
            <body>
                <table>
                    <tr><td colspan="6" class="header-title">DANH SÁCH TỔNG HỢP NHÀ CUNG CẤP</td></tr>
                    <tr><td colspan="6">Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}</td></tr>
                    <tr><td colspan="6"></td></tr>
                    <tr>
                        <th>STT</th>
                        <th>Tên Nhà Cung Cấp</th>
                        <th>Số điện thoại</th>
                        <th>Email</th>
                        <th>Địa chỉ</th>
                        <th>Ghi chú</th>
                    </tr>
                    ${suppliers.map((s, index) => `
                        <tr>
                            <td class="center">${index + 1}</td>
                            <td><strong>${s.name || ''}</strong></td>
                            <td class="center text">${s.phone || ''}</td>
                            <td>${s.email || ''}</td>
                            <td>${s.address || ''}</td>
                            <td>${s.note || ''}</td>
                        </tr>
                    `).join('')}
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Danh_Sach_Nha_Cung_Cap_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (editingId) {
            const result = await updateSupplier(editingId, formData)
            if (result.success) {
                await logAudit('UPDATE', `Sửa nhà cung cấp: ${formData.name}`);
                setShowModal(false)
                loadSuppliers()
            } else {
                alert('Lỗi cập nhật: ' + result.message)
            }
        } else {
            const result = await addSupplier(formData)
            if (result.success) {
                await logAudit('CREATE', `Thêm mới nhà cung cấp: ${formData.name}`);
                setShowModal(false)
                loadSuppliers()
            } else {
                alert('Lỗi thêm mới: ' + result.message)
            }
        }
    }

    const filteredSuppliers = suppliers.filter(s => 
        !searchTerm || 
        (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.phone && s.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="module-container">
            <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ margin: 0 }}>🏭 Quản lý Nhà Cung Cấp</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', minWidth: 250 }}>
                        <span>🔍</span>
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm Nhà cung cấp, SĐT..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14 }} 
                        />
                    </div>
                    <button className="btn-success" onClick={handleExportExcel} style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>
                        📥 Xuất Excel
                    </button>
                    <button className="btn-primary" onClick={handleCreate}>
                        + Thêm Nhà CC
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">Đang tải dữ liệu...</div>
            ) : suppliers.length === 0 ? (
                <div className="empty-state">
                    <p>Chưa có nhà cung cấp nào.</p>
                </div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Tên Nhà CC</th>
                            <th>Số điện thoại</th>
                            <th>Email</th>
                            <th>Địa chỉ</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSuppliers.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Không tìm thấy nhà cung cấp nào.</td></tr>
                        ) : filteredSuppliers.map(sup => (
                            <tr key={sup.id}>
                                <td><strong>{sup.name}</strong></td>
                                <td>{sup.phone}</td>
                                <td>{sup.email}</td>
                                <td>{sup.address}</td>
                                <td>
                                    <div className="btn-group">
                                        <button className="btn-edit" onClick={() => handleEdit(sup)}>Sửa</button>
                                        <button className="btn-delete" onClick={() => handleDelete(sup.id)}>Xóa</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingId ? 'Sửa Thông Tin Nhà CC' : 'Thêm Nhà CC Mới'}</h3>
                        <form className="modal-form" onSubmit={handleSubmit}>
                            <div className="form-field">
                                <label>Tên nhà cung cấp *</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} />
                            </div>
                            <div className="form-field">
                                <label>Số điện thoại</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} />
                            </div>
                            <div className="form-field">
                                <label>Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
                            </div>
                            <div className="form-field">
                                <label>Địa chỉ</label>
                                <input type="text" name="address" value={formData.address} onChange={handleInputChange} />
                            </div>
                            <div className="form-field">
                                <label>Ghi chú</label>
                                <textarea name="note" value={formData.note} onChange={handleInputChange} />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="btn-primary">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SupplierManager
