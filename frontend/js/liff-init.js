// LIFF 初期化
document.addEventListener('DOMContentLoaded', () => {
    // LIFF IDを設定
    const liffId = '2007356421-1rmykxlZ'; // 実際のLIFF IDに置き換える
    
    // LIFF の初期化
    liff.init({
        liffId: liffId
    })
    .then(() => {
        // 初期化成功
        console.log('LIFF initialized successfully');
        
        // ログインしているかチェック
        if (!liff.isLoggedIn()) {
            // ログインしていなければ、ログイン画面にリダイレクト
            liff.login();
        } else {
            // ユーザー情報の取得
            initializeApp();
        }
    })
    .catch((err) => {
        // 初期化失敗
        console.error('LIFF initialization failed', err);
        alert('LINE LIFFの初期化に失敗しました。ページを再読み込みしてください。');
    });
});

// アプリケーションの初期化
function initializeApp() {
    // ユーザープロファイルの取得
    const userProfile = liff.getProfile();
    
    // グローバル変数としてユーザー情報を保存
    window.lineUser = {
        userId: liff.getContext().userId,
        profile: userProfile
    };
    
    // 現在のページに基づいて必要な初期化処理を実行
    const currentPage = window.location.pathname.split('/').pop();
    
    // インデックスページの場合
    if (currentPage === 'index.html' || currentPage === '') {
        initializeIndexPage();
    }
    
    // 他のページ固有の初期化はそれぞれのJSファイルで行う
}

// インデックスページの初期化
function initializeIndexPage() {
    liff.getProfile()
        .then(profile => {
            // プロファイル画像とディスプレイネームを表示
            document.getElementById('profileImage').src = profile.pictureUrl;
            document.getElementById('displayName').textContent = profile.displayName;
        })
        .catch(err => {
            console.error('Error getting profile', err);
        });
}

// APIサーバーのベースURL
const API_BASE_URL = 'https://runtracker.devapp.cc';

// APIリクエスト用のヘルパー関数
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = API_BASE_URL + endpoint;
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + liff.getAccessToken()
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error('API request failed with status ' + response.status);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// ファイルアップロード用のヘルパー関数
// ฟังก์ชันอัปโหลดไฟล์ที่แก้ไขใหม่
async function uploadFile(endpoint, file, additionalData = {}) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        // เพิ่มข้อมูลอื่นๆ ลงใน FormData
        for (const key in additionalData) {
            formData.append(key, additionalData[key]);
        }
        
        // ดึง token จาก LIFF ถ้ามี
        let headers = {};
        if (liff && liff.isLoggedIn()) {
            try {
                const token = liff.getAccessToken();
                if (token) {
                    headers['Authorization'] = 'Bearer ' + token;
                }
            } catch (error) {
                console.warn('Could not get LIFF token:', error);
            }
        }
        
        // แสดงข้อมูลที่จะส่ง (สำหรับการ debug)
        console.log('Sending data to:', API_BASE_URL + endpoint);
        console.log('Headers:', headers);
        console.log('Form data keys:', Object.keys(additionalData));
        
        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'POST',
            headers: headers,
            body: formData
        });
        
        // อ่านข้อความตอบกลับก่อน
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (!response.ok) {
            throw new Error('Upload failed with status ' + response.status + ': ' + responseText);
        }
        
        // แปลงเป็น JSON ถ้าเป็นไปได้
        try {
            return JSON.parse(responseText);
        } catch (e) {
            return { success: true, message: responseText };
        }
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// LINEメッセージを送信する関数
function sendLineMessage(message) {
    liff.sendMessages([
        {
            type: 'text',
            text: message
        }
    ])
    .then(() => {
        console.log('Message sent');
    })
    .catch((err) => {
        console.error('Error sending message', err);
    });
}
