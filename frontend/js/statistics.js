// js/statistics.js - Updated version to work with existing files
document.addEventListener('DOMContentLoaded', () => {
    // Check if LIFF is initialized
    if (liff.isInClient() && liff.isLoggedIn()) {
        initializeStatisticsPage();
    } else {
        // Check periodically for LIFF initialization
        const checkLiffInterval = setInterval(() => {
            if (liff.isInClient() && liff.isLoggedIn()) {
                clearInterval(checkLiffInterval);
                initializeStatisticsPage();
            }
        }, 500);
    }
});

let userStats = null;
let rankingData = null;

async function initializeStatisticsPage() {
    try {
        // Show loading indicator if exists
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
        
        // Hide other containers initially
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) statsContainer.classList.add('hidden');
        
        const loginRequired = document.getElementById('loginRequired');
        if (loginRequired) loginRequired.classList.add('hidden');

        // Get user profile from LIFF
        const profile = await liff.getProfile();
        console.log("LINE profile loaded:", profile.userId);
        
        // Initialize the Supabase client if not using api-client.js
        if (typeof supabaseClient === 'undefined') {
            console.log("Direct Supabase client not found, initializing...");
            // Create direct client if api-client.js is not included
            window.supabaseClient = supabase.createClient(
                'https://jmmtbikvvuyzbhosplli.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbXRiaWt2dnV5emJob3NwbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNTM0ODUsImV4cCI6MjA2MTcyOTQ4NX0.RLJApjPgsvowvEiS_rBCB7CTIPZd14NTcuCT3a3Wb5c'
            );
        }
        
        // Get user data from Supabase
        let userData;
        
        // Use userAPI if available, otherwise make direct query
        if (typeof userAPI !== 'undefined') {
            userData = await userAPI.getUserByLineId(profile.userId);
        } else {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('userId', profile.userId)
                .single();
                
            if (!error || error.code === 'PGRST116') {
                userData = data;
            } else {
                console.error('Error fetching user data:', error);
                throw error;
            }
        }
        
        if (!userData) {
            // User not found, show login required message
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            if (loginRequired) loginRequired.classList.remove('hidden');
            return;
        }
        
        // User found, proceed to show statistics
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        if (statsContainer) statsContainer.classList.remove('hidden');
        
        // Load running stats for the user
        await loadUserStats(profile.userId);
        
        // Load ranking data
        await loadRankingData();
        
        // Render the progress chart
        renderProgressChart();
        
        // Set up share button
        const shareButton = document.getElementById('shareStatsButton');
        if (shareButton) {
            shareButton.addEventListener('click', shareStats);
        }
    } catch (error) {
        console.error('Error initializing statistics page:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
}

async function loadUserStats(userId) {
    try {
        // Get statistics from the runner_rankings view
        let stats;
        
        // Use runningAPI if available, otherwise make direct query
        if (typeof runningAPI !== 'undefined') {
            stats = await runningAPI.getUserStats(userId);
        } else {
            const { data, error } = await supabaseClient
                .from('runner_rankings')
                .select('*')
                .eq('userId', userId)
                .single();
                
            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching user stats:', error);
                throw error;
            }
            
            stats = data;
        }
        
        if (!stats) {
            // No stats found, create default empty stats
            userStats = {
                totaldistance: 0,
                totalruns: 0,
                progressData: []
            };
        } else {
            userStats = {
                totaldistance: stats.totaldistance || 0,
                totalruns: stats.totalruns || 0
            };
            
            // Get run data for progress chart
            let runData;
            
            // Use runningAPI if available, otherwise make direct query
            if (typeof runningAPI !== 'undefined') {
                runData = await runningAPI.getUserRunningRecords(userId);
            } else {
                const { data, error } = await supabaseClient
                    .from('runs')
                    .select('runDate, distance')
                    .eq('userId', userId)
                    .order('runDate', { ascending: true });
                
                if (error) {
                    console.error('Error fetching run data:', error);
                } else {
                    runData = data;
                }
            }
            
            userStats.progressData = runData || [];
        }
        
        // Update UI with user stats
        const totalDistanceElement = document.getElementById('totaldistance');
        if (totalDistanceElement) {
            totalDistanceElement.textContent = userStats.totaldistance.toFixed(2);
        }
        
        const totalRunsElement = document.getElementById('totalruns');
        if (totalRunsElement) {
            totalRunsElement.textContent = userStats.totalruns;
        }
        
        // Update rank if ranking data is available
        if (rankingData) {
            const userRank = rankingData.findIndex(item => item.userId === userId) + 1;
            const currentRankElement = document.getElementById('currentRank');
            if (currentRankElement) {
                currentRankElement.textContent = userRank > 0 ? userRank : '-';
            }
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
        throw error;
    }
}

async function loadRankingData() {
    try {
        // Get rankings data
        let data;
        
        // Use runningAPI if available, otherwise make direct query
        if (typeof runningAPI !== 'undefined') {
            data = await runningAPI.getRankings();
        } else {
            const { data: rankingsData, error } = await supabaseClient
                .from('runner_rankings')
                .select('*')
                .order('totaldistance', { ascending: false });
            
            if (error) {
                console.error('Error fetching ranking data:', error);
                throw error;
            }
            
            data = rankingsData;
        }
        
        rankingData = data || [];
        
        // Generate ranking table
        const tableBody = document.getElementById('rankingTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        rankingData.forEach((runner, index) => {
            const row = document.createElement('tr');
            
            // Highlight current user's row
            if (runner.userId === liff.getContext().userId) {
                row.classList.add('highlight');
            }
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${runner.displayname}</td>
                <td>${runner.totaldistance.toFixed(2)}</td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Update user's current rank
        if (userStats) {
            const userRank = rankingData.findIndex(item => item.userId === liff.getContext().userId) + 1;
            const currentRankElement = document.getElementById('currentRank');
            if (currentRankElement) {
                currentRankElement.textContent = userRank > 0 ? userRank : '-';
            }
        }
    } catch (error) {
        console.error('Error loading ranking data:', error);
        throw error;
    }
}

function renderProgressChart() {
    if (!userStats || !userStats.progressData || userStats.progressData.length === 0) {
        return;
    }
    
    const chartElement = document.getElementById('progressChart');
    if (!chartElement) return;
    
    const ctx = chartElement.getContext('2d');
    
    // Sort running data by date
    const sortedData = [...userStats.progressData].sort((a, b) => new Date(a.runDate) - new Date(b.runDate));
    
    // Calculate cumulative distance
    let cumulativeDistance = 0;
    const chartData = sortedData.map(run => {
        cumulativeDistance += parseFloat(run.distance);
        return {
            x: new Date(run.runDate),
            y: cumulativeDistance
        };
    });
    
    // Chart configuration
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
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const date = new Date(tooltipItems[0].parsed.x);
                            return date.toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        }
                    }
                }
            }
        }
    });
}

// Function to share statistics via LINE
function shareStats() {
    if (!userStats) return;
    
    const message = `📊 สถิติการวิ่งของฉัน\n🏁 ระยะทางรวม: ${userStats.totaldistance.toFixed(2)} กม.\n🏃 จำนวนครั้ง: ${userStats.totalruns} ครั้ง\n🏆 อันดับปัจจุบัน: ${document.getElementById('currentRank').textContent}`;
    
    // Share message via LINE
    if (liff.isApiAvailable('shareTargetPicker')) {
        liff.shareTargetPicker([
            {
                type: "text",
                text: message
            }
        ])
        .then(function(res) {
            if (res) {
                // Sharing successful
                alert('แชร์ข้อมูลเรียบร้อยแล้ว');
            } else {
                // Canceled or failed
                console.log('ShareTargetPicker was cancelled by user or failed');
            }
        })
        .catch(function(error) {
            console.error('ShareTargetPicker failed', error);
        });
    } else {
        // ShareTargetPicker not available, use existing function if available
        if (typeof sendLineMessage === 'function') {
            sendLineMessage(message);
            alert('แชร์ข้อความเรียบร้อยแล้ว');
        } else {
            // Fallback to LIFF's sendMessages
            liff.sendMessages([{
                type: 'text',
                text: message
            }])
            .then(() => {
                alert('แชร์ข้อความเรียบร้อยแล้ว');
            })
            .catch((error) => {
                console.error('Error sending message', error);
                alert('ไม่สามารถแชร์ข้อความได้');
            });
        }
    }
}
