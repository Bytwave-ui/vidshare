import { supabase } from './supabase.js';

class Following {
    constructor() {
        this.currentUser = null;
        this.currentTab = 'all';
        this.init();
    }

    async init() {
        try {
            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            this.currentUser = session?.user;

            // Initialize UI
            this.createFollowingUI();
            
            // Initialize listeners
            this.initializeListeners();

            // Load initial data
            if (document.getElementById('following-section')?.classList.contains('hidden') === false) {
                await this.loadData();
            }
        } catch (error) {
            console.error('Following initialization error:', error);
        }
    }

    createFollowingUI() {
        const container = document.getElementById('following-section');
        if (!container) return;

        container.innerHTML = `
            <div class="following-tabs">
                <button class="following-tab active" data-tab="all">Discover</button>
                <button class="following-tab" data-tab="following">Following</button>
            </div>
            <div class="following-list"></div>
        `;
    }

    initializeListeners() {
        // Tab switching
        document.querySelectorAll('.following-tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                document.querySelectorAll('.following-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                await this.loadData();
            });
        });

        // Navigation listener
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', async () => {
                if (item.dataset.tab === 'following') {
                    await this.loadData();
                }
            });
        });
    }

    async loadData() {
        switch (this.currentTab) {
            case 'all':
                await this.loadAllUsers();
                break;
            case 'following':
                await this.loadFollowing();
                break;
        }
    }

    async loadAllUsers() {
        try {
            this.showLoading();

            // Get all users except current user
            const { data: users, error } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', this.currentUser?.id);

            if (error) throw error;

            // Get following status
            const { data: following, error: followError } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', this.currentUser?.id);

            if (followError) throw followError;

            const followingIds = following?.map(f => f.following_id) || [];

            const container = document.querySelector('#following-section .following-list');
            if (!container) return;

            container.innerHTML = '';

            if (!users || users.length === 0) {
                container.innerHTML = `
                    <div class="empty-following">
                        <i class="fas fa-users"></i>
                        <p>No users found</p>
                    </div>
                `;
                return;
            }

            users.forEach(user => {
                const isFollowing = followingIds.includes(user.id);

                const userElement = document.createElement('div');
                userElement.className = 'user-item';
                userElement.innerHTML = `
                    <img src="${user.avatar_url || 'placeholder.png'}" alt="${user.username}" class="user-avatar">
                    <div class="user-info">
                        <h3>@${user.username}</h3>
                        <div class="user-actions">
                            <button class="follow-btn ${isFollowing ? 'following' : ''}" 
                                    data-user-id="${user.id}">
                                <span>${isFollowing ? 'Following' : 'Follow'}</span>
                            </button>
                        </div>
                    </div>
                `;

                const followBtn = userElement.querySelector('.follow-btn');
                followBtn.addEventListener('click', () => this.handleFollowAction(user.id, followBtn));

                container.appendChild(userElement);
            });

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users');
        } finally {
            this.hideLoading();
        }
    }

    async loadFollowing() {
        try {
            this.showLoading();

            // Get following relationships
            const { data: following, error: followError } = await supabase
                .from('follows')
                .select(`
                    following_id,
                    following:profiles!follows_following_id_fkey(*)
                `)
                .eq('follower_id', this.currentUser?.id);

            if (followError) throw followError;

            const container = document.querySelector('#following-section .following-list');
            if (!container) return;

            container.innerHTML = '';

            if (!following || following.length === 0) {
                container.innerHTML = `
                    <div class="empty-following">
                        <i class="fas fa-users"></i>
                        <p>You're not following anyone yet</p>
                    </div>
                `;
                return;
            }

            following.forEach(({ following: user }) => {
                const userElement = document.createElement('div');
                userElement.className = 'user-item';
                userElement.innerHTML = `
                    <img src="${user.avatar_url || 'placeholder.png'}" alt="${user.username}" class="user-avatar">
                    <div class="user-info">
                        <h3>@${user.username}</h3>
                        <div class="user-actions">
                            <button class="follow-btn following" data-user-id="${user.id}">
                                <span>Following</span>
                            </button>
                        </div>
                    </div>
                `;

                const followBtn = userElement.querySelector('.follow-btn');
                followBtn.addEventListener('click', () => this.handleFollowAction(user.id, followBtn));

                container.appendChild(userElement);
            });

        } catch (error) {
            console.error('Error loading following:', error);
            this.showError('Failed to load following');
        } finally {
            this.hideLoading();
        }
    }

    async handleFollowAction(userId, button) {
        try {
            if (!this.currentUser) throw new Error('Please login first');

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
                this.showSuccess('Unfollowed user');
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
                this.showSuccess('Following user');
            }
        } catch (error) {
            console.error('Follow action error:', error);
            this.showError('Failed to update follow status');
        }
    }

    showLoading() {
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading...</span>
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
}

const following = new Following();
export default following;
