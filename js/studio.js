import { supabase } from './supabase.js';

class Studio {
    constructor() {
        this.currentUser = null;
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            console.log('Initializing studio...'); // Debug log

            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            this.currentUser = session?.user;

            // Initialize UI
            this.createStudioUI();
            
            // Initialize listeners
            this.initializeListeners();

            // Load initial data if studio tab is visible
            if (document.getElementById('studio-section')?.classList.contains('hidden') === false) {
                await this.loadVideos();
            }
        } catch (error) {
            console.error('Studio initialization error:', error);
        }
    }

    createStudioUI() {
        const container = document.getElementById('studio-section');
        if (!container) {
            console.error('Studio section not found');
            return;
        }

        console.log('Creating studio UI'); // Debug log

        container.innerHTML = `
            <div class="studio-container">
                <h2>Content Studio</h2>
                <div class="upload-section">
                    <div class="upload-buttons">
                        <div class="upload-btn">
                            <i class="fas fa-upload"></i>
                            <span>Upload Video</span>
                            <input type="file" 
                                id="studio-video-upload" 
                                accept="video/*,.mp4,.mov,.avi"
                                capture="environment"
                                class="file-input">
                        </div>
                        <div class="upload-btn gallery-btn">
                            <i class="fas fa-images"></i>
                            <span>Choose from Gallery</span>
                            <input type="file" 
                                id="gallery-video-upload" 
                                accept="video/*,.mp4,.mov,.avi"
                                class="file-input">
                        </div>
                    </div>
                </div>
                <div class="videos-section">
                    <h3>My Videos</h3>
                    <div class="videos-grid">
                        <!-- Videos will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    initializeListeners() {
        // Camera video upload
        const uploadInput = document.getElementById('studio-video-upload');
        if (uploadInput) {
            uploadInput.addEventListener('change', async (e) => {
                try {
                    const file = e.target.files?.[0];
                    if (file) {
                        console.log('File selected:', {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            lastModified: file.lastModified
                        });
                        await this.showUploadModal(file);
                    }
                } catch (error) {
                    console.error('Error handling file selection:', error);
                    this.showError('Error selecting file. Please try again.');
                }
            });
        }

        // Gallery video upload
        const galleryInput = document.getElementById('gallery-video-upload');
        if (galleryInput) {
            galleryInput.addEventListener('change', async (e) => {
                try {
                    const file = e.target.files?.[0];
                    if (file) {
                        console.log('File selected:', {
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            lastModified: file.lastModified
                        });
                        await this.showUploadModal(file);
                    }
                } catch (error) {
                    console.error('Error handling file selection:', error);
                    this.showError('Error selecting file. Please try again.');
                }
            });
        }

        // Navigation listener
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', async () => {
                if (item.dataset.tab === 'studio') {
                    await this.loadVideos();
                }
            });
        });
    }

    async showUploadModal(file) {
        const modal = document.createElement('div');
        modal.className = 'upload-modal';
        modal.innerHTML = `
            <div class="upload-content">
                <h3>Upload Video</h3>
                <div class="upload-form">
                    <div class="form-group">
                        <label for="video-title">Title</label>
                        <input type="text" id="video-title" placeholder="Enter video title">
                    </div>
                    <div class="form-group">
                        <label for="video-description">Description</label>
                        <textarea id="video-description" placeholder="Enter video description"></textarea>
                    </div>
                    <div class="upload-actions">
                        <button class="cancel-btn">Cancel</button>
                        <button class="upload-submit-btn">Upload</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
            document.getElementById('studio-video-upload').value = '';
            document.getElementById('gallery-video-upload').value = '';
        });

        modal.querySelector('.upload-submit-btn').addEventListener('click', async () => {
            const title = modal.querySelector('#video-title').value.trim();
            const description = modal.querySelector('#video-description').value.trim();
            
            if (!title) {
                this.showError('Please enter a title');
                return;
            }

            modal.remove();
            await this.uploadVideo(file, title, description);
        });
    }

    async loadVideos() {
        try {
            this.showLoading();

            const { data: videos, error } = await supabase
                .from('videos')
                .select('*')
                .eq('user_id', this.currentUser?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const container = document.querySelector('.videos-grid');
            if (!container) return;

            container.innerHTML = videos?.length ? videos.map(video => `
                <div class="video-card" data-video-id="${video.id}">
                    <div class="video-preview">
                        <video src="${video.url}" preload="metadata"></video>
                        <div class="video-overlay">
                            <button class="delete-video-btn" data-video-id="${video.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="video-info">
                        <h4>${video.title || 'Untitled'}</h4>
                        <p>${video.description || ''}</p>
                    </div>
                </div>
            `).join('') : '<p class="no-videos">No videos uploaded yet</p>';

            // Add delete listeners
            container.querySelectorAll('.delete-video-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (await this.confirmDelete()) {
                        await this.deleteVideo(btn.dataset.videoId);
                    }
                });
            });

        } catch (error) {
            console.error('Error loading videos:', error);
            this.showError('Failed to load videos');
        } finally {
            this.hideLoading();
        }
    }

    async uploadVideo(file, title, description) {
        let loadingDiv = null;
        try {
            if (!this.currentUser) {
                throw new Error('Please login to upload videos');
            }

            // Basic validation
            if (!file) {
                throw new Error('No file selected');
            }

            // Size validation
            const maxSize = 500 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error(`File size must be less than 500MB. Current size: ${Math.round(file.size / (1024 * 1024))}MB`);
            }

            // Show progress UI
            loadingDiv = document.createElement('div');
            loadingDiv.className = 'upload-progress';
            loadingDiv.innerHTML = `
                <div class="progress-text">Preparing upload...</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
            `;
            document.querySelector('.upload-section').appendChild(loadingDiv);

            const updateProgress = (percent, message) => {
                if (loadingDiv) {
                    loadingDiv.querySelector('.progress-text').textContent = message || `Uploading: ${percent}%`;
                    loadingDiv.querySelector('.progress-fill').style.width = `${percent}%`;
                }
                console.log('Progress:', { percent, message });
            };

            // Generate filename
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const fileExt = file.name.split('.').pop().toLowerCase() || 'mp4';
            const fileName = `${this.currentUser.id}/${timestamp}-${randomString}.${fileExt}`;

            updateProgress(5, 'Starting upload...');

            // Create FormData for the file
            const formData = new FormData();
            formData.append('file', file);

            // Get the presigned URL for upload
            const { data: { signedURL }, error: signedURLError } = await supabase.storage
                .from('videos')
                .createSignedUploadUrl(fileName);

            if (signedURLError) {
                throw signedURLError;
            }

            updateProgress(10, 'Uploading file...');

            // Upload using fetch with FormData
            const uploadResponse = await fetch(signedURL, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                    'x-upsert': 'true'
                }
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.statusText}`);
            }

            updateProgress(90, 'Processing...');

            // Get public URL
            const { data: urlData, error: urlError } = supabase.storage
                .from('videos')
                .getPublicUrl(fileName);

            if (urlError) throw urlError;

            // Save to database
            const videoData = {
                user_id: this.currentUser.id,
                url: urlData.publicUrl,
                title: title || 'Untitled Video',
                description: description || '',
                created_at: new Date().toISOString()
            };

            const { error: dbError } = await supabase
                .from('videos')
                .insert([videoData]);

            if (dbError) throw dbError;

            updateProgress(100, 'Complete!');
            this.showSuccess('Video uploaded successfully!');
            await this.loadVideos();

        } catch (error) {
            console.error('Upload error:', error);
            this.showError(error.message || 'Failed to upload video');
        } finally {
            if (loadingDiv) {
                loadingDiv.remove();
            }
            // Reset file inputs
            ['studio-video-upload', 'gallery-video-upload'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = '';
            });
        }
    }

    showLoading(message = 'Loading...') {
        const loading = document.getElementById('loading') || document.createElement('div');
        loading.id = 'loading';
        loading.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        if (!document.getElementById('loading')) {
            document.body.appendChild(loading);
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.remove();
    }

    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
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

    async deleteVideo(videoId) {
        try {
            this.showLoading('Deleting video...');

            // Delete from database
            const { error: dbError } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (dbError) throw dbError;

            // Reload videos
            await this.loadVideos();
            this.showSuccess('Video deleted successfully');

        } catch (error) {
            console.error('Delete error:', error);
            this.showError('Failed to delete video');
        } finally {
            this.hideLoading();
        }
    }
}

// Create and export studio instance
const studio = new Studio();
export default studio;
