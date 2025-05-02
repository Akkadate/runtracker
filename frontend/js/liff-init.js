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
async function uploadFile(endpoint, file, additionalData = {}) {
    const url = API_BASE_URL + endpoint;
    
    const formData = new FormData();
    formData.append('file', file);
    
    // 追加データをフォームデータに追加
    for (const key in additionalData) {
        formData.append(key, additionalData[key]);
    }
    
    const options = {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + liff.getAccessToken()
        },
        body: formData
    };
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error('File upload failed with status ' + response.status);
        }
        
        return await response.json();
    } catch (error) {
        console.error('File upload error:', error);
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
