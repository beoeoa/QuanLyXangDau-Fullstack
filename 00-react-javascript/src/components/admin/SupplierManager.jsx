import { useState, useEffect } from 'react'
import {
    getAllSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier
} from '../../services/supplierService'
import './AdminModules.css'

function SupplierManager() {
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
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
                loadSuppliers()
            } else {
                alert('Lỗi khi xóa: ' + result.message)
            }
        }
    }

    const handleExportExcel = () => {
        const headers = ['Tên Nhà Cung Cấp', 'Số điện thoại', 'Email', 'Địa chỉ', 'Ghi chú'];
        const csvRows = [];
        csvRows.push(headers.join(','));

        suppliers.forEach(supplier => {
            const row = [
                `"${supplier.name || ''}"`,
                `"${supplier.phone || ''}"`,
                `"${supplier.email || ''}"`,
                `"${supplier.address || ''}"`,
                `"${supplier.note || ''}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'Danh_sach_nha_cung_cap.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (editingId) {
            const result = await updateSupplier(editingId, formData)
            if (result.success) {
                setShowModal(false)
                loadSuppliers()
            } else {
                alert('Lỗi cập nhật: ' + result.message)
            }
        } else {
            const result = await addSupplier(formData)
            if (result.success) {
                setShowModal(false)
                loadSuppliers()
            } else {
                alert('Lỗi thêm mới: ' + result.message)
            }
        }
    }

    return (
        <div className="module-container">
            <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2>🏭 Quản lý Nhà Cung Cấp</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
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
                        {suppliers.map(sup => (
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
