// User Authentication and Management System

// Define global functions immediately to prevent reference errors
window.showLoginModal = function() {
    // Use the module version if available, otherwise fallback
    if (window.userSystem && typeof window.userSystem.showLoginModal === 'function') {
        window.userSystem.showLoginModal();
    } else {
        // Fallback implementation
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
            loginModal.style.display = 'flex';
        }
    }
};

window.handleAvatarClick = function() {
    const isAuthenticated = window.firebaseAuth && window.firebaseAuth.currentUser;
    if (isAuthenticated) {
        if (window.navigationModule && typeof window.navigationModule.showPage === 'function') {
            window.navigationModule.showPage('settings-page');
        }
    } else {
        // Show login modal directly
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
            loginModal.style.display = 'flex';
        }
    }
};

window.handleViewAllClick = function(feature) {
    const isAuthenticated = window.firebaseAuth && window.firebaseAuth.currentUser;
    if (isAuthenticated) {
        if (window.navigationModule && typeof window.navigationModule.showPage === 'function') {
            if (feature === 'schedule') {
                window.navigationModule.showPage('schedule-page');
            } else if (feature === 'notes') {
                window.navigationModule.showPage('notes-page');
            }
        }
    } else {
        // Show login modal directly
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
            loginModal.style.display = 'flex';
        }
    }
};

if (typeof window.userSystem === 'undefined') {
    const userSystem = (function() {
        let currentUser = null;
        let isInitialized = false;
        let authStateListener = null;
        let isAuthStateChanging = false;
        let isAnonymousMode = false;
        
        // Check if user is logged in
        function checkAuthState() {
            console.log('=== Auth State Check Started ===');
            console.log('Timestamp:', new Date().toISOString());
            
            if (!window.firebaseAuth) {
                console.error('❌ Firebase Auth not available');
                hideLoadingAndShowApp(); // Allow app to work without Firebase
                return;
            }
            console.log('✓ Firebase Auth is available');
            
            // Check for redirect result first (for iOS Google Sign-In)
            console.log('🔄 Checking for redirect result...');
            firebaseAuth.getRedirectResult().then(function(result) {
                console.log('Redirect result received:', {
                    hasResult: !!result,
                    hasUser: !!(result && result.user),
                    userEmail: result?.user?.email
                });
                
                if (result && result.user) {
                    console.log('✅ Redirect sign-in successful:', result.user.email);
                    // Handle successful redirect sign-in
                    currentUser = result.user;
                    hideLoadingAndShowApp();
                    updateUIForLoggedInUser(result.user);
                    loadUserData(result.user.uid);
                    hideLoginModal();
                    return;
                }
                
                console.log('No redirect result, proceeding with normal auth state check');
                // Continue with normal auth state checking
                proceedWithAuthStateCheck();
            }).catch(function(error) {
                console.error('❌ Redirect result error:', {
                    code: error.code,
                    message: error.message,
                    stack: error.stack
                });
                // Continue with normal auth state checking even if redirect fails
                proceedWithAuthStateCheck();
            });
        }
        
        function proceedWithAuthStateCheck() {
            console.log('=== Proceeding with Auth State Check ===');
            
            // Check if there's a shared note link in URL
            const urlParams = new URLSearchParams(window.location.search);
            const shareId = urlParams.get('share');
            console.log('Shared note ID from URL:', shareId);
            
            // Remove existing listener to prevent duplicates
            if (authStateListener) {
                console.log('Removing existing auth state listener');
                firebaseAuth.onAuthStateChanged(authStateListener);
            }
            
            authStateListener = function(user) {
                console.log('🔔 Auth state changed:', {
                    hasUser: !!user,
                    userEmail: user?.email,
                    isAuthStateChanging: isAuthStateChanging
                });
                
                if (isAuthStateChanging) {
                    console.log('Auth state is already changing, skipping...');
                    return;
                }
                
                isAuthStateChanging = true;
                console.log('Setting isAuthStateChanging to true');
                
                try {
                    if (user) {
                        console.log('✅ User is signed in:', {
                            email: user.email,
                            displayName: user.displayName,
                            uid: user.uid
                        });
                        // User is signed in
                        currentUser = user;
                        hideLoadingAndShowApp();
                        updateUIForLoggedInUser(user);
                        loadUserData(user.uid);
                        
                        // Ensure login modal is hidden
                        hideLoginModal();
                    } else {
                        console.log('❌ User is signed out');
                        // User is signed out
                        currentUser = null;
                        
                        // If there's a shared note link, show login modal first
                        if (shareId) {
                            console.log('Shared note detected, showing login modal');
                            hideLoadingAndShowLogin();
                        } else {
                            console.log('No shared note, allowing anonymous browsing');
                            // Allow anonymous browsing for regular app access
                            hideLoadingAndShowApp();
                            updateUIForAnonymousUser();
                        }
                    }
                } catch (error) {
                    console.error('❌ Auth state change processing error:', {
                        code: error.code,
                        message: error.message,
                        stack: error.stack
                    });
                    // Allow app to work even with auth errors
                    hideLoadingAndShowApp();
                    updateUIForAnonymousUser();
                } finally {
                    isAuthStateChanging = false;
                    console.log('Setting isAuthStateChanging to false');
                }
            };
            
            // Set up the auth state listener
            console.log('🎧 Setting up auth state listener...');
            firebaseAuth.onAuthStateChanged(authStateListener, function(error) {
                console.error('❌ Auth state change listener error:', {
                    code: error.code,
                    message: error.message,
                    stack: error.stack
                });
                isAuthStateChanging = false;
                // Allow app to work even with auth errors
                hideLoadingAndShowApp();
                updateUIForAnonymousUser();
            });
            
            // Also check current user immediately
            const existingUser = firebaseAuth.currentUser;
            console.log('Current user check:', {
                hasCurrentUser: !!existingUser,
                userEmail: existingUser?.email
            });
            
            if (existingUser) {
                console.log('Existing user found, calling auth state listener');
                authStateListener(existingUser);
            } else {
                // If no current user and there's a shared note link, show login modal
                if (shareId) {
                    console.log('No current user but shared note exists, showing login');
                    hideLoadingAndShowLogin();
                } else {
                    console.log('No current user and no shared note, allowing anonymous access');
                    // Allow anonymous browsing for regular app access
                    hideLoadingAndShowApp();
                    updateUIForAnonymousUser();
                }
            }
        }
        
        // Update UI for logged in user
        function updateUIForLoggedInUser(user) {
            
            try {
                // Reset anonymous mode flag
                isAnonymousMode = false;
                
                // Update header avatar
                const avatar = document.querySelector('.avatar');
                if (avatar) {
                    const displayText = user.displayName ? user.displayName.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase();
                    avatar.textContent = displayText;
                }
            
                            // Update welcome title with username
                const welcomeTitle = document.querySelector('.welcome-title');
                if (welcomeTitle) {
                    const displayName = user.displayName || user.email.split('@')[0];
                    welcomeTitle.textContent = `Hello, ${displayName}`;
                }
                
                // Reset navigation to enable all features
                const navItems = document.querySelectorAll('.nav-item');
                navItems.forEach(item => {
                    item.classList.remove('disabled');
                    // Reset onclick handlers to default navigation behavior
                    const navId = item.id;
                    if (navId === 'nav-home') {
                        item.onclick = () => {
                            if (window.navigationModule) {
                                window.navigationModule.showPage('home-page');
                            }
                        };
                    } else if (navId === 'nav-calculators') {
                        item.onclick = () => {
                            if (window.navigationModule) {
                                window.navigationModule.showPage('calculators-page');
                            }
                        };
                    } else if (navId === 'nav-notes') {
                        item.onclick = () => {
                            if (window.navigationModule) {
                                window.navigationModule.showPage('notes-page');
                            }
                        };
                    } else if (navId === 'nav-schedule') {
                        item.onclick = () => {
                            if (window.navigationModule) {
                                window.navigationModule.showPage('schedule-page');
                            }
                        };
                    } else if (navId === 'nav-settings') {
                        item.onclick = () => {
                            if (window.navigationModule) {
                                window.navigationModule.showPage('settings-page');
                            }
                        };
                    }
                });
            
            // Show user info in settings
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = user.email;
            }
            
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = user.displayName || 'User';
            }
            
            // Hide login modal if open
            hideLoginModal();
            
            // Ensure loading overlay is hidden
            const loadingOverlay = document.getElementById('app-loading');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
                
                // Navigate to home page after successful login
                if (window.navigationModule && typeof window.navigationModule.showPage === 'function') {
                    window.navigationModule.showPage('home-page');
                } else {
                    // Fallback if navigation module is not available
                    const homePage = document.getElementById('home-page');
                    if (homePage) {
                        document.querySelectorAll('.page').forEach(page => {
                            page.classList.remove('active');
                        });
                        homePage.classList.add('active');
                    }
                }
            
            // Refresh home page data
            if (window.homeModule && typeof window.homeModule.refresh === 'function') {
                window.homeModule.refresh();
            }
            
            // Refresh settings page if it's currently active
            if (window.settingsModule && document.getElementById('settings-page').classList.contains('active')) {
                window.settingsModule.refreshUserData();
                }
            } catch (error) {
                console.error('Error updating UI for logged in user:', error);
            }
        }
        
        // Hide loading overlay and show login modal
        function hideLoadingAndShowLogin() {
            try {
                const loadingOverlay = document.getElementById('app-loading');
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
                
                // Check if user is already authenticated before showing login modal
                if (window.firebaseAuth && window.firebaseAuth.currentUser) {
                    hideLoadingAndShowApp();
                    return;
                }
                
                showLoginModal();
            } catch (error) {
                console.error('Error hiding loading and showing login:', error);
            }
        }
        
        // Hide loading overlay and show main app
        function hideLoadingAndShowApp() {
            try {
            const loadingOverlay = document.getElementById('app-loading');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            // Handle pending shared note if exists
            if (window.pendingSharedNoteId) {
                handlePendingSharedNote(window.pendingSharedNoteId);
                window.pendingSharedNoteId = null;
                }
            } catch (error) {
                console.error('Error hiding loading and showing app:', error);
            }
        }
        

        // Handle pending shared note after authentication
        async function handlePendingSharedNote(shareId) {
            try {
                if (window.notesSystem && typeof window.notesSystem.loadSharedNote === 'function') {
                    const sharedNote = await window.notesSystem.loadSharedNote(shareId);
                    
                    if (sharedNote) {
                        // Show the shared note
                        window.notesSystem.showSharedNote(sharedNote);
                        
                        // Navigate to note detail page
                        if (window.navigationModule) {
                            window.navigationModule.showPage('note-detail-page');
                        }
                        
                        // Clear the URL parameter
                        const newUrl = window.location.href.split('?')[0];
                        window.history.replaceState({}, document.title, newUrl);
                        
                        // Show success message
                        if (window.notesSystem.showShareSuccess) {
                            window.notesSystem.showShareSuccess('Shared note loaded successfully!');
                        }
                    } else {
                        // Show error message
                        if (window.notesSystem.showShareError) {
                            window.notesSystem.showShareError('Shared note not found or no longer available.');
                        } else {
                            alert('Shared note not found or no longer available.');
                        }
                        
                        // Clear the URL parameter
                        const newUrl = window.location.href.split('?')[0];
                        window.history.replaceState({}, document.title, newUrl);
                    }
                } else {
                    alert('Notes system not available. Please try again.');
                }
            } catch (error) {
                console.error('Error handling pending shared note:', error);
                
                // Show error message
                if (window.notesSystem && window.notesSystem.showShareError) {
                    window.notesSystem.showShareError('Error loading shared note. Please try again.');
                } else {
                    alert('Error loading shared note. Please try again.');
                }
            }
        }
        
        // Handle shared note for anonymous users
        async function handleSharedNoteForAnonymousUser(shareId) {
            // Set up a timeout to force remove loading after 10 seconds
            const loadingTimeout = setTimeout(() => {
                if (window.notesSystem && window.notesSystem.removeShareLoading) {
                    window.notesSystem.removeShareLoading();
                }
            }, 10000);
            
            try {
                if (window.notesSystem && typeof window.notesSystem.loadSharedNote === 'function') {
                    // Show loading state
                    if (window.notesSystem.showShareLoading) {
                        window.notesSystem.showShareLoading('Loading shared note...');
                    }
                    
                    const sharedNote = await window.notesSystem.loadSharedNote(shareId);
                    
                    // Clear the timeout since we're removing loading normally
                    clearTimeout(loadingTimeout);
                    
                    // Remove loading state
                    if (window.notesSystem.removeShareLoading) {
                        window.notesSystem.removeShareLoading();
                    }
                    
                    if (sharedNote) {
                        // Show the shared note with anonymous user restrictions
                        window.notesSystem.showSharedNoteForAnonymousUser(sharedNote);
                        
                        // Navigate to note detail page
                        if (window.navigationModule) {
                            window.navigationModule.showPage('note-detail-page');
                        }
                        
                        // Clear the URL parameter
                        const newUrl = window.location.href.split('?')[0];
                        window.history.replaceState({}, document.title, newUrl);
                        
                        // Show success message
                        if (window.notesSystem.showShareSuccess) {
                            window.notesSystem.showShareSuccess('Shared note loaded successfully!');
                        }
                    } else {
                        // Show error message
                        if (window.notesSystem.showShareError) {
                            window.notesSystem.showShareError('Shared note not found or no longer available.');
                        } else {
                            alert('Shared note not found or no longer available.');
                        }
                        
                        // Clear the URL parameter
                        const newUrl = window.location.href.split('?')[0];
                        window.history.replaceState({}, document.title, newUrl);
                    }
                } else {
                    alert('Notes system not available. Please try again.');
                }
            } catch (error) {
                console.error('Error handling shared note for anonymous user:', error);
                
                // Clear the timeout since we're handling the error
                clearTimeout(loadingTimeout);
                
                // Remove loading state on error
                if (window.notesSystem && window.notesSystem.removeShareLoading) {
                    window.notesSystem.removeShareLoading();
                }
                
                // Show error message
                if (window.notesSystem && window.notesSystem.showShareError) {
                    window.notesSystem.showShareError('Error loading shared note. Please try again.');
                } else {
                    alert('Error loading shared note. Please try again.');
                }
            }
        }
        
        // Update UI for anonymous user (browsing without login)
        function updateUIForAnonymousUser() {
            try {
                // Set anonymous mode flag
                isAnonymousMode = true;
                
                // Update header avatar
                const avatar = document.querySelector('.avatar');
                if (avatar) {
                    avatar.textContent = '👤';
                    avatar.title = 'Sign in to access your account';
                }
                
                // Update welcome title
                const welcomeTitle = document.querySelector('.welcome-title');
                if (welcomeTitle) {
                    welcomeTitle.textContent = 'Welcome to FlowMate';
                }
                
                // Clear user info in settings
                const userEmailElement = document.getElementById('user-email');
                if (userEmailElement) {
                    userEmailElement.textContent = 'Not signed in';
                }
                
                const userNameElement = document.getElementById('user-name');
                if (userNameElement) {
                    userNameElement.textContent = 'Guest User';
                }
                
                // Hide login modal if it's open
                hideLoginModal();
                
                // Update navigation to show limited features
                updateNavigationForAnonymousUser();
                
            } catch (error) {
                console.error('Error updating UI for anonymous user:', error);
            }
        }
        
        // Update UI for logged out user (when user explicitly logs out)
        function updateUIForLoggedOutUser() {
            try {
                // Update header avatar
                const avatar = document.querySelector('.avatar');
                if (avatar) {
                    avatar.textContent = '👤';
                    avatar.title = 'Sign in to access your account';
                }
                
                // Update welcome title
                const welcomeTitle = document.querySelector('.welcome-title');
                if (welcomeTitle) {
                    welcomeTitle.textContent = 'Welcome to FlowMate';
                }
                
                // Clear user info in settings
                const userEmailElement = document.getElementById('user-email');
                if (userEmailElement) {
                    userEmailElement.textContent = 'Not signed in';
                }
                
                const userNameElement = document.getElementById('user-name');
                if (userNameElement) {
                    userNameElement.textContent = 'Guest User';
                }
                
                // Show login modal
                showLoginModal();
            } catch (error) {
                console.error('Error updating UI for logged out user:', error);
            }
        }
        
        // Update navigation for anonymous users
        function updateNavigationForAnonymousUser() {
            try {
                // Show limited features for anonymous users
                // Calculators and shared notes are available
                // Notes, Schedule, and Settings require login
                
                // Update navigation items to show login prompts
                const navItems = document.querySelectorAll('.nav-item');
                navItems.forEach(item => {
                    const navId = item.id;
                    
                    // Enable calculators (always available)
                    if (navId === 'nav-calculators') {
                        item.classList.remove('disabled');
                        item.onclick = () => {
                            if (window.navigationModule) {
                                window.navigationModule.showPage('calculators-page');
                            }
                        };
                    }
                    
                    // Enable home (always available)
                    if (navId === 'nav-home') {
                        item.classList.remove('disabled');
                        item.onclick = () => {
                            if (window.navigationModule) {
                                window.navigationModule.showPage('home-page');
                            }
                        };
                    }
                    
                    // Disable notes for anonymous users
                    if (navId === 'nav-notes') {
                        item.classList.add('disabled');
                        item.onclick = () => {
                            showLoginPrompt('notes');
                        };
                    }
                    
                    // Disable schedule for anonymous users
                    if (navId === 'nav-schedule') {
                        item.classList.add('disabled');
                        item.onclick = () => {
                            showLoginPrompt('schedule');
                        };
                    }
                    
                    // Disable settings for anonymous users
                    if (navId === 'nav-settings') {
                        item.classList.add('disabled');
                        item.onclick = () => {
                            showLoginPrompt('settings');
                        };
                    }
                });
                
                // Also update the navigation module if it exists
                if (window.navigationModule && typeof window.navigationModule.updateActiveNav === 'function') {
                    window.navigationModule.updateActiveNav('home');
                }
                
                // Ensure home page is active
                const homeNav = document.getElementById('nav-home');
                if (homeNav) {
                    homeNav.classList.add('active');
                }
                
            } catch (error) {
                console.error('Error updating navigation for anonymous user:', error);
            }
        }
        
        // Show login prompt for specific features
        function showLoginPrompt(feature) {
            const featureNames = {
                'notes': 'Notes',
                'schedule': 'Schedule',
                'settings': 'Settings'
            };
            
            const featureName = featureNames[feature] || 'this feature';
            
            // Show a toast notification
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
            toast.innerHTML = `
                <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Sign in to access ${featureName}</span>
                </div>
            `;
            document.body.appendChild(toast);
            
            // Animate in
            setTimeout(() => {
                toast.classList.remove('translate-x-full');
            }, 100);
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                toast.classList.add('translate-x-full');
                setTimeout(() => {
                    if (toast.parentNode) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }, 3000);
            
            // Show login modal after a short delay
            setTimeout(() => {
                showLoginModal();
            }, 500);
        }
        
        // Show login modal
        function showLoginModal() {
            // Check if there's a shared note link
            const urlParams = new URLSearchParams(window.location.search);
            const shareId = urlParams.get('share');
            
            // Update login modal text based on context
            if (shareId) {
                updateLoginModalForSharedNote();
            } else {
                updateLoginModalForRegularAccess();
            }
            
            // Show iPad help message if on iPad
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const iPadHelpMessage = document.getElementById('ipad-help-message');
            if (isIOS && iPadHelpMessage) {
                iPadHelpMessage.style.display = 'block';
            } else if (iPadHelpMessage) {
                iPadHelpMessage.style.display = 'none';
            }
            
            // Use modal manager if available
            if (window.modalManager && typeof window.modalManager.showModal === 'function') {
                window.modalManager.showModal('login-modal');
            } else {
                // Fallback to direct DOM manipulation
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.classList.remove('hidden');
                loginModal.style.display = 'flex';
                } else {
                    console.error('Login modal not found');
                }
            }
            
            // Scroll login modal to top
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                const modalContent = loginModal.querySelector('div');
                if (modalContent) {
                    modalContent.scrollTop = 0;
                }
                }
                
                // Reset forms
                const loginForm = document.getElementById('email-login-form');
                const registerForm = document.getElementById('email-register-form');
                const resetForm = document.getElementById('reset-password-form');
                if (loginForm) loginForm.reset();
                if (registerForm) registerForm.reset();
                if (resetForm) resetForm.reset();
                
                // Show login form by default
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('forgot-password-form').classList.add('hidden');
        }
        
        // Hide login modal
        function hideLoginModal() {
            // Use modal manager if available
            if (window.modalManager && typeof window.modalManager.hideModal === 'function') {
                window.modalManager.hideModal('login-modal');
            } else {
                // Fallback to direct DOM manipulation
                const loginModal = document.getElementById('login-modal');
                if (loginModal) {
                    loginModal.classList.add('hidden');
                    loginModal.style.display = 'none';
                    loginModal.style.visibility = 'hidden';
                    loginModal.style.opacity = '0';
                    loginModal.style.pointerEvents = 'none';
                }
            }
            
            // Also ensure body scroll is restored
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }
        
        // Update login modal for shared note access
        function updateLoginModalForSharedNote() {
            const welcomeTitle = document.querySelector('#login-form h2');
            const welcomeSubtitle = document.querySelector('#login-form p');
            const guestText = document.querySelector('#continue-as-guest-btn + p');
            
            if (welcomeTitle) {
                welcomeTitle.textContent = 'View Shared Note';
            }
            if (welcomeSubtitle) {
                welcomeSubtitle.textContent = 'Sign in to copy this note to your account or continue as guest to view only';
            }
            if (guestText) {
                guestText.textContent = 'View the shared note without copying to your account';
            }
        }
        
        // Update login modal for regular access
        function updateLoginModalForRegularAccess() {
            const welcomeTitle = document.querySelector('#login-form h2');
            const welcomeSubtitle = document.querySelector('#login-form p');
            const guestText = document.querySelector('#continue-as-guest-btn + p');
            
            if (welcomeTitle) {
                welcomeTitle.textContent = 'Welcome to FlowMate';
            }
            if (welcomeSubtitle) {
                welcomeSubtitle.textContent = 'Please sign in to your account';
            }
            if (guestText) {
                guestText.textContent = 'Browse calculators and view shared notes without an account';
            }
        }
        
        // Register new user
        async function registerUser(email, password, username) {
            try {
                if (!window.firebaseAuth) {
                    throw new Error('Firebase Auth not available');
                }
                
                // Normalize email to lowercase for case-insensitive login
                const normalizedEmail = email.toLowerCase().trim();
                
                // Validate username format
                const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
                if (!usernameRegex.test(username)) {
                    return { 
                        success: false, 
                        error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.' 
                    };
                }
                
                // Check if username is already taken
                if (window.firebaseDB) {
                    try {
                        const usernameQuery = await firebaseDB.collection('users')
                            .where('username', '==', username)
                            .limit(1)
                            .get();
                        
                        if (!usernameQuery.empty) {
                            return { success: false, error: 'Username is already taken. Please choose a different username.' };
                        }
                    } catch (error) {
                        console.error('Error checking username uniqueness:', error);
                        return { success: false, error: 'Error checking username availability. Please try again.' };
                    }
                }
                
                const userCredential = await firebaseAuth.createUserWithEmailAndPassword(normalizedEmail, password);
                const user = userCredential.user;
                
                // Update profile with username
                await user.updateProfile({
                    displayName: username
                });
                
                // Create user document in Firestore
                try {
                    if (window.firebaseDB) {
                        await firebaseDB.collection('users').doc(user.uid).set({
                            email: normalizedEmail,  // Store normalized email
                            originalEmail: email,    // Store original email for display
                            username: username,
                            displayName: username,
                            bio: '',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } catch (firestoreError) {
                    // Firestore error (expected if not enabled)
                }
                
                return { success: true, user: user };
            } catch (error) {
                console.error('Registration error:', error);
                let errorMessage = 'Registration failed. Please try again.';
                
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'An account with this email already exists.';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = 'Password should be at least 6 characters long.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Please enter a valid email address.';
                }
                
                return { success: false, error: errorMessage };
            }
        }
        
        // Login user with email or username
        async function loginUser(emailOrUsername, password, useUsername = false) {
            
            try {
                if (!window.firebaseAuth) {
                    throw new Error('Firebase Auth not available');
                }
                
                // Auto-detect if input is email or username if not explicitly specified
                if (useUsername === false) {
                    const isEmail = emailOrUsername.includes('@') && emailOrUsername.includes('.');
                    const isUsername = /^[a-zA-Z0-9_]{3,20}$/.test(emailOrUsername);
                    
                    if (!isEmail && !isUsername) {
                        return { 
                            success: false, 
                            error: 'Please enter a valid email address or username.' 
                        };
                    }
                    
                    useUsername = !isEmail;
                }
                
                // Validate username format if using username login
                if (useUsername) {
                    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
                    if (!usernameRegex.test(emailOrUsername)) {
                        return { 
                            success: false, 
                            error: 'Invalid username format. Username must be 3-20 characters long and contain only letters, numbers, and underscores.' 
                        };
                    }
                }
                
                let userEmail = emailOrUsername;
                
                // If using username, find the corresponding email
                if (useUsername && window.firebaseDB) {
                    try {
                        const usernameQuery = await firebaseDB.collection('users')
                            .where('username', '==', emailOrUsername)
                            .limit(1)
                            .get();
                        
                        if (usernameQuery.empty) {
                            return { success: false, error: 'No account found with this username.' };
                        }
                        
                        const userDoc = usernameQuery.docs[0];
                        userEmail = userDoc.data().email;
                    } catch (error) {
                        console.error('Error finding username:', error);
                        return { success: false, error: 'Error finding username. Please try again.' };
                    }
                } else {
                    // Normalize email to lowercase for case-insensitive login
                    userEmail = userEmail.toLowerCase().trim();
                }
                
                const userCredential = await firebaseAuth.signInWithEmailAndPassword(userEmail, password);
                const user = userCredential.user;
                
                // Update last login
                try {
                    if (window.firebaseDB) {
                        await firebaseDB.collection('users').doc(user.uid).update({
                            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } catch (firestoreError) {
                    // Firestore error (expected if not enabled)
                }
                return { success: true, user: user };
            } catch (error) {
                console.error('Login error:', error);
                let errorMessage = 'Login failed. Please check your credentials.';
                
                if (error.code === 'auth/user-not-found') {
                    errorMessage = useUsername ? 'No account found with this username.' : 'No account found with this email address.';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Incorrect password. Please try again.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = useUsername ? 'Invalid username format.' : 'Please enter a valid email address.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Too many failed attempts. Please try again later.';
                }
                
                return { success: false, error: errorMessage };
            }
        }
        
        // Send password reset email
        async function sendPasswordResetEmail(email) {
            try {
                if (!window.firebaseAuth) {
                    throw new Error('Firebase Auth not available');
                }
                
                // Normalize email to lowercase
                const normalizedEmail = email.toLowerCase().trim();
                
                await firebaseAuth.sendPasswordResetEmail(normalizedEmail);
                return { success: true, message: 'Password reset email sent! Check your inbox.' };
            } catch (error) {
                console.error('Password reset error:', error);
                let errorMessage = 'Failed to send reset email. Please try again.';
                
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'No account found with this email address.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Please enter a valid email address.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Too many requests. Please try again later.';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = 'Network error. Please check your internet connection.';
                }
                
                return { success: false, error: errorMessage };
            }
        }
        
        // Google sign in
        async function signInWithGoogle() {
            console.log('=== Google Sign-In Started ===');
            console.log('Timestamp:', new Date().toISOString());
            
            try {
                console.log('Checking Firebase dependencies...');
                if (!window.firebaseAuth || !window.googleProvider) {
                    console.error('Missing dependencies:', {
                        firebaseAuth: !!window.firebaseAuth,
                        googleProvider: !!window.googleProvider
                    });
                    throw new Error('Firebase Auth or Google Provider not available');
                }
                console.log('✓ Firebase dependencies available');
                
                let result;
                
                // iPad/iOS specific handling
                const isIOS = window.isIOS || /iPad|iPhone|iPod/.test(navigator.userAgent);
                const isPrivateBrowsing = window.isPrivateBrowsing || false;
                
                console.log('Device information:', {
                    isIOS: isIOS,
                    isPrivateBrowsing: isPrivateBrowsing,
                    userAgent: navigator.userAgent,
                    cookiesEnabled: navigator.cookieEnabled,
                    onLine: navigator.onLine
                });
                
                if (isIOS) {
                    console.log('🍎 iOS device detected - using iOS-specific flow');
                    // For iOS devices, use redirect flow for better compatibility
                    try {
                        console.log('Attempting popup method first...');
                        result = await firebaseAuth.signInWithPopup(googleProvider);
                        console.log('✓ Popup method successful!', result?.user?.email);
                    } catch (popupError) {
                        console.warn('❌ Popup failed on iOS, error details:', {
                            code: popupError.code,
                            message: popupError.message,
                            stack: popupError.stack
                        });
                        
                        console.log('Trying redirect method as fallback...');
                        
                        // If popup fails, fall back to redirect
                        await firebaseAuth.signInWithRedirect(googleProvider);
                        console.log('Redirect initiated, checking for result...');
                        
                        // Handle redirect result
                        result = await firebaseAuth.getRedirectResult();
                        console.log('Redirect result:', result);
                        
                        if (!result || !result.user) {
                            console.error('❌ Redirect sign-in failed or was cancelled');
                            throw new Error('Redirect sign-in was cancelled or failed');
                        }
                        console.log('✓ Redirect method successful!', result?.user?.email);
                    }
                } else {
                    console.log('🖥️ Non-iOS device - using popup method');
                    // For non-iOS devices, use popup
                    result = await firebaseAuth.signInWithPopup(googleProvider);
                    console.log('✓ Popup method successful!', result?.user?.email);
                }
                
                const user = result.user;
                console.log('✓ User authentication successful:', {
                    email: user.email,
                    displayName: user.displayName,
                    uid: user.uid,
                    photoURL: user.photoURL
                });
                
                // Check if user document exists
                if (window.firebaseDB && !isPrivateBrowsing) {
                    console.log('💾 Attempting to save/update user document in Firestore...');
                    try {
                        const userDoc = await firebaseDB.collection('users').doc(user.uid).get();
                        console.log('User document exists:', userDoc.exists);
                        
                        if (!userDoc.exists) {
                            console.log('Creating new user document...');
                            // Create user document for new Google user
                            await firebaseDB.collection('users').doc(user.uid).set({
                                email: user.email,
                                username: user.displayName || user.email.split('@')[0],
                                displayName: user.displayName || user.email.split('@')[0],
                                bio: '',
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                                photoURL: user.photoURL
                            });
                            console.log('✓ New user document created');
                        } else {
                            console.log('Updating existing user document...');
                            // Update last login for existing user
                            await firebaseDB.collection('users').doc(user.uid).update({
                                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            console.log('✓ User document updated');
                        }
                    } catch (firestoreError) {
                        console.warn('⚠️ Firestore operation failed (possibly in private mode):', {
                            code: firestoreError.code,
                            message: firestoreError.message,
                            isPrivateBrowsing: isPrivateBrowsing
                        });
                    }
                } else {
                    console.log('Skipping Firestore operations:', {
                        firestoreAvailable: !!window.firebaseDB,
                        isPrivateBrowsing: isPrivateBrowsing
                    });
                }
                
                // Update current user
                currentUser = user;
                console.log('✓ Current user updated');
                
                // Update UI for the logged in user
                console.log('🖼️ Updating UI for logged in user...');
                updateUIForLoggedInUser(user);
                
                console.log('=== Google Sign-In Completed Successfully ===');
                return { success: true, user: user };
            } catch (error) {
                console.error('=== Google Sign-In Error ===');
                console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
                
                let errorMessage = 'Google sign-in failed. Please try again.';
                
                if (error.code === 'auth/popup-closed-by-user') {
                    console.log('User closed the popup');
                    errorMessage = 'Sign-in was cancelled.';
                } else if (error.code === 'auth/popup-blocked') {
                    console.log('Popup was blocked by browser');
                    errorMessage = 'Sign-in popup was blocked. Please allow popups for this site or try again.';
                } else if (error.code === 'auth/account-exists-with-different-credential') {
                    console.log('Account exists with different credential');
                    errorMessage = 'An account already exists with this email using a different sign-in method.';
                } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
                    console.log('Operation not supported in this environment');
                    errorMessage = 'Google sign-in is not supported in this browser environment. Please try email sign-in instead.';
                } else if (error.code === 'auth/unauthorized-domain') {
                    console.log('Unauthorized domain error');
                    errorMessage = 'This domain is not authorized for sign-in. Please contact support.';
                } else if (error.message === 'Redirect sign-in was cancelled or failed') {
                    console.log('Redirect sign-in cancelled');
                    errorMessage = 'Sign-in was cancelled. Please try again.';
                } else {
                    console.log('Unknown error:', error);
                }
                
                console.error('Final error message to user:', errorMessage);
                return { success: false, error: errorMessage };
            }
        }
        

        
        // Logout user
        async function logoutUser() {
            try {
                if (!window.firebaseAuth) {
                    throw new Error('Firebase Auth not available');
                }
                
                await firebaseAuth.signOut();
                return { success: true };
            } catch (error) {
                console.error('Logout error:', error);
                return { success: false, error: 'Logout failed. Please try again.' };
            }
        }
        
        // Load user data from Firestore
        async function loadUserData(userId) {
            try {
                if (!window.firebaseDB) {
                    return null;
                }
                
                const userDoc = await firebaseDB.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    return userData;
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
            return null;
        }
        
        // Update user profile
        async function updateUserProfile(userId, profileData) {
            try {
                if (!window.firebaseDB) {
                    throw new Error('Firestore not available');
                }
                
                await firebaseDB.collection('users').doc(userId).update({
                    ...profileData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                return { success: true };
            } catch (error) {
                console.error('Error updating user profile:', error);
                return { success: false, error: error.message };
            }
        }
        
        // Get current user
        function getCurrentUser() {
            return currentUser;
        }
        
        // Initialize user system
        function init() {
            console.log('=== User System Initialization Started ===');
            console.log('Timestamp:', new Date().toISOString());
            
            if (isInitialized || window.userSystemInitialized) {
                console.log('❌ User system already initialized, skipping...');
                return;
            }
            
            isInitialized = true;
            window.userSystemInitialized = true;
            console.log('✓ User system initialization flags set');
            
            // Function to initialize auth when Firebase is ready
            function initializeWhenReady() {
                console.log('Checking if Firebase is ready...');
                if (window.firebaseAuth) {
                    console.log('✅ Firebase Auth is ready, proceeding with initialization');
                    checkAuthState();
                    setupAuthEventListeners();
                } else {
                    console.log('⏳ Firebase Auth not ready yet, waiting...');
                    setTimeout(initializeWhenReady, 100);
                }
            }
            
            // Wait for DOM to be ready and Firebase to be initialized
            if (document.readyState === 'loading') {
                console.log('DOM is loading, waiting for DOMContentLoaded...');
                document.addEventListener('DOMContentLoaded', function() {
                    console.log('✓ DOM loaded, starting Firebase initialization');
                    setTimeout(initializeWhenReady, 100);
                });
            } else {
                console.log('✓ DOM already loaded, starting Firebase initialization');
                setTimeout(initializeWhenReady, 100);
            }
        }
        
        // Setup authentication event listeners
        function setupAuthEventListeners() {
            console.log('Setting up auth event listeners...');
            
            // Google sign in button
            const googleSignInBtn = document.getElementById('google-signin-btn');
            if (googleSignInBtn) {
                console.log('✓ Google Sign-In button found, setting up event listener');
                googleSignInBtn.addEventListener('click', async function(e) {
                    console.log('🔘 Google Sign-In button clicked');
                    e.preventDefault();
                    
                    // Check for iPad/iOS specific issues
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    const isPrivateBrowsing = window.isPrivateBrowsing || false;
                    
                    console.log('Pre-flight checks:', {
                        isIOS: isIOS,
                        isPrivateBrowsing: isPrivateBrowsing,
                        buttonDisabled: googleSignInBtn.disabled
                    });
                    
                    if (isIOS && isPrivateBrowsing) {
                        console.warn('⚠️ iPad in private browsing mode detected');
                        showAuthMessage('Google Sign-In may not work in private browsing mode on iPad. Please try regular browsing mode or use email sign-in.', 'error');
                        return;
                    }
                    
                    // Show loading state
                    googleSignInBtn.disabled = true;
                    const originalText = googleSignInBtn.innerHTML;
                    googleSignInBtn.textContent = isIOS ? 'Signing in... (may redirect)' : 'Signing in...';
                    console.log('Button state changed to loading');
                    
                    console.log('Calling signInWithGoogle function...');
                    const result = await signInWithGoogle();
                    console.log('signInWithGoogle returned:', {
                        success: result.success,
                        error: result.error,
                        userEmail: result.user?.email
                    });
                    
                    // Reset button state
                    googleSignInBtn.disabled = false;
                    googleSignInBtn.innerHTML = originalText;
                    console.log('Button state reset');
                    
                    if (result.success) {
                        console.log('✅ Sign-in successful, updating UI...');
                        showAuthMessage('Successfully signed in with Google!', 'success');
                        
                        // Hide login modal immediately after successful login
                        hideLoginModal();
                        
                        // Ensure navigation to home page
                        setTimeout(() => {
                            console.log('Navigating to home page...');
                            if (window.navigationModule && typeof window.navigationModule.showPage === 'function') {
                                window.navigationModule.showPage('home-page');
                                
                                // Comprehensive scroll to top
                                setTimeout(() => {
                                    console.log('Scrolling to top...');
                                    // Scroll window to top
                                    window.scrollTo({
                                        top: 0,
                                        left: 0,
                                        behavior: 'instant'
                                    });
                                    
                                    // Scroll document elements
                                    document.body.scrollTop = 0;
                                    document.documentElement.scrollTop = 0;
                                    
                                    // Scroll main container
                                    const mainContainer = document.querySelector('.container');
                                    if (mainContainer) {
                                        mainContainer.scrollTop = 0;
                                    }
                                    
                                    // Scroll any other scrollable containers
                                    const scrollableElements = document.querySelectorAll('.page, .container, [style*="overflow"]');
                                    scrollableElements.forEach(element => {
                                        if (element.scrollTop !== undefined) {
                                            element.scrollTop = 0;
                                        }
                                    });
                                    console.log('Scroll to top completed');
                                }, 50);
                            }
                        }, 100);
                    } else {
                        console.error('❌ Sign-in failed:', result.error);
                        showAuthMessage(result.error, 'error');
                        
                        // Show iPad-specific help message
                        if (isIOS && result.error.includes('popup')) {
                            console.log('Showing iPad-specific help message...');
                            setTimeout(() => {
                                showAuthMessage('iPad Tip: If Google Sign-In is not working, try using email sign-in or enable popups in Safari settings.', 'info');
                            }, 3000);
                        }
                    }
                });
            } else {
                console.error('❌ Google Sign-In button not found!');
            }
            
            // Email login form
            const emailLoginForm = document.getElementById('email-login-form');
            if (emailLoginForm) {
                
                emailLoginForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const emailOrUsername = document.getElementById('login-email').value;
                    const password = document.getElementById('login-password').value;
                    const submitBtn = emailLoginForm.querySelector('button[type="submit"]');
                    
                    if (!emailOrUsername || !password) {
                        showAuthMessage('Please fill in all fields.', 'error');
                        return;
                    }
                    
                    // Show loading state
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Signing in...';
                    
                    const result = await loginUser(emailOrUsername, password);
                    
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign In';
                    
                    if (result.success) {
                        showAuthMessage('Successfully signed in!', 'success');
                        
                        // Hide login modal immediately after successful login
                        hideLoginModal();
                        
                        // Ensure navigation to home page
                        setTimeout(() => {
                            if (window.navigationModule && typeof window.navigationModule.showPage === 'function') {
                                window.navigationModule.showPage('home-page');
                                
                                // Comprehensive scroll to top
                                setTimeout(() => {
                                    // Scroll window to top
                                    window.scrollTo({
                                        top: 0,
                                        left: 0,
                                        behavior: 'instant'
                                    });
                                    
                                    // Scroll document elements
                                    document.body.scrollTop = 0;
                                    document.documentElement.scrollTop = 0;
                                    
                                    // Scroll main container
                                    const mainContainer = document.querySelector('.container');
                                    if (mainContainer) {
                                        mainContainer.scrollTop = 0;
                                    }
                                    
                                    // Scroll any other scrollable containers
                                    const scrollableElements = document.querySelectorAll('.page, .container, [style*="overflow"]');
                                    scrollableElements.forEach(element => {
                                        if (element.scrollTop !== undefined) {
                                            element.scrollTop = 0;
                                        }
                                    });
                                }, 50);
                            }
                        }, 100);
                    } else {
                        showAuthMessage(result.error, 'error');
                    }
                });
            }
            
            // Email register form
            const emailRegisterForm = document.getElementById('email-register-form');
            if (emailRegisterForm) {
                emailRegisterForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const username = document.getElementById('register-username').value;
                    const email = document.getElementById('register-email').value;
                    const password = document.getElementById('register-password').value;
                    const submitBtn = emailRegisterForm.querySelector('button[type="submit"]');
                    
                    if (!username || !email || !password) {
                        showAuthMessage('Please fill in all fields.', 'error');
                        return;
                    }
                    
                    if (password.length < 6) {
                        showAuthMessage('Password must be at least 6 characters long.', 'error');
                        return;
                    }
                    
                    // Show loading state
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creating Account...';
                    
                    const result = await registerUser(email, password, username);
                    
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                    
                    if (result.success) {
                        showAuthMessage('Account created successfully!', 'success');
                    } else {
                        showAuthMessage(result.error, 'error');
                    }
                });
            }
            
                         // Show register form button
             const showRegisterBtn = document.getElementById('show-register-btn');
             if (showRegisterBtn) {
                 showRegisterBtn.addEventListener('click', function() {
                     document.getElementById('login-form').classList.add('hidden');
                     document.getElementById('register-form').classList.remove('hidden');
                     
                     // Clear any error messages from both forms
                     const loginMessage = document.getElementById('auth-message');
                     const registerMessage = document.getElementById('auth-message-register');
                     if (loginMessage) {
                         loginMessage.style.display = 'none';
                     }
                     if (registerMessage) {
                         registerMessage.style.display = 'none';
                     }
                 });
             }
             
             // Show login form button
             const showLoginBtn = document.getElementById('show-login-btn');
             if (showLoginBtn) {
                 showLoginBtn.addEventListener('click', function() {
                     document.getElementById('register-form').classList.add('hidden');
                     document.getElementById('forgot-password-form').classList.add('hidden');
                     document.getElementById('login-form').classList.remove('hidden');
                     
                     // Clear any error messages from all forms
                     const loginMessage = document.getElementById('auth-message');
                     const registerMessage = document.getElementById('auth-message-register');
                     const resetMessage = document.getElementById('auth-message-reset');
                     if (loginMessage) {
                         loginMessage.style.display = 'none';
                     }
                     if (registerMessage) {
                         registerMessage.style.display = 'none';
                     }
                     if (resetMessage) {
                         resetMessage.style.display = 'none';
                     }
                 });
             }
             
             // Forgot password button
             const forgotPasswordBtn = document.getElementById('forgot-password-btn');
             if (forgotPasswordBtn) {
                 forgotPasswordBtn.addEventListener('click', function() {
                     document.getElementById('login-form').classList.add('hidden');
                     document.getElementById('register-form').classList.add('hidden');
                     document.getElementById('forgot-password-form').classList.remove('hidden');
                     
                     // Clear any error messages from all forms
                     const loginMessage = document.getElementById('auth-message');
                     const registerMessage = document.getElementById('auth-message-register');
                     const resetMessage = document.getElementById('auth-message-reset');
                     if (loginMessage) {
                         loginMessage.style.display = 'none';
                     }
                     if (registerMessage) {
                         registerMessage.style.display = 'none';
                     }
                     if (resetMessage) {
                         resetMessage.style.display = 'none';
                     }
                 });
             }
             
             // Back to login button (from forgot password)
             const backToLoginBtn = document.getElementById('back-to-login-btn');
             if (backToLoginBtn) {
                 backToLoginBtn.addEventListener('click', function() {
                     document.getElementById('forgot-password-form').classList.add('hidden');
                     document.getElementById('register-form').classList.add('hidden');
                     document.getElementById('login-form').classList.remove('hidden');
                     
                     // Clear any error messages from all forms
                     const loginMessage = document.getElementById('auth-message');
                     const registerMessage = document.getElementById('auth-message-register');
                     const resetMessage = document.getElementById('auth-message-reset');
                     if (loginMessage) {
                         loginMessage.style.display = 'none';
                     }
                     if (registerMessage) {
                         registerMessage.style.display = 'none';
                     }
                     if (resetMessage) {
                         resetMessage.style.display = 'none';
                     }
                 });
             }
             
             // Reset password form
             const resetPasswordForm = document.getElementById('reset-password-form');
             if (resetPasswordForm) {
                 resetPasswordForm.addEventListener('submit', async function(e) {
                     e.preventDefault();
                     
                     const email = document.getElementById('reset-email').value;
                     const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
                     
                     if (!email) {
                         showAuthMessage('Please enter your email address.', 'error');
                         return;
                     }
                     
                     // Show loading state
                     submitBtn.disabled = true;
                     submitBtn.textContent = 'Sending...';
                     
                     const result = await sendPasswordResetEmail(email);
                     
                     // Reset button state
                     submitBtn.disabled = false;
                     submitBtn.textContent = 'Send Reset Link';
                     
                     if (result.success) {
                         showAuthMessage(result.message, 'success');
                         
                         // Clear the form
                         resetPasswordForm.reset();
                         
                         // Auto-return to login after 3 seconds
                         setTimeout(() => {
                             document.getElementById('forgot-password-form').classList.add('hidden');
                             document.getElementById('login-form').classList.remove('hidden');
                         }, 3000);
                     } else {
                         showAuthMessage(result.error, 'error');
                     }
                 });
             }
            
            // Continue as Guest button
            const continueAsGuestBtn = document.getElementById('continue-as-guest-btn');
            if (continueAsGuestBtn) {
                continueAsGuestBtn.addEventListener('click', function() {
                    // Set anonymous mode flag
                    isAnonymousMode = true;
                    
                    // Hide login modal
                    hideLoginModal();
                    
                    // Update UI for anonymous user
                    updateUIForAnonymousUser();
                    
                    // Check if there's a shared note link
                    const urlParams = new URLSearchParams(window.location.search);
                    const shareId = urlParams.get('share');
                    
                    if (shareId) {
                        // Handle shared note for anonymous user
                        handleSharedNoteForAnonymousUser(shareId);
                    } else {
                        // Show success message for regular browsing
                        showAuthMessage('Welcome! You can browse calculators and view shared notes.', 'success');
                        
                        // Navigate to home page
                        setTimeout(() => {
                            if (window.navigationModule && typeof window.navigationModule.showPage === 'function') {
                                window.navigationModule.showPage('home-page');
                            }
                        }, 100);
                    }
                });
            }
            
            // Logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async function() {
                    const result = await logoutUser();
                    if (result.success) {
                        showAuthMessage('Successfully signed out!', 'success');
                        
                        // Force page refresh immediately
                        window.location.replace(window.location.href);
                    } else {
                        showAuthMessage(result.error, 'error');
                    }
                });
            }
        }
        
        // Clear all form fields across all pages
        function clearAllFormFields() {
            
            // Clear login/register forms
            const loginForm = document.getElementById('email-login-form');
            const registerForm = document.getElementById('email-register-form');
            if (loginForm) loginForm.reset();
            if (registerForm) registerForm.reset();
            
            // Clear schedule form fields
            const scheduleFields = [
                'shift-date', 'shift-start', 'shift-end', 
                'shift-location', 'shift-notes'
            ];
            scheduleFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.value = '';
            });
            
            // Clear notes form fields
            const notesFields = [
                'note-title', 'note-content', 'note-tags'
            ];
            notesFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.value = '';
            });
            
            // Clear settings form fields
            const settingsFields = [
                'profile-name', 'profile-bio', 'profile-email'
            ];
            settingsFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.value = '';
            });
            
            // Clear calculator form fields
            const calculatorInputs = document.querySelectorAll('.calculator-input');
            calculatorInputs.forEach(input => {
                input.value = '';
            });
            
            // Clear any other input fields
            const allInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');
            allInputs.forEach(input => {
                if (!input.classList.contains('preserve-on-logout')) {
                    input.value = '';
                }
            });
        }
        
        // Reset all page states
        function resetAllPageStates() {
            
            // Reset schedule module state
            if (window.scheduleModule) {
                // Clear shifts array
                if (window.scheduleModule.shifts) {
                    window.scheduleModule.shifts = [];
                }
                // Reset to list tab
                if (typeof window.scheduleModule.switchTab === 'function') {
                    window.scheduleModule.switchTab('list');
                }
                // Clear schedule containers
                const shiftsContainer = document.getElementById('shifts-container');
                const dateShiftsContainer = document.getElementById('date-shifts-container');
                if (shiftsContainer) {
                    shiftsContainer.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-light);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem;">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <div>Sign in to view your shifts</div>
                        </div>
                    `;
                }
                if (dateShiftsContainer) {
                    dateShiftsContainer.innerHTML = `
                        <div style="text-align: center; padding: 1rem; color: var(--text-light);">
                            Sign in to view your shifts
                        </div>
                    `;
                }
            }
            
            // Reset notes module state
            if (window.notesSystem) {
                // Clear notes array
                if (window.notesSystem.notesData) {
                    window.notesSystem.notesData = [];
                }
                // Clear notes containers
                const notesContainer = document.getElementById('notes-container');
                const noteDetailContainer = document.getElementById('note-detail-content');
                if (notesContainer) {
                    notesContainer.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-light);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14,2 14,8 20,8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10,9 9,9 8,9"></polyline>
                            </svg>
                            <div>Sign in to view your notes</div>
                        </div>
                    `;
                }
                if (noteDetailContainer) {
                    noteDetailContainer.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-light);">
                            Sign in to view note details
                        </div>
                    `;
                }
            }
            
            // Reset home page
            if (window.homeModule) {
                // Clear home page containers
                const homeShiftsContainer = document.getElementById('home-shifts-container');
                const homeNotesContainer = document.getElementById('home-notes-container');
                
                if (homeShiftsContainer) {
                    homeShiftsContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">📅</div>
                            <div class="empty-text">Sign in to view your shifts</div>
                        </div>
                    `;
                }
                
                if (homeNotesContainer) {
                    homeNotesContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">📝</div>
                            <div class="empty-text">Sign in to view your notes</div>
                        </div>
                    `;
                }
            }
            
            // Reset settings page
            if (window.settingsModule) {
                // Clear user info displays
                const userEmailElement = document.getElementById('user-email');
                const userNameElement = document.getElementById('user-name');
                if (userEmailElement) userEmailElement.textContent = 'Not signed in';
                if (userNameElement) userNameElement.textContent = 'Guest';
            }
            
            // Clear any modals
            const modals = document.querySelectorAll('.modal.active');
            modals.forEach(modal => {
                modal.classList.remove('active');
            });
            
            // Reset navigation active state
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.classList.remove('active');
            });
            const homeNav = document.getElementById('nav-home');
            if (homeNav) homeNav.classList.add('active');
        }
        
        // Show authentication message
        function showAuthMessage(message, type) {
            // Determine which form is currently visible
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            const forgotPasswordForm = document.getElementById('forgot-password-form');
            
            let messageElement = null;
            
            if (loginForm && !loginForm.classList.contains('hidden')) {
                messageElement = document.getElementById('auth-message');
            } else if (registerForm && !registerForm.classList.contains('hidden')) {
                messageElement = document.getElementById('auth-message-register');
            } else if (forgotPasswordForm && !forgotPasswordForm.classList.contains('hidden')) {
                messageElement = document.getElementById('auth-message-reset');
            }
            
            if (messageElement) {
                messageElement.textContent = message;
                messageElement.style.display = 'block';
                messageElement.style.marginTop = '15px';
                messageElement.style.padding = '12px';
                messageElement.style.borderRadius = '8px';
                messageElement.style.textAlign = 'center';
                messageElement.style.fontSize = '14px';
                
                if (type === 'success') {
                    messageElement.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                    messageElement.style.color = '#16a34a';
                    messageElement.style.border = '1px solid rgba(34, 197, 94, 0.2)';
                } else if (type === 'info') {
                    messageElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                    messageElement.style.color = '#2563eb';
                    messageElement.style.border = '1px solid rgba(59, 130, 246, 0.2)';
                } else {
                    messageElement.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    messageElement.style.color = '#dc2626';
                    messageElement.style.border = '1px solid rgba(239, 68, 68, 0.2)';
                }
                
                // Hide message after different timeouts based on type
                const timeout = type === 'success' ? 3000 : type === 'info' ? 7000 : 5000;
                setTimeout(() => {
                    messageElement.style.display = 'none';
                }, timeout);
            } else {
                console.error('Auth message element not found');
            }
        }
        
        // Return public methods
        return {
            init: init,
            registerUser: registerUser,
            loginUser: loginUser,
            signInWithGoogle: signInWithGoogle,
            sendPasswordResetEmail: sendPasswordResetEmail,
            logoutUser: logoutUser,
            loadUserData: loadUserData,
            updateUserProfile: updateUserProfile,
            getCurrentUser: getCurrentUser,
            showLoginModal: showLoginModal,
            hideLoginModal: hideLoginModal,
            showLoginPrompt: showLoginPrompt,
            updateUIForLoggedInUser: updateUIForLoggedInUser,
            updateUIForLoggedOutUser: updateUIForLoggedOutUser,
            clearAllFormFields: clearAllFormFields,
            resetAllPageStates: resetAllPageStates,
            isAuthenticated: () => currentUser !== null
        };
    })();

    // Make userSystem available globally
    window.userSystem = userSystem;
    
    // Function to check if user should be treated as anonymous
    window.shouldShowLoginPrompt = function() {
        return !window.firebaseAuth || !window.firebaseAuth.currentUser;
    };
}
