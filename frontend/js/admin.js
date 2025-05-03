// js/admin.js - JavaScript สำหรับหน้า Admin
document.addEventListener('DOMContentLoaded', function() {
    // ตั้งค่า API URL
    const API_BASE_URL = 'https://runtracker.devapp.cc';
    
    // สถานะของข้อมูล
    let runsData = [];
    
    // ฟังก์ชันโหลดข้อมูลทั้งหมด
    async function loadData() {
        try {
            // โหลดข้อมูลการวิ่งทั้งหมด
            const response = await fetch(`${API_BASE_URL}/api/runs/admin/all`);
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            runsData = await response.json();
            
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
    
    // ฟังก์ชันแสดงตารางข้อมูล
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
            const displayName = user.displayName || 'ไม่ระบุชื่อ';
            
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
                item.id,
                runDate,
                displayName,
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
                { title: 'ID' },
                { title: 'วันที่' },
                { title: 'ชื่อผู้ใช้' },
                { title: 'ระยะทาง (กม.)' },
                { title: 'เวลา (นาที)' },
                { title: 'รูปภาพ' },
                { title: 'วันที่บันทึก' },
                { title: 'จัดการ' }
            ],
            order: [[1, 'desc']], // เรียงตามวันที่จากใหม่ไปเก่า
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
    
    // ฟังก์ชันเพิ่ม event listeners
    function setupEventListeners() {
        // รูปภาพ
        document.querySelectorAll('.thumbnail').forEach(img => {
            img.addEventListener('click', function() {
                const fullImageUrl = this.getAttribute('data-full');
                showImageModal(fullImageUrl);
            });
        });
        
        // ปุ่มแก้ไข
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                showEditModal(id);
            });
        });
        
        // ปุ่มลบ
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                showDeleteModal(id);
            });
        });
        
        // ปุ่มปิด modals
        document.querySelectorAll('.close, #cancelEdit, #closeImage, #cancelDelete').forEach(element => {
            element.addEventListener('click', function() {
                closeAllModals();
            });
        });
        
        // ฟอร์มแก้ไข
        document.getElementById('editForm').addEventListener('submit', function(e) {
            e.preventDefault();
            updateRunData();
        });
        
        // ปุ่มยืนยันการลบ
        document.getElementById('confirmDelete').addEventListener('click', deleteRunData);
    }
    
    // ฟังก์ชันแสดง Modal รูปภาพ
    function showImageModal(imageUrl) {
        // แสดงรูปภาพ
        document.getElementById('largeImage').src = imageUrl;
        
        // แสดงข้อมูลเพิ่มเติม (ถ้ามี)
        // document.getElementById('imageInfo').textContent = 'ข้อมูลเพิ่มเติม...';
        
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
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const result = await response.json();
            
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
            
            // ส่งคำสั่งลบไปยัง API
            const response = await fetch(`${API_BASE_URL}/api/runs/admin/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
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
    
    // โหลดข้อมูลเมื่อหน้าเว็บโหลดเสร็จ
    loadData();
});
