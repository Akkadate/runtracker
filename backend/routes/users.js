// backend/routes/users.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// เส้นทางทดสอบง่ายๆ
router.get('/ping', async (req, res) => {
    res.status(200).json({ message: 'API is working', timestamp: new Date() });
});

// เส้นทางทดสอบการเชื่อมต่อ Supabase
router.get('/test-connection', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (error) throw error;

        res.status(200).json({ 
            message: 'Supabase connection successful',
            data: data 
        });
    } catch (error) {
        console.error('Error connecting to Supabase:', error);
        res.status(500).json({ 
            message: 'Failed to connect to Supabase',
            error: error.message 
        });
    }
});

// ดูโครงสร้างตาราง
router.get('/table-info', async (req, res) => {
    try {
        // ทดสอบรันคำสั่ง SQL โดยตรง
        const { data, error } = await supabase.rpc('get_table_columns', { p_table_name: 'users' });
        
        if (error) {
            // ถ้า rpc ไม่ทำงาน ให้ลองใช้วิธีอื่น
            const { data: tableData, error: tableError } = await supabase
                .from('users')
                .select('*')
                .limit(1);
                
            if (tableError) throw tableError;
            
            if (tableData && tableData.length > 0) {
                res.status(200).json({
                    message: 'Table structure found',
                    columns: Object.keys(tableData[0]),
                    sample: tableData[0]
                });
            } else {
                res.status(200).json({
                    message: 'Table exists but is empty',
                    columns: []
                });
            }
        } else {
            res.status(200).json({
                message: 'Table structure from RPC',
                columns: data
            });
        }
    } catch (error) {
        console.error('Error getting table info:', error);
        res.status(500).json({
            message: 'Failed to get table info',
            error: error.message
        });
    }
});

// LINE ID でユーザーを取得
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // เปลี่ยนจาก .single() เป็น .limit(1)
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('userid', userId)  // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
            .limit(1);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(data[0]);  // ส่งข้อมูลแถวแรก
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Failed to fetch user', error: error.message });
    }
});

// 新しいユーザーを登録
router.post('/', async (req, res) => {
    try {
        const { userid, displayname, pictureurl, nationalid, phonenumber } = req.body;
        
        // แสดงข้อมูลที่ได้รับเพื่อตรวจสอบ
        console.log('Received data:', { userid, displayname, pictureurl, nationalid, phonenumber });
        
        // 入力検証
        if (!userid || !nationalid || !phonenumber) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // 既存のユーザーをチェック - เปลี่ยนจาก .single() เป็น .limit(1)
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('userid', userid)  // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
            .limit(1);
        
        if (checkError) throw checkError;
        
        // แสดงผลการตรวจสอบ
        console.log('Existing user check:', existingUser);
        
        if (existingUser && existingUser.length > 0) {
            // 既存のユーザーを更新
            console.log('Updating existing user...');
            
            // สร้างข้อมูลที่จะอัปเดต
            const updateData = {
                displayname: displayname,  // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
                pictureurl: pictureurl,    // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
                nationalid: nationalid,    // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
                phonenumber: phonenumber,  // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
                updatedat: new Date()      // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
            };
            
            console.log('Update data:', updateData);
            
            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('userid', userid)  // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
                .select();
            
            if (error) {
                console.error('Update error:', error);
                throw error;
            }
            
            console.log('Update result:', data);
            return res.status(200).json(data.length > 0 ? data[0] : { message: 'User updated' });
        }
        
        // 新規ユーザーを作成
        console.log('Creating new user...');
        
        // สร้างข้อมูลที่จะเพิ่ม
        const insertData = {
            userid: userid,              // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
            displayname: displayname,    // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
            pictureurl: pictureurl,      // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
            nationalid: nationalid,      // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
            phonenumber: phonenumber,    // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
            createdat: new Date(),       // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
            updatedat: new Date()        // ตรวจสอบชื่อฟิลด์ให้ตรงกับ DB
        };
        
        console.log('Insert data:', insertData);
        
        const { data, error } = await supabase
            .from('users')
            .insert([insertData])
            .select();
        
        if (error) {
            console.error('Insert error:', error);
            throw error;
        }
        
        console.log('Insert result:', data);
        res.status(201).json(data.length > 0 ? data[0] : { message: 'User created' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user', error: error.message });
    }
});

// หลังจากนี้คุณอาจเพิ่มเส้นทาง API อื่นๆ ตามต้องการ

module.exports = router;