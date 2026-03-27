// ===== CENTRAL API CONFIG =====
// Ưu tiên: env var VITE_API_URL (Render Static Site) > URL Render cố định > localhost dev
const API_BASE = import.meta.env.VITE_API_URL 
  || 'https://quanlyxangdau-fullstack-1.onrender.com/api';
export default API_BASE;
