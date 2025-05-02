// backend/server.js
// ไฟล์หลักสำหรับ Express Server ที่รองรับ HTTPS
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const https = require('https');  // เพิ่มโมดูล HTTPS
const fs = require('fs');  // เพิ่มโมดูล fs สำหรับอ่านไฟล์ certificate

const userRoutes = require('./routes/users');
const runRoutes = require('./routes/runs');

const app = express();
const PORT = process.env.PORT || 4900;

// ค่า SSL options
const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/runtracker.devapp.cc/privkey.pem'),  // เปลี่ยนเป็นเส้นทางจริงของไฟล์ private key
    cert: fs.readFileSync('/etc/letsencrypt/live/runtracker.devapp.cc/fullchain.pem')  // เปลี่ยนเป็นเส้นทางจริงของไฟล์ certificate
};

// ミドルウェアの設定
app.use(cors({
    origin: '*',  // อนุญาตทุกโดเมน หรือระบุเฉพาะโดเมนที่อนุญาต
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload({
    createParentPath: true,
    limits: { 
        fileSize: 10 * 1024 * 1024 // 10MB
    },
}));

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));

// ルートの設定
app.use('/api/users', userRoutes);
app.use('/api/runs', runRoutes);

// สร้าง HTTPS server
const httpsServer = https.createServer(sslOptions, app);

// เริ่มเซิร์ฟเวอร์ HTTPS
httpsServer.listen(PORT, () => {
    console.log(`HTTPS Server is running on port ${PORT}`);
});