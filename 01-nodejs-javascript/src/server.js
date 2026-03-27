require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const port = process.env.PORT || 8080;

// Config CORS - cho phép Frontend React gọi API từ mọi port
app.use(cors());

// Config req.body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Khai báo API routes
app.use('/api', apiRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Backend API is running', port });
});

const fuelPriceScraper = require('./services/fuelPriceScraper');

app.listen(port, () => {
    console.log(`✅ Backend Nodejs App listening on port ${port}`);
    // Khởi động auto-sync giá xăng dầu Nhà nước
    fuelPriceScraper.startScheduledSync();
});
