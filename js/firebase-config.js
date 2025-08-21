// Firebase Configuration
if (typeof firebaseConfig === 'undefined') {
    const firebaseConfig = {
        apiKey: "AIzaSyCkjZrximy6HsnmTQu3zUw55BFC2PsJuQ4",
        authDomain: "flowmate-4a79c.firebaseapp.com",
        projectId: "flowmate-4a79c",
        storageBucket: "flowmate-4a79c.firebasestorage.app",
        messagingSenderId: "730742939743",
        appId: "1:730742939743:web:fdefbdacd2a2ee79537bea",
        measurementId: "G-RQ7CWQFQXC"
    };

    // Production environment check
    const isProduction = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1' && 
                        !window.location.hostname.includes('127.0.0.1');
    
    console.log('Environment:', isProduction ? 'Production' : 'Development');
    console.log('Hostname:', window.location.hostname);

    // const firebaseConfig = {
    //     apiKey: "AIzaSyAki9iTse2IDy0wINrGxWAJ3hxL2AX9ywI",
    //     authDomain: "login-259d9.firebaseapp.com",
    //     projectId: "login-259d9",
    //     storageBucket: "login-259d9.firebasestorage.app",
    //     messagingSenderId: "202184599983",
    //     appId: "1:202184599983:web:011884a1989143a788e75a",
    //     measurementId: "G-YJZTW03RLR"
    // };

    // Error handling wrapper
    function handleFirebaseError(error, context) {
        console.error(`Firebase ${context} Error:`, error);
        
        // Show user-friendly error message
        let userMessage = 'An error occurred. Please try again.';
        
        if (error.code) {
            switch (error.code) {
                case 'auth/network-request-failed':
                    userMessage = 'Network error. Please check your internet connection.';
                    break;
                case 'auth/too-many-requests':
                    userMessage = 'Too many requests. Please try again later.';
                    break;
                case 'auth/user-not-found':
                    userMessage = 'User not found. Please check your credentials.';
                    break;
                case 'auth/wrong-password':
                    userMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/email-already-in-use':
                    userMessage = 'Email already in use. Please use a different email.';
                    break;
                case 'auth/weak-password':
                    userMessage = 'Password is too weak. Please use a stronger password.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'Invalid email address. Please check your email.';
                    break;
                case 'permission-denied':
                    userMessage = 'Access denied. You may not have permission to perform this action.';
                    break;
                case 'unavailable':
                    userMessage = 'Service temporarily unavailable. Please try again later.';
                    break;
                default:
                    userMessage = `Error: ${error.message || 'Unknown error occurred'}`;
            }
        }
        
        // Show error to user
        if (window.showAuthMessage) {
            window.showAuthMessage(userMessage, 'error');
        } else {
            alert(userMessage);
        }
        
        return error;
    }

    // Initialize Firebase with error handling
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
        handleFirebaseError(error, 'Initialization');
    }

    // Initialize Firebase services with error handling
    let auth, db, googleProvider;
    
    // Initialize Firebase services asynchronously
    async function initializeFirebaseServices() {
        console.log('=== Firebase Services Initialization Started ===');
        console.log('Timestamp:', new Date().toISOString());
        
        try {
            console.log('Creating Firebase Auth and Firestore instances...');
            auth = firebase.auth();
            db = firebase.firestore();
            console.log('✓ Firebase instances created');
            
            // iPad-specific persistence handling
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isPrivateBrowsing = await checkPrivateBrowsing();
            
            console.log('Device detection results:', {
                isIOS: isIOS,
                isPrivateBrowsing: isPrivateBrowsing,
                userAgent: navigator.userAgent,
                cookiesEnabled: navigator.cookieEnabled,
                localStorageSupported: typeof(Storage) !== "undefined"
            });
            
            // Enable Firestore persistence FIRST (before any other operations)
            if (db && !isPrivateBrowsing) {
                console.log('Attempting to enable Firestore persistence...');
                try {
                    await db.enablePersistence();
                    console.log('✅ Firestore offline persistence enabled');
                } catch (err) {
                    console.warn('⚠️ Firestore persistence error:', {
                        code: err.code,
                        message: err.message
                    });
                    if (err.code === 'failed-precondition') {
                        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                    } else if (err.code === 'unimplemented') {
                        console.warn('The current browser does not support persistence');
                    } else {
                        console.warn('Could not enable Firestore persistence:', err.message);
                    }
                }
            } else if (isPrivateBrowsing) {
                console.warn('⚠️ Private browsing detected, skipping Firestore persistence');
            }
            
            // Set persistence based on device and browsing mode
            console.log('Setting Firebase Auth persistence...');
            try {
                if (isIOS && !isPrivateBrowsing) {
                    // For iOS devices, use LOCAL persistence if not in private mode
                    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                    console.log('✅ Firebase Auth persistence set to LOCAL for iOS');
                } else if (isPrivateBrowsing) {
                    // For private browsing, use NONE persistence
                    await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
                    console.log('✅ Firebase Auth persistence set to NONE for private browsing');
                } else {
                    // For other devices, use LOCAL persistence
                    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                    console.log('✅ Firebase Auth persistence set to LOCAL');
                }
            } catch (persistenceError) {
                console.warn('⚠️ Could not set preferred persistence:', {
                    code: persistenceError.code,
                    message: persistenceError.message
                });
                // Fallback to session persistence
                try {
                    await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
                    console.log('✅ Firebase Auth persistence set to SESSION (fallback)');
                } catch (fallbackError) {
                    console.error('❌ Could not set any persistence:', {
                        code: fallbackError.code,
                        message: fallbackError.message
                    });
                }
            }
            
            // Firebase Authentication Providers
            console.log('Creating Google Authentication Provider...');
            googleProvider = new firebase.auth.GoogleAuthProvider();
            
            // Add scopes for Google sign-in
            googleProvider.addScope('email');
            googleProvider.addScope('profile');
            console.log('✓ Google provider scopes added');
            
            // iPad-specific Google provider settings
            if (isIOS) {
                console.log('Applying iOS-specific Google provider settings...');
                googleProvider.setCustomParameters({
                    prompt: 'select_account',
                    login_hint: '',
                    // Force redirect flow for better iPad compatibility
                    redirect_uri: window.location.origin
                });
                console.log('✓ iOS-specific settings applied');
            }
            
            console.log('✅ Firebase services initialized successfully');
            
            // Export for use in other files
            window.firebaseAuth = auth;
            window.firebaseDB = db;
            window.googleProvider = googleProvider;
            window.handleFirebaseError = handleFirebaseError;
            window.isIOS = isIOS;
            window.isPrivateBrowsing = isPrivateBrowsing;
            
            console.log('✓ Firebase services exported to global scope');
            console.log('Global exports:', {
                firebaseAuth: !!window.firebaseAuth,
                firebaseDB: !!window.firebaseDB,
                googleProvider: !!window.googleProvider,
                isIOS: window.isIOS,
                isPrivateBrowsing: window.isPrivateBrowsing
            });
            
            // Enhanced error handling for Firebase initialization
            if (auth) {
                console.log('Setting up Firebase Auth state change monitoring...');
                auth.onAuthStateChanged(function(user) {
                    try {
                        if (user) {
                            console.log('🔔 Firebase Auth: User is signed in:', user.email);
                        } else {
                            console.log('🔔 Firebase Auth: User is signed out');
                        }
                    } catch (error) {
                        console.error('❌ Auth state change monitoring error:', error);
                        handleFirebaseError(error, 'Auth State Change');
                    }
                }, function(error) {
                    console.error('❌ Firebase Auth Error:', error);
                    handleFirebaseError(error, 'Auth State Change');
                });
                console.log('✓ Auth state monitoring established');
            }
            
            console.log('=== Firebase Services Initialization Completed ===');
            
        } catch (error) {
            console.error('❌ Firebase services initialization error:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            handleFirebaseError(error, 'Services Initialization');
        }
    }
    
    // Function to detect private browsing mode
    async function checkPrivateBrowsing() {
        console.log('🔍 Checking for private browsing mode...');
        
        try {
            // Test localStorage availability
            const testKey = 'test-private-browsing';
            console.log('Testing localStorage...');
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            console.log('✓ localStorage test passed');
            
            // Test if we can create indexedDB
            console.log('Testing IndexedDB...');
            return new Promise((resolve) => {
                const db = indexedDB.open('test');
                db.onerror = () => {
                    console.log('❌ IndexedDB test failed - likely private browsing');
                    resolve(true);  // Private browsing
                };
                db.onsuccess = () => {
                    console.log('✓ IndexedDB test passed - not private browsing');
                    indexedDB.deleteDatabase('test');
                    resolve(false);  // Not private browsing
                };
            });
        } catch (e) {
            console.log('❌ Private browsing check failed with error:', e.message);
            return true;  // Assume private browsing if any errors
        }
    }
    
    // Start Firebase initialization
    initializeFirebaseServices();

    // iPad/iOS diagnostic function
    function diagnoseIOSIssues() {
        console.log('=== Running iOS/iPad Diagnostics ===');
        
        const diagnostics = {
            isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
            isPrivateBrowsing: false,
            localStorageAvailable: false,
            indexedDBAvailable: false,
            cookiesEnabled: navigator.cookieEnabled,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            windowLocation: window.location.href,
            firebaseAuthAvailable: !!window.firebaseAuth,
            googleProviderAvailable: !!window.googleProvider,
            onlineStatus: navigator.onLine
        };
        
        // Test localStorage
        console.log('Testing localStorage availability...');
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            diagnostics.localStorageAvailable = true;
            console.log('✓ localStorage is available');
        } catch (e) {
            diagnostics.localStorageAvailable = false;
            console.log('❌ localStorage is not available:', e.message);
        }
        
        // Test IndexedDB
        console.log('Testing IndexedDB availability...');
        try {
            const request = indexedDB.open('test');
            request.onsuccess = () => {
                diagnostics.indexedDBAvailable = true;
                console.log('✓ IndexedDB is available');
                indexedDB.deleteDatabase('test');
            };
            request.onerror = () => {
                diagnostics.indexedDBAvailable = false;
                console.log('❌ IndexedDB is not available');
            };
        } catch (e) {
            diagnostics.indexedDBAvailable = false;
            console.log('❌ IndexedDB test failed:', e.message);
        }
        
        // Detect private browsing
        if (!diagnostics.localStorageAvailable && !diagnostics.indexedDBAvailable) {
            diagnostics.isPrivateBrowsing = true;
            console.log('🕵️ Private browsing mode detected');
        } else {
            console.log('👀 Normal browsing mode detected');
        }
        
        console.log('=== iOS/iPad Diagnostics Results ===');
        console.table(diagnostics);
        
        // Store for global access
        window.iosDiagnostics = diagnostics;
        
        // Show diagnostics to user if on iOS and having issues
        if (diagnostics.isIOS) {
            setTimeout(() => {
                console.log('📋 iPad/iOS user detected - diagnostics available in window.iosDiagnostics');
                if (diagnostics.isPrivateBrowsing) {
                    console.warn('⚠️ IMPORTANT: Private browsing detected! This may cause authentication issues.');
                }
            }, 2000);
        }
        
        return diagnostics;
    }
    
    // Run diagnostics
    setTimeout(diagnoseIOSIssues, 1000);
    
    // Export diagnostic function
    window.diagnoseIOSIssues = diagnoseIOSIssues;


    

    
    // Network status monitoring
    function setupNetworkMonitoring() {
        const networkStatus = document.createElement('div');
        networkStatus.id = 'network-status';
        networkStatus.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ef4444;
            color: white;
            text-align: center;
            padding: 8px;
            font-size: 14px;
            z-index: 10001;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
        `;
        networkStatus.textContent = 'No internet connection';
        document.body.appendChild(networkStatus);
        
        function updateNetworkStatus() {
            if (!navigator.onLine) {
                networkStatus.style.transform = 'translateY(0)';
            } else {
                networkStatus.style.transform = 'translateY(-100%)';
            }
        }
        
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        updateNetworkStatus();
    }
    
    // Initialize network monitoring when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupNetworkMonitoring);
    } else {
        setupNetworkMonitoring();
    }
    
    // Service Worker registration for offline support
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/service-worker.js')
                .then(function(registration) {
                    console.log('ServiceWorker registration successful');
                })
                .catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
}