// backend/server.js 
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const https = require('https');
const fs = require('fs');

const userRoutes = require('./routes/users');
const runRoutes = require('./routes/runs');

const app = express();
const PORT = process.env.PORT || 4900;

// SSL options
const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/runtracker.devapp.cc/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/runtracker.devapp.cc/fullchain.pem')
};

// สำคัญ: อัปเดตการตั้งค่า CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ตั้งค่า fileUpload ใหม่ให้ละเอียดขึ้น
app.use(fileUpload({
    createParentPath: true,
    useTempFiles: false,
    debug: true, // เปิด debug mode
    limits: { 
        fileSize: 20 * 1024 * 1024, // 20MB
    },
    abortOnLimit: true,
    responseOnLimit: 'File size limit has been reached',
    safeFileNames: true,
    preserveExtension: true
}));

// สำคัญ: ปรับการใช้งาน bodyParser
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// เพิ่ม routes
app.use('/api/users', userRoutes);
app.use('/api/runs', runRoutes);

// เพิ่ม route สำหรับทดสอบ
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working', time: new Date().toISOString() });
});

// สร้าง HTTPS server
const httpsServer = https.createServer(sslOptions, app);

// เริ่มเซิร์ฟเวอร์ HTTPS
httpsServer.listen(PORT, () => {
    console.log(`HTTPS Server is running on port ${PORT}`);
});
