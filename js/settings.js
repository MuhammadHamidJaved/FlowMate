// Settings Module - User Profile and Preferences Management
if (typeof window.settingsModule === 'undefined') {
    const settingsModule = (function() {
        let isInitialized = false;
        let currentUser = null;
        
        // Initialize settings module
        function init() {
            if (isInitialized) {
                loadUserProfile();
                return;
            }
            
            isInitialized = true;
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    setupEventListeners();
                    loadUserProfile();
                });
            } else {
                setupEventListeners();
                loadUserProfile();
            }
        }
        
        // Setup event listeners
        function setupEventListeners() {
            // Profile form submission
            const profileForm = document.getElementById('profile-form');
            if (profileForm) {
                profileForm.addEventListener('submit', handleProfileUpdate);
            }
            
            // Profile field change detection
            const profileName = document.getElementById('profile-name');
            const profileBio = document.getElementById('profile-bio');
            const saveProfileBtn = document.getElementById('save-profile-btn');
            
            if (profileName) {
                profileName.addEventListener('input', () => checkProfileChanges());
            }
            
            if (profileBio) {
                profileBio.addEventListener('input', () => checkProfileChanges());
            }
            
            // Dark mode toggle
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkModeToggle) {
                darkModeToggle.addEventListener('change', handleDarkModeToggle);
            }
            
            // Export data button
            const exportDataBtn = document.getElementById('export-data-btn');
            if (exportDataBtn) {
                exportDataBtn.addEventListener('click', handleExportData);
            }
            
            // Delete account button
            const deleteAccountBtn = document.getElementById('delete-account-btn');
            if (deleteAccountBtn) {
                deleteAccountBtn.addEventListener('click', handleDeleteAccount);
            }
            
            // Settings logout button
            const settingsLogoutBtn = document.getElementById('settings-logout-btn');
            if (settingsLogoutBtn) {
                settingsLogoutBtn.addEventListener('click', handleSettingsLogout);
            }
            // Change Username button
const changeUsernameBtn = document.getElementById('change-username-btn');
if (changeUsernameBtn) {
    changeUsernameBtn.addEventListener('click', openChangeUsernameModal);
}

// Change Username modal controls
const changeModal = document.getElementById('change-username-modal');
const closeChangeBtn = document.getElementById('close-change-username');
const cancelChangeBtn = document.getElementById('cancel-change-username');
const changeForm = document.getElementById('change-username-form');

if (closeChangeBtn) closeChangeBtn.addEventListener('click', closeChangeUsernameModal);
if (cancelChangeBtn) cancelChangeBtn.addEventListener('click', closeChangeUsernameModal);
if (changeForm) changeForm.addEventListener('submit', handleChangeUsernameSubmit);

        }
        
        // Check if profile has changes
        function checkProfileChanges() {
            const profileName = document.getElementById('profile-name');
            const profileBio = document.getElementById('profile-bio');
            const saveProfileBtn = document.getElementById('save-profile-btn');
            
            if (!profileName || !profileBio || !saveProfileBtn) return;
            
            // Get current values
            const currentName = profileName.value.trim();
            const currentBio = profileBio.value.trim();
            
            // Get original values (stored when profile was loaded)
            const originalName = profileName.getAttribute('data-original') || '';
            const originalBio = profileBio.getAttribute('data-original') || '';
            
            // Check if there are changes
            const hasChanges = (currentName !== originalName) || (currentBio !== originalBio);
            
            // Show/hide save button
            if (hasChanges) {
                saveProfileBtn.style.display = 'block';
            } else {
                saveProfileBtn.style.display = 'none';
            }
        }
        
        // Load user profile data
        async function loadUserProfile() {
            if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
                return;
            }
            
            currentUser = window.firebaseAuth.currentUser;
            
            // Load basic user info
            const profileName = document.getElementById('profile-name');
            const profileEmail = document.getElementById('profile-email');
            const userId = document.getElementById('user-id');
            const userUsername = document.getElementById('user-username');
            
            if (profileName) {
                profileName.value = currentUser.displayName || '';
                profileName.setAttribute('data-original', currentUser.displayName || ''); // Store original value
            }
            
            if (profileEmail) {
                profileEmail.value = currentUser.email || '';
            }
            
            if (userId) {
                userId.textContent = currentUser.uid;
            }
            
            // Load detailed user data from Firestore
            try {
                if (window.firebaseDB) {
                    const userDoc = await window.firebaseDB.collection('users').doc(currentUser.uid).get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        
                        // Update username in account section
                        if (userUsername && userData.username) {
                            userUsername.textContent = userData.username;
                        } else if (userUsername) {
                            // Fallback to display name or email prefix if username not available
                            const fallbackUsername = userData.displayName || currentUser.displayName || currentUser.email.split('@')[0];
                            userUsername.textContent = fallbackUsername;
                        }
                        
                        // Update profile fields
                        const profileBio = document.getElementById('profile-bio');
                        if (profileBio && userData.bio) {
                            profileBio.value = userData.bio;
                            profileBio.setAttribute('data-original', userData.bio); // Store original value
                        } else if (profileBio) {
                            profileBio.setAttribute('data-original', ''); // Store empty as original
                        }
                        
                        // Update account info
                        const accountCreated = document.getElementById('account-created');
                        const lastLogin = document.getElementById('last-login');
                        
                        if (accountCreated && userData.createdAt) {
                            const createdDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
                            accountCreated.textContent = createdDate.toLocaleDateString();
                        }
                        
                        if (lastLogin && userData.lastLogin) {
                            const loginDate = userData.lastLogin.toDate ? userData.lastLogin.toDate() : new Date(userData.lastLogin);
                            lastLogin.textContent = loginDate.toLocaleDateString() + ' ' + loginDate.toLocaleTimeString();
                        }
                    }
                }
            } catch (error) {
                }
        }
        
        // Handle profile form submission
        async function handleProfileUpdate(e) {
            e.preventDefault();
            
            if (!currentUser) {
                return;
            }
            
            const profileName = document.getElementById('profile-name');
            const profileBio = document.getElementById('profile-bio');
            
            const displayName = profileName ? profileName.value.trim() : '';
            const bio = profileBio ? profileBio.value.trim() : '';
            
            try {
                // Update Firebase Auth display name
                await currentUser.updateProfile({
                    displayName: displayName
                });
                
                // Update Firestore user document
                if (window.firebaseDB) {
                    await window.firebaseDB.collection('users').doc(currentUser.uid).update({
                        displayName: displayName,
                        bio: bio,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                // Update UI elements
                const avatar = document.querySelector('.avatar');
                if (avatar) {
                    const displayText = displayName ? displayName.substring(0, 2).toUpperCase() : currentUser.email.substring(0, 2).toUpperCase();
                    avatar.textContent = displayText;
                }
                
                const welcomeTitle = document.querySelector('.welcome-title');
                if (welcomeTitle) {
                    welcomeTitle.textContent = `Hello, ${displayName || currentUser.email.split('@')[0]}`;
                }
                
                showSettingsMessage('Profile updated successfully!', 'success');
                
                // Hide save button after successful update
                const saveProfileBtn = document.getElementById('save-profile-btn');
                if (saveProfileBtn) {
                    saveProfileBtn.style.display = 'none';
                }
                
                // Update original values to match current values
                const profileName = document.getElementById('profile-name');
                const profileBio = document.getElementById('profile-bio');
                
                if (profileName) {
                    profileName.setAttribute('data-original', displayName);
                }
                
                if (profileBio) {
                    profileBio.setAttribute('data-original', bio);
                }
                
            } catch (error) {
                showSettingsMessage('Failed to update profile. Please try again.', 'error');
            }
        }
        
        // Handle dark mode toggle
        function handleDarkModeToggle(e) {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
        
        // Handle data export
        async function handleExportData() {
            if (!currentUser) {
                showSettingsMessage('Please log in to export your data.', 'error');
                return;
            }
            
            // Require password confirmation
            const password = prompt('Please enter your password to export your data:');
            
            if (!password) {
                showSettingsMessage('Password is required to export your data.', 'error');
                return;
            }
            
            try {
                // Re-authenticate user with password
                const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
                await currentUser.reauthenticateWithCredential(credential);
                
                const exportData = {
                    user: {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                        photoURL: currentUser.photoURL
                    },
                    timestamp: new Date().toISOString()
                };
                
                // Add Firestore data if available
                if (window.firebaseDB) {
                    const userDoc = await window.firebaseDB.collection('users').doc(currentUser.uid).get();
                    if (userDoc.exists) {
                        exportData.profile = userDoc.data();
                    }
                    
                    // Add notes data
                    const notesSnapshot = await window.firebaseDB.collection('users').doc(currentUser.uid).collection('notes').get();
                    if (!notesSnapshot.empty) {
                        exportData.notes = notesSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                    }
                }
                
                // Create and download JSON file
                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `flowmate-data-${currentUser.uid}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showSettingsMessage('Data exported successfully!', 'success');
                } catch (error) {
                if (error.code === 'auth/wrong-password') {
                    showSettingsMessage('Incorrect password. Please try again.', 'error');
                } else if (error.code === 'auth/requires-recent-login') {
                    showSettingsMessage('Please log in again to export your data.', 'error');
                } else {
                    showSettingsMessage('Failed to export data. Please try again.', 'error');
                }
            }
        }
        
        // Handle settings logout
        async function handleSettingsLogout() {
            if (window.userSystem && typeof window.userSystem.logoutUser === 'function') {
                const result = await window.userSystem.logoutUser();
                if (result.success) {
                    showSettingsMessage('Successfully signed out!', 'success');
                    
                    // Force page refresh immediately
                    console.log('Refreshing page after settings logout...');
                    window.location.replace(window.location.href);
                } else {
                    showSettingsMessage(result.error, 'error');
                }
            } else {
                showSettingsMessage('Logout functionality not available', 'error');
            }
        }
        
        // Handle account deletion
        async function handleDeleteAccount() {
            if (!currentUser) {
                showSettingsMessage('Please log in to delete your account.', 'error');
                return;
            }
            
            const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.');
            
            if (!confirmed) {
                return;
            }
            
            // Require password confirmation
            const password = prompt('Please enter your password to confirm account deletion:');
            
            if (!password) {
                showSettingsMessage('Password is required to delete your account.', 'error');
                return;
            }
            
            try {
                // Re-authenticate user with password
                const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
                await currentUser.reauthenticateWithCredential(credential);
                
                // Delete user data from Firestore
                if (window.firebaseDB) {
                    // Delete user document
                    await window.firebaseDB.collection('users').doc(currentUser.uid).delete();
                    
                    // Delete user's notes
                    const notesSnapshot = await window.firebaseDB.collection('users').doc(currentUser.uid).collection('notes').get();
                    const deletePromises = notesSnapshot.docs.map(doc => doc.ref.delete());
                    await Promise.all(deletePromises);
                }
                
                // Delete Firebase Auth account
                await currentUser.delete();
                
                showSettingsMessage('Account deleted successfully. You will be redirected to the login page.', 'success');
                
                // Redirect to login after a short delay
                setTimeout(() => {
                    if (window.userSystem) {
                        window.userSystem.showLoginModal();
                    }
                }, 2000);
                
                } catch (error) {
                if (error.code === 'auth/wrong-password') {
                    showSettingsMessage('Incorrect password. Please try again.', 'error');
                } else if (error.code === 'auth/requires-recent-login') {
                    showSettingsMessage('Please log in again to delete your account.', 'error');
                } else {
                    showSettingsMessage('Failed to delete account. Please try again.', 'error');
                }
            }
        }
        
        // Show settings message
        function showSettingsMessage(message, type) {
            // Create a temporary message element
            const messageElement = document.createElement('div');
            messageElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                max-width: 300px;
                word-wrap: break-word;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            `;
            
            if (type === 'success') {
                messageElement.style.backgroundColor = '#10b981';
            } else {
                messageElement.style.backgroundColor = '#ef4444';
            }
            
            messageElement.textContent = message;
            document.body.appendChild(messageElement);
            
            // Remove message after 3 seconds
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 3000);
        }
        
        // Refresh user data
        function refreshUserData() {
            loadUserProfile();
        }
        
        function openChangeUsernameModal() {
    const modal = document.getElementById('change-username-modal');
    const errorEl = document.getElementById('change-username-error');
    const successEl = document.getElementById('change-username-success');
    const input = document.getElementById('new-username-input');
    if (!modal) return;
    if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
    if (successEl) { successEl.style.display = 'none'; successEl.textContent = ''; }
    if (input) { input.value = ''; input.focus(); }
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    if (document.body) document.body.style.overflow = 'hidden';
}

function closeChangeUsernameModal() {
    const modal = document.getElementById('change-username-modal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.add('hidden');
    if (document.body) document.body.style.overflow = '';
}

async function handleChangeUsernameSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-change-username');
    const input = document.getElementById('new-username-input');
    const errorEl = document.getElementById('change-username-error');
    const successEl = document.getElementById('change-username-success');

    if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
        if (errorEl) { errorEl.textContent = 'Please sign in first.'; errorEl.style.display = 'block'; }
        return;
    }

    const username = (input?.value || '').trim();
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    if (!re.test(username)) {
        if (errorEl) { errorEl.textContent = 'Invalid username. Use 3–20 letters/numbers/_'; errorEl.style.display = 'block'; }
        return;
    }

    const user = window.firebaseAuth.currentUser;
    const currentDisplay = user.displayName || (user.email ? user.email.split('@')[0] : '');
    if (username.toLowerCase() === currentDisplay.toLowerCase()) {
        if (errorEl) { errorEl.textContent = 'This is already your current name.'; errorEl.style.display = 'block'; }
        return;
    }

    // Check uniqueness in Firestore
    try {
        if (!window.firebaseDB) throw new Error('Firestore not available');
        const snap = await window.firebaseDB.collection('users')
            .where('username', '==', username)
            .limit(1)
            .get();
        if (!snap.empty) {
            if (errorEl) { errorEl.textContent = 'Username is taken. Choose another.'; errorEl.style.display = 'block'; }
            return;
        }
    } catch (err) {
        console.error('Username check failed:', err);
        if (errorEl) { errorEl.textContent = 'Could not verify availability. Try again.'; errorEl.style.display = 'block'; }
        return;
    }

    const oldLabel = submitBtn?.textContent;
    if (submitBtn) { submitBtn.textContent = 'Saving...'; submitBtn.disabled = true; }

    try {
        // 1) Update Auth displayName
        await user.updateProfile({ displayName: username });

        // 2) Update Firestore users/{uid}
        await window.firebaseDB.collection('users').doc(user.uid).update({
            username,
            displayName: username,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3) Update UI instantly
        const userUsernameEl = document.getElementById('user-username');
        if (userUsernameEl) userUsernameEl.textContent = username;

        const profileName = document.getElementById('profile-name');
        if (profileName) {
            profileName.value = username;
            profileName.setAttribute('data-original', username);
        }

        const avatar = document.querySelector('.avatar');
        if (avatar) {
            avatar.textContent = (username.substring(0,2) || 'U').toUpperCase();
        }

        const welcomeTitle = document.querySelector('.welcome-title');
        if (welcomeTitle) welcomeTitle.textContent = `Hello, ${username}`;

        if (successEl) { successEl.textContent = 'Username updated successfully.'; successEl.style.display = 'block'; }
        setTimeout(() => { closeChangeUsernameModal(); }, 400);
    } catch (err) {
        console.error('Change username failed:', err);
        if (errorEl) { errorEl.textContent = 'Update failed. Please try again.'; errorEl.style.display = 'block'; }
    } finally {
        if (submitBtn) { submitBtn.textContent = oldLabel || 'Save'; submitBtn.disabled = false; }
    }
}


        // Return public methods
        return {
            init: init,
            loadUserProfile: loadUserProfile,
            refreshUserData: refreshUserData,
            showSettingsMessage: showSettingsMessage
        };
    })();
    
    // Make settingsModule available globally
    window.settingsModule = settingsModule;
} 