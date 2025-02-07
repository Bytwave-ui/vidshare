import { supabase } from './supabase.js';

class Profile {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            this.currentUser = session?.user;

            // Initialize UI
            this.createProfileUI();
            
            // Initialize listeners
            this.initializeListeners();

            // Load initial data if profile tab is visible
            if (document.getElementById('profile-section')?.classList.contains('hidden') === false) {
                await this.loadProfile();
            }
        } catch (error) {
            console.error('Profile initialization error:', error);
        }
    }

    createProfileUI() {
        const container = document.getElementById('profile-section');
        if (!container) return;

        container.innerHTML = `
            <div class="profile-settings">
                <div class="profile-header">
                    <div class="profile-pic-container">
                        <img src="placeholder.png" alt="Profile Picture" class="profile-pic">
                        <button class="change-pic-btn">
                            <i class="fas fa-camera"></i>
                        </button>
                        <input type="file" id="avatar-upload" accept="image/*" hidden>
                    </div>
                    <div class="profile-info">
                        <div class="username-container">
                            <input type="text" class="username-input" placeholder="Username">
                            <button class="save-username-btn">Save</button>
                        </div>
                    </div>
                </div>

                <div class="profile-videos-section">
                    <h3>My Videos</h3>
                    <div class="videos-grid">
                        <!-- Videos will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    initializeListeners() {
        // Profile picture upload
        const avatarUpload = document.getElementById('avatar-upload');
        const changePicBtn = document.querySelector('.change-pic-btn');
        
        if (changePicBtn && avatarUpload) {
            changePicBtn.addEventListener('click', () => avatarUpload.click());
            avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e.target.files[0]));
        }

        // Username save
        const saveUsernameBtn = document.querySelector('.save-username-btn');
        if (saveUsernameBtn) {
            saveUsernameBtn.addEventListener('click', () => this.saveUsername());
        }

        // Navigation listener
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', async () => {
                if (item.dataset.tab === 'profile') {
                    await this.loadProfile();
                }
            });
        });
    }

    async loadProfile() {
        try {
            this.showLoading();

            // Get profile data
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser?.id)
                .single();

            if (error) throw error;

            // Update UI with profile data
            const profilePic = document.querySelector('.profile-pic');
            const usernameInput = document.querySelector('.username-input');

            if (profilePic) profilePic.src = profile.avatar_url || 'placeholder.png';
            if (usernameInput) usernameInput.value = profile.username || '';

            // Load user's videos
            await this.loadUserVideos();

        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Failed to load profile');
        } finally {
            this.hideLoading();
        }
    }

    async loadUserVideos() {
        try {
            const { data: videos, error } = await supabase
                .from('videos')
                .select('*')
                .eq('user_id', this.currentUser?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const container = document.querySelector('.videos-grid');
            if (!container) return;

            container.innerHTML = videos?.length ? videos.map(video => `
                <div class="video-thumbnail" data-video-id="${video.id}">
                    <video src="${video.video_url}" preload="metadata"></video>
                    <span class="video-description">${video.description || ''}</span>
                    <div class="video-actions">
                        <button class="delete-video-btn" data-video-id="${video.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('') : '<p class="no-videos">No videos uploaded yet</p>';

            // Add delete listeners
            container.querySelectorAll('.delete-video-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (await this.confirmDelete()) {
                        await this.deleteVideo(btn.dataset.videoId);
                    }
                });
            });

        } catch (error) {
            console.error('Error loading videos:', error);
            this.showError('Failed to load videos');
        }
    }

    async handleAvatarUpload(file) {
        try {
            if (!file) return;
            this.showLoading('Uploading avatar...');

            // Upload to storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}/avatar.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: data.publicUrl })
                .eq('id', this.currentUser.id);

            if (updateError) throw updateError;

            // Update UI
            const profilePic = document.querySelector('.profile-pic');
            if (profilePic) profilePic.src = data.publicUrl;

            this.showSuccess('Profile picture updated!');

        } catch (error) {
            console.error('Avatar upload error:', error);
            this.showError('Failed to update profile picture');
        } finally {
            this.hideLoading();
        }
    }

    async saveUsername() {
        try {
            const usernameInput = document.querySelector('.username-input');
            const newUsername = usernameInput.value.trim();

            if (!newUsername) {
                this.showError('Username cannot be empty');
                return;
            }

            this.showLoading('Saving username...');

            const { error } = await supabase
                .from('profiles')
                .update({ username: newUsername })
                .eq('id', this.currentUser.id);

            if (error) throw error;

            this.showSuccess('Username updated!');

        } catch (error) {
            console.error('Username update error:', error);
            this.showError('Failed to update username');
        } finally {
            this.hideLoading();
        }
    }

    // ... rest of your utility methods (showLoading, hideLoading, etc.) ...
}

const profile = new Profile();
export default profile; 