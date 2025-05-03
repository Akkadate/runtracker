// ปรับปรุงไฟล์ submit-run.js เพื่อให้ส่งข้อมูลวิ่งและอัปโหลดภาพได้สำเร็จ
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded - Initializing submit-run.js");
    
    // รอให้ LIFF เริ่มทำงาน
    if (liff.isInClient() && liff.isLoggedIn()) {
        console.log("LIFF is initialized and user is logged in");
        initializeSubmitRunPage();
    } else {
        // ตรวจสอบเป็นระยะ
        console.log("Waiting for LIFF to initialize...");
        const checkLiffInterval = setInterval(() => {
            if (liff.isInClient() && liff.isLoggedIn()) {
                console.log("LIFF is now initialized");
                clearInterval(checkLiffInterval);
                initializeSubmitRunPage();
            }
        }, 500);
    }
});

let currentRunData = null;

async function initializeSubmitRunPage() {
    try {
        console.log("Starting initializeSubmitRunPage function");
        // ดึงข้อมูลโปรไฟล์ LINE
        const profile = await liff.getProfile();
        console.log("LIFF profile retrieved:", profile.userId);
        
        // ตรวจสอบว่าผู้ใช้ลงทะเบียนแล้วหรือไม่ โดยใช้ userId ของ LINE
        console.log("Checking if user is registered");
        const userData = await fetchUserData(profile.userId);
        
        if (!userData) {
            // ถ้ายังไม่ลงทะเบียน แสดงข้อความให้ไปลงทะเบียน
            console.log("User not registered, showing login required message");
            document.getElementById('loginRequired').classList.remove('hidden');
            document.getElementById('runForm').classList.add('hidden');
            return;
        }
        
        // ถ้าลงทะเบียนแล้ว แสดงฟอร์มส่งข้อมูลการวิ่ง
        console.log("User is registered, showing run form");
        document.getElementById('loginRequired').classList.add('hidden');
        document.getElementById('runForm').classList.remove('hidden');
        
        // ตั้งค่าวันที่เริ่มต้นเป็นวันนี้
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('rundate').value = today;
        console.log("Default date set to:", today);
        
        // ตั้งค่าการแสดงตัวอย่างรูปภาพ
        document.getElementById('proofImage').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                console.log("File selected:", file.name, "Size:", file.size, "bytes");
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imagePreview = document.getElementById('imagePreview');
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="ตัวอย่างรูปภาพ">`;
                    console.log("Image preview created");
                }
                reader.readAsDataURL(file);
            }
        });
        
        // จัดการการส่งฟอร์ม - ใช้ปุ่มแทนการ submit ฟอร์ม
        document.getElementById('submitButton').addEventListener('click', async () => {
            console.log("Submit button clicked");
            
            // ดึงข้อมูลจากฟอร์ม
            const rundate = document.getElementById('rundate').value;
            const distance = document.getElementById('distance').value;
            const duration = document.getElementById('duration').value;
            const proofImage = document.getElementById('proofImage').files[0];
            
            // ตรวจสอบข้อมูลว่ากรอกครบหรือไม่
            if (!rundate) {
                alert('กรุณาระบุวันที่วิ่ง');
                return;
            }
            
            if (!distance) {
                alert('กรุณาระบุระยะทาง');
                return;
            }
            
            if (!duration) {
                alert('กรุณาระบุเวลาที่ใช้');
                return;
            }
            
            if (!proofImage) {
                alert('กรุณาอัปโหลดภาพหลักฐาน');
                return;
            }
            
            console.log('Form data:', {
                rundate,
                distance,
                duration,
                proofImage: proofImage ? proofImage.name : 'No file selected'
            });
            
            try {
                // ล็อคปุ่มส่งเพื่อป้องกันการกดซ้ำ
                const submitButton = document.getElementById('submitButton');
                submitButton.textContent = 'กำลังบันทึก...';
                submitButton.disabled = true;
                
                // แสดงสถานะการอัปโหลด
                const uploadStatus = document.getElementById('uploadStatus');
                uploadStatus.textContent = 'กำลังอัปโหลดข้อมูล...';
                uploadStatus.style.display = 'block';
                uploadStatus.className = 'upload-status';
                
                // เตรียมข้อมูลสำหรับส่ง API
                const userid = profile.userId;  // ใช้ userId จาก LINE
                
                // สร้าง FormData เพื่อส่งไฟล์และข้อมูลอื่นๆ
                const formData = new FormData();
                formData.append('file', proofImage);
                formData.append('userid', userid);
                formData.append('rundate', rundate);
                formData.append('distance', distance);
                formData.append('duration', duration);
                
                console.log('Sending data to API with formData');
                
                // ส่งข้อมูลไปยัง API
                const result = await uploadRunData(formData);
                console.log('API response:', result);
                
                if (result.success || result.message) {
                    // บันทึกข้อมูลสำเร็จ
                    uploadStatus.textContent = 'อัปโหลดสำเร็จ!';
                    uploadStatus.className = 'upload-status success';
                    
                    document.getElementById('runForm').classList.add('hidden');
                    document.getElementById('successMessage').classList.remove('hidden');
                    
                    // เก็บข้อมูลสำหรับการแชร์
                    currentRunData = {
                        rundate: rundate,
                        distance: distance,
                        duration: duration,
                        imageurl: result.imageurl || result.imageUrl || result.run?.imageurl || 'https://example.com/placeholder.jpg'
                    };
                    
                    // ตั้งค่าปุ่มแชร์
                    document.getElementById('shareButton').addEventListener('click', shareRunResult);
                    
                    console.log('Data saved successfully, stored currentRunData:', currentRunData);
                } else {
                    throw new Error('ไม่สามารถบันทึกข้อมูลได้');
                }
            } catch (error) {
                console.error('Error submitting run data:', error);
                
                // แสดงข้อความผิดพลาด
                const uploadStatus = document.getElementById('uploadStatus');
                uploadStatus.textContent = 'เกิดข้อผิดพลาด: ' + error.message;
                uploadStatus.className = 'upload-status error';
                
                document.getElementById('errorText').textContent = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message;
                document.getElementById('runForm').classList.add('hidden');
                document.getElementById('errorMessage').classList.remove('hidden');
                
                // คืนค่าปุ่มส่ง
                const submitButton = document.getElementById('submitButton');
                submitButton.textContent = 'บันทึกข้อมูล';
                submitButton.disabled = false;
            }
        });
    } catch (error) {
        console.error('Error initializing submit run page:', error);
        alert('เกิดข้อผิดพลาดในการโหลดหน้า กรุณาลองใหม่อีกครั้ง');
    }
}

// ฟังก์ชันสำหรับดึงข้อมูลผู้ใช้
async function fetchUserData(userId) {
    try {
        console.log('Fetching user data for:', userId);
        const response = await fetch(`https://runtracker.devapp.cc/api/users/${userId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                console.log('User not found');
                return null;
            }
            throw new Error('API request failed with status ' + response.status);
        }
        
        const data = await response.json();
        console.log('User data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

// ฟังก์ชันสำหรับอัปโหลดข้อมูลการวิ่ง
async function uploadRunData(formData) {
    try {
        console.log('Uploading run data');
        
        // แสดงข้อมูลที่จะส่ง
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
            if (key !== 'file') {
                console.log(`${key}: ${value}`);
            } else {
                console.log(`${key}: (File) ${value.name}, type: ${value.type}, size: ${value.size} bytes`);
            }
        }

        // เตรียม headers สำหรับการส่งข้อมูล
        let headers = {};
        if (liff && liff.isLoggedIn()) {
            try {
                const token = liff.getAccessToken();
                if (token) {
                    headers['Authorization'] = 'Bearer ' + token;
                    console.log('Access token retrieved and set in headers');
                }
            } catch (error) {
                console.warn('Could not get LIFF token:', error);
            }
        }

        // ส่งข้อมูลไปยัง API
        console.log('Sending POST request to API endpoint...');
        const response = await fetch('https://runtracker.devapp.cc/api/runs/upload', {
            method: 'POST',
            headers: headers,
            body: formData
        });

        console.log('API response status:', response.status);
        
        // อ่านข้อความตอบกลับ
        const responseText = await response.text();
        console.log('API response text:', responseText);

        if (!response.ok) {
            throw new Error('Upload failed with status ' + response.status + ': ' + responseText);
        }

        // แปลงเป็น JSON ถ้าเป็นไปได้
        try {
            const jsonResponse = JSON.parse(responseText);
            console.log('Parsed JSON response:', jsonResponse);
            return jsonResponse;
        } catch (e) {
            console.log('Response is not JSON, returning as text');
            return { success: true, message: responseText };
        }
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// ฟังก์ชันสำหรับแชร์ผลการวิ่งไปยัง LINE
function shareRunResult() {
    if (!currentRunData) {
        console.error('No run data available for sharing');
        return;
    }
    
    console.log('Sharing run result:', currentRunData);
    
    // แปลงวันที่ให้เป็นรูปแบบที่อ่านง่าย
    const runDate = new Date(currentRunData.rundate).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // สร้างข้อความสำหรับแชร์
    const message = `🏃 บันทึกการวิ่งของฉัน\n📅 วันที่: ${runDate}\n🏁 ระยะทาง: ${currentRunData.distance} กม.\n⏱️ เวลา: ${currentRunData.duration} นาที`;
    
    // แชร์ผ่าน LINE
    if (liff.isApiAvailable('shareTargetPicker')) {
        // สร้างข้อมูลสำหรับแชร์
        const shareContent = [
            {
                type: "text",
                text: message
            }
        ];
        
        // เพิ่มรูปภาพถ้ามี URL
        if (currentRunData.imageurl && currentRunData.imageurl !== 'https://example.com/placeholder.jpg') {
            shareContent.push({
                type: "image",
                originalContentUrl: currentRunData.imageurl,
                previewImageUrl: currentRunData.imageurl
            });
        }
        
        console.log('Sharing content via LINE:', shareContent);
        
        // แชร์ข้อมูล
        liff.shareTargetPicker(shareContent)
            .then(function(res) {
                if (res) {
                    // แชร์สำเร็จ
                    alert('แชร์ข้อมูลเรียบร้อยแล้ว');
                    console.log('Share successful');
                } else {
                    // ผู้ใช้ยกเลิกหรือเกิดข้อผิดพลาด
                    console.log('ShareTargetPicker was cancelled by user or failed');
                }
            })
            .catch(function(error) {
                console.error('ShareTargetPicker failed', error);
                alert('ไม่สามารถแชร์ข้อมูลได้: ' + error.message);
            });
    } else {
        // ถ้าไม่รองรับ ShareTargetPicker
        alert('ไม่สามารถแชร์ข้อมูลได้ เนื่องจากไม่รองรับฟังก์ชันนี้');
        console.error('ShareTargetPicker is not available');
    }
}
