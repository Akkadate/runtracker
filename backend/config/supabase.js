// backend/config/supabase.js
// Supabaseクライアントの設定
const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const supabaseUrl = 'https://jmmtbikvvuyzbhosplli.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbXRiaWt2dnV5emJob3NwbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNTM0ODUsImV4cCI6MjA2MTcyOTQ4NX0.RLJApjPgsvowvEiS_rBCB7CTIPZd14NTcuCT3a3Wb5c';

// Supabaseクライアントの作成
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
