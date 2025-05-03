// js/admin.js - JavaScript สำหรับหน้า Admin
document.addEventListener('DOMContentLoaded', function() {

    // ตรวจสอบ session
    checkSession();
    
    // เพิ่ม event listener สำหรับปุ่มล็อกอิน
    document.getElementById('loginButton').addEventListener('click', login);
    
    // ตั้งค่า API URL
    const API_BASE_URL = 'https://runtracker.devapp.cc';
    
    // สถานะของข้อมูล
    let runsData = [];
    
    // แก้ไขฟังก์ชันโหลดข้อมูล
async function loadData() {
    try {
        // โหลดข้อมูลการวิ่งทั้งหมด
        const response = await fetch(`${API_BASE_URL}/api/runs/admin/all`);
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        runsData = await response.json();
        
        // โหลดข้อมูลผู้ใช้เพิ่มเติม (เพื่อดึงเบอร์โทรศัพท์)
        const userIds = [...new Set(runsData.map(item => item.userid))];
        const userPromises = userIds.map(userId => 
            fetch(`${API_BASE_URL}/api/users/${userId}`)
                .then(res => res.ok ? res.json() : null)
        );
        
        const usersData = await Promise.all(userPromises);
        const usersMap = {};
        usersData.forEach(user => {
            if (user) {
                usersMap[user.userid] = user;
            }
        });
        
        // เพิ่มข้อมูลผู้ใช้ลงในข้อมูลการวิ่ง
        runsData = runsData.map(run => ({
            ...run,
            userDetails: usersMap[run.userid] || {}
        }));
        
        // แสดงสถิติ
        displayStats(runsData);
        
        // แสดงตารางข้อมูล
        displayTable(runsData);
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message;
    }
}
    
    
    // ฟังก์ชันคำนวณและแสดงสถิติ
    function displayStats(data) {
        // คำนวณสถิติ
        const uniqueUsers = [...new Set(data.map(item => item.userid))].length;
        const totalRuns = data.length;
        const totalDistance = data.reduce((sum, item) => sum + parseFloat(item.distance || 0), 0);
        const avgDistance = totalRuns > 0 ? totalDistance / totalRuns : 0;
        
        // แสดงสถิติ
        document.getElementById('totalUsers').textContent = uniqueUsers;
        document.getElementById('totalRuns').textContent = totalRuns;
        document.getElementById('totalDistance').textContent = totalDistance.toFixed(2);
        document.getElementById('avgDistance').textContent = avgDistance.toFixed(2);
    }
    
 // แก้ไขฟังก์ชันแสดงตาราง
function displayTable(data) {
    // ซ่อนข้อความ loading
    document.getElementById('loading').style.display = 'none';
    
    // สร้างข้อมูลสำหรับตาราง
    const tableData = data.map(item => {
        // แปลงวันที่ให้อยู่ในรูปแบบที่อ่านง่าย
        const runDate = new Date(item.rundate).toLocaleDateString('th-TH');
        const createdAt = new Date(item.createdat).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // ดึงข้อมูลผู้ใช้
        const user = item.users || {};
        const displayName = user.displayname || 'ไม่ระบุชื่อ';
        const phoneNumber = item.userDetails?.phonenumber || '-';
        
        // สร้าง HTML สำหรับรูปภาพ
        const thumbnailHtml = item.imageurl 
            ? `<img src="${item.imageurl}" class="thumbnail" data-full="${item.imageurl}" alt="หลักฐานการวิ่ง">`
            : 'ไม่มีรูปภาพ';
        
        // สร้าง HTML สำหรับปุ่มแก้ไขและลบ
        const actionsHtml = `
            <div class="action-buttons">
                <button class="btn-edit" data-id="${item.id}">แก้ไข</button>
                <button class="btn-delete" data-id="${item.id}">ลบ</button>
            </div>
        `;
        
        return [
            displayName,
            phoneNumber,
            runDate,
            parseFloat(item.distance).toFixed(2),
            parseFloat(item.duration).toFixed(2),
            thumbnailHtml,
            createdAt,
            actionsHtml
        ];
    });
    
    // แสดงตาราง DataTable
    const table = $('#runsTable').DataTable({
        data: tableData,
        columns: [
            { title: 'ชื่อผู้ใช้' },
            { title: 'เบอร์โทรศัพท์' },
            { title: 'วันที่วิ่ง' },
            { title: 'ระยะทาง (กม.)' },
            { title: 'เวลา (นาที)' },
            { title: 'รูปภาพ' },
            { title: 'วันที่บันทึก' },
            { title: 'จัดการ' }
        ],
        order: [[6, 'desc']], // เรียงตามวันที่บันทึกจากใหม่ไปเก่า
        language: {
            url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/th.json'
        },
        responsive: true
    });
    
    // แสดงตาราง
    document.getElementById('runsTable').style.display = 'table';
    
    // เพิ่ม event listeners สำหรับปุ่มและรูปภาพ
    setupEventListeners();
}
    
// ใช้แบบนี้แทน setupEventListeners ตัวเดิม
function setupEventListeners() {
    // สำคัญ: ใช้ event delegation แทนการผูก event โดยตรง
    // เพราะ elements ถูกสร้างขึ้นแบบ dynamic หลังจากโหลดข้อมูล
    $(document).on('click', '.thumbnail', function() {
        const fullImageUrl = $(this).attr('data-full');
        showImageModal(fullImageUrl);
    });
    
    $(document).on('click', '.btn-edit', function() {
        const id = $(this).attr('data-id');
        showEditModal(id);
    });
    
    $(document).on('click', '.btn-delete', function() {
        const id = $(this).attr('data-id');
        showDeleteModal(id);
    });
    
    // ปุ่มที่มีอยู่แล้วในเอกสาร สามารถใช้ selector ธรรมดาได้
    $('.close, #cancelEdit, #closeImage, #cancelDelete').on('click', function() {
        closeAllModals();
    });
    
    $('#editForm').on('submit', function(e) {
        e.preventDefault();
        updateRunData();
    });
    
    $('#confirmDelete').on('click', deleteRunData);
}

// เรียก setupEventListeners ทันทีที่โหลดเอกสาร
$(document).ready(function() {
    setupEventListeners();
    loadData();
});

   // แก้ไขฟังก์ชันแสดง Modal รูปภาพ
function showImageModal(imageUrl) {
    // แสดงรูปภาพ
    document.getElementById('largeImage').src = imageUrl;
    
    // แสดง modal
    document.getElementById('imageModal').style.display = 'block';
}
    
    // ฟังก์ชันแสดง Modal แก้ไขข้อมูล
    function showEditModal(id) {
        // ค้นหาข้อมูลจาก ID
        const runData = runsData.find(item => item.id === id);
        
        if (!runData) {
            alert('ไม่พบข้อมูลที่ต้องการแก้ไข');
            return;
        }
        
        // ตั้งค่าข้อมูลในฟอร์ม
        document.getElementById('editId').value = id;
        document.getElementById('editRunDate').value = runData.rundate;
        document.getElementById('editDistance').value = runData.distance;
        document.getElementById('editDuration').value = runData.duration;
        
        // แสดง modal
        document.getElementById('editModal').style.display = 'block';
    }
    
    // ฟังก์ชันแสดง Modal ยืนยันการลบ
    function showDeleteModal(id) {
        document.getElementById('deleteId').value = id;
        document.getElementById('deleteModal').style.display = 'block';
    }
    
    // ฟังก์ชันปิด Modals ทั้งหมด
    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
   // ฟังก์ชันอัปเดตข้อมูล
async function updateRunData() {
    try {
        const id = document.getElementById('editId').value;
        const rundate = document.getElementById('editRunDate').value;
        const distance = document.getElementById('editDistance').value;
        const duration = document.getElementById('editDuration').value;
        
        // ตรวจสอบข้อมูล
        if (!rundate || !distance || !duration) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        console.log('Updating run data:', { id, rundate, distance, duration });
        
        // ส่งข้อมูลไปยัง API
        const response = await fetch(`${API_BASE_URL}/api/runs/admin/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rundate,
                distance,
                duration
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Update result:', result);
        
        // ปิด modal
        closeAllModals();
        
        // โหลดข้อมูลใหม่
        alert('อัปเดตข้อมูลสำเร็จ');
        location.reload();
    } catch (error) {
        console.error('Error updating data:', error);
        alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล: ' + error.message);
    }
}

// ฟังก์ชันลบข้อมูล
async function deleteRunData() {
    try {
        const id = document.getElementById('deleteId').value;
        
        console.log('Deleting run data:', id);
        
        // ส่งคำสั่งลบไปยัง API
        const response = await fetch(`${API_BASE_URL}/api/runs/admin/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Delete result:', result);
        
        // ปิด modal
        closeAllModals();
        
        // โหลดข้อมูลใหม่
        alert('ลบข้อมูลสำเร็จ');
        location.reload();
    } catch (error) {
        console.error('Error deleting data:', error);
        alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + error.message);
    }
}
    // ฟังก์ชันตรวจสอบ session
function checkSession() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    
    if (isLoggedIn === 'true') {
        // ซ่อนฟอร์มล็อกอิน และแสดงหน้า admin
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        
        // โหลดข้อมูล
        loadData();
    } else {
        // แสดงฟอร์มล็อกอิน และซ่อนหน้า admin
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
    }
}

// ฟังก์ชันล็อกอิน
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // ตรวจสอบชื่อผู้ใช้และรหัสผ่าน (แบบง่าย)
    // ในระบบจริง ควรใช้ API ที่มีการเข้ารหัส
    if (username === 'admin' && password === 'nbu2025') {
        // บันทึก session
        sessionStorage.setItem('adminLoggedIn', 'true');
        
        // ซ่อนฟอร์มล็อกอิน และแสดงหน้า admin
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        
        // โหลดข้อมูล
        loadData();
    } else {
        // แสดงข้อความผิดพลาด
        const errorElement = document.getElementById('loginError');
        errorElement.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        errorElement.style.display = 'block';
    }
}

// เพิ่มปุ่มออกจากระบบในหน้า admin
function addLogoutButton() {
    const header = document.querySelector('.header');
    
    if (header) {
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'ออกจากระบบ';
        logoutBtn.className = 'logout-btn';
        logoutBtn.onclick = function() {
            sessionStorage.removeItem('adminLoggedIn');
            location.reload();
        };
        
        header.appendChild(logoutBtn);
    }
}

// แก้ไขฟังก์ชัน loadData
async function loadData() {
    try {
        // เพิ่มปุ่มออกจากระบบ
        addLogoutButton();
        
        // โหลดข้อมูลเหมือนเดิม
    }
    catch (error) {
        // จัดการข้อผิดพลาดเหมือนเดิม
    }
}
    
  
  
});
