// ในไฟล์ backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// สร้าง hash เมื่อเริ่มต้นระบบ (ควรทำเพียงครั้งเดียว)
const adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // ตรวจสอบ username
    if (username !== process.env.ADMIN_USERNAME) {
        return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }
    
    // ตรวจสอบ password
    const isValidPassword = await bcrypt.compare(password, adminPasswordHash);
    
    if (isValidPassword) {
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
