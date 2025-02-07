import { supabase } from './supabase.js';

class Inbox {
    constructor() {
        this.currentUser = null;
        this.initializeInbox();
        this.initializeListeners();
    }

    async initializeInbox() {
        const { data: { user } } = await supabase.auth.getUser();
        this.currentUser = user;
        
        // Subscribe to announcements
        this.subscribeToAnnouncements();
        
        // Load initial announcements
        await this.loadAnnouncements();
    }

    initializeListeners() {
        // Tab switching
        const tabButtons = document.querySelectorAll('.inbox-tab');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.switchTab(button.dataset.tab);
            });
        });

        // Mark as read
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mark-read')) {
                const announcementId = e.target.dataset.id;
                this.markAnnouncementAsRead(announcementId);
            }
        });
    }

    subscribeToAnnouncements() {
        const announcementsChannel = supabase
            .channel('announcements')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'announcements'
                },
                (payload) => {
                    this.handleNewAnnouncement(payload.new);
                }
            )
            .subscribe();
    }

    async loadAnnouncements() {
        try {
            const { data: announcements, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get read status for current user
            const { data: readStatus, error: readError } = await supabase
                .from('announcement_reads')
                .select('announcement_id')
                .eq('user_id', this.currentUser.id);

            if (readError) throw readError;

            const readAnnouncementIds = readStatus.map(r => r.announcement_id);
            
            this.displayAnnouncements(announcements, readAnnouncementIds);
        } catch (error) {
            console.error('Error loading announcements:', error);
        }
    }

    async markAnnouncementAsRead(announcementId) {
        try {
            const { error } = await supabase
                .from('announcement_reads')
                .insert({
                    user_id: this.currentUser.id,
                    announcement_id: announcementId
                });

            if (error) throw error;

            // Update UI
            const announcement = document.querySelector(`.announcement[data-id="${announcementId}"]`);
            if (announcement) {
                announcement.classList.add('read');
                const markReadBtn = announcement.querySelector('.mark-read');
                if (markReadBtn) markReadBtn.remove();
            }
        } catch (error) {
            console.error('Error marking announcement as read:', error);
        }
    }

    handleNewAnnouncement(announcement) {
        const inboxContent = document.querySelector('.inbox-content');
        if (!inboxContent) return;

        const announcementElement = this.createAnnouncementElement(announcement, false);
        inboxContent.insertBefore(announcementElement, inboxContent.firstChild);
    }

    displayAnnouncements(announcements, readAnnouncementIds) {
        const inboxContent = document.querySelector('.inbox-content');
        if (!inboxContent) return;

        if (announcements.length === 0) {
            inboxContent.innerHTML = `
                <div class="empty-inbox">
                    <i class="fas fa-inbox"></i>
                    <p>No announcements</p>
                </div>
            `;
            return;
        }

        inboxContent.innerHTML = '';
        announcements.forEach(announcement => {
            const isRead = readAnnouncementIds.includes(announcement.id);
            const announcementElement = this.createAnnouncementElement(announcement, isRead);
            inboxContent.appendChild(announcementElement);
        });
    }

    createAnnouncementElement(announcement, isRead) {
        const element = document.createElement('div');
        element.className = `announcement ${isRead ? 'read' : 'unread'}`;
        element.dataset.id = announcement.id;

        const date = new Date(announcement.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        element.innerHTML = `
            <div class="announcement-header">
                <span class="announcement-type ${announcement.type || 'info'}">
                    <i class="fas fa-${this.getAnnouncementIcon(announcement.type)}"></i>
                </span>
                <span class="announcement-date">${date}</span>
                ${!isRead ? `
                    <button class="mark-read" data-id="${announcement.id}">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
            </div>
            <h3 class="announcement-title">${announcement.title}</h3>
            <p class="announcement-content">${announcement.content}</p>
        `;

        return element;
    }

    getAnnouncementIcon(type) {
        switch (type) {
            case 'warning':
                return 'exclamation-triangle';
            case 'update':
                return 'sync';
            case 'event':
                return 'calendar';
            default:
                return 'info-circle';
        }
    }
}

// Initialize inbox
const inbox = new Inbox();
export default inbox;