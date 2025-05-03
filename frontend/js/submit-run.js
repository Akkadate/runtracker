// Simplified submit-run.js with lowercase field names
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded - Initializing simplified submit-run.js");
    
    // Add click handler to the submit button
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        console.log("Submit button found, adding click handler");
        submitButton.addEventListener('click', handleSubmit);
    } else {
        console.error("Submit button with ID 'submitButton' not found!");
    }
    
    // Add change handler for file input
    const fileInput = document.getElementById('proofImage');
    if (fileInput) {
        console.log("File input found, adding change handler");
        fileInput.addEventListener('change', handleFileChange);
    } else {
        console.error("File input with ID 'proofImage' not found!");
    }
    
    // Add click handler for retry button
    const retryButton = document.getElementById('retryButton');
    if (retryButton) {
        retryButton.addEventListener('click', function() {
            document.getElementById('errorMessage').classList.add('hidden');
            document.getElementById('runForm').classList.remove('hidden');
        });
    }
    
    // Initialize default date
    const rundateInput = document.getElementById('rundate');
    if (rundateInput) {
        const today = new Date().toISOString().split('T')[0];
        rundateInput.value = today;
        console.log("Default date set to:", today);
    }
    
    console.log("Initialization complete");
});

// Handle file selection for preview
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

async function handleSubmit() {
    console.log("Submit button clicked");
    
    // แสดงข้อความ debug
    showDebug("เริ่มกระบวนการส่งข้อมูล...");
    
    try {
        // รับค่าจากฟอร์ม
        const rundate = document.getElementById('rundate').value;
        const distance = document.getElementById('distance').value;
        const duration = document.getElementById('duration').value;
        const proofImage = document.getElementById('proofImage').files[0];
        
        // ตรวจสอบความถูกต้องของข้อมูล
        if (!rundate) {
            showError("กรุณาระบุวันที่วิ่ง");
            return;
        }
        
        if (!distance) {
            showError("กรุณาระบุระยะทาง");
            return;
        }
        
        if (!duration) {
            showError("กรุณาระบุเวลาที่ใช้");
            return;
        }
        
        if (!proofImage) {
            showError("กรุณาอัปโหลดภาพหลักฐาน");
            return;
        }
        
        // บันทึกข้อความ debug
        showDebug(`ข้อมูลฟอร์ม: วันที่=${rundate}, ระยะทาง=${distance}, เวลา=${duration}, ไฟล์=${proofImage.name}`);
        
        // ปิดการใช้งานปุ่มบันทึก
        const submitButton = document.getElementById('submitButton');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'กำลังบันทึก...';
        }
        
        // ดึงข้อมูลโปรไฟล์ LINE
        showDebug("กำลังดึงข้อมูลโปรไฟล์ LINE...");
        let userId;
        try {
            const profile = await liff.getProfile();
            userId = profile.userId;
            showDebug(`ได้รับ userId: ${userId}`);
        } catch (profileError) {
            showError(`ไม่สามารถดึงข้อมูลโปรไฟล์ LINE ได้: ${profileError.message}`);
            return;
        }
        
        // สร้าง FormData สำหรับส่งข้อมูล
        showDebug("กำลังเตรียมข้อมูลสำหรับส่ง...");
        const formData = new FormData();
        
        // สำคัญ: ต้องใช้ชื่อฟิลด์ตรงกับที่ backend กำหนด
        formData.append('file', proofImage);  // ต้องเป็น 'file' ไม่ใช่ชื่ออื่น
        formData.append('userid', userId);    // ใช้ 'userid' ตัวพิมพ์เล็ก
        formData.append('rundate', rundate);  // ใช้ 'rundate' ตัวพิมพ์เล็ก
        formData.append('distance', distance);
        formData.append('duration', duration);
        
        // บันทึกข้อความ debug
        showDebug(`ข้อมูลที่ส่ง: userid=${userId}, rundate=${rundate}, distance=${distance}, duration=${duration}, file=${proofImage.name}`);
        
        // ส่งข้อมูลไปยัง API
        showDebug("กำลังส่งข้อมูลไปยัง API...");
        const response = await fetch('https://runtracker.devapp.cc/api/runs/upload', {
            method: 'POST',
            body: formData  // ไม่ต้องกำหนด Content-Type เพราะ browser จะกำหนดให้อัตโนมัติ
        });
        
        // อ่านข้อมูลตอบกลับ
        showDebug(`ได้รับการตอบกลับ: ${response.status}`);
        const responseText = await response.text();
        showDebug(`ข้อความตอบกลับ: ${responseText}`);
        
        // ตรวจสอบสถานะการตอบกลับ
        if (!response.ok) {
            throw new Error(`การส่งข้อมูลล้มเหลว: ${response.status} - ${responseText}`);
        }
        
        // แปลงข้อความตอบกลับเป็น JSON
        let result;
        try {
            result = JSON.parse(responseText);
            showDebug(`ผลลัพธ์ API: ${JSON.stringify(result)}`);
        } catch (e) {
            showDebug("ไม่สามารถแปลงข้อความตอบกลับเป็น JSON ได้");
        }
        
        // บันทึกข้อมูลสำหรับการแชร์
        window.currentRunData = {
            rundate: rundate,
            distance: distance,
            duration: duration,
            imageurl: result?.imageurl || result?.run?.imageurl || ''
        };
        
        // แสดงข้อความสำเร็จ
        showDebug("บันทึกข้อมูลสำเร็จ!");
        document.getElementById('runForm').classList.add('hidden');
        document.getElementById('successMessage').classList.remove('hidden');
        
        // เพิ่ม event listener สำหรับปุ่มแชร์
        const shareButton = document.getElementById('shareButton');
        if (shareButton) {
            shareButton.addEventListener('click', shareRunResult);
        }
    } catch (error) {
        // จัดการข้อผิดพลาด
        showDebug(`เกิดข้อผิดพลาด: ${error.message}`);
        console.error('Error submitting run data:', error);
        
        // แสดงข้อความผิดพลาด
        document.getElementById('errorText').textContent = `เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message}`;
        document.getElementById('runForm').classList.add('hidden');
        document.getElementById('errorMessage').classList.remove('hidden');
    } finally {
        // เปิดการใช้งานปุ่มบันทึกอีกครั้ง
        const submitButton = document.getElementById('submitButton');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'บันทึกข้อมูล';
        }
    }
}

// Share run result to LINE
function shareRunResult() {
    if (!window.currentRunData) {
        console.error('No run data available for sharing');
        return;
    }
    
    console.log('Sharing run result:', window.currentRunData);
    
    // Format date
    const runDate = new Date(window.currentRunData.rundate).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Create message
    const message = `🏃 บันทึกการวิ่งของฉัน\n📅 วันที่: ${runDate}\n🏁 ระยะทาง: ${window.currentRunData.distance} กม.\n⏱️ เวลา: ${window.currentRunData.duration} นาที`;
    
    // Share via LINE
    if (liff.isApiAvailable('shareTargetPicker')) {
        const shareContent = [
            {
                type: "text",
                text: message
            }
        ];
        
        // Add image if available
        if (window.currentRunData.imageurl && window.currentRunData.imageurl !== 'https://example.com/placeholder.jpg') {
            shareContent.push({
                type: "image",
                originalContentUrl: window.currentRunData.imageurl,
                previewImageUrl: window.currentRunData.imageurl
            });
        }
        
        // Share content
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

// Helper functions for showing errors and debug info
function showError(message) {
    console.error(message);
    alert(message);
}

// Create debug overlay
function createDebugOverlay() {
    // Check if overlay already exists
    if (document.getElementById('debugOverlay')) {
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'debugOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '10px';
    overlay.style.right = '10px';
    overlay.style.width = '300px';
    overlay.style.maxHeight = '80vh';
    overlay.style.overflowY = 'auto';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.color = '#fff';
    overlay.style.padding = '10px';
    overlay.style.borderRadius = '5px';
    overlay.style.zIndex = '9999';
    overlay.style.fontSize = '12px';
    overlay.style.fontFamily = 'monospace';
    
    const title = document.createElement('div');
    title.textContent = 'DEBUG INFO';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '5px';
    title.style.borderBottom = '1px solid #fff';
    overlay.appendChild(title);
    
    const content = document.createElement('div');
    content.id = 'debugContent';
    overlay.appendChild(content);
    
    document.body.appendChild(overlay);
}

function showDebug(message) {
    console.log(message);
    
    // Create overlay if it doesn't exist
    createDebugOverlay();
    
    // Add message to overlay
    const content = document.getElementById('debugContent');
    if (content) {
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        entry.style.marginBottom = '3px';
        entry.style.borderBottom = '1px dotted #555';
        entry.style.paddingBottom = '3px';
        content.appendChild(entry);
        
        // Scroll to bottom
        content.scrollTop = content.scrollHeight;
    }
}
