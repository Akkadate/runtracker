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
    
    // ป้องกันการส่งฟอร์มแบบปกติโดยตรง
    const form = document.getElementById('userForm');
    
    // ล้าง event listener เดิมที่อาจมีอยู่
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // เพิ่ม event listener ใหม่
    newForm.addEventListener('submit', async function(event) {
        // ป้องกันการส่งแบบ default (GET)
        event.preventDefault();
        
        console.log("Form submit event triggered");
        
        const nationalid = document.getElementById('nationalid').value;
        const phonenumber = document.getElementById('phonenumber').value;
        
        console.log("Form data:", { nationalid, phonenumber });
        
        // ตรวจสอบข้อมูล
        if (nationalid.length !== 13 || !/^\d+$/.test(nationalid)) {
            alert('กรุณากรอกเลขบัตรประชาชน 13 หลัก');
            return;
        }
        
        if (phonenumber.length !== 10 || !/^\d+$/.test(phonenumber)) {
            alert('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก');
            return;
        }
        
        try {
            // สร้างข้อมูลที่จะส่ง
            const userData = {
                userid: profile.userId,
                displayname: profile.displayName,
                pictureurl: profile.pictureUrl,
                nationalid: nationalid,
                phonenumber: phonenumber
            };
            
            console.log("Sending data to API:", userData);
            
            // ส่งข้อมูลโดยตรง ไม่ผ่าน apiRequest
            const response = await fetch('https://runtracker.devapp.cc/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + liff.getAccessToken()
                },
                body: JSON.stringify(userData)
            });
            
            console.log("Response status:", response.status);
            
            const result = await response.json();
            console.log("API response:", result);
            
            if (!response.ok) {
                throw new Error("API error: " + JSON.stringify(result));
            }
            
            // แสดงผลสำเร็จ
            showProfileMode(profile, userData);
            alert('ลงทะเบียนเรียบร้อยแล้ว');
        } catch (error) {
            console.error("Registration error:", error);
            alert('เกิดข้อผิดพลาดในการลงทะเบียน: ' + error.message);
        }
    });
}