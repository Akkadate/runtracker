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

// 新しいユーザーを登録
router.post('/', async (req, res) => {
    try {
        const { userId, displayName, pictureUrl, nationalId, phoneNumber } = req.body;
        
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
            
            if (error) throw error;
            
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
        
        if (error) throw error;
        
        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user', error: error.message });
    }
});

module.exports = router;