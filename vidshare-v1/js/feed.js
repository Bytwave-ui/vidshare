import { supabase } from './supabase.js'
import { placeholderImage } from './placeholder.js'
import comments from './comments.js'

class Feed {
    constructor() {
        this.currentUser = null;
        this.videos = [];
        this.isLoading = false;
        this.currentTab = 'home';
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            console.log('Initializing feed...'); // Debug log

            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            this.currentUser = session?.user;

            // Make sure we have a content area
            let contentArea = document.querySelector('.content-area');
            if (!contentArea) {
                console.log('Creating content area');
                contentArea = document.createElement('div');
                contentArea.className = 'content-area';
                document.querySelector('.app-container')?.appendChild(contentArea);
            }

            // Create video container if it doesn't exist
            this.ensureVideoContainer();
            
            // Make sure home feed is visible initially
            const homeFeed = document.getElementById('home-feed');
            if (homeFeed) {
                homeFeed.classList.remove('hidden');
                document.querySelectorAll('.feed-container').forEach(container => {
                    if (container !== homeFeed) container.classList.add('hidden');
                });
            }

            // Initial load
            await this.loadVideos();
            
            // Initialize listeners
            this.initializeListeners();

        } catch (error) {
            console.error('Feed initialization error:', error);
        }
    }

    ensureVideoContainer() {
        // First, check if home feed exists
        let homeFeed = document.getElementById('home-feed');
        if (!homeFeed) {
            console.log('Creating home feed container');
            homeFeed = document.createElement('div');
            homeFeed.id = 'home-feed';
            homeFeed.className = 'feed-container';
            document.querySelector('.content-area')?.appendChild(homeFeed);
        }

        // Then check for video container
        let videoContainer = homeFeed.querySelector('.video-container');
        if (!videoContainer) {
            console.log('Creating video container');
            videoContainer = document.createElement('div');
            videoContainer.className = 'video-container';
            homeFeed.appendChild(videoContainer);
        }

        // Make sure the containers are visible
        homeFeed.style.display = 'block';
        videoContainer.style.display = 'block';
    }

    initializeListeners() {
        // Video upload
        const uploadInput = document.getElementById('video-upload');
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.uploadVideo(file);
            });
        }

        // Tab navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', async () => {
                const tab = item.dataset.tab;
                if (tab === 'home') {
                    console.log('Home tab clicked');
                    document.querySelectorAll('.feed-container').forEach(container => {
                        container.classList.add('hidden');
                    });
                    const homeFeed = document.getElementById('home-feed');
                    if (homeFeed) {
                        homeFeed.classList.remove('hidden');
                        await this.loadVideos();
                    }
                }
            });
        });

        // Video playback
        document.addEventListener('click', (e) => {
            const video = e.target.closest('video');
            if (video) {
                if (video.paused) video.play();
                else video.pause();
            }
        });
    }

    async loadVideos() {
        try {
            console.log('Loading videos...'); // Debug log
            this.isLoading = true;
            this.showLoading();

            const { data: videos, error } = await supabase
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false });

            console.log('Videos from database:', videos); // Debug log

            if (error) {
                console.error('Database error:', error);
                throw error;
            }

            const container = document.querySelector('#home-feed .video-container');
            if (!container) {
                console.error('Video container not found');
                return;
            }

            if (!videos || videos.length === 0) {
                console.log('No videos found');
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-video"></i>
                        <p>No videos yet</p>
                    </div>
                `;
                return;
            }

            await this.renderVideos(videos);

        } catch (error) {
            console.error('Error loading videos:', error);
            this.showError('Failed to load videos');
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }

    async renderVideos(videos) {
        try {
            const container = document.querySelector('#home-feed .video-container');
            if (!container) return;

            // Get all likes and follows for the current user
            const [likesResult, followsResult] = await Promise.all([
                supabase
                    .from('likes')
                    .select('video_id')
                    .eq('user_id', this.currentUser?.id),
                supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', this.currentUser?.id)
            ]);

            const likedVideoIds = likesResult.data?.map(l => l.video_id) || [];
            const followingIds = followsResult.data?.map(f => f.following_id) || [];

            container.innerHTML = ''; // Clear existing videos

            for (const video of videos) {
                // Get user profile and like count
                const [profileResult, likesCountResult] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', video.user_id)
                        .single(),
                    supabase
                        .from('likes')
                        .select('id', { count: 'exact' })
                        .eq('video_id', video.id)
                ]);

                const profile = profileResult.data;
                const likesCount = likesCountResult.count || 0;
                const isOwnVideo = this.currentUser?.id === video.user_id;

                const videoElement = document.createElement('div');
                videoElement.className = 'video-wrapper';
                videoElement.innerHTML = `
                    <video src="${video.url}" loop>
                        Your browser does not support the video tag.
                    </video>
                    <div class="video-info">
                        <div class="video-user">
                            <img src="${profile?.avatar_url || 'placeholder.png'}" 
                                 alt="@${profile?.username}" 
                                 class="user-avatar">
                            <div class="user-info">
                                <div class="username-container">
                                    <span class="username" data-user-id="${profile?.id}">@${profile?.username}</span>
                                    ${this.currentUser?.id !== profile?.id ? `
                                        <button class="follow-btn ${followingIds.includes(profile?.id) ? 'following' : ''}"
                                                data-user-id="${profile?.id}">
                                            <span>${followingIds.includes(profile?.id) ? 'Following' : 'Follow'}</span>
                                        </button>
                                    ` : ''}
                                </div>
                                <p class="video-description">${video.description || ''}</p>
                            </div>
                        </div>
                    </div>
                    <div class="video-actions">
                        <button class="action-btn like-btn ${likedVideoIds.includes(video.id) ? 'liked' : ''}"
                                data-video-id="${video.id}">
                            <i class="fas fa-heart"></i>
                            <span class="likes-count">${likesCount}</span>
                        </button>
                        ${isOwnVideo ? `
                            <button class="action-btn delete-btn" data-video-id="${video.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                `;

                // Add event listeners
                const videoEl = videoElement.querySelector('video');
                const userAvatar = videoElement.querySelector('.user-avatar');
                const username = videoElement.querySelector('.username');
                const followBtn = videoElement.querySelector('.follow-btn');
                const likeBtn = videoElement.querySelector('.like-btn');
                const deleteBtn = videoElement.querySelector('.delete-btn');

                // Video playback
                if (videoEl) {
                    videoEl.addEventListener('click', () => {
                        if (videoEl.paused) {
                            // Try to play and handle any errors
                            videoEl.play().catch(error => {
                                console.log('Playback error (expected if no user interaction):', error);
                                // We don't need to show this error to the user as it's expected
                            });
                        } else {
                            videoEl.pause();
                        }
                    });

                    // Add a play button overlay
                    const playButton = document.createElement('div');
                    playButton.className = 'video-play-button';
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    videoElement.querySelector('.video-info').insertAdjacentElement('beforebegin', playButton);

                    // Show play button when video is paused
                    videoEl.addEventListener('pause', () => {
                        playButton.style.display = 'flex';
                    });

                    // Hide play button when video is playing
                    videoEl.addEventListener('play', () => {
                        playButton.style.display = 'none';
                    });

                    // Initial state
                    playButton.style.display = 'flex';

                    // Handle play button click
                    playButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent video click event
                        if (videoEl.paused) {
                            videoEl.play().catch(console.error);
                        } else {
                            videoEl.pause();
                        }
                    });
                }

                // Profile click handlers
                [userAvatar, username].forEach(el => {
                    if (el) {
                        el.addEventListener('click', () => {
                            const userId = el.dataset.userId || profile?.id;
                            if (userId) this.showUserProfile(userId);
                        });
                    }
                });

                // Follow button handler
                if (followBtn) {
                    followBtn.addEventListener('click', () => {
                        this.handleFollow(profile?.id, followBtn);
                    });
                }

                // Like button handler
                if (likeBtn) {
                    likeBtn.addEventListener('click', () => {
                        this.handleLike(video.id, likeBtn);
                    });
                }

                // Delete button handler
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async () => {
                        if (await this.confirmDelete()) {
                            await this.deleteVideo(video.id, videoElement);
                        }
                    });
                }

                container.appendChild(videoElement);
            }
        } catch (error) {
            console.error('Error rendering videos:', error);
            this.showError('Failed to render videos');
        }
    }

    async handleFollow(userId, button) {
        try {
            if (!this.currentUser) {
                this.showError('Please login first');
                return;
            }

            const isFollowing = button.classList.contains('following');

            if (isFollowing) {
                // Unfollow
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', this.currentUser.id)
                    .eq('following_id', userId);

                if (error) throw error;

                button.classList.remove('following');
                button.querySelector('span').textContent = 'Follow';
            } else {
                // Follow
                const { error } = await supabase
                    .from('follows')
                    .insert({
                        follower_id: this.currentUser.id,
                        following_id: userId
                    });

                if (error) throw error;

                button.classList.add('following');
                button.querySelector('span').textContent = 'Following';
            }

        } catch (error) {
            console.error('Follow error:', error);
            this.showError('Failed to update follow status');
        }
    }

    async handleLike(videoId, button) {
        try {
            if (!this.currentUser) {
                this.showError('Please login first');
                return;
            }

            const isLiked = button.classList.contains('liked');
            const countElement = button.querySelector('.likes-count');
            const currentCount = parseInt(countElement.textContent);

            if (isLiked) {
                // Unlike
                const { error } = await supabase
                    .from('likes')
                    .delete()
                    .eq('user_id', this.currentUser.id)
                    .eq('video_id', videoId);

                if (error) throw error;

                button.classList.remove('liked');
                countElement.textContent = currentCount - 1;
            } else {
                // Like
                const { error } = await supabase
                    .from('likes')
                    .insert({
                        user_id: this.currentUser.id,
                        video_id: videoId
                    });

                if (error) throw error;

                button.classList.add('liked');
                countElement.textContent = currentCount + 1;

                // Show like animation
                this.showLikeAnimation(button);
            }

        } catch (error) {
            console.error('Like error:', error);
            this.showError('Failed to update like');
        }
    }

    showLikeAnimation(button) {
        const heart = document.createElement('i');
        heart.className = 'fas fa-heart like-animation';
        
        const rect = button.getBoundingClientRect();
        heart.style.left = `${rect.left + rect.width / 2}px`;
        heart.style.top = `${rect.top + rect.height / 2}px`;
        
        document.body.appendChild(heart);
        
        heart.addEventListener('animationend', () => heart.remove());
    }

    async showUserProfile(userId) {
        try {
            // Get user profile
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            // Get user's videos
            const { data: videos } = await supabase
                .from('videos')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            // Get follow status
            const { data: follows } = await supabase
                .from('follows')
                .select('*')
                .eq('follower_id', this.currentUser?.id)
                .eq('following_id', userId)
                .single();

            const isFollowing = !!follows;
            const isOwnProfile = this.currentUser?.id === userId;

            // Show profile modal
            const modal = document.createElement('div');
            modal.className = 'profile-modal';
            modal.innerHTML = `
                <div class="profile-content">
                    <button class="close-modal">&times;</button>
                    <div class="profile-header">
                        <img src="${profile.avatar_url || 'placeholder.png'}" alt="@${profile.username}" class="profile-avatar">
                        <h2>@${profile.username}</h2>
                        ${!isOwnProfile ? `
                            <button class="follow-btn ${isFollowing ? 'following' : ''}"
                                    data-user-id="${profile.id}">
                                <span>${isFollowing ? 'Following' : 'Follow'}</span>
                            </button>
                        ` : ''}
                    </div>
                    <div class="profile-videos">
                        <h3>Videos</h3>
                        <div class="videos-grid">
                            ${videos?.map(video => `
                                <div class="video-thumbnail" data-video-url="${video.url}" data-video-id="${video.id}">
                                    <video src="${video.url}" preload="metadata"></video>
                                    <span class="video-description">${video.description || ''}</span>
                                    ${isOwnProfile ? `
                                        <div class="video-actions">
                                            <button class="delete-video-btn" data-video-id="${video.id}">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('') || '<p>No videos yet</p>'}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add event listeners
            modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());

            const followBtn = modal.querySelector('.follow-btn');
            if (followBtn) {
                followBtn.addEventListener('click', () => this.handleFollow(userId, followBtn));
            }

            // Video thumbnail clicks and delete buttons
            modal.querySelectorAll('.video-thumbnail').forEach(thumbnail => {
                // Play video on click
                thumbnail.addEventListener('click', (e) => {
                    // Don't play if clicking delete button
                    if (e.target.closest('.delete-video-btn')) return;
                    modal.remove();
                    this.playVideo(thumbnail.dataset.videoUrl);
                });

                // Delete button
                const deleteBtn = thumbnail.querySelector('.delete-video-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (await this.confirmDelete()) {
                            await this.deleteVideo(deleteBtn.dataset.videoId, thumbnail);
                        }
                    });
                }
            });

        } catch (error) {
            console.error('Error showing profile:', error);
            this.showError('Failed to load profile');
        }
    }

    async uploadVideo(file) {
        try {
            if (!this.currentUser) {
                throw new Error('Please login to upload videos');
            }

            this.showLoading('Uploading video...');

            // Validate file
            if (file.size > 50 * 1024 * 1024) {
                throw new Error('Video size should be less than 50MB');
            }

            // Upload to storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}/${Date.now()}.${fileExt}`;

            console.log('Uploading file:', fileName);
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw uploadError;
            }

            // Get public URL
            const { data: urlData, error: urlError } = supabase.storage
                .from('videos')
                .getPublicUrl(fileName);

            if (urlError) {
                console.error('URL generation error:', urlError);
                throw urlError;
            }

            if (!urlData?.publicUrl) {
                console.error('No public URL in response:', urlData);
                throw new Error('Failed to generate public URL for video');
            }

            console.log('Generated public URL:', urlData.publicUrl);

            // Save to database
            const { error: dbError } = await supabase
                .from('videos')
                .insert({
                    user_id: this.currentUser.id,
                    url: urlData.publicUrl,
                    description: 'New video'
                });

            if (dbError) {
                console.error('Database insert error:', dbError);
                throw dbError;
            }

            this.showSuccess('Video uploaded successfully!');
            await this.loadVideos();

        } catch (error) {
            console.error('Upload error:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
            const uploadInput = document.getElementById('video-upload');
            if (uploadInput) uploadInput.value = '';
        }
    }

    showLoading(message = 'Loading...') {
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(loading);
    }

    hideLoading() {
        const loading = document.querySelector('.loading-overlay');
        if (loading) loading.remove();
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        document.body.appendChild(error);
        setTimeout(() => error.remove(), 3000);
    }

    showSuccess(message) {
        const success = document.createElement('div');
        success.className = 'success-message';
        success.textContent = message;
        document.body.appendChild(success);
        setTimeout(() => success.remove(), 3000);
    }

    showVideoError(videoWrapper) {
        const error = document.createElement('div');
        error.className = 'video-error';
        error.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <p>Failed to load video</p>
        `;
        videoWrapper.appendChild(error);
    }

    confirmDelete() {
        return new Promise((resolve) => {
            const confirmModal = document.createElement('div');
            confirmModal.className = 'confirm-modal';
            confirmModal.innerHTML = `
                <div class="confirm-content">
                    <h3>Delete Video?</h3>
                    <p>This action cannot be undone.</p>
                    <div class="confirm-actions">
                        <button class="cancel-btn">Cancel</button>
                        <button class="delete-btn">Delete</button>
                    </div>
                </div>
            `;

            document.body.appendChild(confirmModal);

            confirmModal.querySelector('.cancel-btn').addEventListener('click', () => {
                confirmModal.remove();
                resolve(false);
            });

            confirmModal.querySelector('.delete-btn').addEventListener('click', () => {
                confirmModal.remove();
                resolve(true);
            });
        });
    }

    async deleteVideo(videoId, thumbnailElement) {
        try {
            this.showLoading('Deleting video...');

            // Delete from database
            const { error: dbError } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (dbError) throw dbError;

            // Remove the thumbnail from UI
            thumbnailElement.remove();

            // Reload videos in feed if visible
            const homeFeed = document.getElementById('home-feed');
            if (homeFeed && !homeFeed.classList.contains('hidden')) {
                await this.loadVideos();
            }

            this.showSuccess('Video deleted successfully');

        } catch (error) {
            console.error('Delete error:', error);
            this.showError('Failed to delete video');
        } finally {
            this.hideLoading();
        }
    }
}

// Create and export feed instance
const feed = new Feed();
export default feed;