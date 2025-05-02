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
    // แสดงฟอร์ม
    document.getElementById('registrationForm').classList.remove('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    
    // สร้างฟอร์มใหม่แบบง่ายๆ คล้ายกับไฟล์ HTML ที่ทดสอบสำเร็จ
    const formContainer = document.getElementById('registrationForm');
    formContainer.innerHTML = `
        <h2>กรอกข้อมูลส่วนตัว</h2>
        <div class="form-group">
            <label for="nationalid">เลขบัตรประชาชน:</label>
            <input type="text" id="nationalid" maxlength="13" required>
        </div>
        <div class="form-group">
            <label for="phonenumber">เบอร์โทรศัพท์:</label>
            <input type="tel" id="phonenumber" maxlength="10" required>
        </div>
        <button id="submitBtn" class="btn-primary">บันทึกข้อมูล</button>
        <div id="statusMessage"></div>
    `;
    
    // ใช้ onclick แทน addEventListener
    document.getElementById('submitBtn').onclick = async function() {
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.innerHTML = "กำลังส่งข้อมูล...";
        
        try {
            // ดึงข้อมูลจากฟอร์ม
            const nationalid = document.getElementById('nationalid').value;
            const phonenumber = document.getElementById('phonenumber').value;
            
            console.log('ข้อมูลที่กรอก:', { nationalid, phonenumber });
            
            // ตรวจสอบข้อมูล
            if (nationalid.length !== 13 || !/^\d+$/.test(nationalid)) {
                statusMessage.innerHTML = "กรุณากรอกเลขบัตรประชาชน 13 หลัก";
                return;
            }
            
            if (phonenumber.length !== 10 || !/^\d+$/.test(phonenumber)) {
                statusMessage.innerHTML = "กรุณากรอกเบอร์โทรศัพท์ 10 หลัก";
                return;
            }
            
            // แสดงข้อมูลที่จะส่ง
            const userData = {
                userid: profile.userId,
                displayname: profile.displayName,
                pictureurl: profile.pictureUrl,
                nationalid: nationalid,
                phonenumber: phonenumber
            };
            
            console.log('ข้อมูลที่จะส่ง:', userData);
            statusMessage.innerHTML = "กำลังส่งข้อมูล...";
            
            // ส่งข้อมูลโดยตรงไม่ผ่าน apiRequest
            const response = await fetch('https://runtracker.devapp.cc/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            console.log('สถานะการตอบกลับ:', response.status);
            
            // รับผลลัพธ์
            const result = await response.json();
            console.log('ผลลัพธ์ API:', result);
            
            // แสดงข้อความสำเร็จ
            statusMessage.innerHTML = "ลงทะเบียนเรียบร้อยแล้ว";
            alert('ลงทะเบียนเรียบร้อยแล้ว');
            
            // แสดงหน้าโปรไฟล์
            showProfileMode(profile, userData);
        } catch (error) {
            console.error('เกิดข้อผิดพลาด:', error);
            statusMessage.innerHTML = "เกิดข้อผิดพลาด: " + error.message;
        }
        
        return false; // ป้องกันการส่งฟอร์มตามปกติ
    };
}

// เพิ่มโค้ดนี้ในส่วนต้นของ register.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // ทดสอบ LIFF
    if (typeof liff !== 'undefined') {
        console.log('LIFF is defined');
        console.log('LIFF version:', liff.getVersion());
        console.log('LIFF is logged in:', liff.isLoggedIn());
        console.log('LIFF is in client:', liff.isInClient());
    } else {
        console.error('LIFF is not defined!');
    }
});
