// ===== CENTRAL API CONFIG =====
// Khi deploy lên Render/VPS: đặt biến môi trường VITE_API_URL
// Khi dev local: tự động dùng localhost:8080
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
export default API_BASE;
