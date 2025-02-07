import { supabase } from './supabase.js';
import auth from './auth.js';
import studio from './studio.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check auth state first
        const { data: { session } } = await supabase.auth.getSession();
        
        // Show correct section
        const authSection = document.getElementById('auth-section');
        const mainApp = document.getElementById('main-app');
        
        if (session) {
            authSection.classList.add('hidden');
            mainApp.classList.remove('hidden');
        } else {
            authSection.classList.remove('hidden');
            mainApp.classList.add('hidden');
        }

        // Initialize navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', async () => {
                const tab = item.dataset.tab;
                
                // Hide all sections
                document.querySelectorAll('#profile-section, #studio-section').forEach(section => {
                    section.classList.add('hidden');
                });

                // Show selected section
                const selectedSection = document.getElementById(`${tab}-section`);
                if (selectedSection) {
                    selectedSection.classList.remove('hidden');
                    
                    // Handle specific tab initializations
                    if (tab === 'studio') {
                        await studio.loadVideos();
                    }
                }

                // Update active state
                document.querySelectorAll('.nav-item').forEach(navItem => {
                    navItem.classList.remove('active');
                });
                item.classList.add('active');
            });
        });

    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

// Initialize app state
const state = {
    currentUser: null,
    currentTab: 'profile'
};