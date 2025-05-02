// js/statistics.js
// ไฟล์นี้ใช้สำหรับจัดการหน้าแสดงสถิติและอันดับ
document.addEventListener('DOMContentLoaded', () => {
    // LIFFが初期化されるのを待つ
    if (liff.isInClient() && liff.isLoggedIn()) {
        initializeStatisticsPage();
    } else {
        // 定期的にチェック
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
        // ユーザープロファイルの取得
        const profile = await liff.getProfile();
        
        // LINE UserIDを使用してユーザー情報を取得
        const userData = await apiRequest('/api/users/' + profile.userId);
        
        if (!userData) {
            // ユーザーデータが存在しない場合は、ログイン要求メッセージを表示
            document.getElementById('loginRequired').classList.remove('hidden');
            document.getElementById('statsContainer').classList.add('hidden');
            return;
        }
        
        // ユーザーがログイン済みの場合、統計を表示
        document.getElementById('loginRequired').classList.add('hidden');
        document.getElementById('statsContainer').classList.remove('hidden');
        
        // ユーザーの走行データを取得
        await loadUserStats(profile.userId);
        
        // ランキングデータを取得
        await loadRankingData();
        
        // グラフを描画
        renderProgressChart();
        
        // 共有ボタンのイベントリスナーを設定
        document.getElementById('shareStatsButton').addEventListener('click', shareStats);
    } catch (error) {
        console.error('Error initializing statistics page:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
}

async function loadUserStats(userId) {
    try {
        userStats = await apiRequest('/api/runs/stats/' + userId);
        
        // 統計データを表示
        document.getElementById('totaldistance').textContent = userStats.totaldistance.toFixed(2);
        document.getElementById('totalruns').textContent = userStats.totalruns;
        
        // ユーザーの現在のランクを特定
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
        rankingData = await apiRequest('/api/runs/ranking');
        
        // ランキングテーブルを生成
        const tableBody = document.getElementById('rankingTableBody');
        tableBody.innerHTML = '';
        
        rankingData.forEach((runner, index) => {
            const row = document.createElement('tr');
            
            // ユーザー自身の行をハイライト
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
        
        // ユーザーの現在のランクを更新
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
    
    // 走行データを日付でソート
    const sortedData = [...userStats.progressData].sort((a, b) => new Date(a.runDate) - new Date(b.runDate));
    
    // 累積距離を計算
    let cumulativeDistance = 0;
    const chartData = sortedData.map(run => {
        cumulativeDistance += parseFloat(run.distance);
        return {
            x: new Date(run.rundate),
            y: cumulativeDistance
        };
    });
    
    // チャートの設定
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

// 統計を共有する関数
function shareStats() {
    if (!userStats) return;
    
    const message = `📊 สถิติการวิ่งของฉัน\n🏁 ระยะทางรวม: ${userStats.totaldistance.toFixed(2)} กม.\n🏃 จำนวนครั้ง: ${userstats.totalruns} ครั้ง\n🏆 อันดับปัจจุบัน: ${document.getElementById('currentRank').textContent}`;
    
    // LINEでメッセージを共有
    if (liff.isApiAvailable('shareTargetPicker')) {
        liff.shareTargetPicker([
            {
                type: "text",
                text: message
            }
        ])
        .then(function(res) {
            if (res) {
                // 共有成功
                alert('แชร์ข้อมูลเรียบร้อยแล้ว');
            } else {
                // キャンセルまたは失敗
                console.log('ShareTargetPicker was cancelled by user or failed');
            }
        })
        .catch(function(error) {
            console.error('ShareTargetPicker failed', error);
        });
    } else {
        // ShareTargetPickerが利用できない場合
        sendLineMessage(message);
        alert('แชร์ข้อความเรียบร้อยแล้ว');
    }
}