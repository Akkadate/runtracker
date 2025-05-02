document.addEventListener('DOMContentLoaded', () => {
    // LIFFが初期化されるのを待つ
    if (liff.isInClient() && liff.isLoggedIn()) {
        initializeSubmitRunPage();
    } else {
        // 定期的にチェック
        const checkLiffInterval = setInterval(() => {
            if (liff.isInClient() && liff.isLoggedIn()) {
                clearInterval(checkLiffInterval);
                initializeSubmitRunPage();
            }
        }, 500);
    }
});

let currentRunData = null;

async function initializeSubmitRunPage() {
    try {
        // ユーザープロファイルの取得
        const profile = await liff.getProfile();
        
        // LINE UserIDを使用してユーザー情報を取得
        const userData = await apiRequest('/api/users/' + profile.userId);
        
        if (!userData) {
            // ユーザーデータが存在しない場合は、ログイン要求メッセージを表示
            document.getElementById('loginRequired').classList.remove('hidden');
            document.getElementById('runForm').classList.add('hidden');
            return;
        }
        
        // ユーザーがログイン済みの場合、フォームを表示
        document.getElementById('loginRequired').classList.add('hidden');
        document.getElementById('runForm').classList.remove('hidden');
        
        // 日付フィールドのデフォルト値を今日に設定
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('rundate').value = today;
        
        // イメージプレビュー設定
        // 画像選択時のプレビュー
        document.getElementById('proofImage').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imagePreview = document.getElementById('imagePreview');
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                }
                reader.readAsDataURL(file);
            }
        });
        
        // フォーム送信イベントの設定
        document.getElementById('submitRunForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const rundate = document.getElementById('rundate').value;
            const distance = document.getElementById('distance').value;
            const duration = document.getElementById('duration').value;
            const proofImage = document.getElementById('proofImage').files[0];
            
            if (!proofImage) {
                alert('กรุณาอัปโหลดภาพหลักฐาน');
                return;
            }
            
            try {
                // ロード中表示
                document.getElementById('submitRunForm').querySelector('button').textContent = 'กำลังบันทึก...';
                document.getElementById('submitRunForm').querySelector('button').disabled = true;
                
                // ファイルをアップロード
                const additionalData = {
                    userid: profile.userId,
                    rundate: rundate,
                    distance: distance,
                    duration: duration
                };
                
                const result = await uploadFile('/api/runs/upload', proofImage, additionalData);
                
                // 成功メッセージを表示
                document.getElementById('runForm').classList.add('hidden');
                document.getElementById('successMessage').classList.remove('hidden');
                
                // 現在のランデータを保存（共有用）
                currentRunData = {
                    rundate: rundate,
                    distance: distance,
                    duration: duration,
                    imageurl: result.imageurl
                };
                
                // 共有ボタンのイベントリスナーを設定
                document.getElementById('shareButton').addEventListener('click', shareRunResult);
                
            } catch (error) {
                console.error('Error submitting run data:', error);
                alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
                
                // ボタンを元に戻す
                document.getElementById('submitRunForm').querySelector('button').textContent = 'บันทึกข้อมูล';
                document.getElementById('submitRunForm').querySelector('button').disabled = false;
            }
        });
    }
}

