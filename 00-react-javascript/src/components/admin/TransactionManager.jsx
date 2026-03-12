import { useState, useEffect } from 'react'
import {
    getAllTransactions,
    createTransaction,
    deleteTransaction
} from '../../services/transactionService'
import { getAllProducts } from '../../services/inventoryService'
import { getAllSuppliers } from '../../services/supplierService'
import { getAllCustomers } from '../../services/customerService'
import './AdminModules.css'

function TransactionManager({ currentUser }) {
    const [transactions, setTransactions] = useState([])
    const [products, setProducts] = useState([])
    const [partners, setPartners] = useState([]) // Suppliers or Customers depending on type
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [activeTab, setActiveTab] = useState('all') // 'all', 'import', 'export'

    const [formData, setFormData] = useState({
        type: 'import',
        productId: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        partnerId: '',
        partnerName: '',
        note: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const [txData, prodData] = await Promise.all([
            getAllTransactions(),
            getAllProducts()
        ])
        setTransactions(txData)
        setProducts(prodData)
        setLoading(false)
    }

    // Load partners based on transaction type
    useEffect(() => {
        const loadPartners = async () => {
            if (formData.type === 'import') {
                const data = await getAllSuppliers()
                setPartners(data)
            } else {
                const data = await getAllCustomers()
                setPartners(data)
            }
        }
        loadPartners()
    }, [formData.type])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        if (name === 'productId') {
            const selectedProduct = products.find(p => p.id === value)
            setFormData(prev => ({
                ...prev,
                productId: value,
                productName: selectedProduct ? selectedProduct.name : '',
                unitPrice: selectedProduct ? (prev.type === 'import' ? selectedProduct.importPrice : selectedProduct.exportPrice) : 0
            }))
        } else if (name === 'partnerId') {
            const selectedPartner = partners.find(p => p.id === value)
            setFormData(prev => ({
                ...prev,
                partnerId: value,
                partnerName: selectedPartner ? selectedPartner.name : ''
            }))
        } else if (name === 'type') {
            // Reset partner when changing type
            setFormData(prev => ({ ...prev, type: value, partnerId: '', partnerName: '' }))
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }
    }

    const handleCreate = () => {
        setFormData({
            type: 'import',
            productId: '',
            productName: '',
            quantity: 1,
            unitPrice: 0,
            partnerId: '',
            partnerName: '',
            note: ''
        })
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (window.confirm('⚠️ Chú ý: Việc xóa giao dịch không làm thay đổi lại số lượng tồn kho. Bạn có chắc chắn muốn xóa lịch sử này?')) {
            const result = await deleteTransaction(id)
            if (result.success) {
                loadData()
            } else {
                alert('Lỗi khi xóa: ' + result.message)
            }
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.productId) {
            alert('Vui lòng chọn sản phẩm!')
            return
        }

        if (formData.type === 'export') {
            const product = products.find(p => p.id === formData.productId)
            if (product && product.quantity < formData.quantity) {
                alert(`❌ Số lượng tồn kho không đủ! (Tồn: ${product.quantity})`)
                return
            }
        }

        // Gắn user tạo giao dịch
        const submitData = {
            ...formData,
            createdBy: currentUser.name || currentUser.email
        }

        const result = await createTransaction(submitData)
        if (result.success) {
            setShowModal(false)
            loadData()
            alert('✅ Tạo phiếu thành công!')
        } else {
            alert('❌ Lỗi: ' + result.message)
        }
    }

    const filteredTransactions = transactions.filter(t =>
        activeTab === 'all' ? true : t.type === activeTab
    )

    const formatDate = (timestamp) => {
        if (!timestamp) return ''
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date)
    }

    return (
        <div className="module-container">
            <div className="module-header">
                <h2>🔄 Lịch Sử Nhập / Xuất</h2>
                <button className="btn-primary" onClick={handleCreate}>
                    + Tạo Phiếu Mới
                </button>
            </div>

            <div className="tabs">
                <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Tất cả</button>
                <button className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>Nhập kho</button>
                <button className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>Xuất kho</button>
            </div>

            {loading ? (
                <div className="loading-state">Đang tải dữ liệu...</div>
            ) : filteredTransactions.length === 0 ? (
                <div className="empty-state">
                    <p>Chưa có giao dịch nào.</p>
                </div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Ngày giờ</th>
                            <th>Loại</th>
                            <th>Sản phẩm</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Tổng tiền</th>
                            <th>Đối tác</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(tx => (
                            <tr key={tx.id}>
                                <td>{formatDate(tx.createdAt)}</td>
                                <td>
                                    <span className={`badge ${tx.type === 'import' ? 'badge-import' : 'badge-export'}`}>
                                        {tx.type === 'import' ? 'Nhập' : 'Xuất'}
                                    </span>
                                </td>
                                <td><strong>{tx.productName}</strong></td>
                                <td>{tx.quantity}</td>
                                <td>{tx.unitPrice?.toLocaleString()} đ</td>
                                <td><strong>{tx.totalAmount?.toLocaleString()} đ</strong></td>
                                <td>{tx.partnerName || '-'}</td>
                                <td>
                                    <button className="btn-delete" onClick={() => handleDelete(tx.id)}>Xóa lịch sử</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Tạo Phiếu Mới</h3>
                        <form className="modal-form" onSubmit={handleSubmit}>
                            <div className="form-field">
                                <label>Loại giao dịch</label>
                                <select name="type" value={formData.type} onChange={handleInputChange}>
                                    <option value="import">Nhập kho</option>
                                    <option value="export">Xuất kho</option>
                                </select>
                            </div>

                            <div className="form-field">
                                <label>Sản phẩm *</label>
                                <select required name="productId" value={formData.productId} onChange={handleInputChange}>
                                    <option value="">-- Chọn sản phẩm --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (Tồn: {p.quantity})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-field">
                                <label>Đối tác ({formData.type === 'import' ? 'Nhà cung cấp' : 'Khách hàng'})</label>
                                <select name="partnerId" value={formData.partnerId} onChange={handleInputChange}>
                                    <option value="">-- Có thể để trống --</option>
                                    {partners.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-field">
                                    <label>Số lượng *</label>
                                    <input required type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} min="1" />
                                </div>
                                <div className="form-field">
                                    <label>Đơn giá (VNĐ) *</label>
                                    <input required type="number" name="unitPrice" value={formData.unitPrice} onChange={handleInputChange} min="0" />
                                </div>
                            </div>

                            <div className="form-field">
                                <label>Ghi chú</label>
                                <input type="text" name="note" value={formData.note} onChange={handleInputChange} />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="btn-primary">Tạo Phiếu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TransactionManager
