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
        // Get user stats from runner_rankings
        const { data, error } = await client
            .from('runner_rankings')
            .select('*')
            .eq('userId', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        // Set default values if no data
        const stats = data || { totaldistance: 0, totalruns: 0 };
        
        // Update UI
        document.getElementById('totaldistance').textContent = stats.totaldistance.toFixed(2);
        document.getElementById('totalruns').textContent = stats.totalruns;
        
        // Load progress data for chart
        const { data: runData } = await client
            .from('runs')
            .select('runDate, distance')
            .eq('userId', userId)
            .order('runDate', { ascending: true });
            
        if (runData && runData.length > 0) {
            renderProgressChart(runData);
        }
        
        // Save for share function
        window.userStats = stats;
        
        return stats;
    } catch (error) {
        console.error("Error loading user stats:", error);
        showError("ไม่สามารถโหลดสถิติผู้ใช้ได้");
        throw error;
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

function renderProgressChart(runData) {
    try {
        if (!runData || runData.length === 0) return;
        
        const chartElement = document.getElementById('progressChart');
        if (!chartElement) return;
        
        const ctx = chartElement.getContext('2d');
        
        // Calculate cumulative distance
        let cumulativeDistance = 0;
        const chartData = runData.map(run => {
            cumulativeDistance += parseFloat(run.distance);
            return {
                x: new Date(run.runDate),
                y: cumulativeDistance
            };
        });
        
        // Create chart
        new Chart(ctx, {
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
    } catch (error) {
        console.error("Error rendering chart:", error);
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
