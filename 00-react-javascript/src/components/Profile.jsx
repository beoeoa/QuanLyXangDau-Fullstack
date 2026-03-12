import { useState, useEffect } from 'react';
import { updateUser, getUserById } from '../services/userService';
import './Dashboard.css';

function Profile({ currentUser }) {
    const [profileData, setProfileData] = useState({
        // Nhóm 1 & 2: Cá nhân (User có quyền sửa)
        fullname: '',
        dob: '',
        gender: '',
        cccd: '',
        cccdDate: '',
        cccdPlace: '',
        phone: '',
        permanentAddress: '',
        temporaryAddress: '',
        photoURL: '',

        // Nhóm 3: Công việc (Chỉ Admin sửa)
        employeeId: '',
        role: '',
        startDate: '',
        contractImageURL: '', // Thêm ảnh chụp hợp đồng
        licenseImageURL: '', // Thêm ảnh bằng lái

        // Nhóm 4 & 5: Ca làm việc & Lương (Chỉ Admin sửa)
        baseSalary: '',
        bankAccountNumber: '',
        bankAccountName: '',
        bankName: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Là Admin nếu role là 'admin'
    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        loadProfile();
    }, [currentUser]);

    const loadProfile = async () => {
        setLoading(true);
        const user = await getUserById(currentUser.userId || currentUser.id);
        if (user) {
            setProfileData(prev => ({ ...prev, ...user }));
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (e, fieldName) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileData(prev => ({ ...prev, [fieldName]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const res = await updateUser(currentUser.userId || currentUser.id, profileData);
            if (res.success) {
                setMessage('Cập nhật hồ sơ thành công!');
                // Update local storage name if fullname changed
                if (profileData.fullname) {
                    const lUser = JSON.parse(localStorage.getItem('user'));
                    if (lUser) {
                        lUser.name = profileData.fullname;
                        localStorage.setItem('user', JSON.stringify(lUser));
                    }
                }
            } else {
                setMessage('Lỗi cập nhật: ' + res.message);
            }
        } catch (error) {
            setMessage('Lỗi hệ thống khi cập nhật: ' + error.message);
        }
        setSaving(false);
    };

    if (loading) return <div>Đang tải hồ sơ...</div>;

    return (
        <div className="data-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Hồ Sơ Của Bạn</h3>
                {message && (
                    <span style={{
                        padding: '8px 15px',
                        borderRadius: '4px',
                        backgroundColor: message.includes('thành công') ? '#d4edda' : '#f8d7da',
                        color: message.includes('thành công') ? '#155724' : '#721c24'
                    }}>
                        {message}
                    </span>
                )}
            </div>

            <form onSubmit={handleSave} className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '30px' }}>

                {/* NHÓM 1: THÔNG TIN CÁ NHÂN */}
                <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                    <h4 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
                        👤 Thông tin Cá nhân
                    </h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Ảnh Đại Diện (Chọn từ máy tính)</label>
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'photoURL')} />
                        </div>
                        {profileData.photoURL && (
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                                <img src={profileData.photoURL} alt="Avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                                {profileData.photoURL.startsWith('data:image') && <span style={{ marginLeft: '10px', fontSize: '12px', color: 'green' }}>✓ Đã tải ảnh lên</span>}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Họ và Tên (*)</label>
                            <input type="text" name="fullname" value={profileData.fullname || ''} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Ngày sinh</label>
                            <input type="date" name="dob" value={profileData.dob || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label>Giới tính</label>
                            <select name="gender" value={profileData.gender || ''} onChange={handleChange}>
                                <option value="">-- Chọn giới tính --</option>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Số Điện thoại</label>
                            <input type="text" name="phone" value={profileData.phone || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Email (Đăng nhập)</label>
                            <input type="email" value={profileData.email || ''} disabled style={{ backgroundColor: '#e9ecef' }} />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Số CCCD</label>
                            <input type="text" name="cccd" value={profileData.cccd || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Địa chỉ thường trú</label>
                            <input type="text" name="permanentAddress" value={profileData.permanentAddress || ''} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                {/* NHÓM 2: CÔNG VIỆC */}
                <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                    <h4 style={{ marginTop: 0, color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '10px' }}>
                        💼 Thông tin Công việc {!isAdmin && <span style={{ fontSize: '12px', color: '#7f8c8d' }}>(Chỉ Admin có quyền sửa)</span>}
                    </h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Mã Nhân Viên (Tự động)</label>
                            <input type="text" name="employeeId" value={profileData.employeeId || ''} disabled style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }} />
                        </div>

                        <div className="form-group">
                            <label>Quyền hệ thống (Role)</label>
                            <input type="text" value={profileData.role || ''} disabled style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }} />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Ngày bắt đầu làm việc</label>
                            <input type="date" name="startDate" value={profileData.startDate || ''} onChange={handleChange} disabled={!isAdmin} />
                        </div>

                        <div className="form-group">
                            <label>Ảnh Hợp Đồng Đã Ký (Chọn từ máy tính)</label>
                            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleImageUpload(e, 'contractImageURL')} disabled={!isAdmin} />
                        </div>
                        {profileData.contractImageURL && (
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                                {profileData.contractImageURL.includes('application/pdf') || profileData.contractImageURL.includes('data:application/pdf') ? (
                                    <span style={{ color: 'green' }}>📄 Đã tải lên file PDF hợp đồng</span>
                                ) : (
                                    <img src={profileData.contractImageURL} alt="Contract" style={{ width: '80px', height: '80px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #ddd' }} />
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Ảnh Bằng Lái (Chọn từ máy tính)</label>
                            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleImageUpload(e, 'licenseImageURL')} disabled={!isAdmin} />
                        </div>
                        {profileData.licenseImageURL && (
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                                {profileData.licenseImageURL.includes('application/pdf') || profileData.licenseImageURL.includes('data:application/pdf') ? (
                                    <span style={{ color: 'green' }}>📄 Đã tải lên file PDF Bằng lái</span>
                                ) : (
                                    <img src={profileData.licenseImageURL} alt="License" style={{ width: '80px', height: '80px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #ddd' }} />
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Ngày hết hạn Bằng Lái</label>
                            <input type="date" name="licenseExpiry" value={profileData.licenseExpiry || ''} onChange={handleChange} disabled={!isAdmin} />
                        </div>

                        <div className="form-group">
                            <label>Ngày hết hạn Chứng chỉ PCCC</label>
                            <input type="date" name="pcccExpiry" value={profileData.pcccExpiry || ''} onChange={handleChange} disabled={!isAdmin} />
                        </div>
                    </div>
                </div>

                {/* NHÓM 3: TÀI CHÍNH & LƯƠNG */}
                <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                    <h4 style={{ marginTop: 0, color: '#27ae60', borderBottom: '2px solid #27ae60', paddingBottom: '10px' }}>
                        💰 Thông tin Tài chính, Trả lương {!isAdmin && <span style={{ fontSize: '12px', color: '#7f8c8d' }}>(Chỉ Admin có quyền sửa)</span>}
                    </h4>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Mức lương cơ bản (VNĐ)</label>
                            <input
                                type="number"
                                name="baseSalary"
                                value={profileData.baseSalary || ''}
                                onChange={handleChange}
                                disabled={!isAdmin}
                                placeholder="Vd: 5000000"
                            />
                        </div>

                        <div className="form-group">
                            <label>Tên Ngân Hàng</label>
                            <input type="text" name="bankName" value={profileData.bankName || ''} onChange={handleChange} disabled={!isAdmin} placeholder="Vd: Vietcombank" />
                        </div>

                        <div className="form-group">
                            <label>Số Tài Khoản</label>
                            <input type="text" name="bankAccountNumber" value={profileData.bankAccountNumber || ''} onChange={handleChange} disabled={!isAdmin} />
                        </div>

                        <div className="form-group">
                            <label>Tên Chủ Tài Khoản</label>
                            <input type="text" name="bankAccountName" value={profileData.bankAccountName || ''} onChange={handleChange} disabled={!isAdmin} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', gridColumn: '1 / -1', marginTop: '10px' }}>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Đang lưu...' : '💾 Lưu Hồ Sơ'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Profile;
