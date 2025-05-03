// แก้ไขไฟล์ frontend/js/admin.js
$(document).ready(function() {
    // ตรวจสอบสถานะล็อกอิน
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    
    if (isLoggedIn !== 'true') {
        // ถ้ายังไม่ได้ล็อกอิน ให้ redirect ไปยังหน้าล็อกอิน
        window.location.href = 'login.html';
        return;
    }
    
    // ตั้งค่า API URL
    const API_BASE_URL = 'https://runtracker.devapp.cc';
    
    // สถานะของข้อมูล
    let runsData = [];
    
    // เพิ่มปุ่มออกจากระบบ
    addLogoutButton();
    
    // เพิ่ม event listeners
    setupEventListeners();
    
    // โหลดข้อมูล
    loadData();
    
    // ฟังก์ชันเพิ่มปุ่มออกจากระบบ
    function addLogoutButton() {
        // เพิ่มปุ่มออกจากระบบในส่วนหัว
        const logoutBtn = $('<button>')
            .text('ออกจากระบบ')
            .addClass('logout-btn')
            .css({
                position: 'absolute',
                right: '20px',
                top: '20px',
                padding: '8px 15px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
            })
            .on('click', function() {
                sessionStorage.removeItem('adminLoggedIn');
                window.location.href = 'login.html';
            });
        
        $('.header').append(logoutBtn);
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
    
    // ฟังก์ชันโหลดข้อมูล
    async function loadData() {
        try {
            // โหลดข้อมูลการวิ่งทั้งหมด
            const response = await fetch(`${API_BASE_URL}/api/runs/admin/all`);
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            runsData = await response.json();
            console.log('Loaded data:', runsData);
            
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
            
            console.log('Users map:', usersMap);
            
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
        
        // ล้างตารางเดิมถ้ามี
        if ($.fn.DataTable.isDataTable('#runsTable')) {
            $('#runsTable').DataTable().destroy();
        }
        
        // ล้าง tbody
        $('#runsTable tbody').empty();
        
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
    }
    
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
        
        console.log('Edit data:', runData);
        
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

    // เพิ่มหลังจากฟังก์ชัน loadData ในไฟล์ admin.js

// เพิ่มฟังก์ชันโหลดข้อมูลอันดับ
async function loadRankingData() {
    try {
        document.getElementById('rankingLoading').style.display = 'block';
        document.getElementById('rankingTable').style.display = 'none';
        
        // ใช้ endpoint ที่มีอยู่แล้ว หรือเพิ่ม endpoint ใหม่ถ้าต้องการ
        const response = await fetch(`${API_BASE_URL}/api/runs/ranking`);
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const rankingData = await response.json();
        console.log('Ranking data:', rankingData);
        
        displayRankingTable(rankingData);
    } catch (error) {
        console.error('Error loading ranking data:', error);
        document.getElementById('rankingLoading').textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูลอันดับ: ' + error.message;
    }
}

// เพิ่มฟังก์ชันแสดงตารางอันดับ
function displayRankingTable(data) {
    // ซ่อนข้อความ loading
    document.getElementById('rankingLoading').style.display = 'none';
    
    // สร้างข้อมูลสำหรับตาราง
    const tableData = data.map((item, index) => {
        // สร้าง HTML สำหรับรูปโปรไฟล์
        const profileImageHtml = item.pictureUrl 
            ? `<img src="${item.pictureUrl}" class="profile-thumbnail" alt="${item.displayName}">`
            : '<div class="no-profile">ไม่มีรูป</div>';
        
        // คำนวณระยะทางเฉลี่ยต่อครั้ง
        const avgDistance = item.totalRuns > 0 
            ? (item.totalDistance / item.totalRuns).toFixed(2)
            : '0.00';
        
        return [
            index + 1, // อันดับ
            item.displayName || 'ไม่ระบุชื่อ',
            profileImageHtml,
            parseFloat(item.totalDistance).toFixed(2),
            item.totalRuns,
            avgDistance
        ];
    });
    
    // ล้างตารางเดิมถ้ามี
    if ($.fn.DataTable.isDataTable('#rankingTable')) {
        $('#rankingTable').DataTable().destroy();
    }
    
    // ล้าง tbody
    $('#rankingTable tbody').empty();
    
    // แสดงตาราง DataTable
    const table = $('#rankingTable').DataTable({
        data: tableData,
        columns: [
            { title: 'อันดับ' },
            { title: 'ชื่อผู้ใช้' },
            { title: 'รูปโปรไฟล์', orderable: false },
            { title: 'ระยะทางรวม (กม.)' },
            { title: 'จำนวนครั้ง' },
            { title: 'ระยะทางเฉลี่ย/ครั้ง' }
        ],
        order: [[3, 'desc']], // เรียงตามระยะทางรวมจากมากไปน้อย
        language: {
            url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/th.json'
        },
        responsive: true
    });
    
    // แสดงตาราง
    document.getElementById('rankingTable').style.display = 'table';
}

// เพิ่มการเรียกใช้งานในฟังก์ชัน $(document).ready หรือฟังก์ชันโหลดข้อมูลหลัก
$(document).ready(function() {
    // ตรวจสอบสถานะล็อกอินและโค้ดอื่นๆ ที่มีอยู่แล้ว
    
    // เรียกฟังก์ชันโหลดข้อมูลอันดับด้วย
    loadRankingData();
});
    
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
            loadData();
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
            loadData();
        } catch (error) {
            console.error('Error deleting data:', error);
            alert('เกิดข้อผิดพลาดในการลบข้อมูล: ' + error.message);
        }
    }
});
