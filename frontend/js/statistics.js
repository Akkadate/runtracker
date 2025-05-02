// js/statistics.js - Updated version with debugging
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded");
    
    // Check if Supabase is available
    if (typeof supabase === 'undefined') {
        console.error("ERROR: Supabase library is not loaded");
        alert("Supabase library is not loaded. Please check the script tags in your HTML.");
        return;
    }
    
    // Check if LIFF is initialized
    if (typeof liff === 'undefined') {
        console.error("ERROR: LIFF library is not loaded");
        alert("LIFF library is not loaded. Please check the script tags in your HTML.");
        return;
    }
    
    console.log("LIFF status:", {
        initialized: liff.isReady(),
        inLIFFBrowser: liff.isInClient(),
        loggedIn: liff.isLoggedIn()
    });
    
    if (liff.isInClient() && liff.isLoggedIn()) {
        console.log("User is logged in, initializing page...");
        initializeStatisticsPage();
    } else {
        console.log("User not logged in or not in LIFF browser, checking periodically...");
        // Check periodically for LIFF initialization
        const checkLiffInterval = setInterval(() => {
            console.log("Checking LIFF status...");
            if (liff.isInClient() && liff.isLoggedIn()) {
                console.log("LIFF is now ready, initializing page...");
                clearInterval(checkLiffInterval);
                initializeStatisticsPage();
            }
        }, 1000);
    }
});

let userStats = null;
let rankingData = null;

async function initializeStatisticsPage() {
    try {
        console.log("Starting initializeStatisticsPage...");
        
        // Show loading indicator if exists
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            console.log("Showing loading indicator");
            loadingIndicator.classList.remove('hidden');
        } else {
            console.warn("Loading indicator element not found in the DOM");
        }
        
        // Hide other containers initially
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) {
            statsContainer.classList.add('hidden');
        } else {
            console.warn("Stats container element not found in the DOM");
        }
        
        const loginRequired = document.getElementById('loginRequired');
        if (loginRequired) {
            loginRequired.classList.add('hidden');
        }

        // Get user profile from LIFF
        console.log("Getting user profile from LIFF...");
        let profile;
        try {
            profile = await liff.getProfile();
            console.log("LINE profile loaded:", profile.userId);
        } catch (err) {
            console.error("Error getting LIFF profile:", err);
            alert("Could not get LIFF profile: " + err.message);
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            return;
        }
        
        // Initialize Supabase client
        console.log("Initializing Supabase client...");
        let supabaseClient;
        
        try {
            // Try to use the global supabase variable
            supabaseClient = supabase.createClient(
                'https://jmmtbikvvuyzbhosplli.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbXRiaWt2dnV5emJob3NwbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNTM0ODUsImV4cCI6MjA2MTcyOTQ4NX0.RLJApjPgsvowvEiS_rBCB7CTIPZd14NTcuCT3a3Wb5c'
            );
            console.log("Supabase client initialized successfully");
            
            // Test the Supabase connection with a simple query
            console.log("Testing Supabase connection...");
            const { data, error } = await supabaseClient.from('users').select('count(*)');
            if (error) {
                console.error("Supabase connection test failed:", error);
                throw error;
            }
            console.log("Supabase connection test successful:", data);
        } catch (err) {
            console.error("Error initializing Supabase client:", err);
            alert("Could not initialize Supabase: " + err.message);
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            return;
        }
        
        // Get user data from Supabase
        console.log("Fetching user data from Supabase...");
        let userData;
        
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('userId', profile.userId)
                .single();
                
            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching user data:', error);
                throw error;
            }
            
            userData = data;
            console.log("User data retrieved:", userData);
        } catch (err) {
            console.error("Error fetching user data:", err);
            alert("Could not fetch user data: " + err.message);
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            return;
        }
        
        if (!userData) {
            // User not found, show login required message
            console.log("User not found in database, showing login required message");
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            if (loginRequired) loginRequired.classList.remove('hidden');
            return;
        }
        
        // User found, proceed to show statistics
        console.log("User found, proceeding to show statistics");
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        if (statsContainer) statsContainer.classList.remove('hidden');
        
        // Load running stats for the user
        console.log("Loading user stats...");
        await loadUserStats(profile.userId, supabaseClient);
        
        // Load ranking data
        console.log("Loading ranking data...");
        await loadRankingData(supabaseClient);
        
        // Render the progress chart
        console.log("Rendering progress chart...");
        renderProgressChart();
        
        // Set up share button
        const shareButton = document.getElementById('shareStatsButton');
        if (shareButton) {
            console.log("Setting up share button");
            shareButton.addEventListener('click', shareStats);
        } else {
            console.warn("Share button element not found in the DOM");
        }
        
        console.log("Statistics page initialization complete");
    } catch (error) {
        console.error('Error initializing statistics page:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง: ' + error.message);
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }
}

async function loadUserStats(userId, supabaseClient) {
    try {
        console.log("Starting loadUserStats for userId:", userId);
        
        // Get statistics from the runner_rankings view
        console.log("Fetching user stats from runner_rankings view...");
        const { data, error } = await supabaseClient
            .from('runner_rankings')
            .select('*')
            .eq('userId', userId)
            .single();
            
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user stats:', error);
            throw error;
        }
        
        console.log("Stats data retrieved:", data);
        
        if (!data) {
            // No stats found, create default empty stats
            console.log("No stats found, creating default empty stats");
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
            console.log("Fetching run data for progress chart...");
            const { data: runData, error: runError } = await supabaseClient
                .from('runs')
                .select('runDate, distance')
                .eq('userId', userId)
                .order('runDate', { ascending: true });
            
            if (runError) {
                console.error('Error fetching run data:', runError);
            } else {
                console.log("Run data retrieved:", runData);
                userStats.progressData = runData || [];
            }
        }
        
        // Update UI with user stats
        console.log("Updating UI with user stats...");
        const totalDistanceElement = document.getElementById('totaldistance');
        if (totalDistanceElement) {
            totalDistanceElement.textContent = userStats.totaldistance.toFixed(2);
        } else {
            console.warn("Total distance element not found in the DOM");
        }
        
        const totalRunsElement = document.getElementById('totalruns');
        if (totalRunsElement) {
            totalRunsElement.textContent = userStats.totalruns;
        } else {
            console.warn("Total runs element not found in the DOM");
        }
        
        // Update rank if ranking data is available
        if (rankingData) {
            console.log("Updating user rank...");
            const userRank = rankingData.findIndex(item => item.userId === userId) + 1;
            const currentRankElement = document.getElementById('currentRank');
            if (currentRankElement) {
                currentRankElement.textContent = userRank > 0 ? userRank : '-';
            } else {
                console.warn("Current rank element not found in the DOM");
            }
        }
        
        console.log("User stats loaded successfully");
    } catch (error) {
        console.error('Error loading user stats:', error);
        throw error;
    }
}

async function loadRankingData(supabaseClient) {
    try {
        console.log("Starting loadRankingData...");
        
        // Get rankings data from runner_rankings view
        console.log("Fetching rankings from runner_rankings view...");
        const { data, error } = await supabaseClient
            .from('runner_rankings')
            .select('*')
            .order('totaldistance', { ascending: false });
        
        if (error) {
            console.error('Error fetching ranking data:', error);
            throw error;
        }
        
        rankingData = data || [];
        console.log("Ranking data retrieved:", rankingData);
        
        // Generate ranking table
        console.log("Generating ranking table...");
        const tableBody = document.getElementById('rankingTableBody');
        if (!tableBody) {
            console.warn("Ranking table body element not found in the DOM");
            return;
        }
        
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
            console.log("Updating user rank in UI...");
            const userRank = rankingData.findIndex(item => item.userId === liff.getContext().userId) + 1;
            const currentRankElement = document.getElementById('currentRank');
            if (currentRankElement) {
                currentRankElement.textContent = userRank > 0 ? userRank : '-';
            } else {
                console.warn("Current rank element not found in the DOM");
            }
        }
        
        console.log("Ranking data loaded successfully");
    } catch (error) {
        console.error('Error loading ranking data:', error);
        throw error;
    }
}

function renderProgressChart() {
    try {
        console.log("Starting renderProgressChart...");
        
        if (!userStats || !userStats.progressData || userStats.progressData.length === 0) {
            console.log("No progress data available for chart, skipping");
            return;
        }
        
        const chartElement = document.getElementById('progressChart');
        if (!chartElement) {
            console.warn("Progress chart element not found in the DOM");
            return;
        }
        
        const ctx = chartElement.getContext('2d');
        
        // Sort running data by date
        console.log("Processing chart data...");
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
        
        console.log("Chart data prepared:", chartData);
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error("Chart.js library is not loaded");
            alert("Chart.js library is not loaded. Please check the script tags in your HTML.");
            return;
        }
        
        // Chart configuration
        console.log("Creating chart...");
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
        
        console.log("Chart rendered successfully");
    } catch (error) {
        console.error("Error rendering chart:", error);
    }
}

// Function to share statistics via LINE
function shareStats() {
    try {
        console.log("Starting shareStats...");
        
        if (!userStats) {
            console.warn("No user stats available for sharing");
            return;
        }
        
        const currentRankElement = document.getElementById('currentRank');
        const currentRank = currentRankElement ? currentRankElement.textContent : '-';
        
        const message = `📊 สถิติการวิ่งของฉัน\n🏁 ระยะทางรวม: ${userStats.totaldistance.toFixed(2)} กม.\n🏃 จำนวนครั้ง: ${userStats.totalruns} ครั้ง\n🏆 อันดับปัจจุบัน: ${currentRank}`;
        
        console.log("Sharing message:", message);
        
        // Share message via LINE
        if (liff.isApiAvailable('shareTargetPicker')) {
            console.log("Using shareTargetPicker...");
            liff.shareTargetPicker([
                {
                    type: "text",
                    text: message
                }
            ])
            .then(function(res) {
                if (res) {
                    // Sharing successful
                    console.log("Share successful");
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
            console.log("ShareTargetPicker not available, using fallback...");
            if (typeof sendLineMessage === 'function') {
                sendLineMessage(message);
                console.log("Message sent using sendLineMessage");
                alert('แชร์ข้อความเรียบร้อยแล้ว');
            } else {
                // Fallback to LIFF's sendMessages
                console.log("Using LIFF sendMessages...");
                liff.sendMessages([{
                    type: 'text',
                    text: message
                }])
                .then(() => {
                    console.log("Message sent using LIFF sendMessages");
                    alert('แชร์ข้อความเรียบร้อยแล้ว');
                })
                .catch((error) => {
                    console.error('Error sending message', error);
                    alert('ไม่สามารถแชร์ข้อความได้');
                });
            }
        }
    } catch (error) {
        console.error("Error sharing stats:", error);
        alert("Error sharing stats: " + error.message);
    }
}
