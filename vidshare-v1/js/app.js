import { supabase } from './supabase.js';
import auth from './auth.js';
import feed from './feed.js';
import following from './following.js';
import inbox from './inbox.js';
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
                
                // Hide all containers
                document.querySelectorAll('.feed-container').forEach(container => {
                    container.classList.add('hidden');
                });

                // Show selected container
                const selectedContainer = document.getElementById(`${tab}-section`);
                if (selectedContainer) {
                    selectedContainer.classList.remove('hidden');
                    
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
    currentTab: 'for-you'
};

// Navigation handling
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        document.querySelectorAll('.feed-container, #upload-section, #profile-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        const targetId = `${item.dataset.tab}-section`;
        const target = document.getElementById(targetId) || document.getElementById(`${item.dataset.tab}-feed`);
        if (target) {
            target.classList.remove('hidden');
        }

        const tab = item.dataset.tab;
        if (tab === 'following') {
            following.loadData();
        } else if (tab === 'inbox') {
            inbox.loadFriendRequests();
        }
    });
});

function switchTab(tab) {
    // Update navigation
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        }
    });

    // Hide all containers
    document.querySelectorAll('.feed-container, #upload-section, #profile-section').forEach(container => {
        container.classList.add('hidden');
    });

    // Show selected container
    switch (tab) {
        case 'for-you':
            document.getElementById('for-you-feed').classList.remove('hidden');
            break;
        case 'following':
            document.getElementById('following-feed').classList.remove('hidden');
            break;
        case 'upload':
            document.getElementById('upload-section').classList.remove('hidden');
            break;
        case 'profile':
            document.getElementById('profile-section').classList.remove('hidden');
            break;
    }

    state.currentTab = tab;
}

// Video upload handling
const videoUpload = document.getElementById('video-upload');
if (videoUpload) {
    videoUpload.addEventListener('change', handleVideoUpload);
}

function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // Here you would typically:
        // 1. Upload to your server/cloud storage
        // 2. Process the video (compression, formatting)
        // 3. Add to the feed
        console.log('Video selected:', file.name);
    }
}

// Record video functionality
const recordButton = document.getElementById('record-video');
recordButton.addEventListener('click', startRecording);

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Here you would typically:
        // 1. Show video preview
        // 2. Start recording
        // 3. Handle stop recording
        console.log('Recording started');
    } catch (error) {
        console.error('Error accessing camera:', error);
    }
} 