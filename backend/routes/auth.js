// ในไฟล์ backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // ตรวจสอบ username และ password
    // ไม่ควรใช้รหัสผ่านแบบ hardcode ในโค้ดจริง
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        // สร้าง token
        const token = jwt.sign(
            { username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ token });
    } else {
        res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }
});

module.exports = router;
