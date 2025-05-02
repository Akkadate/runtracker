// backend/routes/runs.js
// 走行データ関連のAPI
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// ファイルのアップロードとランニングデータの保存
router.post('/upload', async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const { userId, runDate, distance, duration } = req.body;
        
        if (!userId || !runDate || !distance || !duration) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // ファイルのアップロード
        const file = req.files.file;
        const fileExt = path.extname(file.name);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = `runs/${userId}/${fileName}`;
        
        // Supabaseストレージにファイルをアップロード
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('running-proofs')
            .upload(filePath, file.data, {
                contentType: file.mimetype,
                cacheControl: '3600'
            });
        
        if (uploadError) throw uploadError;
        
        // アップロードされた画像の公開URLを取得
        const { data: urlData } = await supabase.storage
            .from('running-proofs')
            .getPublicUrl(filePath);
        
        const imageUrl = urlData.publicUrl;
        
        // ランニングデータをデータベースに保存
        const { data, error } = await supabase
            .from('runs')
            .insert([
                {
                    userId,
                    runDate,
                    distance: parseFloat(distance),
                    duration: parseFloat(duration),
                    imageUrl,
                    createdAt: new Date()
                }
            ])
            .select();
        
        if (error) throw error;
        
        res.status(201).json({
            message: 'Run data saved successfully',
            run: data[0],
            imageUrl
        });
    } catch (error) {
        console.error('Error uploading run data:', error);
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
            .eq('userId', userId)
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