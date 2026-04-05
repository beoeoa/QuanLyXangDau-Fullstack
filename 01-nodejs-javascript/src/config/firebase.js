const admin = require("firebase-admin");

// Production (Render/VPS): đặt biến môi trường FIREBASE_SERVICE_ACCOUNT = nội dung file serviceAccountKey.json
// Development (local): dùng file serviceAccountKey.json như bình thường
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'quanlyxangdau-3fa49.firebasestorage.app',
});

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
