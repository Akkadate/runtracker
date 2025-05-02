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
       // แก้ไขส่วนการส่งฟอร์ม
document.getElementById('submitRunForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const rundate = document.getElementById('rundate').value;
    const distance = document.getElementById('distance').value;
    const duration = document.getElementById('duration').value;
    const proofImage = document.getElementById('proofImage').files[0];
    
    console.log('Form data:', {
        rundate,
        distance,
        duration,
        proofImage: proofImage ? proofImage.name : 'No file selected'
    });
    
    if (!proofImage) {
        alert('กรุณาอัปโหลดภาพหลักฐาน');
        return;
    }
    
    try {
        // ล็อคปุ่มส่ง
        const submitButton = document.getElementById('submitRunForm').querySelector('button');
        submitButton.textContent = 'กำลังบันทึก...';
        submitButton.disabled = true;
        
        // ข้อมูลเพิ่มเติม
        const additionalData = {
            userid: (await liff.getProfile()).userId,
            rundate: rundate,
            distance: distance,
            duration: duration
        };
        
        console.log('Sending data to API...');
        
        // ใช้ debugUpload เพื่อตรวจสอบการส่งข้อมูล
        try {
            const debugResult = await debugUpload(proofImage, additionalData);
            console.log('Debug upload result:', debugResult);
            
            // ถ้าสำเร็จ ให้ใช้ผลลัพธ์จาก debug
            const result = debugResult;
            
            // แสดงข้อความสำเร็จ
            document.getElementById('runForm').classList.add('hidden');
            document.getElementById('successMessage').classList.remove('hidden');
            
            // บันทึกข้อมูลปัจจุบันสำหรับการแชร์
            currentRunData = {
                rundate: rundate,
                distance: distance,
                duration: duration,
                imageurl: result.imageurl || 'https://example.com/placeholder.jpg' // ใส่ URL สำรองหากไม่มี
            };
            
            // ตั้งค่า event listener สำหรับปุ่มแชร์
            document.getElementById('shareButton').addEventListener('click', shareRunResult);
        } catch (debugError) {
            // ถ้า debug ไม่สำเร็จ ให้แสดงข้อความผิดพลาด
            console.error('Debug upload failed:', debugError);
            
            // ลองใช้ uploadFile ตามปกติหากมีการกำหนดไว้แล้ว
            if (typeof uploadFile === 'function') {
                const result = await uploadFile('/api/runs/upload', proofImage, additionalData);
                
                // แสดงข้อความสำเร็จ
                document.getElementById('runForm').classList.add('hidden');
                document.getElementById('successMessage').classList.remove('hidden');
                
                // บันทึกข้อมูลปัจจุบัน
                currentRunData = {
                    rundate: rundate,
                    distance: distance,
                    duration: duration,
                    imageurl: result.imageurl
                };
                
                // ตั้งค่า event listener สำหรับปุ่มแชร์
                document.getElementById('shareButton').addEventListener('click', shareRunResult);
            } else {
                throw new Error('ฟังก์ชัน uploadFile ไม่ได้ถูกกำหนด');
            }
        }
    } catch (error) {
        console.error('Error submitting run data:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
        
        // คืนค่าปุ่มส่ง
        const submitButton = document.getElementById('submitRunForm').querySelector('button');
        submitButton.textContent = 'บันทึกข้อมูล';
        submitButton.disabled = false;
    }
});

        }catch (error) {
        console.error('Error initializing submit run page:', error);
        alert('เกิดข้อผิดพลาดในการโหลดหน้า กรุณาลองใหม่อีกครั้ง');
    }
}

function shareRunResult() {
    if (!currentRunData) return;
    
    // แก้ไขให้ใช้ชื่อตัวแปรที่ตรงกัน
    const runDate = new Date(currentRunData.rundate).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const message = `🏃 บันทึกการวิ่งของฉัน\n📅 วันที่: ${runDate}\n🏁 ระยะทาง: ${currentRunData.distance} กม.\n⏱️ เวลา: ${currentRunData.duration} นาที`;
    
    // LINEでメッセージを共有
    if (liff.isApiAvailable('shareTargetPicker')) {
        liff.shareTargetPicker([
            {
                type: "text",
                text: message
            },
            {
                type: "image",
                originalContentUrl: currentRunData.imageurl, // แก้ไขเป็น imageurl
                previewImageUrl: currentRunData.imageurl    // แก้ไขเป็น imageurl
            }
        ])
        .then(function(res) {
            if (res) {
                // 共有成功
                alert('แชร์ข้อมูลเรียบร้อยแล้ว');
            } else {
                // キャンセルまたは失敗
                console.log('ShareTargetPicker was cancelled by user or failed');
            }
        })
        .catch(function(error) {
            console.error('ShareTargetPicker failed', error);
        });
    } else {
        // ShareTargetPickerが利用できない場合
        alert('ไม่สามารถแชร์ข้อมูลได้ เนื่องจากไม่รองรับฟังก์ชันนี้');
    }
}

// ฟังก์ชันสำหรับตรวจสอบการส่งข้อมูล
async function debugUpload(file, additionalData) {
    try {
        console.log('Debug: Preparing to upload file');
        console.log('File data:', {
            name: file.name,
            type: file.type,
            size: file.size
        });
        console.log('Additional data:', additionalData);
        
        // ทดสอบส่งข้อมูลโดยตรง
        const formData = new FormData();
        formData.append('file', file);
        
        for (const key in additionalData) {
            formData.append(key, additionalData[key]);
        }
        
        console.log('FormData created, attempting to send...');
        
        const response = await fetch(API_BASE_URL + '/api/runs/upload', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + liff.getAccessToken()
            },
            body: formData
        });
        
        console.log('Upload response status:', response.status);
        
        const result = await response.json();
        console.log('Upload response data:', result);
        
        return result;
    } catch (error) {
        console.error('Debug upload error:', error);
        throw error;
    }
}