// Simplified submit-run.js for troubleshooting
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

// Handle form submission
async function handleSubmit() {
    console.log("Submit button clicked");
    
    // Show debug overlay
    showDebug("เริ่มกระบวนการส่งข้อมูล...");
    
    try {
        // Get form values
        const rundate = document.getElementById('rundate').value;
        const distance = document.getElementById('distance').value;
        const duration = document.getElementById('duration').value;
        const proofImage = document.getElementById('proofImage').files[0];
        
        // Validate form
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
        
        // Log form data
        showDebug(`ข้อมูลฟอร์ม: วันที่=${rundate}, ระยะทาง=${distance}, เวลา=${duration}, ไฟล์=${proofImage.name}`);
        
        // Disable submit button
        const submitButton = document.getElementById('submitButton');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'กำลังบันทึก...';
        }
        
        // Get LINE profile
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
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', proofImage);
        formData.append('userid', userId);
        formData.append('rundate', rundate);
        formData.append('distance', distance);
        formData.append('duration', duration);
        
        showDebug("สร้าง FormData สำเร็จ กำลังส่งข้อมูลไปยัง API...");
        
        // Get access token
        let token = null;
        try {
            token = liff.getAccessToken();
            showDebug(token ? "ได้รับ access token สำเร็จ" : "ไม่ได้รับ access token");
        } catch (tokenError) {
            showDebug(`ข้อผิดพลาดในการดึง token: ${tokenError.message}`);
        }
        
        // Prepare headers
        const headers = {};
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        
        // Send data to API
        showDebug("กำลังส่งคำขอ POST ไปยัง API...");
        
        try {
            const response = await fetch('https://runtracker.devapp.cc/api/runs/upload', {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            showDebug(`การตอบกลับจาก API: สถานะ ${response.status}`);
            
            // Read response
            const responseText = await response.text();
            showDebug(`ข้อความตอบกลับ: ${responseText}`);
            
            if (!response.ok) {
                throw new Error(`การอัปโหลดล้มเหลว: ${response.status} - ${responseText}`);
            }
            
            // Parse JSON response if possible
            let result;
            try {
                result = JSON.parse(responseText);
                showDebug("แปลงข้อมูล JSON สำเร็จ");
            } catch (jsonError) {
                showDebug("ข้อความตอบกลับไม่ใช่ JSON");
                result = { success: true, message: responseText };
            }
            
            // Handle success
            showDebug("บันทึกข้อมูลสำเร็จ!");
            document.getElementById('runForm').classList.add('hidden');
            document.getElementById('successMessage').classList.remove('hidden');
            
            // Store data for sharing
            window.currentRunData = {
                rundate: rundate,
                distance: distance,
                duration: duration,
                imageurl: result.imageurl || result.imageUrl || result.run?.imageurl || 'https://example.com/placeholder.jpg'
            };
            
            // Setup share button
            const shareButton = document.getElementById('shareButton');
            if (shareButton) {
                shareButton.addEventListener('click', shareRunResult);
            }
            
        } catch (apiError) {
            showError(`การส่งข้อมูลล้มเหลว: ${apiError.message}`);
            
            // Show error message
            document.getElementById('errorText').textContent = `เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${apiError.message}`;
            document.getElementById('runForm').classList.add('hidden');
            document.getElementById('errorMessage').classList.remove('hidden');
        } finally {
            // Re-enable submit button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'บันทึกข้อมูล';
            }
        }
        
    } catch (error) {
        showError(`เกิดข้อผิดพลาด: ${error.message}`);
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
