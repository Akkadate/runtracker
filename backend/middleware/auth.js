// ในไฟล์ backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    // ดึง token จาก header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    
    try {
        // ตรวจสอบ token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token ไม่ถูกต้อง' });
    }
}

module.exports = authMiddleware;
