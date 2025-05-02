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
        
        // ดึงข้อมูลสำหรับกราฟความก้าวหน้า
        console.log("Loading run data for progress chart...");
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
            } else {
                console.log("No run data available for chart");
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

async function loadRankingData(userId, client) {
    try {
        // Get ranking data
        const { data, error } = await client
            .from('runner_rankings')
            .select('*')
            .order('totaldistance', { ascending: false });
            
        if (error) {
            throw error;
        }
        
        // Save ranking data globally
        window.rankingData = data || [];
        
        // Generate table
        const tableBody = document.getElementById('rankingTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        data.forEach((runner, index) => {
            const row = document.createElement('tr');
            
            // Highlight current user
            if (runner.userId === userId) {
                row.classList.add('highlight');
            }
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${runner.displayname || 'ไม่ระบุชื่อ'}</td>
                <td>${runner.totaldistance.toFixed(2)}</td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Update user rank
        const userRank = data.findIndex(item => item.userId === userId) + 1;
        document.getElementById('currentRank').textContent = userRank > 0 ? userRank : '-';
        
        return data;
    } catch (error) {
        console.error("Error loading ranking data:", error);
        showError("ไม่สามารถโหลดข้อมูลอันดับได้");
        throw error;
    }
}

// แก้ไขฟังก์ชัน renderProgressChart ให้มีการจัดการข้อผิดพลาดที่ดีขึ้น
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
        
        // ตรวจสอบข้อมูลให้ถูกต้อง
        const validData = runData.filter(run => run.rundate && run.distance !== undefined);
        console.log("Valid data for chart:", validData);
        
        if (validData.length === 0) {
            console.warn("No valid data for chart after filtering");
            return;
        }
        
        // คำนวณค่าสะสม
        let cumulativeDistance = 0;
        const chartData = [];
        
        for (const run of validData) {
            try {
                // แปลงข้อมูลให้ถูกรูปแบบ
                const date = new Date(run.rundate);
                const distance = parseFloat(run.distance);
                
                if (!isNaN(distance) && date instanceof Date && !isNaN(date)) {
                    cumulativeDistance += distance;
                    chartData.push({
                        x: date,
                        y: cumulativeDistance
                    });
                }
            } catch (err) {
                console.warn("Error processing run data item:", run, err);
            }
        }
        
        console.log("Processed chart data:", chartData);
        
        if (chartData.length === 0) {
            console.warn("No valid data points after processing");
            return;
        }
        
        // ตรวจสอบว่า Chart.js โหลดเรียบร้อยแล้ว
        if (typeof Chart === 'undefined') {
            console.error("Chart.js library is not loaded");
            return;
        }
        
        // สร้างกราฟ
        console.log("Creating chart...");
        const chart = new Chart(chartElement.getContext('2d'), {
            type: 'line',
            data: {
                datasets: [{
                    label: 'ระยะทางสะสม (กม.)',
                    data: chartData,
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
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'DD MMM'
                            }
                        },
                        title: {
                            display: true,
                            text: 'วันที่'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'ระยะทางสะสม (กม.)'
                        },
                        min: 0
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
        
        // สร้างตารางอันดับ
        const tableBody = document.getElementById('rankingTableBody');
        if (!tableBody) {
            console.warn("Ranking table body element not found");
            return;
        }
        
        tableBody.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach((runner, index) => {
                // ตรวจสอบว่าข้อมูลมีครบไหม
                if (runner && runner.totaldistance !== undefined) {
                    const row = document.createElement('tr');
                    
                    // ไฮไลท์ผู้ใช้ปัจจุบัน
                    if (runner.userId === userId) {
                        row.classList.add('highlight');
                    }
                    
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${runner.displayname || 'ไม่ระบุชื่อ'}</td>
                        <td>${parseFloat(runner.totaldistance).toFixed(2)}</td>
                    `;
                    
                    tableBody.appendChild(row);
                }
            });
            
            // อัปเดตอันดับของผู้ใช้
            console.log("Calculating user rank for user:", userId);
            const userRankIndex = data.findIndex(item => item.userId === userId);
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
        } else {
            console.warn("No ranking data received");
            // แสดงข้อความว่าไม่มีข้อมูล
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" style="text-align: center;">ไม่มีข้อมูลการจัดอันดับ</td>';
            tableBody.appendChild(row);
        }
        
        return data;
    } catch (error) {
        console.error("Error loading ranking data:", error);
        return [];
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
