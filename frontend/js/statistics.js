// js/statistics.js - Complete solution
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded");
    
    // Check if LIFF and Supabase are defined
    if (typeof liff === 'undefined') {
        showError("LIFF library not loaded properly");
        return;
    }
    
    if (typeof supabase === 'undefined') {
        showError("Supabase library not loaded properly");
        return;
    }
    
    // Check if LIFF is initialized and user is logged in
    if (liff.isLoggedIn()) {
        initializeStatisticsPage();
        
    } else {
        // Redirect to login or show login message
        showError("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        
        // Optional: Auto login
        // liff.login();
    }
});

async function initializeStatisticsPage() {
    try {
        // Initialize Supabase client
        const supabaseUrl = 'https://jmmtbikvvuyzbhosplli.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbXRiaWt2dnV5emJob3NwbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNTM0ODUsImV4cCI6MjA2MTcyOTQ4NX0.RLJApjPgsvowvEiS_rBCB7CTIPZd14NTcuCT3a3Wb5c';
        const client = supabase.createClient(supabaseUrl, supabaseKey);

        // ตรวจสอบโครงสร้างของตาราง-------------------
            console.log("Checking database structure...");
            client.from('runner_rankings').select().limit(1).then(({ data }) => {
                if (data && data.length > 0) {
                    console.log("runner_rankings column structure:", Object.keys(data[0]));
                }
            });
            
            client.from('runs').select().limit(1).then(({ data }) => {
                if (data && data.length > 0) {
                    console.log("runs column structure:", Object.keys(data[0]));
                }
            });
        //---------------------------------------
        // Get LIFF profile
        const profile = await liff.getProfile();
        console.log("User profile:", profile.userId);
        
        // Show stats container and hide loading
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('statsContainer').classList.remove('hidden');
        
        // Load user stats
        await loadUserStats(profile.userId, client);
        
        // Load rankings
        await loadRankingData(profile.userId, client);
        
        // Set up share button
        const shareButton = document.getElementById('shareStatsButton');
        if (shareButton) {
            shareButton.addEventListener('click', shareStats);
        }
    } catch (error) {
        console.error("Error initializing statistics:", error);
        showError("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
    }
}

async function loadUserStats(userId, client) {
    try {
        console.log("Loading user stats for:", userId);
        
        // ดึงข้อมูลสถิติจาก runner_rankings
        const { data, error } = await client
            .from('runner_rankings')
            .select('*')
            .eq('userid', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error("Error fetching user stats:", error);
            throw error;
        }
        
        console.log("User stats data:", data);
        
        // ตั้งค่าเริ่มต้นถ้าไม่มีข้อมูล
        const stats = data || { totaldistance: 0, totalruns: 0 };
        
        // อัปเดต UI
        const totalDistanceElement = document.getElementById('totaldistance');
        if (totalDistanceElement) {
            totalDistanceElement.textContent = parseFloat(stats.totaldistance).toFixed(2);
        }
        
        const totalRunsElement = document.getElementById('totalruns');
        if (totalRunsElement) {
            totalRunsElement.textContent = stats.totalruns || '0';
        }
        
        // ดึงข้อมูลสำหรับกราฟ
        console.log("Loading run data for charts...");
        const { data: runData, error: runError } = await client
            .from('runs')
            .select('rundate,distance')
            .eq('userid', userId)
            .order('rundate', { ascending: true });
        
        if (runError) {
            console.error("Error fetching run data:", runError);
        } else {
            console.log("Run data received:", runData);
            
            // ถ้ามีข้อมูลการวิ่ง ให้แสดงกราฟ
            if (runData && runData.length > 0) {
                renderProgressChart(runData);
                renderDistancePerRunChart(runData); // เรียกใช้กราฟแท่งด้วย
            } else {
                console.log("No run data available for charts");
            }
        }
        
        // บันทึกข้อมูลสำหรับฟังก์ชันแชร์
        window.userStats = stats;
        
        return stats;
    } catch (error) {
        console.error("Error loading user stats:", error);
        showError("ไม่สามารถโหลดสถิติผู้ใช้ได้: " + error.message);
        return { totaldistance: 0, totalruns: 0 };
    }
}



// เพิ่มฟังก์ชันสำหรับสร้างกราฟแท่งแสดงระยะทางแต่ละครั้ง
function renderDistancePerRunChart(runData) {
    try {
        console.log("Starting renderDistancePerRunChart with data:", runData);
        
        if (!runData || runData.length === 0) {
            console.warn("No run data available for distance per run chart");
            return;
        }
        
        const chartElement = document.getElementById('distancePerRunChart');
        if (!chartElement) {
            console.warn("Distance per run chart element not found in the DOM");
            return;
        }
        
        // กำหนดความสูงและความกว้างโดยตรงที่ element
        chartElement.style.maxHeight = '200px';
        chartElement.style.width = '100%';
        chartElement.height = 200;
        
        // ตั้งค่า parent container ให้มีความสูงที่จำกัดเช่นกัน
        const chartContainer = chartElement.closest('.chart-container');
        if (chartContainer) {
            chartContainer.style.maxHeight = '250px';
            chartContainer.style.height = '250px';
        }
        
        // ตรวจสอบข้อมูลให้ถูกต้อง
        const validData = runData.filter(run => run.rundate && run.distance !== undefined);
        console.log("Valid data for distance per run chart:", validData);
        
        if (validData.length === 0) {
            console.warn("No valid data for distance per run chart after filtering");
            return;
        }
        
        // เรียงลำดับข้อมูลตามวันที่
        validData.sort((a, b) => new Date(a.rundate) - new Date(b.rundate));
        
        // แสดงเฉพาะข้อมูล 10 รายการล่าสุด ถ้ามีมากกว่า 10 รายการ
        const limitedData = validData.length > 10 ? validData.slice(-10) : validData;
        
        // สร้างข้อมูลสำหรับกราฟแท่ง
        const labels = limitedData.map(run => {
            const date = new Date(run.rundate);
            return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
        });
        
        const data = limitedData.map(run => parseFloat(run.distance));
        
        console.log("Bar chart data prepared:", { labels, data });
        
        // สร้างกราฟแท่ง
        console.log("Creating bar chart...");
        const chart = new Chart(chartElement.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ระยะทาง (กม.)',
                    data: data,
                    backgroundColor: 'rgba(6, 199, 85, 0.7)',
                    borderColor: '#06c755',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: 0
                },
                scales: {
                    x: {
                        title: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                size: 10
                            }
                        }
                    },
                    y: {
                        title: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 10
                            }
                        },
                        min: 0
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return limitedData[context[0].dataIndex].rundate;
                            },
                            label: function(context) {
                                return `ระยะทาง: ${context.raw.toFixed(2)} กม.`;
                            }
                        }
                    }
                }
            }
        });
        
        console.log("Bar chart created successfully");
    } catch (error) {
        console.error("Error rendering distance per run chart:", error);
    }
}

function renderProgressChart(runData) {
    try {
        console.log("Starting renderProgressChart with data:", runData);
        
        if (!runData || runData.length === 0) {
            console.warn("No run data available for chart");
            return;
        }
        
        const chartElement = document.getElementById('progressChart');
        if (!chartElement) {
            console.warn("Progress chart element not found in the DOM");
            return;
        }
        
        // กำหนดความสูงของกราฟให้พอดี
        chartElement.height = 200;
        
        // ตรวจสอบข้อมูลให้ถูกต้อง
        const validData = runData.filter(run => run.rundate && run.distance !== undefined);
        console.log("Valid data for chart:", validData);
        
        if (validData.length === 0) {
            console.warn("No valid data for chart after filtering");
            return;
        }
        
        // เรียงลำดับข้อมูลตามวันที่
        validData.sort((a, b) => new Date(a.rundate) - new Date(b.rundate));
        
        // แสดงเฉพาะข้อมูล 10 รายการล่าสุด ถ้ามีมากกว่า 10 รายการ
        const limitedData = validData.length > 10 ? validData.slice(-10) : validData;
        
        // สร้างข้อมูลสำหรับกราฟในรูปแบบที่ไม่ใช้ time scale
        const labels = limitedData.map(run => {
            const date = new Date(run.rundate);
            return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
        });
        
        // คำนวณค่าสะสม
        let cumulativeDistance = 0;
        // หาค่าสะสมก่อนหน้าข้อมูลที่แสดง (ถ้ามีการจำกัดข้อมูล)
        if (validData.length > 10) {
            cumulativeDistance = validData.slice(0, validData.length - 10).reduce((sum, run) => sum + parseFloat(run.distance), 0);
        }
        
        const data = limitedData.map(run => {
            cumulativeDistance += parseFloat(run.distance);
            return cumulativeDistance;
        });
        
        console.log("Chart data prepared:", { labels, data });
        
        // สร้างกราฟแบบไม่ใช้ time scale
        console.log("Creating chart without time scale...");
        const chart = new Chart(chartElement.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ระยะทางสะสม (กม.)',
                    data: data,
                    borderColor: '#06c755',
                    backgroundColor: 'rgba(6, 199, 85, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'วันที่'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'ระยะทางสะสม (กม.)'
                        },
                        min: 0
                    }
                },
                plugins: {
                    legend: {
                        display: false // ซ่อนคำอธิบาย (legend) เพื่อประหยัดพื้นที่
                    }
                }
            }
        });
        
        console.log("Chart created successfully");
    } catch (error) {
        console.error("Error rendering chart:", error);
    }
}

// แก้ไขฟังก์ชัน loadRankingData ให้จัดการกับข้อมูลอันดับได้ดีขึ้น
// แก้ไขฟังก์ชัน loadRankingData ให้รองรับการแบ่งหน้า
async function loadRankingData(userId, client) {
    try {
        console.log("Loading ranking data for user:", userId);
        
        // ดึงข้อมูลการจัดอันดับ
        const { data, error } = await client
            .from('runner_rankings')
            .select('userid,displayname,totaldistance,totalruns')
            .order('totaldistance', { ascending: false });
            
        if (error) {
            console.error("Error fetching ranking data:", error);
            throw error;
        }
        
        console.log("Ranking data received:", data);
        
        // บันทึกข้อมูลอันดับไว้ใช้ทั่วไป
        window.rankingData = data || [];
        window.currentPage = 1; // เริ่มต้นที่หน้าแรก
        window.itemsPerPage = 10; // แสดง 10 รายการต่อหน้า
        
        // สร้างตารางอันดับสำหรับหน้าแรก
        renderRankingPage(userId);
        
        // เพิ่มปุ่มสำหรับเปลี่ยนหน้า
        createPaginationControls(userId);
        
        // อัปเดตอันดับของผู้ใช้
        updateUserRank(userId, data);
        
        return data;
    } catch (error) {
        console.error("Error loading ranking data:", error);
        return [];
    }
}

// ฟังก์ชันสำหรับแสดงข้อมูลในหน้าปัจจุบัน
function renderRankingPage(userId) {
    const data = window.rankingData || [];
    const currentPage = window.currentPage || 1;
    const itemsPerPage = window.itemsPerPage || 10;
    
    // คำนวณข้อมูลที่จะแสดงในหน้าปัจจุบัน
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, data.length);
    const pageData = data.slice(startIndex, endIndex);
    
    // สร้างตารางอันดับ
    const tableBody = document.getElementById('rankingTableBody');
    if (!tableBody) {
        console.warn("Ranking table body element not found");
        return;
    }
    
    tableBody.innerHTML = '';
    
    if (pageData && pageData.length > 0) {
        pageData.forEach((runner, pageIndex) => {
            // ตรวจสอบว่าข้อมูลมีครบไหม
            if (runner && runner.totaldistance !== undefined) {
                const row = document.createElement('tr');
                
                // คำนวณอันดับจริงในข้อมูลทั้งหมด
                const actualRank = startIndex + pageIndex + 1;
                
                // ไฮไลท์ผู้ใช้ปัจจุบัน
                if (runner.userid === userId) {
                    row.classList.add('highlight');
                }
                
                row.innerHTML = `
                    <td>${actualRank}</td>
                    <td>${runner.displayname || 'ไม่ระบุชื่อ'}</td>
                    <td>${parseFloat(runner.totaldistance).toFixed(2)}</td>
                `;
                
                tableBody.appendChild(row);
            }
        });
    } else {
        console.warn("No ranking data for current page");
        // แสดงข้อความว่าไม่มีข้อมูล
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="3" style="text-align: center;">ไม่มีข้อมูลการจัดอันดับ</td>';
        tableBody.appendChild(row);
    }
    
    // อัปเดตหมายเลขหน้า
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = `หน้า ${currentPage} จาก ${Math.ceil(data.length / itemsPerPage)}`;
    }
     // เรียกใช้ฟังก์ชันอัปเดตสถานะปุ่ม
    updatePaginationButtons();
}

// สร้างปุ่มควบคุมการเปลี่ยนหน้า
function createPaginationControls(userId) {
    const data = window.rankingData || [];
    const totalPages = Math.ceil(data.length / (window.itemsPerPage || 10));
    
    // ตรวจสอบว่ามีหลายหน้าหรือไม่
    if (totalPages <= 1) {
        return; // ไม่ต้องสร้างปุ่มถ้ามีเพียงหน้าเดียว
    }
    
    // สร้างหรือดึงคอนเทนเนอร์ควบคุมการแบ่งหน้า
    let paginationContainer = document.getElementById('paginationControls');
    
    if (!paginationContainer) {
        // สร้างคอนเทนเนอร์ใหม่ถ้ายังไม่มี
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationControls';
        paginationContainer.className = 'pagination-container';
        
        // แทรกเข้าไปก่อนปุ่มแชร์
        const shareContainer = document.querySelector('.share-container');
        if (shareContainer) {
            shareContainer.parentNode.insertBefore(paginationContainer, shareContainer);
        } else {
            // หากไม่พบ share-container ให้เพิ่มต่อจากตารางแทน
            const rankingContainer = document.querySelector('.ranking-container');
            if (rankingContainer) {
                rankingContainer.appendChild(paginationContainer);
            }
        }
    }
    
    // สร้างปุ่มควบคุม
    paginationContainer.innerHTML = `
        <div class="pagination-controls">
            <button id="prevPage" class="btn-pagination">&laquo; ก่อนหน้า</button>
            <span id="pageInfo">หน้า 1 จาก ${totalPages}</span>
            <button id="nextPage" class="btn-pagination">ถัดไป &raquo;</button>
        </div>
    `;
    
   // แก้ไขสไตล์ในฟังก์ชัน createPaginationControls
const style = document.createElement('style');
style.textContent = `
    .pagination-container {
        margin: 15px 0;
        text-align: center;
    }
    .pagination-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        font-family: 'Prompt', sans-serif; /* ใช้ฟอนต์ Prompt เหมือนกับส่วนอื่นๆ */
    }
    .btn-pagination {
        background-color: #06c755; /* สีเขียวของ LINE เหมือนปุ่มอื่นๆ */
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 5px;
        cursor: pointer;
        font-family: 'Prompt', sans-serif; /* ฟอนต์ Prompt */
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.3s;
    }
    .btn-pagination:hover {
        background-color: #05b049; /* สีเขียวเข้มเมื่อวางเมาส์ */
    }
    .btn-pagination:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    #pageInfo {
        padding: 5px 10px;
        font-family: 'Prompt', sans-serif; /* ฟอนต์ Prompt */
        font-size: 14px;
    }
`;
document.head.appendChild(style);
    
    // เพิ่ม Event Listener สำหรับปุ่มเปลี่ยนหน้า
    document.getElementById('prevPage').addEventListener('click', () => {
        if (window.currentPage > 1) {
            window.currentPage--;
            renderRankingPage(userId);
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        if (window.currentPage < totalPages) {
            window.currentPage++;
            renderRankingPage(userId);
        }
    });
}


// เพิ่มฟังก์ชันนี้หลังจากฟังก์ชัน createPaginationControls
function updatePaginationButtons() {
    const data = window.rankingData || [];
    const totalPages = Math.ceil(data.length / (window.itemsPerPage || 10));
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    
    if (prevButton) {
        if (window.currentPage <= 1) {
            prevButton.disabled = true;
        } else {
            prevButton.disabled = false;
        }
    }
    
    if (nextButton) {
        if (window.currentPage >= totalPages) {
            nextButton.disabled = true;
        } else {
            nextButton.disabled = false;
        }
    }
}


// แยกฟังก์ชันอัปเดตอันดับของผู้ใช้ออกมา
function updateUserRank(userId, data) {
    // คำนวณอันดับของผู้ใช้
    console.log("Calculating user rank for user:", userId);
    const userRankIndex = data.findIndex(item => item.userid === userId);
    console.log("User rank index:", userRankIndex);
    
    const currentRankElement = document.getElementById('currentRank');
    if (currentRankElement) {
        if (userRankIndex >= 0) {
            // อันดับเริ่มจาก 1, ไม่ใช่ 0
            const userRank = userRankIndex + 1;
            console.log("Setting user rank to:", userRank);
            currentRankElement.textContent = userRank;
        } else {
            console.log("User not found in ranking data");
            currentRankElement.textContent = '-';
        }
    } else {
        console.warn("Current rank element not found in the DOM");
    }
}

function shareStats() {
    try {
        const stats = window.userStats || { totaldistance: 0, totalruns: 0 };
        const currentRank = document.getElementById('currentRank').textContent;
        
        const message = `📊 สถิติการวิ่งของฉัน\n🏁 ระยะทางรวม: ${stats.totaldistance.toFixed(2)} กม.\n🏃 จำนวนครั้ง: ${stats.totalruns} ครั้ง\n🏆 อันดับปัจจุบัน: ${currentRank}`;
        
        if (liff.isApiAvailable('shareTargetPicker')) {
            liff.shareTargetPicker([
                {
                    type: "text",
                    text: message
                }
            ])
            .then(function(res) {
                if (res) {
                    alert('แชร์ข้อมูลเรียบร้อยแล้ว');
                }
            })
            .catch(function(error) {
                console.error('ShareTargetPicker failed', error);
            });
        } else {
            // Fallback to sendMessages or other sharing method
            if (typeof sendLineMessage === 'function') {
                sendLineMessage(message);
                alert('แชร์ข้อความเรียบร้อยแล้ว');
            }
        }
    } catch (error) {
        console.error("Error sharing stats:", error);
    }
}

function showError(message) {
    // Hide loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }
    
    // Show error message
    const errorText = document.getElementById('errorText');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorText) {
        errorText.textContent = message;
    }
    
    if (errorMessage) {
        errorMessage.classList.remove('hidden');
    }
    
    console.error("ERROR:", message);
}
