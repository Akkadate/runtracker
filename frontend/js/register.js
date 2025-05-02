// แสดง debug log
console.log('register.js loaded');

// ตรวจสอบเมื่อหน้าโหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // ตรวจสอบ LIFF
    if (typeof liff === 'undefined') {
        console.error('LIFF SDK not found');
        document.getElementById('statusMessage').textContent = 'ไม่พบ LIFF SDK กรุณาลองใหม่อีกครั้ง';
        return;
    }
    
    console.log('LIFF SDK Found');
    
    // เริ่มต้นใช้งาน LIFF
    liff.ready.then(() => {
        console.log('LIFF is ready');
        
        if (!liff.isLoggedIn()) {
            console.log('User not logged in, redirecting to login');
            liff.login();
            return;
        }
        
        console.log('User is logged in, initializing app');
        initializeApp();
    }).catch(err => {
        console.error('LIFF initialization error', err);
        document.getElementById('statusMessage').textContent = 'ไม่สามารถเชื่อมต่อกับ LINE ได้';
    });
});

// ฟังก์ชันเริ่มต้นแอป
async function initializeApp() {
    try {
        // ดึงข้อมูลโปรไฟล์
        console.log('Getting user profile');
        const profile = await liff.getProfile();
        console.log('User profile:', profile);
        
        // ตรวจสอบข้อมูลผู้ใช้
        try {
            console.log('Checking if user exists');
            const response = await fetch('https://runtracker.devapp.cc/api/users/' + profile.userId);
            console.log('User check response:', response.status);
            
            if (response.ok) {
                const userData = await response.json();
                console.log('User data found:', userData);
                showProfileMode(profile, userData);
            } else {
                console.log('User not found, showing registration form');
                showRegistrationForm(profile);
            }
        } catch (error) {
            console.error('Error checking user:', error);
            showRegistrationForm(profile);
        }
        
        // เพิ่ม event listener สำหรับปุ่มส่ง
        setupSubmitButton(profile);
    } catch (error) {
        console.error('App initialization error:', error);
        document.getElementById('statusMessage').textContent = 'เกิดข้อผิดพลาดในการเริ่มต้นแอป: ' + error.message;
    }
}

// แสดงโปรไฟล์
function showProfileMode(profile, userData) {
    console.log('Showing profile mode');
    
    // อัปเดตข้อมูลโปรไฟล์
    if (profile.pictureUrl) {
        document.getElementById('profileImage').src = profile.pictureUrl;
    }
    document.getElementById('displayName').textContent = profile.displayName;
    document.getElementById('profile-nationalid').textContent = userData.nationalid;
    document.getElementById('profile-phonenumber').textContent = userData.phonenumber;
    
    // แสดง/ซ่อนส่วนต่างๆ
    document.getElementById('profileContainer').classList.remove('hidden');
    document.getElementById('registrationForm').classList.add('hidden');
}

// แสดงฟอร์มลงทะเบียน
function showRegistrationForm(profile) {
    console.log('Showing registration form');
    
    // แสดง/ซ่อนส่วนต่างๆ
    document.getElementById('registrationForm').classList.remove('hidden');
    document.getElementById('profileContainer').classList.add('hidden');
    
    // ล้างค่าฟอร์ม
    document.getElementById('form-nationalid').value = '';
    document.getElementById('form-phonenumber').value = '';
    document.getElementById('statusMessage').textContent = '';
}

// ตั้งค่าปุ่มส่งฟอร์ม
function setupSubmitButton(profile) {
    const submitBtn = document.getElementById('submitBtn');
    
    if (!submitBtn) {
        console.error('Submit button not found');
        return;
    }
    
    console.log('Setting up submit button');
    
    submitBtn.onclick = async function() {
        try {
            console.log('Submit button clicked');
            document.getElementById('statusMessage').textContent = 'กำลังส่งข้อมูล...';
            
            // ดึงข้อมูลจากฟอร์ม
            const nationalidElement = document.getElementById('form-nationalid');
            const phonenumberElement = document.getElementById('form-phonenumber');
            
            console.log('Input elements:', {
                nationalidElement: nationalidElement ? 'found' : 'not found',
                phonenumberElement: phonenumberElement ? 'found' : 'not found'
            });
            
            if (!nationalidElement || !phonenumberElement) {
                throw new Error('ไม่พบช่องกรอกข้อมูล');
            }
            
            const nationalid = nationalidElement.value;
            const phonenumber = phonenumberElement.value;
            
            console.log('Form data:', { nationalid, phonenumber });
            
            // ตรวจสอบข้อมูล
            if (!nationalid || nationalid.length !== 13 || !/^\d+$/.test(nationalid)) {
                document.getElementById('statusMessage').textContent = 'กรุณากรอกเลขบัตรประชาชน 13 หลัก';
                return;
            }
            
            if (!phonenumber || phonenumber.length !== 10 || !/^\d+$/.test(phonenumber)) {
                document.getElementById('statusMessage').textContent = 'กรุณากรอกเบอร์โทรศัพท์ 10 หลัก';
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
            
            console.log('Sending user data:', userData);
            
            // ส่งข้อมูล
            const response = await fetch('https://runtracker.devapp.cc/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            console.log('API response status:', response.status);
            
            const result = await response.json();
            console.log('API response data:', result);
            
            // แสดงผลสำเร็จ
            document.getElementById('statusMessage').textContent = 'ลงทะเบียนเรียบร้อยแล้ว';
            alert('ลงทะเบียนเรียบร้อยแล้ว');
            
            // แสดงหน้าโปรไฟล์
            showProfileMode(profile, userData);
        } catch (error) {
            console.error('Registration error:', error);
            document.getElementById('statusMessage').textContent = 'เกิดข้อผิดพลาด: ' + error.message;
        }
    };
}