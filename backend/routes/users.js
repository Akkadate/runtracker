// backend/routes/users.js
// ユーザー関連のAPI
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// LINE IDでユーザーを取得
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('userId', userId)
            .single();
        
        if (error) throw error;
        
        if (!data) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Failed to fetch user', error: error.message });
    }
});

router.get('/test-connection', async (req, res) => {
    try {
        // ทดสอบการเชื่อมต่อโดยนับจำนวนแถวในตาราง
        const { data, error } = await supabase
            .from('users')
            .select('*', { count: 'exact' })  // ใช้ count แทน single()
            .limit(5);  // จำกัดจำนวนแถวที่ดึงมา
        
        if (error) throw error;
        
        res.status(200).json({ 
            message: 'Supabase connection successful',
            count: data.length,
            sample: data.slice(0, 2)  // ส่งตัวอย่างข้อมูล 2 แถวแรก
        });
    } catch (error) {
        console.error('Error connecting to Supabase:', error);
        res.status(500).json({ 
            message: 'Failed to connect to Supabase',
            error: error.message 
        });
    }
});

router.get('/table-info', async (req, res) => {
    try {
        // ดึงข้อมูลตัวอย่าง 1 แถวเพื่อดูโครงสร้าง
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);
        
        if (error) throw error;
        
        // ถ้าพบข้อมูล ให้แสดงชื่อฟิลด์และตัวอย่างข้อมูล
        if (data && data.length > 0) {
            const columnNames = Object.keys(data[0]);
            res.status(200).json({ 
                message: 'Table structure found',
                columnNames: columnNames,
                sampleData: data[0]
            });
        } else {
            // ถ้าไม่พบข้อมูล ลองดึงชื่อคอลัมน์โดยตรงจาก Supabase
            const { data: tableData, error: tableError } = await supabase
                .rpc('get_table_columns', { table_name: 'users' });
            
            if (tableError) throw tableError;
            
            res.status(200).json({ 
                message: 'Table is empty, showing structure only',
                columnNames: tableData || []
            });
        }
    } catch (error) {
        console.error('Error fetching table structure:', error);
        res.status(500).json({ 
            message: 'Failed to get table structure',
            error: error.message 
        });
    }
});

// เพิ่มฟังก์ชัน RPC ใน Supabase SQL Editor
// CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
// RETURNS SETOF information_schema.columns AS $$
//   SELECT column_name, data_type
//   FROM information_schema.columns
//   WHERE table_name = $1
// $$ LANGUAGE sql;


router.get('/ping', async (req, res) => {
    res.status(200).json({ message: 'API is working', timestamp: new Date() });
});


// เพิ่มเส้นทางสำหรับการทดสอบการเชื่อมต่อแบบง่ายที่สุด
router.get('/simple-test', async (req, res) => {
    res.status(200).json({ message: 'API is working' });
});

// 新しいユーザーを登録
router.post('/', async (req, res) => {
    try {
        const { userId, displayName, pictureUrl, nationalId, phoneNumber } = req.body;

        console.log('Received user data:', { userId, displayName, nationalId, phoneNumber });
        
        // 入力検証
        if (!userId || !nationalId || !phoneNumber) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // 既存のユーザーをチェック
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('userId', userId)
            .single();
        
        if (existingUser) {
            // 既存のユーザーを更新
            const { data, error } = await supabase
                .from('users')
                .update({
                    displayName,
                    pictureUrl,
                    nationalId,
                    phoneNumber,
                    updatedAt: new Date()
                })
                .eq('userId', userId)
                .select();
            
                if (error) {
                    console.error(' exis user Supabase error:', error);
                    throw error;
                }
            
            return res.status(200).json(data[0]);
        }
        
        // 新規ユーザーを作成
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    userId,
                    displayName,
                    pictureUrl,
                    nationalId,
                    phoneNumber,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ])
            .select();
        
            if (error) {
                console.error('Insert Supabase error:', error);
                throw error;
            }
        
        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user', error: error.message });
    }
});

module.exports = router;