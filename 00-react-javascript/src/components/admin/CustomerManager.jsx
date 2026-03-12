import { useState, useEffect } from 'react'
import {
    getAllCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer
} from '../../services/customerService'
import './AdminModules.css'

function CustomerManager() {
    const [customers, setCustomers] = useState([])
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
        loadCustomers()
    }, [])

    const loadCustomers = async () => {
        setLoading(true)
        const data = await getAllCustomers()
        setCustomers(data)
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

    const handleEdit = (customer) => {
        setFormData({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            note: customer.note || ''
        })
        setEditingId(customer.id)
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
            const result = await deleteCustomer(id)
            if (result.success) {
                loadCustomers()
            } else {
                alert('Lỗi khi xóa: ' + result.message)
            }
        }
    }

    const handleExportExcel = () => {
        const headers = ['Tên Khách Hàng', 'Số điện thoại', 'Email', 'Địa chỉ', 'Ghi chú'];
        const csvRows = [];
        csvRows.push(headers.join(','));

        customers.forEach(customer => {
            const row = [
                `"${customer.name || ''}"`,
                `"${customer.phone || ''}"`,
                `"${customer.email || ''}"`,
                `"${customer.address || ''}"`,
                `"${customer.note || ''}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'Danh_sach_khach_hang.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (editingId) {
            const result = await updateCustomer(editingId, formData)
            if (result.success) {
                setShowModal(false)
                loadCustomers()
            } else {
                alert('Lỗi cập nhật: ' + result.message)
            }
        } else {
            const result = await addCustomer(formData)
            if (result.success) {
                setShowModal(false)
                loadCustomers()
            } else {
                alert('Lỗi thêm mới: ' + result.message)
            }
        }
    }

    return (
        <div className="module-container">
            <div className="module-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2>👥 Quản lý Khách Hàng</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-success" onClick={handleExportExcel} style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>
                        📥 Xuất Excel
                    </button>
                    <button className="btn-primary" onClick={handleCreate}>
                        + Thêm Khách Hàng
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">Đang tải dữ liệu...</div>
            ) : customers.length === 0 ? (
                <div className="empty-state">
                    <p>Chưa có khách hàng nào.</p>
                </div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Tên Khách Hàng</th>
                            <th>Số điện thoại</th>
                            <th>Email</th>
                            <th>Địa chỉ</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map(cus => (
                            <tr key={cus.id}>
                                <td><strong>{cus.name}</strong></td>
                                <td>{cus.phone}</td>
                                <td>{cus.email}</td>
                                <td>{cus.address}</td>
                                <td>
                                    <div className="btn-group">
                                        <button className="btn-edit" onClick={() => handleEdit(cus)}>Sửa</button>
                                        <button className="btn-delete" onClick={() => handleDelete(cus.id)}>Xóa</button>
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
                        <h3>{editingId ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}</h3>
                        <form className="modal-form" onSubmit={handleSubmit}>
                            <div className="form-field">
                                <label>Tên khách hàng *</label>
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

export default CustomerManager
