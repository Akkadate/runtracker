document.addEventListener('DOMContentLoaded', () => {
    // LIFFが初期化されるのを待つ
    if (liff.isInClient() && liff.isLoggedIn()) {
        initializeRegisterPage();
    } else {
        // 定期的にチェック
        const checkLiffInterval = setInterval(() => {
            if (liff.isInClient() && liff.isLoggedIn()) {
                clearInterval(checkLiffInterval);
                initializeRegisterPage();
            }
        }, 500);
    }
});




async function initializeRegisterPage() {
    try {
        // ユーザープロファイルの取得
        const profile = await liff.getProfile();
        
        // LINE UserIDを使用してユーザー情報を取得
        const userData = await apiRequest('/api/users/' + profile.userId);
        
        if (userData) {
            // ユーザーデータが存在する場合は、プロファイル表示モードに切り替える
            showProfileMode(profile, userData);
        } else {
            // ユーザーデータが存在しない場合は、登録フォームを表示
            showRegistrationForm(profile);
        }
    } catch (error) {
        console.error('Error initializing register page:', error);
        // エラーが発生した場合も登録フォームを表示
        const profile = await liff.getProfile();
        showRegistrationForm(profile);
    }
}

function showProfileMode(profile, userData) {
    // プロファイル情報を表示
    document.getElementById('profileImage').src = profile.pictureUrl;
    document.getElementById('displayName').textContent = profile.displayName;
    document.getElementById('nationalid').textContent = userData.nationalid;
    document.getElementById('phonenumber').textContent = userData.phonenumber;
    
    // プロファイルコンテナを表示
    document.getElementById('profileContainer').classList.remove('hidden');
    // 登録フォームを非表示
    document.getElementById('registrationForm').classList.add('hidden');
}


function showRegistrationForm(profile) {
    // 登録フォームを表示
    document.getElementById('registrationForm').classList.remove('hidden');
    // プロファイルコンテナを非表示
    document.getElementById('profileContainer').classList.add('hidden');
    
    // フォーム送信イベントの設定
    document.getElementById('userForm').addEventListener('submit', async (event) => {
        event.preventDefault(); // ป้องกันการส่งฟอร์มแบบปกติ
        
        const nationalid = document.getElementById('nationalid').value;
        const phonenumber = document.getElementById('phonenumber').value; // แก้ไขการสะกดผิด phonnumber -> phonenumber
        
        console.log('Form submitted with data:', { nationalid, phonenumber }); // แก้ไขชื่อตัวแปรใน log ให้ตรงกัน
        
        // 入力検証
        if (nationalid.length !== 13 || !/^\d+$/.test(nationalid)) {
            alert('กรุณากรอกเลขบัตรประชาชน 13 หลัก');
            return;
        }
        
        if (phonenumber.length !== 10 || !/^\d+$/.test(phonenumber)) {
            alert('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก');
            return;
        }
        
        try {
            // ユーザーデータを登録
            const userData = {
                userid: profile.userId,
                displayname: profile.displayName,
                pictureurl: profile.pictureUrl,
                nationalid: nationalid,
                phonenumber: phonenumber
            };
            
            console.log('Sending user data to API:', userData);
            
            const result = await apiRequest('/api/users', 'POST', userData);
            console.log('API response:', result);
            
            // 登録成功後、プロファイル表示モードに切り替え
            showProfileMode(profile, userData);
            
            alert('ลงทะเบียนเรียบร้อยแล้ว');
        } catch (error) {
            console.error('Error registering user:', error);
            alert('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
        }
    });
}