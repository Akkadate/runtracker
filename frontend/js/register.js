// ตรวจสอบการโหลดไฟล์
console.log('register.js loaded');

// ตรวจสอบสถานะของ LIFF
window.addEventListener('load', function() {
    console.log('Window loaded');
    console.log('LIFF status:', {
        isDefined: typeof liff !== 'undefined',
        isInClient: liff?.isInClient?.() || false,
        isLoggedIn: liff?.isLoggedIn?.() || false
    });
});

// รวมเหลือเพียง listener เดียว
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // ทดสอบ LIFF
    if (typeof liff !== 'undefined') {
        console.log('LIFF is defined');
        console.log('LIFF version:', liff.getVersion());
        console.log('LIFF is logged in:', liff.isLoggedIn());
        console.log('LIFF is in client:', liff.isInClient());
        
        // เริ่มต้นการทำงานเมื่อ LIFF พร้อม
        if (liff.isLoggedIn()) {
            initializeRegisterPage();
        } else {
            // หากยังไม่ได้ล็อกอิน ให้เข้าสู่ระบบก่อน
            liff.login();
        }
    } else {
        console.error('LIFF is not defined!');
        alert('ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาลองใหม่อีกครั้ง');
    }
});

async function initializeRegisterPage() {
    try {
        // ดึงข้อมูลโปรไฟล์ผู้ใช้
        const profile = await liff.getProfile();
        console.log('ได้รับข้อมูลโปรไฟล์:', profile);
        
        // ตรวจสอบว่ามีข้อมูลผู้ใช้อยู่แล้วหรือไม่
        try {
            const response = await fetch('https://runtracker.devapp.cc/api/users/' + profile.userId);
            
            if (response.ok) {
                const userData = await response.json();
                console.log('พบข้อมูลผู้ใช้:', userData);
                showProfileMode(profile, userData);
            } else {
                console.log('ไม่พบข้อมูลผู้ใช้ แสดงฟอร์มลงทะเบียน');
                showRegistrationForm(profile);
            }
        } catch (error) {
            console.error('ไม่สามารถตรวจสอบข้อมูลผู้ใช้:', error);
            showRegistrationForm(profile);
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเริ่มต้น:', error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับ LINE: ' + error.message);
    }
}

function showProfileMode(profile, userData) {
    // แสดงข้อมูลโปรไฟล์
    const profileImage = document.getElementById('profileImage');
    if (profileImage && profile.pictureUrl) {
        profileImage.src = profile.pictureUrl;
    }
    
    document.getElementById('displayName').textContent = profile.displayName;
    document.getElementById('nationalid').textContent = userData.nationalid;
    document.getElementById('phonenumber').textContent = userData.phonenumber;
    
    // แสดงโปรไฟล์
    document.getElementById('profileContainer').classList.remove('hidden');
    document.getElementById('registrationForm').classList.add('hidden');
}

function showRegistrationForm(profile) {
    // แสดงฟอร์ม
    document.getElementById('registrationForm').classList.remove('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    
    // สร้างฟอร์ม
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
        <button type="button" id="submitBtn" class="btn-primary">บันทึกข้อมูล</button>
        <div id="statusMessage"></div>
    `;
    
    // เพิ่มการตรวจสอบว่า element มีอยู่จริงหรือไม่
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) {
        console.error('ไม่พบปุ่ม submitBtn!');
        return;
    }
    
    // กำหนด event handler
    submitBtn.onclick = async function() {
        try {
            // ตรวจสอบว่า element มีอยู่จริงหรือไม่
            const nationalidElement = document.getElementById('nationalid');
            const phonenumberElement = document.getElementById('phonenumber');
            
            if (!nationalidElement || !phonenumberElement) {
                console.error('ไม่พบช่องกรอกข้อมูล!', {
                    nationalidElement,
                    phonenumberElement
                });
                alert('เกิดข้อผิดพลาด: ไม่พบช่องกรอกข้อมูล');
                return;
            }
            
            const nationalid = nationalidElement.value;
            const phonenumber = phonenumberElement.value;
            
            console.log('ข้อมูลที่กรอก:', { nationalid, phonenumber });
            
            // ตรวจสอบข้อมูล
            if (!nationalid || nationalid.length !== 13 || !/^\d+$/.test(nationalid)) {
                alert('กรุณากรอกเลขบัตรประชาชน 13 หลัก');
                return;
            }
            
            if (!phonenumber || phonenumber.length !== 10 || !/^\d+$/.test(phonenumber)) {
                alert('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก');
                return;
            }
            
            // สร้างข้อมูลที่จะส่ง
            const userData = {
                userid: profile.userId,
                displayname: profile.displayName,
                pictureurl: profile.pictureUrl || '',
                nationalid: nationalid,
                phonenumber: phonenumber
            };
            
            console.log('ข้อมูลที่จะส่ง:', userData);
            
            // ส่งข้อมูล
            const response = await fetch('https://runtracker.devapp.cc/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            console.log('สถานะการตอบกลับ:', response.status);
            
            const result = await response.json();
            console.log('ผลลัพธ์ API:', result);
            
            // แสดงผลสำเร็จ
            alert('ลงทะเบียนเรียบร้อยแล้ว');
            
            // แสดงหน้าโปรไฟล์
            showProfileMode(profile, userData);
        } catch (error) {
            console.error('เกิดข้อผิดพลาด:', error);
            alert('เกิดข้อผิดพลาดในการลงทะเบียน: ' + error.message);
        }
    };
}