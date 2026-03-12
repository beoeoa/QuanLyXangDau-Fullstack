import { useState, useEffect } from 'react'
import {
    getAllProducts,
    addProduct,
    updateProduct,
    deleteProduct
} from '../../services/inventoryService'
import './AdminModules.css'

function InventoryManager() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState(null)

    const [formData, setFormData] = useState({
        name: '',
        unit: '',
        quantity: 0,
        importPrice: 0,
        exportPrice: 0
    })

    useEffect(() => {
        loadProducts()
    }, [])

    const loadProducts = async () => {
        setLoading(true)
        const data = await getAllProducts()
        setProducts(data)
        setLoading(false)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleCreate = () => {
        setFormData({ name: '', unit: '', quantity: 0, importPrice: 0, exportPrice: 0 })
        setEditingId(null)
        setShowModal(true)
    }

    const handleEdit = (product) => {
        setFormData({
            name: product.name,
            unit: product.unit,
            quantity: product.quantity,
            importPrice: product.importPrice,
            exportPrice: product.exportPrice
        })
        setEditingId(product.id)
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
            const result = await deleteProduct(id)
            if (result.success) {
                loadProducts()
            } else {
                alert('Lỗi khi xóa: ' + result.message)
            }
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (editingId) {
            const result = await updateProduct(editingId, formData)
            if (result.success) {
                setShowModal(false)
                loadProducts()
            } else {
                alert('Lỗi cập nhật: ' + result.message)
            }
        } else {
            const result = await addProduct(formData)
            if (result.success) {
                setShowModal(false)
                loadProducts()
            } else {
                alert('Lỗi thêm mới: ' + result.message)
            }
        }
    }

    return (
        <div className="module-container">
            <div className="module-header">
                <h2>📦 Quản lý Tồn kho</h2>
                <button className="btn-primary" onClick={handleCreate}>
                    + Thêm Sản Phẩm
                </button>
            </div>

            {loading ? (
                <div className="loading-state">Đang tải dữ liệu...</div>
            ) : products.length === 0 ? (
                <div className="empty-state">
                    <p>Chưa có sản phẩm nào trong kho.</p>
                </div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Tên sản phẩm</th>
                            <th>Đơn vị</th>
                            <th>Tồn kho</th>
                            <th>Giá nhập</th>
                            <th>Giá bán</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td><strong>{product.name}</strong></td>
                                <td>{product.unit}</td>
                                <td>
                                    <span className={`badge ${product.quantity <= 0 ? 'badge-export' : 'badge-import'}`}>
                                        {product.quantity}
                                    </span>
                                </td>
                                <td>{product.importPrice.toLocaleString()} đ</td>
                                <td>{product.exportPrice.toLocaleString()} đ</td>
                                <td>
                                    <div className="btn-group">
                                        <button className="btn-edit" onClick={() => handleEdit(product)}>Sửa</button>
                                        <button className="btn-delete" onClick={() => handleDelete(product.id)}>Xóa</button>
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
                        <h3>{editingId ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h3>
                        <form className="modal-form" onSubmit={handleSubmit}>
                            <div className="form-field">
                                <label>Tên sản phẩm</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="VD: Xăng RON 95" />
                            </div>
                            <div className="form-field">
                                <label>Đơn vị tính</label>
                                <input required type="text" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="VD: Lít" />
                            </div>
                            <div className="form-field">
                                <label>Số lượng tồn ban đầu</label>
                                <input required type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} min="0" />
                            </div>
                            <div className="form-field">
                                <label>Giá nhập (VNĐ)</label>
                                <input required type="number" name="importPrice" value={formData.importPrice} onChange={handleInputChange} min="0" />
                            </div>
                            <div className="form-field">
                                <label>Giá bán (VNĐ)</label>
                                <input required type="number" name="exportPrice" value={formData.exportPrice} onChange={handleInputChange} min="0" />
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

export default InventoryManager
