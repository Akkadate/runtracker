// js/api-client.js - A helper for Supabase API calls

const SUPABASE_URL = 'https://jmmtbikvvuyzbhosplli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbXRiaWt2dnV5emJob3NwbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNTM0ODUsImV4cCI6MjA2MTcyOTQ4NX0.RLJApjPgsvowvEiS_rBCB7CTIPZd14NTcuCT3a3Wb5c';

// Create Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// API Functions for User Management
const userAPI = {
    // Get user by LINE ID
    getUserByLineId: async (lineId) => {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('userId', lineId)
                .single();
                
            if (error && error.code !== 'PGRST116') throw error;
            
            return data;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    },
    
    // Create new user
    createUser: async (userData) => {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .insert([userData])
                .select()
                .single();
                
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
};

// API Functions for Running Records
const runningAPI = {
    // Get user statistics from runner_rankings view
    getUserStats: async (userId) => {
        try {
            const { data, error } = await supabaseClient
                .from('runner_rankings')
                .select('*')
                .eq('userId', userId)
                .single();
                
            if (error && error.code !== 'PGRST116') throw error;
            
            return data || { totaldistance: 0, totalruns: 0 };
        } catch (error) {
            console.error('Error fetching user stats:', error);
            throw error;
        }
    },
    
    // Get running records for a user
    getUserRunningRecords: async (userId) => {
        try {
            const { data, error } = await supabaseClient
                .from('runs')
                .select('*')
                .eq('userId', userId)
                .order('runDate', { ascending: false });
                
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error fetching running records:', error);
            throw error;
        }
    },
    
    // Get running rankings
    getRankings: async () => {
        try {
            const { data, error } = await supabaseClient
                .from('runner_rankings')
                .select('*')
                .order('totaldistance', { ascending: false });
                
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error fetching rankings:', error);
            throw error;
        }
    }
};
