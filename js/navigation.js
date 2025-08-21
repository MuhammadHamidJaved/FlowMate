// Navigation Module - Page Management and UI State
if (typeof window.navigationModule === 'undefined') {
    const navigationModule = (function() {
        
        // Current page state
        let currentPage = 'home-page';
        let isNavigating = false; // Prevent navigation conflicts
        let isHistoryNavigation = false; // Track if navigation is from browser history
        let isInitialLoad = true; // Track if this is the initial page load
        let hasInitialHistory = false; // Track if we've set up initial history
        
        // Navigation functions
        function showPage(pageId) {
            // Prevent navigation conflicts
            if (isNavigating) {
                return;
            }
            
            isNavigating = true;
            
            try {
                // Validate page exists
                const targetPage = document.getElementById(pageId);
                if (!targetPage) {
                    console.error('Page not found:', pageId);
                    isNavigating = false;
                    return;
                }
                
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Show selected page
                targetPage.classList.add('active');
                currentPage = pageId;
                
                // Scroll to top of the page
                window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: 'smooth'
                });
                
                // Also scroll the main container to top
                const mainContainer = document.querySelector('.container');
                if (mainContainer) {
                    mainContainer.scrollTop = 0;
                }
                
                // Update browser history (only if not from history navigation and not initial load)
                if (!isHistoryNavigation && !isInitialLoad) {
                    updateBrowserHistory(pageId);
                }
                isHistoryNavigation = false;
                isInitialLoad = false;
            
            // Update navigation
            updateNavigation(pageId);
            
            // Handle page-specific initialization
            handlePageInitialization(pageId);
                
            } catch (error) {
                console.error('Navigation error:', error);
            } finally {
                isNavigating = false;
            }
        }
        
        function updateBrowserHistory(pageId) {
            // Check if we're trying to add a duplicate entry
            const currentState = window.history.state;
            if (currentState && currentState.page === pageId) {
                return;
            }
            
            // Update URL without page reload
            const url = new URL(window.location);
            url.searchParams.set('page', pageId);
            
            // Use pushState to create a new history entry
            window.history.pushState({ 
                page: pageId,
                timestamp: Date.now()
            }, '', url);
            
        }
        
        function updateNavigation(pageId) {
            try {
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
                // Highlight active nav item with error handling
                const navSelectors = {
                    'home-page': 'nav-home',
                    'calculators-page': 'nav-calculators',
                    'schedule-page': 'nav-schedule',
                    'notes-page': 'nav-notes',
                    'note-detail-page': 'nav-notes',
                    'settings-page': 'nav-settings'
                };
                
                // Handle calculator pages
                if (pageId.includes('calculator')) {
                    const navElement = document.getElementById('nav-calculators');
                    if (navElement) navElement.classList.add('active');
                } else {
                    const navId = navSelectors[pageId];
                    if (navId) {
                        const navElement = document.getElementById(navId);
                        if (navElement) navElement.classList.add('active');
                    }
                }
            } catch (error) {
                console.error('Error updating navigation:', error);
            }
        }
        
        function updateActiveNav(navType) {
            try {
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Highlight active nav item based on type
                const navId = `nav-${navType}`;
                const navElement = document.getElementById(navId);
                if (navElement) {
                    navElement.classList.add('active');
                }
            } catch (error) {
                console.error('Error updating active nav:', error);
            }
        }
        
        function handlePageInitialization(pageId) {
            try {
            switch (pageId) {
                case 'home-page':
                    // Initialize home page
                    if (window.homeModule && typeof window.homeModule.init === 'function') {
                        window.homeModule.init();
                    }
                    break;
                    
                case 'schedule-page':
                    // Initialize schedule functionality
                    if (window.scheduleModule && typeof window.scheduleModule.init === 'function') {
                        window.scheduleModule.init();
                    }
                    break;
                    
                case 'notes-page':
                    // Initialize notes system
                    if (window.notesSystem && typeof window.notesSystem.init === 'function') {
                        window.notesSystem.init();
                    }
                    break;
                    
                case 'settings-page':
                    // Initialize settings
                    initializeSettings();
                    if (window.settingsModule && typeof window.settingsModule.init === 'function') {
                        window.settingsModule.init();
                    }
                    // Ensure user profile is loaded
                    if (window.settingsModule && typeof window.settingsModule.loadUserProfile === 'function') {
                        window.settingsModule.loadUserProfile();
                    }
                    break;
                    
                default:
                    // Handle calculator pages
                    if (pageId.includes('calculator')) {
                        // Any calculator-specific initialization can go here
                    }
                    break;
                }
            } catch (error) {
                console.error('Error in page initialization:', error);
            }
        }
        
        function showCalculator(calculator) {
            showPage(calculator + '-calculator');
        }
        
        // Initialize dark mode on app startup
        function initializeDarkMode() {
            try {
                const savedDarkMode = localStorage.getItem('darkMode');
                if (savedDarkMode === 'true') {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            } catch (error) {
                console.error('Error initializing dark mode:', error);
            }
        }
        
        function initializeSettings() {
            try {
            // Initialize dark mode toggle
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkModeToggle && !darkModeToggle.hasListener) {
                darkModeToggle.addEventListener('change', () => {
                    if (darkModeToggle.checked) {
                            document.body.classList.add('dark-mode');
                            localStorage.setItem('darkMode', 'true');
                        } else {
                            document.body.classList.remove('dark-mode');
                            localStorage.setItem('darkMode', 'false');
                        }
                    });
                    darkModeToggle.hasListener = true;
                    
                    // Restore dark mode preference
                    const savedDarkMode = localStorage.getItem('darkMode');
                    if (savedDarkMode === 'true') {
                        darkModeToggle.checked = true;
                        document.body.classList.add('dark-mode');
                    } else {
                        darkModeToggle.checked = false;
                        document.body.classList.remove('dark-mode');
                    }
                }
            } catch (error) {
                console.error('Error initializing settings:', error);
            }
        }
        
        function getCurrentPage() {
            return currentPage;
        }
        
        // Enhanced back navigation with history support
        function goBack() {
            // Use browser history if available and not at initial state
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // Stay on current page if no more history
                alert('You are at the beginning of your navigation history.');
            }
        }
        
        // Handle direct URL access
        function handleDirectAccess() {
            const urlParams = new URLSearchParams(window.location.search);
            const page = urlParams.get('page');
            
            if (page) {
                // Set flag to prevent adding to history on direct access
                isHistoryNavigation = true;
                showPage(page);
            } else {
                // No page parameter means home page - ensure we're on home
                if (currentPage !== 'home-page') {
                    isHistoryNavigation = true;
                showPage('home-page');
                }
            }
        }
        
        // Get current history length
        function getHistoryLength() {
            return window.history.length;
        }
        
        // Check if we can go back
        function canGoBack() {
            return window.history.length > 1;
        }
        
        // Check if we're at the initial state
        function isAtInitialState() {
            return window.history.length <= 1;
        }
        
        // Get current history info
        function getHistoryInfo() {
            return {
                length: window.history.length,
                canGoBack: canGoBack(),
                isAtInitial: isAtInitialState(),
                currentPage: currentPage
            };
        }
        
        // Handle browser back/forward buttons
        function handlePopState(event) {
            
            // Set flag to prevent adding new history entries
            isHistoryNavigation = true;
            
            // Get the page from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const page = urlParams.get('page') || 'home-page';
            
            // Check if we're at the initial state (no more history to go back)
            if (window.history.length <= 1) {
                // Force stay on current page if no more history
                const currentUrl = new URL(window.location);
                currentUrl.searchParams.set('page', currentPage);
                window.history.replaceState({ 
                    page: currentPage,
                    timestamp: Date.now(),
                    isInitial: true
                }, '', currentUrl);
                return;
            }
            
            // Navigate to the page without adding to history
            showPage(page);
        }
        
        // Initialize browser history support
        function initBrowserHistory() {
            // Add popstate event listener
            window.addEventListener('popstate', handlePopState);
            
            // Handle initial page load
            const urlParams = new URLSearchParams(window.location.search);
            const initialPage = urlParams.get('page') || 'home-page';
            
            // Set up initial history state only once
            if (!hasInitialHistory) {
                // Replace the current history entry with the initial page
                const url = new URL(window.location);
                url.searchParams.set('page', initialPage);
                window.history.replaceState({ 
                    page: initialPage,
                    timestamp: Date.now(),
                    isInitial: true
                }, '', url);
                hasInitialHistory = true;
                
                // Navigate to the initial page without adding to history
                if (initialPage !== currentPage) {
                    isHistoryNavigation = true;
                    showPage(initialPage);
                }
            }
        }
        
        // Function to check and clean up duplicate history entries
        function cleanupDuplicateHistory() {
            
            // If we have more than 1 entry and we're on the initial page, clean up
            if (window.history.length > 1 && currentPage === 'home-page') {
                // Force a single history entry
                const url = new URL(window.location);
                url.searchParams.set('page', 'home-page');
                window.history.replaceState({ 
                    page: 'home-page',
                    timestamp: Date.now(),
                    isInitial: true
                }, '', url);
            }
        }
        
        // Function to clear browser history
        function clearBrowserHistory() {
            // Replace current state with a clean home page state
            const url = new URL(window.location);
            url.searchParams.set('page', 'home-page');
            window.history.replaceState({ 
                page: 'home-page',
                timestamp: Date.now(),
                isInitial: true
            }, '', url);
            
            // Navigate to home page
            currentPage = 'home-page';
            showPage('home-page');
        }
        
        // Public API
        return {
            showPage,
            showCalculator,
            getCurrentPage,
            goBack,
            initializeSettings,
            updateActiveNav,
            initBrowserHistory,
            getHistoryInfo,
            cleanupDuplicateHistory,
            initializeDarkMode,
            clearBrowserHistory
        };
    })();
    
    // Make navigation functions globally accessible for HTML onclick handlers
    window.showPage = navigationModule.showPage;
    window.showCalculator = navigationModule.showCalculator;
    
    // Make the module globally accessible
    window.navigationModule = navigationModule;
    
    // Initialize browser history when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        navigationModule.initBrowserHistory();
        navigationModule.initializeDarkMode(); // Initialize dark mode on app startup
    });
    
    // Clear browser history on page refresh
    window.addEventListener('beforeunload', function() {
        // Clear any stored history state
        if (window.history.length > 1) {
            // Replace current state with a clean one
            const url = new URL(window.location);
            url.searchParams.set('page', 'home-page');
            window.history.replaceState({ 
                page: 'home-page',
                timestamp: Date.now(),
                isInitial: true
            }, '', url);
        }
    });
    
    // Handle page refresh
    window.addEventListener('load', function() {
        // Ensure we start with a clean history state
        if (window.history.length > 1) {
            const url = new URL(window.location);
            url.searchParams.set('page', 'home-page');
            window.history.replaceState({ 
                page: 'home-page',
                timestamp: Date.now(),
                isInitial: true
            }, '', url);
        }
    });
} 