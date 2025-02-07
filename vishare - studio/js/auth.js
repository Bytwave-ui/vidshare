import { supabase } from './supabase.js'

const DEFAULT_AVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'

class Auth {
    constructor() {
        this.currentUser = null;
        this.placeholderImage = DEFAULT_AVATAR;
        this.initializeAuth();
        this.initializeListeners();
    }

    async initializeAuth() {
        try {
            // Get initial session
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;

            if (session) {
                this.currentUser = session.user;
                
                // Check if profile exists, create if it doesn't
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', this.currentUser.id)
                    .single();

                if (profileError && profileError.code === 'PGRST116') {
                    // Profile doesn't exist, create it
                    const { error: createError } = await supabase
                        .from('profiles')
                        .insert({
                            id: this.currentUser.id,
                            username: this.currentUser.email.split('@')[0],
                            avatar_url: this.placeholderImage,
                            is_private: false
                        });

                    if (createError) throw createError;
                } else if (profileError) {
                    throw profileError;
                }

                await this.loadUserProfile();
                this.showMainApp();
            } else {
                this.showAuthSection();
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN') {
                    this.currentUser = session.user;
                    await this.loadUserProfile();
                    this.showMainApp();
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.showAuthSection();
                }
            });

        } catch (error) {
            console.error('Auth initialization error:', error);
            this.showError('Authentication error');
        }
    }

    initializeListeners() {
        // Edit profile button
        const editProfileBtn = document.getElementById('edit-profile-btn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                this.showEditProfileModal();
            });
        }

        // Close modal button
        const closeModalBtn = document.querySelector('.close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.hideEditProfileModal();
            });
        }

        // Edit profile form
        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate(e);
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Login and signup buttons
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                document.getElementById('auth-forms').classList.remove('hidden');
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('signup-form').classList.add('hidden');
            });
        }

        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                document.getElementById('auth-forms').classList.remove('hidden');
                document.getElementById('signup-form').classList.remove('hidden');
                document.getElementById('login-form').classList.add('hidden');
            });
        }

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Signup form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
    }

    async loadUserProfile() {
        try {
            if (!this.currentUser) {
                console.log('No current user found'); // Debug log
                return;
            }

            console.log('Loading profile for user:', this.currentUser.id); // Debug log

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            console.log('Profile load result:', { profile, error }); // Debug log

            if (error) {
                console.error('Error loading profile:', error);
                throw error;
            }

            if (profile) {
                // Update all profile pictures
                const profilePics = document.querySelectorAll('.profile-pic');
                profilePics.forEach(pic => {
                    pic.src = profile.avatar_url || this.placeholderImage;
                });

                // Update all username displays
                const usernameElements = document.querySelectorAll('.profile-info h3');
                usernameElements.forEach(el => {
                    el.textContent = profile.username || 'Username';
                });

                // Update form fields if they exist
                const usernameInput = document.getElementById('edit-username');
                if (usernameInput) {
                    usernameInput.value = profile.username || '';
                }

                const privacyToggle = document.getElementById('privacy-setting');
                if (privacyToggle) {
                    privacyToggle.checked = profile.is_private || false;
                }
            }

        } catch (error) {
            console.error('Error in loadUserProfile:', error);
            this.showError('Failed to load profile');
        }
    }

    updateProfileUI(profile) {
        // Update profile picture
        const profilePics = document.querySelectorAll('.profile-pic');
        profilePics.forEach(pic => {
            pic.src = profile.avatar_url || 'placeholder.png';
        });

        // Update username
        const usernameElements = document.querySelectorAll('.profile-info h3');
        usernameElements.forEach(el => {
            el.textContent = profile.username || 'Username';
        });

        // Update form fields
        const usernameInput = document.getElementById('edit-username');
        if (usernameInput) {
            usernameInput.value = profile.username || '';
        }

        // Update privacy setting
        const privacyToggle = document.getElementById('privacy-setting');
        if (privacyToggle) {
            privacyToggle.checked = profile.is_private || false;
        }
    }

    showEditProfileModal() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            // Load current values into form
            const usernameInput = document.getElementById('edit-username');
            const privacyToggle = document.getElementById('privacy-setting');
            
            // Get current profile data
            supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single()
                .then(({ data, error }) => {
                    if (!error && data) {
                        usernameInput.value = data.username || '';
                        privacyToggle.checked = data.is_private || false;
                    }
                });

            modal.classList.remove('hidden');
        }
    }

    hideEditProfileModal() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        
        try {
            this.showLoading('Updating profile...');
            
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            const username = document.getElementById('edit-username').value.trim();
            const avatarFile = document.getElementById('edit-avatar').files[0];
            const privacyToggle = document.getElementById('privacy-setting');

            // Validate username
            if (!username) {
                throw new Error('Username cannot be empty');
            }

            // First, check if the profile exists
            const { data: existingProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (profileError) {
                console.error('Error checking profile:', profileError);
                throw new Error('Failed to load profile');
            }

            if (!existingProfile) {
                // Create profile if it doesn't exist
                const { error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: this.currentUser.id,
                        username,
                        is_private: privacyToggle.checked,
                        avatar_url: this.placeholderImage
                    });

                if (createError) {
                    console.error('Error creating profile:', createError);
                    throw new Error('Failed to create profile');
                }
            } else {
                // Check for username uniqueness
                const { data: existingUsers, error: usernameError } = await supabase
                    .from('profiles')
                    .select('id')
                    .match({ username: username })
                    .neq('id', this.currentUser.id);

                if (usernameError) {
                    console.error('Error checking username:', usernameError);
                    throw new Error('Failed to check username availability');
                }

                if (existingUsers && existingUsers.length > 0) {
                    throw new Error('Username is already taken');
                }

                // Update profile
                const updates = {
                    username: username,
                    is_private: privacyToggle.checked
                };

                const { error: updateError } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', this.currentUser.id);

                if (updateError) {
                    console.error('Error updating profile:', updateError);
                    throw new Error('Failed to update profile');
                }
            }

            // Handle avatar upload if provided
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `avatar_${this.currentUser.id}_${Date.now()}.${fileExt}`;
                
                try {
                    // Upload to videos bucket (since it already exists)
                    const { error: uploadError } = await supabase.storage
                        .from('videos')
                        .upload(`avatars/${fileName}`, avatarFile, {
                            cacheControl: '3600',
                            upsert: true,
                            contentType: avatarFile.type
                        });

                    if (uploadError) {
                        console.error('Error uploading avatar:', uploadError);
                        throw new Error('Failed to upload avatar');
                    }

                    // Get the public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('videos')
                        .getPublicUrl(`avatars/${fileName}`);

                    // Update profile with new avatar URL
                    const { error: avatarUpdateError } = await supabase
                        .from('profiles')
                        .update({ avatar_url: publicUrl })
                        .eq('id', this.currentUser.id);

                    if (avatarUpdateError) {
                        console.error('Error updating avatar URL:', avatarUpdateError);
                        throw new Error('Failed to update avatar URL in profile');
                    }
                } catch (error) {
                    console.error('Avatar upload/update error:', error);
                    throw new Error(error.message || 'Failed to update avatar');
                }
            }

            // Reload profile and update UI
            await this.loadUserProfile();
            this.hideEditProfileModal();
            this.showSuccess('Profile updated successfully!');

        } catch (error) {
            console.error('Profile update error:', error);
            this.showError(error.message || 'Failed to update profile');
        } finally {
            this.hideLoading();
        }
    }

    async handleLogout() {
        try {
            this.showLoading('Logging out...');
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Error logging out:', error);
            this.showError('Failed to log out');
        } finally {
            this.hideLoading();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        try {
            this.showLoading('Logging in...');
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Clear form and hide auth forms
            e.target.reset();
            document.getElementById('auth-forms').classList.add('hidden');
            
            this.showSuccess('Logged in successfully!');
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message || 'Failed to log in');
        } finally {
            this.hideLoading();
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        try {
            this.showLoading('Creating account...');
            
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            // Sign up the user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password
            });

            if (authError) throw authError;

            // Manually create profile if it doesn't exist
            if (authData?.user) {
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();

                if (!existingProfile) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: authData.user.id,
                            username: email.split('@')[0],
                            avatar_url: this.placeholderImage,
                            is_private: false
                        });

                    if (profileError) {
                        console.error('Profile creation error:', profileError);
                        throw profileError;
                    }
                }
            }

            // Clear form and hide auth forms
            e.target.reset();
            document.getElementById('auth-forms').classList.add('hidden');
            
            this.showSuccess('Account created successfully! Please check your email to verify your account.');
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showError(error.message || 'Failed to create account');
        } finally {
            this.hideLoading();
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'auth-success';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }

    showLoading(message) {
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

    showMainApp() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
    }

    showAuthSection() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }
}

// Initialize auth
const auth = new Auth();
export default auth; 