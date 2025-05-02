// js/statistics.js
document.addEventListener('DOMContentLoaded', () => {
    // Initialize with LIFF
    if (liff.isInClient() && liff.isLoggedIn()) {
        initializeStatisticsPage();
    } else {
        // Check periodically
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
        // Get user profile
        const profile = await liff.getProfile();
        console.log("LINE profile loaded:", profile.userId);
        
        // Create Supabase client
        const supabase = createClient(
            'https://jmmtbikvvuyzbhosplli.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbXRiaWt2dnV5emJob3NwbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNTM0ODUsImV4cCI6MjA2MTcyOTQ4NX0.RLJApjPgsvowvEiS_rBCB7CTIPZd14NTcuCT3a3Wb5c'
        );
        
        // Get user data from Supabase
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('userId', profile.userId)
            .single();
        
        if (userError && userError.code !== 'PGRST116') {
            console.error('Error fetching user data:', userError);
            throw userError;
        }
        
        if (!userData) {
            // User not found, show login required message
            document.getElementById('loginRequired').classList.remove('hidden');
            document.getElementById('statsContainer').classList.add('hidden');
            return;
        }
        
        // User found, proceed to show statistics
        document.getElementById('loginRequired').classList.add('hidden');
        document.getElementById('statsContainer').classList.remove('hidden');
        
        // Load running stats for the user
        await loadUserStats(profile.userId);
        
        // Load ranking data
        await loadRankingData();
        
        // Render the progress chart
        renderProgressChart();
        
        // Set up share button
        document.getElementById('shareStatsButton').addEventListener('click', shareStats);
    } catch (error) {
        console.error('Error initializing statistics page:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
}

async function loadUserStats(userId) {
    try {
        // Get statistics from the runner_rankings view
        const supabase = createClient(
            'https://jmmtbikvvuyzbhosplli.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbXRiaWt2dnV5emJob3NwbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNTM0ODUsImV4cCI6MjA2MTcyOTQ4NX0.RLJApjPgsvowvEiS_rBCB7CTIPZd14NTcuCT3a3Wb5c'
        );
        
        const { data, error } = await supabase
            .from('runner_rankings')
            .select('*')
            .eq('userId', userId)
            .single();
        
        if (error) {
            console.error('Error fetching user stats:', error);
            throw error;
        }
        
        if (!data) {
            // No stats found, create default empty stats
            userStats = {
                totaldistance: 0,
                totalruns: 0,
                progressData: []
            };
        } else {
            userStats = {
                totaldistance: data.totaldistance || 0,
                totalruns: data.totalruns || 0
            };
            
            // Get run data for progress chart
            const { data: runData, error: runError } = await supabase
                .from('runs')
                .select('runDate, distance')
                .eq('userId', userId)
                .order('runDate', { ascending: true });
            
            if (runError) {
                console.error('Error fetching run data:', runError);
            } else {
                userStats.progressData = runData || [];
            }
        }
        
        // Update UI with user stats
        document.getElementById('totaldistance').textContent = userStats.totaldistance.toFixed(2);
        document.getElementById('totalruns').textContent = userStats.totalruns;
        
        // Update rank if ranking data is available
        if (rankingData) {
            const userRank = rankingData.findIndex(item => item.userId === userId) + 1;
            document.getElementById('currentRank').textContent = userRank > 0 ? userRank : '-';
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
        throw error;
    }
}

async function loadRankingData() {
    try {
        const supabase = createClient(
            'https://jmmtbikvvuyzbhosplli.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbXRiaWt2dnV5emJob3NwbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNTM0ODUsImV4cCI6MjA2MTcyOTQ4NX0.RLJApjPgsvowvEiS_rBCB7CTIPZd14NTcuCT3a3Wb5c'
        );
        
        // Get all rankings from runner_rankings view, sorted by distance
        const { data, error } = await supabase
            .from('runner_rankings')
            .select('*')
            .order('totaldistance', { ascending: false });
        
        if (error) {
            console.error('Error fetching ranking data:', error);
            throw error;
        }
        
        rankingData = data || [];
        
        // Generate ranking table
        const tableBody = document.getElementById('rankingTableBody');
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
            document.getElementById('currentRank').textContent = userRank > 0 ? userRank : '-';
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
    
    const ctx = document.getElementById('progressChart').getContext('2d');
    
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
        // ShareTargetPicker not available
        liff.sendMessages([{
            type: 'text',
            text: message
        }]);
        alert('แชร์ข้อความเรียบร้อยแล้ว');
    }
}

// Helper function to create Supabase client (avoiding repeated code)
function createClient(url, key) {
    return supabase.createClient(url, key);
}
