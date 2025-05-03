// frontend/js/submit-run.js
// ปรับปรุงการส่งข้อมูลการวิ่ง
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - Initializing submit-run.js");
    
    // เพิ่ม event listener ให้กับปุ่มบันทึก
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        console.log("Submit button found, adding click handler");
        submitButton.addEventListener('click', handleSubmit);
    } else {
        console.error("Submit button with ID 'submitButton' not found!");
    }
    
    // เพิ่ม event listener สำหรับการเลือกไฟล์
    const fileInput = document.getElementById('proofImage');
    if (fileInput) {
        console.log("File input found, adding change handler");
        fileInput.addEventListener('change', handleFileChange);
    } else {
        console.error("File input with ID 'proofImage' not found!");
    }
    
    // เพิ่ม event listener สำหรับปุ่มลองใหม่
    const retryButton = document.getElementById('retryButton');
    if (retryButton) {
        retryButton.addEventListener('click', function() {
            document.getElementById('errorMessage').classList.add('hidden');
            document.getElementById('runForm').classList.remove('hidden');
        });
    }
    
    // กำหนดวันที่เริ่มต้นเป็นวันปัจจุบัน
    const rundateInput = document.getElementById('rundate');
    if (rundateInput) {
        const today = new Date().toISOString().split('T')[0];
        rundateInput.value = today;
        console.log("Default date set to:", today);
    }
    
    console.log("Initialization complete");
});

// จัดการการเลือกไฟล์และแสดงตัวอย่าง
function handleFileChange(event) {
    console.log("File input changed");
    const file = event.target.files[0];
    if (file) {
        console.log("File selected:", file.name, "Size:", file.size, "Type:", file.type);
        const reader = new FileReader();
        reader.onload = function(e) {
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="ตัวอย่างรูปภาพ">`;
                console.log("Image preview created");
            }
        };
        reader.readAsDataURL(file);
    }
}

// ฟังก์ชันส่งข้อมูลการวิ่ง
async function handleSubmit() {
    console.log("Submit button clicked");
    
    try {
        // ข้อมูลพื้นฐาน
        const rundate = document.getElementById('rundate').value;
        const distance = document.getElementById('distance').value;
        const duration = document.getElementById('duration').value;
        const proofImage = document.getElementById('proofImage').files[0];
        
        // ตรวจสอบข้อมูล
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
        
        console.log(`ส่งข้อมูล: วันที่=${rundate}, ระยะทาง=${distance}, เวลา=${duration}, ไฟล์=${proofImage.name}`);
        
        // ปิดการใช้งานปุ่ม
        const submitButton = document.getElementById('submitButton');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'กำลังบันทึก...';
        }
        
        // ดึง Line User ID
        const profile = await liff.getProfile();
        const userId = profile.userId;
        console.log("LINE User ID:", userId);
        
        // สร้าง FormData แบบชัดเจน
        const formData = new FormData();
        
        // สำคัญ: ต้องกำหนดชื่อฟิลด์ให้ตรงกับที่ backend คาดหวัง
        formData.append('file', proofImage);
        formData.append('userid', userId);
        formData.append('rundate', rundate);
        formData.append('distance', distance);
        formData.append('duration', duration);
        
        // ตรวจสอบว่า FormData มีข้อมูลครบ
        console.log("FormData entries:");
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + (pair[0] === 'file' ? pair[1].name : pair[1]));
        }
        
        // ส่งข้อมูลแบบเรียบง่าย
        console.log("Sending data to API...");
        const response = await fetch('https://runtracker.devapp.cc/api/runs/upload', {
            method: 'POST',
            body: formData
        });
        
        // บันทึก response status
        console.log('Response status:', response.status);
        
        // อ่านการตอบกลับเป็นข้อความ
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        // แปลงเป็น JSON ถ้าเป็นไปได้
        let resultData = null;
        try {
            resultData = JSON.parse(responseText);
            console.log('Response data:', resultData);
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
        
        // ตรวจสอบการตอบกลับ
        if (response.status === 201 || response.status === 200) {
            // เก็บข้อมูลการวิ่ง
            window.currentRunData = {
                rundate: rundate,
                distance: distance,
                duration: duration,
                imageurl: resultData?.imageurl || resultData?.run?.imageurl || ''
            };
            
            console.log("Run data saved for sharing:", window.currentRunData);
            
            // แสดงข้อความสำเร็จ
            document.getElementById('runForm').classList.add('hidden');
            document.getElementById('successMessage').classList.remove('hidden');
            
            // ตั้งค่าปุ่มแชร์
            const shareButton = document.getElementById('shareButton');
            if (shareButton) {
                shareButton.addEventListener('click', shareRunResult);
            }
        } else {
            // แสดงข้อความผิดพลาด
            throw new Error(`การส่งข้อมูลล้มเหลว (${response.status}): ${responseText}`);
        }
    } catch (error) {
        console.error('Error submitting run data:', error);
        
        // แสดงข้อความผิดพลาด
        document.getElementById('errorText').textContent = `เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message}`;
        document.getElementById('runForm').classList.add('hidden');
        document.getElementById('errorMessage').classList.remove('hidden');
    } finally {
        // เปิดใช้งานปุ่มอีกครั้ง
        const submitButton = document.getElementById('submitButton');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'บันทึกข้อมูล';
        }
    }
}

// แชร์ผลการวิ่งไปยัง LINE
function shareRunResult() {
    if (!window.currentRunData) {
        console.error('No run data available for sharing');
        return;
    }
    
    console.log('Sharing run result:', window.currentRunData);
    
    // จัดรูปแบบวันที่
    const runDate = new Date(window.currentRunData.rundate).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // สร้างข้อความ
    const message = `🏃 บันทึกการวิ่งของฉัน\n📅 วันที่: ${runDate}\n🏁 ระยะทาง: ${window.currentRunData.distance} กม.\n⏱️ เวลา: ${window.currentRunData.duration} นาที`;
    
    // แชร์ผ่าน LINE
    if (liff.isApiAvailable('shareTargetPicker')) {
        const shareContent = [
            {
                type: "text",
                text: message
            }
        ];
        
        // เพิ่มรูปภาพถ้ามี
        if (window.currentRunData.imageurl && window.currentRunData.imageurl !== '') {
            shareContent.push({
                type: "image",
                originalContentUrl: window.currentRunData.imageurl,
                previewImageUrl: window.currentRunData.imageurl
            });
        }
        
        // แชร์ข้อมูล
        liff.shareTargetPicker(shareContent)
            .then(function(res) {
                if (res) {
                    alert('แชร์ข้อมูลเรียบร้อยแล้ว');
                }
            })
            .catch(function(error) {
                console.error('ShareTargetPicker failed', error);
                alert('ไม่สามารถแชร์ข้อมูลได้: ' + error.message);
            });
    } else {
        alert('ไม่สามารถแชร์ข้อมูลได้ เนื่องจากไม่รองรับฟังก์ชันนี้');
    }
}
