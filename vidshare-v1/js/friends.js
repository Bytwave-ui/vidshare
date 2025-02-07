import { supabase } from './supabase.js';

class Friends {
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
            this.createFriendsUI();
            
            // Initialize listeners
            this.initializeListeners();

            // Load initial data
            if (document.getElementById('friends-section')?.classList.contains('hidden') === false) {
                await this.loadData();
            }
        } catch (error) {
            console.error('Friends initialization error:', error);
        }
    }

    createFriendsUI() {
        const container = document.getElementById('friends-section');
        if (!container) return;

        container.innerHTML = `
            <div class="friends-tabs">
                <button class="friends-tab active" data-tab="all">All Users</button>
                <button class="friends-tab" data-tab="friends">Friends</button>
                <button class="friends-tab" data-tab="requests">Requests</button>
            </div>
            <div class="friends-list"></div>
        `;
    }

    initializeListeners() {
        // Tab switching
        document.querySelectorAll('.friends-tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                document.querySelectorAll('.friends-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                await this.loadData();
            });
        });

        // Navigation listener
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', async () => {
                if (item.dataset.tab === 'friends') {
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
            case 'friends':
                await this.loadFriends();
                break;
            case 'requests':
                await this.loadFriendRequests();
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

            // Get friend requests and follows
            const [requestsResult, followsResult] = await Promise.all([
                supabase
                    .from('friend_requests')
                    .select('*')
                    .or(`sender_id.eq.${this.currentUser?.id},receiver_id.eq.${this.currentUser?.id}`),
                supabase
                    .from('follows')
                    .select('*')
                    .eq('follower_id', this.currentUser?.id)
            ]);

            const friendRequests = requestsResult.data || [];
            const following = followsResult.data || [];

            const container = document.querySelector('#friends-section .friends-list');
            if (!container) return;

            container.innerHTML = '';

            if (!users || users.length === 0) {
                container.innerHTML = `
                    <div class="empty-friends">
                        <i class="fas fa-users"></i>
                        <p>No users found</p>
                    </div>
                `;
                return;
            }

            users.forEach(user => {
                const friendRequest = friendRequests.find(request => 
                    (request.sender_id === this.currentUser?.id && request.receiver_id === user.id) ||
                    (request.receiver_id === this.currentUser?.id && request.sender_id === user.id)
                );

                const isFollowing = following.some(f => f.following_id === user.id);

                const userElement = document.createElement('div');
                userElement.className = 'friend-item';
                userElement.innerHTML = `
                    <img src="${user.avatar_url || 'placeholder.png'}" alt="${user.username}" class="friend-avatar">
                    <div class="friend-info">
                        <h3>@${user.username}</h3>
                        <div class="friend-actions">
                            <button class="friend-action-btn ${this.getFriendButtonClass(friendRequest)}" 
                                    data-user-id="${user.id}"
                                    ${this.getFriendButtonDisabled(friendRequest)}>
                                ${this.getFriendButtonText(friendRequest)}
                            </button>
                            <button class="follow-btn ${isFollowing ? 'following' : ''}" 
                                    data-user-id="${user.id}">
                                <span>${isFollowing ? 'Following' : 'Follow'}</span>
                            </button>
                        </div>
                    </div>
                `;

                const friendBtn = userElement.querySelector('.friend-action-btn');
                const followBtn = userElement.querySelector('.follow-btn');

                friendBtn.addEventListener('click', () => 
                    this.handleFriendAction(user.id, friendRequest));

                followBtn.addEventListener('click', () => 
                    this.handleFollowAction(user.id, followBtn));

                container.appendChild(userElement);
            });

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users');
        } finally {
            this.hideLoading();
        }
    }

    getFriendButtonClass(request) {
        if (!request) return 'add-friend';
        if (request.status === 'pending') return 'pending';
        if (request.status === 'accepted') return 'friends';
        return 'add-friend';
    }

    getFriendButtonText(request) {
        if (!request) return 'Add Friend';
        if (request.status === 'pending') return 'Pending';
        if (request.status === 'accepted') return 'Friends';
        return 'Add Friend';
    }

    getFriendButtonDisabled(request) {
        return (request?.status === 'pending' || request?.status === 'accepted') ? 'disabled' : '';
    }

    async handleFriendAction(userId, existingRequest) {
        try {
            if (!this.currentUser) throw new Error('Please login first');

            if (!existingRequest) {
                // Send friend request
                const { error } = await supabase
                    .from('friend_requests')
                    .insert({
                        sender_id: this.currentUser.id,
                        receiver_id: userId,
                        status: 'pending'
                    });

                if (error) throw error;
                this.showSuccess('Friend request sent!');
            }

            // Reload the list
            await this.loadAllUsers();

        } catch (error) {
            console.error('Friend action error:', error);
            this.showError(error.message);
        }
    }

    async handleFollowAction(userId, button) {
        try {
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

const friends = new Friends();
export default friends; 