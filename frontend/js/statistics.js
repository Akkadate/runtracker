// js/statistics.js - Simplified testing version
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded");
    
    // Step 1: Test LIFF
    console.log("Testing LIFF...");
    if (typeof liff === 'undefined') {
        console.error("LIFF is not defined");
        showError("LIFF library not loaded properly");
        return;
    }
    
    // Step 2: Test Supabase
    console.log("Testing Supabase...");
    if (typeof supabase === 'undefined') {
        console.error("Supabase is not defined");
        showError("Supabase library not loaded properly");
        return;
    }
    
    // Step 3: Try to create Supabase client
    console.log("Creating Supabase client...");
    try {
        const supabaseUrl = 'https://jmmtbikvvuyzbhosplli.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbXRiaWt2dnV5emJob3NwbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNTM0ODUsImV4cCI6MjA2MTcyOTQ4NX0.RLJApjPgsvowvEiS_rBCB7CTIPZd14NTcuCT3a3Wb5c';
        const client = supabase.createClient(supabaseUrl, supabaseKey);
        console.log("Supabase client created successfully:", client);
        
        // Step 4: Try a simple Supabase query
        console.log("Testing Supabase query...");
        client.from('users').select('count(*)')
            .then(response => {
                console.log("Supabase query response:", response);
                
                // If we got here, Supabase is working fine
                // We can now try LIFF authentication
                testLIFFAuth();
            })
            .catch(error => {
                console.error("Supabase query error:", error);
                showError("Cannot connect to database: " + error.message);
            });
    } catch (error) {
        console.error("Error creating Supabase client:", error);
        showError("Error initializing database connection: " + error.message);
    }
});

function testLIFFAuth() {
    console.log("Testing LIFF authentication...");
    try {
        if (!liff.isLoggedIn()) {
            console.warn("User is not logged in");
            showError("ยังไม่ได้เข้าสู่ระบบ LINE กรุณาเข้าสู่ระบบ");
            return;
        }
        
        console.log("Getting LIFF profile...");
        liff.getProfile()
            .then(profile => {
                console.log("LIFF profile retrieved:", profile);
                showSuccess("สามารถโหลดข้อมูลได้แล้ว กำลังแสดงสถิติ...");
                
                // If we got here, everything is working correctly
                hideElement('loadingIndicator');
                showElement('statsContainer');
                
                // You can continue with your statistics loading here
                // or keep this test file simple
            })
            .catch(error => {
                console.error("Error getting LIFF profile:", error);
                showError("ไม่สามารถรับข้อมูลโปรไฟล์ LINE: " + error.message);
            });
    } catch (error) {
        console.error("LIFF authentication error:", error);
        showError("LINE authentication error: " + error.message);
    }
}

// Helper functions for UI management
function showError(message) {
    hideElement('loadingIndicator');
    
    const errorTextElement = document.getElementById('errorText');
    const errorMessageElement = document.getElementById('errorMessage');
    
    if (errorTextElement) {
        errorTextElement.innerText = message;
    }
    
    if (errorMessageElement) {
        errorMessageElement.classList.remove('hidden');
    }
}

function showSuccess(message) {
    console.log("SUCCESS:", message);
}

function hideElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.add('hidden');
    }
}

function showElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.remove('hidden');
    }
}
