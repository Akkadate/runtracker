// backend/server.js
// ไฟล์หลักสำหรับ Express Server
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');

const userRoutes = require('./routes/users');
const runRoutes = require('./routes/runs');

const app = express();
const PORT = process.env.PORT || 4900;

// ミドルウェアの設定
app.use(cors());
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

// サーバー起動
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});