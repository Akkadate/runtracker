// backend/routes/runs.js
// 走行データ関連のAPI
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// แก้ไขไฟล์ runs.js ในฝั่ง backend
// อัปเดตการรับข้อมูลจาก req.body และการตรวจสอบ
router.post('/upload', async (req, res) => {
    try {
        // Debug: ตรวจสอบข้อมูลที่ได้รับ
        console.log('Request body:', req.body);
        console.log('Request files:', req.files ? Object.keys(req.files) : 'No files');
        
        // ตรวจสอบไฟล์
        if (!req.files || !req.files.file) {
            console.log('Error: No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        // รับค่าข้อมูลจาก body แบบรองรับทั้งตัวพิมพ์เล็กและตัวพิมพ์ใหญ่
        // ทำให้รองรับทั้งกรณีที่ frontend ส่งมาเป็น userId หรือ userid
        const userId = req.body.userid || req.body.userId;
        const runDate = req.body.rundate || req.body.runDate;
        const distance = req.body.distance;
        const duration = req.body.duration;
        
        console.log('Extracted fields:', { userId, runDate, distance, duration });
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!userId || !runDate || !distance || !duration) {
            console.log('Error: Missing required fields', {
                hasUserId: !!userId,
                hasRunDate: !!runDate,
                hasDistance: !!distance,
                hasDuration: !!duration
            });
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // ดำเนินการต่อเมื่อมีข้อมูลครบ
        const file = req.files.file;
        const fileExt = path.extname(file.name);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = `runs/${userId}/${fileName}`;
        
        console.log('File info:', {
            fileName: file.name,
            size: file.size,
            mimeType: file.mimetype,
            savePath: filePath
        });
        
        // อัปโหลดไฟล์ไปยัง Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('running-proofs')
            .upload(filePath, file.data, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });
        
        if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
            throw uploadError;
        }
        
        // ดึง URL สาธารณะของไฟล์ที่อัปโหลด
        const { data: urlData } = await supabase.storage
            .from('running-proofs')
            .getPublicUrl(filePath);
        
        const imageUrl = urlData.publicUrl;
        console.log('Image URL:', imageUrl);
        
        // บันทึกข้อมูลลงฐานข้อมูล
        const { data, error } = await supabase
            .from('runs')
            .insert([
                {
                    userid: userId,  // ใช้ตัวพิมพ์เล็กตามโครงสร้างฐานข้อมูล
                    rundate: runDate, // ใช้ตัวพิมพ์เล็กตามโครงสร้างฐานข้อมูล
                    distance: parseFloat(distance),
                    duration: parseFloat(duration),
                    imageurl: imageUrl, // ใช้ตัวพิมพ์เล็กตามโครงสร้างฐานข้อมูล
                    createdat: new Date() // ใช้ตัวพิมพ์เล็กตามโครงสร้างฐานข้อมูล
                }
            ])
            .select();
        
        if (error) {
            console.error('Supabase insert error:', error);
            throw error;
        }
        
        console.log('Run data saved successfully:', data[0]);
        
        // ส่งข้อมูลกลับไปยัง client
        res.status(201).json({
            message: 'Run data saved successfully',
            run: data[0],
            imageurl: imageUrl
        });
    } catch (error) {
        console.error('Error handling upload:', error);
        res.status(500).json({ message: 'Failed to upload run data', error: error.message });
    }
});

// ユーザーの走行統計を取得
router.get('/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // ユーザーの全ての走行データを取得
        const { data: runs, error } = await supabase
            .from('runs')
            .select('*')
            .eq('userid', userId)
            .order('runDate', { ascending: true });
        
        if (error) throw error;
        
        // 統計を計算
        const totalRuns = runs.length;
        const totalDistance = runs.reduce((sum, run) => sum + parseFloat(run.distance), 0);
        
        res.json({
            userId,
            totalRuns,
            totalDistance,
            progressData: runs
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ message: 'Failed to fetch user stats', error: error.message });
    }
});

// ランキングデータを取得
router.get('/ranking', async (req, res) => {
    try {
        // ユーザーごとの合計距離を計算するクエリ
        const { data, error } = await supabase
            .from('runs')
            .select('userId, distance');
        
        if (error) throw error;
        
        // ユーザーごとの合計距離を集計
        const userDistances = {};
        data.forEach(run => {
            const userId = run.userId;
            const distance = parseFloat(run.distance);
            
            if (!userDistances[userId]) {
                userDistances[userId] = 0;
            }
            
            userDistances[userId] += distance;
        });
        
        // ユーザー情報を取得
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('userId, displayName, pictureUrl');
        
        if (usersError) throw usersError;
        
        // ユーザー情報と距離を結合
        const rankingData = users
            .map(user => ({
                userId: user.userId,
                displayName: user.displayName,
                pictureUrl: user.pictureUrl,
                totalDistance: userDistances[user.userId] || 0
            }))
            .sort((a, b) => b.totalDistance - a.totalDistance)
            .slice(0, 50); // 上位50人まで
        
        res.json(rankingData);
    } catch (error) {
        console.error('Error fetching ranking data:', error);
        res.status(500).json({ message: 'Failed to fetch ranking data', error: error.message });
    }
});

module.exports = router;
