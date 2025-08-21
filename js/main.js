        // Main Application Module - Core functionality and initialization
        if (typeof window.mainApp === 'undefined') {
            const mainApp = (function() {
                
                // Immediately prevent scrolling when script loads
                document.documentElement.classList.add('app-loading');
                document.body.classList.add('app-loading');
                
                // Modal management system
                const modalManager = {
                    activeModals: [],
                    
                    showModal: function(modalId) {
                        const modal = document.getElementById(modalId);
                        if (!modal) {
                            return false;
                        }
                        
                        // Hide any existing modals
                        this.hideAllModals();
                        
                        // Store current scroll position
                        this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
                        
                        // Show the new modal - handle both types of modals
                        if (modal.classList.contains('modal-overlay')) {
                            // Shift modals use 'active' class
                            modal.classList.add('active');
                        } else {
                            // Notes modals use 'hidden' class
                            modal.classList.remove('hidden');
                            modal.style.display = 'flex';
                        }
                        
                        this.activeModals.push(modalId);
                        
                        // Scroll modal to top
                        this.scrollModalToTop(modalId);
                        
                        // Prevent body scroll
                        document.body.classList.add('modal-open');
                        
                        return true;
                    },
                    
                    scrollModalToTop: function(modalId) {
                        const modal = document.getElementById(modalId);
                        if (modal) {
                            // Try to find modal body first
                            const modalBody = modal.querySelector('.modal-body');
                            if (modalBody) {
                                modalBody.scrollTop = 0;
                            } else {
                                // Fallback: scroll the modal content div
                                const modalContent = modal.querySelector('div');
                                if (modalContent) {
                                    modalContent.scrollTop = 0;
                                }
                            }
                        }
                    },
                    
                    hideModal: function(modalId) {
                        const modal = document.getElementById(modalId);
                        if (modal) {
                            // Hide modal - handle both types of modals
                            if (modal.classList.contains('modal-overlay')) {
                                // Shift modals use 'active' class
                                modal.classList.remove('active');
                            } else {
                                // Notes modals use 'hidden' class
                                modal.classList.add('hidden');
                                modal.style.display = 'none';
                            }
                            
                            this.activeModals = this.activeModals.filter(id => id !== modalId);
                            
                            // Re-enable body scroll if no modals are active
                            if (this.activeModals.length === 0) {
                                document.body.classList.remove('modal-open');
                                // Restore scroll position
                                if (this.scrollPosition !== undefined) {
                                    window.scrollTo(0, this.scrollPosition);
                                    this.scrollPosition = undefined;
                                }
                            }
                            
                        }
                    },
                    
                    hideAllModals: function() {
                        this.activeModals.forEach(modalId => {
                            const modal = document.getElementById(modalId);
                            if (modal) {
                                // Hide modal - handle both types of modals
                                if (modal.classList.contains('modal-overlay')) {
                                    // Shift modals use 'active' class
                                    modal.classList.remove('active');
                                } else {
                                    // Notes modals use 'hidden' class
                                    modal.classList.add('hidden');
                                    modal.style.display = 'none';
                                }
                            }
                        });
                        this.activeModals = [];
                        document.body.classList.remove('modal-open');
                        // Restore scroll position
                        if (this.scrollPosition !== undefined) {
                            window.scrollTo(0, this.scrollPosition);
                            this.scrollPosition = undefined;
                        }
                    },
                    
                    isModalActive: function(modalId) {
                        return this.activeModals.includes(modalId);
                    }
                };
                
                // Initialize the application
                function init() {
                    // Theme init
                    initializeTheme();

                    // Wire settings preference toggle if present
                    const darkModeToggle = document.getElementById('darkModeToggle');
                    if (darkModeToggle) {
                        // Ensure checkbox reflects current theme on load
                        darkModeToggle.checked = document.documentElement.classList.contains('dark-mode');
                        darkModeToggle.addEventListener('change', function(e) {
                            applyTheme(e.target.checked ? 'dark' : 'light');
                        });
                    }
                    
                    // Initialize modal manager
                    window.modalManager = modalManager;
                    
                    // Store shared note ID for later handling
                    const urlParams = new URLSearchParams(window.location.search);
                    const shareId = urlParams.get('share');
                    if (shareId) {
                        window.pendingSharedNoteId = shareId;
                    }
                    
                    // Initialize user system
                    if (window.userSystem && !window.userSystemInitialized) {
                        userSystem.init();
                        window.userSystemInitialized = true;
                        
                        // Ensure login modal is properly managed after user system init
                        setTimeout(() => {
                            if (window.userSystem && window.userSystem.isAuthenticated()) {
                                console.log('User is authenticated, ensuring login modal is hidden');
                                window.userSystem.hideLoginModal();
                            }
                        }, 1000);
                    }
                    
                    // Initialize navigation
                    if (window.navigationModule) {
                        navigationModule.showPage('home-page');
                    }
                    
                    // Initialize schedule module
                    if (window.scheduleModule) {
                        scheduleModule.initializeShiftTypeListeners();
                    }
                    
                    // Add global modal event listeners
                    setupGlobalModalListeners();
                    
                    // iOS Safari dynamic viewport handling
                    setupIOSViewportHandling();
                    
                    // Enable scrolling after initialization is complete
                    setTimeout(() => {
                        // Remove all scroll prevention
                        if (document.documentElement) {
                            document.documentElement.style.overflow = '';
                            document.documentElement.classList.remove('app-loading');
                        }
                        if (document.body) {
                            document.body.style.overflow = '';
                            document.body.classList.remove('app-loading');
                        }
                    }, 1000);
                    
                    // Fallback: Ensure scrolling is restored after 3 seconds
                    setTimeout(() => {
                        if (document.documentElement && document.documentElement.classList.contains('app-loading')) {
                            document.documentElement.style.overflow = '';
                            document.documentElement.classList.remove('app-loading');
                        }
                        if (document.body && document.body.classList.contains('app-loading')) {
                            document.body.style.overflow = '';
                            document.body.classList.remove('app-loading');
                        }
                    }, 3000);
                }

                function initializeTheme() {
                    try {
                        const savedTheme = localStorage.getItem('flowmate_theme');
                        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
                        applyTheme(theme);
                        // Sync settings checkbox if available
                        const darkModeToggle = document.getElementById('darkModeToggle');
                        if (darkModeToggle) {
                            darkModeToggle.checked = theme === 'dark';
                        }
                    } catch (e) {
                        applyTheme('light');
                    }
                }

                function applyTheme(theme) {
                    const root = document.documentElement;
                    const body = document.body;
                    if (theme === 'dark') {
                        root.classList.add('dark-mode');
                        if (body) body.classList.add('dark-mode');
                    } else {
                        root.classList.remove('dark-mode');
                        if (body) body.classList.remove('dark-mode');
                    }
                    try { localStorage.setItem('flowmate_theme', theme); } catch (e) {}

                    // Swap icon
                    const btn = document.getElementById('theme-toggle');
                    if (btn) {
                        btn.innerHTML = theme === 'dark'
                          ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
                          : '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>';
                    }

                    // Sync settings checkbox state
                    const darkModeToggle = document.getElementById('darkModeToggle');
                    if (darkModeToggle) {
                        darkModeToggle.checked = theme === 'dark';
                    }
                }

                // Expose toggle for header button
                window.toggleTheme = function() {
                    const root = document.documentElement;
                    const next = root.classList.contains('dark-mode') ? 'light' : 'dark';
                    applyTheme(next);
                };
                
                function setupGlobalModalListeners() {
                    // Close modals when clicking outside
                    document.addEventListener('click', function(event) {
                        if (event.target.classList.contains('modal-overlay')) {
                            const modalId = event.target.id;
                            if (modalId && modalId !== 'login-modal') {
                                modalManager.hideModal(modalId);
                            }
                        }
                    });
                    
                    // Close modals with Escape key
                    document.addEventListener('keydown', function(event) {
                        if (event.key === 'Escape' && modalManager.activeModals.length > 0) {
                            const lastModal = modalManager.activeModals[modalManager.activeModals.length - 1];
                            if (lastModal !== 'login-modal') {
                                modalManager.hideModal(lastModal);
                            }
                        }
                    });
                }
                
                // Handle iOS Safari dynamic viewport changes
                function setupIOSViewportHandling() {
                    // Check if it's iOS Safari
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
                    
                    if (isIOS && isSafari) {
                        
                        // Handle viewport changes when bottom bar expands/contracts
                        let initialViewportHeight = window.innerHeight;
                        
                        window.addEventListener('resize', () => {
                            const currentHeight = window.innerHeight;
                            const heightDifference = initialViewportHeight - currentHeight;
                            
                            // If height changed significantly, it's likely the bottom bar
                            if (Math.abs(heightDifference) > 50) {
                                
                                // Update all active modals
                                if (modalManager.activeModals.length > 0) {
                                    modalManager.activeModals.forEach(modalId => {
                                        const modal = document.getElementById(modalId);
                                        if (modal) {
                                            // Force modal to recalculate position
                                            modal.style.height = '100dvh';
                                            modal.style.height = '100vh';
                                        }
                                    });
                                }
                                
                                initialViewportHeight = currentHeight;
                            }
                        });
                        
                        // Handle orientation changes
                        window.addEventListener('orientationchange', () => {
                            setTimeout(() => {
                                initialViewportHeight = window.innerHeight;
                                
                                // Update all active modals
                                if (modalManager.activeModals.length > 0) {
                                    modalManager.activeModals.forEach(modalId => {
                                        const modal = document.getElementById(modalId);
                                        if (modal) {
                                            modal.style.height = '100dvh';
                                            modal.style.height = '100vh';
                                        }
                                    });
                                }
                            }, 100);
                        });
                    }
                }
                

                
                // Public API
                return {
                    init,
                    modalManager
                };
            })();
            
            // Make the module globally accessible
            window.mainApp = mainApp;
        }

        // Initialize the app when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                window.mainApp.init();
            });
        } else {
            // DOM is already ready
            window.mainApp.init();
        }
        if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('service-worker.js', { scope: './' });
      console.log('Service worker registered:', reg.scope);
      await navigator.serviceWorker.ready;
    } catch (err) {
      console.error('Service worker registration failed:', err);
    }
  });
}

