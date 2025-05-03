// backend/routes/runs.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// เพิ่ม route สำหรับทดสอบ
router.get('/test', (req, res) => {
    res.json({ message: 'Runs API is working', time: new Date().toISOString() });
});

// แก้ไข route upload
router.post('/upload', async (req, res) => {
    try {
        // แสดงข้อมูลโดยละเอียดเพื่อการดีบัก
        console.log('Headers:', req.headers);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Body keys:', Object.keys(req.body || {}));
        console.log('Body:', req.body);
        console.log('Files exist:', !!req.files);
        console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
        
        // ตรวจสอบไฟล์อย่างละเอียด
        if (!req.files) {
            console.log('Error: req.files is undefined');
            return res.status(400).json({ 
                message: 'Missing required fields', 
                details: 'req.files is undefined - check express-fileupload middleware' 
            });
        }
        
        // ตรวจสอบ req.files.file
        if (!req.files.file) {
            console.log('Error: req.files.file is undefined. Available keys:', Object.keys(req.files));
            return res.status(400).json({ 
                message: 'Missing required fields', 
                details: 'file field is missing in the request',
                availableFields: Object.keys(req.files) 
            });
        }
        
        // ตรวจสอบ req.body
        if (!req.body) {
            console.log('Error: req.body is undefined');
            return res.status(400).json({ 
                message: 'Missing required fields', 
                details: 'req.body is undefined - check body-parser middleware' 
            });
        }
        
        // รับค่าและตรวจสอบแต่ละฟิลด์
        const userId = req.body.userid || req.body.userId;
        const runDate = req.body.rundate || req.body.runDate;
        const distance = req.body.distance;
        const duration = req.body.duration;
        
        console.log('Extracted fields:', { 
            userId, 
            runDate, 
            distance, 
            duration,
            file: req.files.file ? req.files.file.name : 'undefined' 
        });
        
        // ตรวจสอบแต่ละฟิลด์โดยละเอียด
        const fieldStatus = {
            userId: { exists: !!userId, value: userId },
            runDate: { exists: !!runDate, value: runDate },
            distance: { exists: !!distance, value: distance },
            duration: { exists: !!duration, value: duration },
            file: { exists: !!req.files.file, name: req.files.file ? req.files.file.name : null }
        };
        
        if (!userId || !runDate || !distance || !duration) {
            console.log('Error: Missing field(s)', fieldStatus);
            return res.status(400).json({ 
                message: 'Missing required fields', 
                details: 'One or more required fields are missing',
                fieldStatus 
            });
        }
        
        // ทดสอบส่งกลับข้อมูลเบื้องต้น - เพื่อดูว่ารับข้อมูลได้หรือไม่
        // เอาออกหลังจากทดสอบเสร็จ
        if (process.env.NODE_ENV === 'development') {
            return res.status(200).json({
                message: 'Data received successfully (test mode)',
                data: {
                    userId,
                    runDate,
                    distance,
                    duration,
                    file: {
                        name: req.files.file.name,
                        size: req.files.file.size,
                        mimetype: req.files.file.mimetype
                    }
                }
            });
        }
        
        // ดำเนินการเมื่อข้อมูลครบถ้วน
        const file = req.files.file;
        const fileExt = path.extname(file.name);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = `runs/${userId}/${fileName}`;
        
        console.log('File info:', {
            originalName: file.name,
            size: file.size,
            mimetype: file.mimetype,
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
                    userid: userId,
                    rundate: runDate,
                    distance: parseFloat(distance),
                    duration: parseFloat(duration),
                    imageurl: imageUrl,
                    createdat: new Date()
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
        res.status(500).json({ 
            message: 'Failed to upload run data', 
            error: error.message,
            stack: error.stack
        });
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

// ดึงรายการวิ่งทั้งหมด (สำหรับ admin)
router.get('/admin/all', async (req, res) => {
    try {
        // TODO: เพิ่มการตรวจสอบสิทธิ์ admin
        const { data, error } = await supabase
            .from('runs')
            .select(`
                *,
                users(userId, displayName, pictureUrl)
            `)
            .order('createdat', { ascending: false });
        
        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching all runs:', error);
        res.status(500).json({ message: 'Failed to fetch runs data', error: error.message });
    }
});

// อัปเดตข้อมูลการวิ่ง
router.put('/admin/:id', async (req, res) => {
    try {
        // TODO: เพิ่มการตรวจสอบสิทธิ์ admin
        const { id } = req.params;
        const { rundate, distance, duration } = req.body;
        
        const { data, error } = await supabase
            .from('runs')
            .update({
                rundate,
                distance: parseFloat(distance),
                duration: parseFloat(duration),
                updatedat: new Date()
            })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        
        res.json({ message: 'Run data updated successfully', run: data[0] });
    } catch (error) {
        console.error('Error updating run:', error);
        res.status(500).json({ message: 'Failed to update run data', error: error.message });
    }
});

// ลบข้อมูลการวิ่ง
router.delete('/admin/:id', async (req, res) => {
    try {
        // TODO: เพิ่มการตรวจสอบสิทธิ์ admin
        const { id } = req.params;
        
        // ดึงข้อมูลรูปภาพเพื่อลบจาก storage
        const { data: runData, error: fetchError } = await supabase
            .from('runs')
            .select('imageurl')
            .eq('id', id)
            .single();
        
        if (fetchError) throw fetchError;
        
        // ลบข้อมูลจากตาราง
        const { error: deleteError } = await supabase
            .from('runs')
            .delete()
            .eq('id', id);
        
        if (deleteError) throw deleteError;
        
        // ลบไฟล์รูปภาพจาก storage (optional)
        if (runData && runData.imageurl) {
            const imagePath = runData.imageurl.split('/').slice(-2).join('/');
            const { error: storageError } = await supabase.storage
                .from('running-proofs')
                .remove([imagePath]);
            
            if (storageError) {
                console.warn('Warning: Could not delete storage file:', storageError);
            }
        }
        
        res.json({ message: 'Run data deleted successfully' });
    } catch (error) {
        console.error('Error deleting run:', error);
        res.status(500).json({ message: 'Failed to delete run data', error: error.message });
    }
});

module.exports = router;
