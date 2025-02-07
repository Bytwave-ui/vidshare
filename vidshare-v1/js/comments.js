import { supabase } from './supabase.js';

class Comments {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        const { data: { session } } = await supabase.auth.getSession();
        this.currentUser = session?.user;
    }

    async showComments(videoId) {
        try {
            // Get comments for this video
            const { data: comments, error } = await supabase
                .from('comments')
                .select(`
                    *,
                    profiles:user_id (username, avatar_url)
                `)
                .eq('video_id', videoId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Create comments modal
            const modal = document.createElement('div');
            modal.className = 'comments-modal';
            modal.innerHTML = `
                <div class="comments-container">
                    <div class="comments-header">
                        <h3>${comments?.length || 0} comments</h3>
                        <button class="close-comments">&times;</button>
                    </div>
                    <div class="comments-list">
                        ${comments?.map(comment => this.renderComment(comment)).join('') || 
                        '<p class="no-comments">No comments yet. Be the first!</p>'}
                    </div>
                    <div class="comment-input-container">
                        <input type="text" 
                               class="comment-input" 
                               placeholder="Add a comment..."
                               maxlength="150">
                        <button class="post-comment-btn" disabled>Post</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add event listeners
            const closeBtn = modal.querySelector('.close-comments');
            const input = modal.querySelector('.comment-input');
            const postBtn = modal.querySelector('.post-comment-btn');

            closeBtn.addEventListener('click', () => modal.remove());

            input.addEventListener('input', () => {
                postBtn.disabled = !input.value.trim();
            });

            postBtn.addEventListener('click', async () => {
                await this.addComment(videoId, input.value.trim(), modal);
            });

            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

        } catch (error) {
            console.error('Error showing comments:', error);
        }
    }

    renderComment(comment) {
        const timestamp = this.formatTimestamp(comment.created_at);
        return `
            <div class="comment-item">
                <img src="${comment.profiles.avatar_url || 'placeholder.png'}" 
                     alt="@${comment.profiles.username}" 
                     class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-username">@${comment.profiles.username}</span>
                        <span class="comment-time">${timestamp}</span>
                    </div>
                    <p class="comment-text">${comment.content}</p>
                </div>
            </div>
        `;
    }

    async addComment(videoId, content, modal) {
        try {
            if (!this.currentUser) {
                this.showError('Please login to comment');
                return;
            }

            const { data: comment, error } = await supabase
                .from('comments')
                .insert({
                    video_id: videoId,
                    user_id: this.currentUser.id,
                    content: content
                })
                .select(`
                    *,
                    profiles:user_id (username, avatar_url)
                `)
                .single();

            if (error) throw error;

            // Add new comment to UI
            const commentsList = modal.querySelector('.comments-list');
            const noComments = commentsList.querySelector('.no-comments');
            if (noComments) noComments.remove();

            const commentElement = document.createElement('div');
            commentElement.innerHTML = this.renderComment(comment);
            commentsList.insertBefore(commentElement.firstChild, commentsList.firstChild);

            // Clear input
            modal.querySelector('.comment-input').value = '';
            modal.querySelector('.post-comment-btn').disabled = true;

        } catch (error) {
            console.error('Error adding comment:', error);
            this.showError('Failed to add comment');
        }
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
        return date.toLocaleDateString();
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = message;
        document.body.appendChild(error);
        setTimeout(() => error.remove(), 3000);
    }
}

const comments = new Comments();
export default comments; 