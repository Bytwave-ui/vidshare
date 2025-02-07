import { supabase } from './supabase.js';
import auth from './auth.js';
import studio from './studio.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('App initializing...');
        
        // Check auth state first
        const { data: { session } } = await supabase.auth.getSession();
        
        // Show correct section
        const authSection = document.getElementById('auth-section');
        const mainApp = document.getElementById('main-app');
        
        if (session) {
            console.log('User is logged in, showing main app');
            authSection.classList.add('hidden');
            mainApp.classList.remove('hidden');
            
            // Show profile section by default
            const profileSection = document.getElementById('profile-section');
            const studioSection = document.getElementById('studio-section');
            if (profileSection && studioSection) {
                profileSection.classList.remove('hidden');
                studioSection.classList.add('hidden');
            }
        } else {
            console.log('User is not logged in, showing auth section');
            authSection.classList.remove('hidden');
            mainApp.classList.add('hidden');
        }

        // Initialize navigation
        const navItems = document.querySelectorAll('.nav-item');
        console.log('Found nav items:', navItems.length);
        
        navItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const tab = item.dataset.tab;
                console.log('Navigation clicked:', tab);
                
                try {
                    // Hide all sections
                    const sections = document.querySelectorAll('#profile-section, #studio-section');
                    console.log('Found sections:', sections.length);
                    sections.forEach(section => {
                        section.classList.add('hidden');
                    });

                    // Show selected section
                    const selectedSection = document.getElementById(`${tab}-section`);
                    if (selectedSection) {
                        console.log('Showing section:', tab);
                        selectedSection.classList.remove('hidden');
                        
                        // Initialize studio if needed
                        if (tab === 'studio') {
                            console.log('Initializing studio...');
                            if (typeof studio.init === 'function') {
                                await studio.init();
                            }
                            if (typeof studio.loadVideos === 'function') {
                                await studio.loadVideos();
                            }
                        }
                    } else {
                        console.error('Selected section not found:', tab);
                    }

                    // Update active state
                    navItems.forEach(navItem => {
                        navItem.classList.remove('active');
                    });
                    item.classList.add('active');
                    
                } catch (error) {
                    console.error('Error during navigation:', error);
                }
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

// Export for use in other modules
export { state };
