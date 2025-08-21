// Schedule Module - Shift Management and Calendar
if (typeof window.scheduleModule === 'undefined') {
    const scheduleModule = (function() {
        
        // Schedule data
        let shifts = [];
        let currentTab = 'list';
        let currentMonth = new Date().getMonth();
        let currentYear = new Date().getFullYear();
        let selectedDate = new Date();
        let shiftToDelete = null;
        let currentUser = null;
        
        // Firebase Integration Functions
        async function loadShiftsFromFirebase() {
            if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDB) {
                // Handle anonymous users
                shifts = [];
                loadShifts();
                return;
            }
            
            currentUser = window.firebaseAuth.currentUser;
            
            try {
                const shiftsSnapshot = await window.firebaseDB
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('schedules')
                    .orderBy('date', 'asc')
                    .get();
                
                shifts = [];
                shiftsSnapshot.forEach(doc => {
                    const shiftData = doc.data();
                    shifts.push({
                        id: doc.id,
                        ...shiftData,
                        date: shiftData.date,
                        createdAt: shiftData.createdAt ? shiftData.createdAt.toDate() : new Date(),
                        updatedAt: shiftData.updatedAt ? shiftData.updatedAt.toDate() : new Date()
                    });
                });
                
                // Update UI
                if (currentTab === 'list') {
                    loadShifts();
                } else {
                    renderCalendar();
                    updateSelectedDateShifts();
                }
            } catch (error) {
                console.error('Error loading shifts from Firebase:', error);
            }
        }
        
        async function saveShiftToFirebase(shiftData) {
            if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDB) {
                return null;
            }
            
            try {
                const userDoc = window.firebaseDB.collection('users').doc(currentUser.uid);
                const schedulesCollection = userDoc.collection('schedules');
                
                if (shiftData.id) {
                    // Update existing shift
                    await schedulesCollection.doc(shiftData.id).update({
                        ...shiftData,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    return shiftData.id;
                } else {
                    // Create new shift
                    const docRef = await schedulesCollection.add({
                        ...shiftData,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        userId: currentUser.uid
                    });
                    return docRef.id;
                }
            } catch (error) {
                console.error('Error saving shift to Firebase:', error);
                throw error;
            }
        }
        
        async function deleteShiftFromFirebase(shiftId) {
            if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDB) {
                return false;
            }
            
            try {
                await window.firebaseDB
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('schedules')
                    .doc(shiftId)
                    .delete();
                return true;
            } catch (error) {
                console.error('Error deleting shift from Firebase:', error);
                return false;
            }
        }
        
        // Tab management
        function switchTab(tab) {
            currentTab = tab;
            
            // Update tab UI
            document.querySelectorAll('.schedule-tab').forEach(tabEl => {
                tabEl.classList.remove('active');
            });
            document.querySelector(`.schedule-tab[onclick="switchTab('${tab}')"]`).classList.add('active');
            
            // Show/hide tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            if (tab === 'list') {
                document.getElementById('list-view').classList.add('active');
                document.getElementById('list-view').style.display = 'block';
                loadShifts();
            } else {
                document.getElementById('calendar-view').classList.add('active');
                document.getElementById('calendar-view').style.display = 'block';
                renderCalendar();
                updateSelectedDateShifts();
            }
        }
        
        // Load and display shifts
        function loadShifts() {
            const container = document.getElementById('shifts-container');
            if (!container) return;
            
            container.innerHTML = '';
            
            if (shifts.length === 0) {
                // Check if user is authenticated
                const isAuthenticated = window.firebaseAuth && window.firebaseAuth.currentUser;
                
                if (isAuthenticated) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-light);">
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" style="display:block; margin: 0 auto 1rem;">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <div>No shifts scheduled</div>
                            <div style="font-size: 0.875rem; margin-top: 0.5rem;">Add your first shift to get started</div>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: var(--text-light);">
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" style="display:block; margin: 0 auto 1rem;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>Sign in to access Schedule</div>
                            <div style="font-size: 0.875rem; margin-top: 0.5rem;">Manage your shifts and appointments by signing in to your account</div>
                            <button onclick="window.showLoginModal ? window.showLoginModal() : alert('Please sign in to access Schedule')" class="btn btn-primary" style="margin-top: 1rem;">
                                Sign In to Continue
                            </button>
                        </div>
                    `;
                }
                return;
            }
            
            // Sort shifts by date
            const sortedShifts = [...shifts].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            sortedShifts.forEach(shift => {
                const shiftEl = createShiftElement(shift);
                container.appendChild(shiftEl);
            });
        }
        
        function createShiftElement(shift) {
            const shiftEl = document.createElement('div');
            shiftEl.className = 'shift-item-container';
            shiftEl.setAttribute('data-id', shift.id);
            
            const shiftDate = new Date(shift.date);
            const dayOfWeek = shiftDate.toLocaleDateString('en-US', { weekday: 'long' });
            const formattedDate = shiftDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            shiftEl.innerHTML = `
                <div class="shift-item">
                    <div class="shift-header">
                        <div class="shift-date">${dayOfWeek}, ${formattedDate}</div>
                        <div class="shift-time">${shift.startTime} - ${shift.endTime}</div>
                    </div>
                    <div class="shift-location">${shift.location}</div>
                    ${shift.notes ? `<div class="shift-note">${shift.notes}</div>` : ''}
                    <div class="shift-actions">
                        <button class="shift-action-btn" onclick="editShift('${shift.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="shift-action-btn" onclick="openDeleteModal('${shift.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            return shiftEl;
        }
        
        // Calendar functionality
        function renderCalendar() {
            const calendarDays = document.getElementById('calendar-days');
            const monthTitle = document.getElementById('calendar-month');
            
            if (!calendarDays || !monthTitle) return;
            
            // Update month title
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
            monthTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
            
            // Clear calendar
            calendarDays.innerHTML = '';
            
            // Get first day of month and number of days
            const firstDay = new Date(currentYear, currentMonth, 1);
            const lastDay = new Date(currentYear, currentMonth + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay());
            
            // Generate calendar grid
            for (let i = 0; i < 42; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day';
                
                // Check if date is in current month
                if (date.getMonth() === currentMonth) {
                    dayEl.classList.add('current-month');
                }
                
                // Check if date has shifts
                const dateStr = date.toISOString().split('T')[0];
                const dayShifts = shifts.filter(shift => shift.date === dateStr);
                
                if (dayShifts.length > 0) {
                    dayEl.classList.add('has-shifts');
                }
                
                // Check if date is selected
                if (date.toDateString() === selectedDate.toDateString()) {
                    dayEl.classList.add('selected');
                }
                
                dayEl.textContent = date.getDate();
                dayEl.onclick = () => selectDate(date);
                
                calendarDays.appendChild(dayEl);
            }
        }
        
        function selectDate(date) {
            selectedDate = date;
            
            // Update calendar UI
            document.querySelectorAll('.calendar-day').forEach(day => {
                day.classList.remove('selected');
            });
            
            const dayElements = document.querySelectorAll('.calendar-day');
            const startDate = new Date(currentYear, currentMonth, 1);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            
            for (let i = 0; i < dayElements.length; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                
                if (date.toDateString() === selectedDate.toDateString()) {
                    dayElements[i].classList.add('selected');
                    break;
                }
            }
            
            updateSelectedDateShifts();
        }
        
        function updateSelectedDateShifts() {
            const container = document.getElementById('date-shifts-container');
            const title = document.getElementById('selected-date-title');
            
            if (!container || !title) return;
            
            const dateStr = selectedDate.toISOString().split('T')[0];
            const dayShifts = shifts.filter(shift => shift.date === dateStr);
            
            const formattedDate = selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            title.textContent = `Shifts for ${formattedDate}`;
            
            container.innerHTML = '';
            
            if (dayShifts.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 1rem; color: var(--text-light);">
                        No shifts scheduled for this date
                    </div>
                `;
                return;
            }
            
            dayShifts.forEach(shift => {
                const shiftEl = createShiftElement(shift);
                container.appendChild(shiftEl);
            });
        }
        
        function prevMonth() {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        }
        
        function nextMonth() {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        }
        
        // Modal management
        // Utility function to scroll modal to top
        function scrollModalToTop(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                const modalBody = modal.querySelector('.modal-body');
                if (modalBody) {
                    modalBody.scrollTop = 0;
                }
            }
        }
        
        function openAddShiftModal(dateStr = '') {
            const modal = document.getElementById('add-shift-modal');
            if (modal) {
                // Use modal manager if available
                if (window.modalManager) {
                    window.modalManager.showModal('add-shift-modal');
                } else {
                    // Fallback to direct modal show
                    modal.classList.add('active');
                    document.body.classList.add('modal-open');
                }
                
                // Scroll modal to top
                scrollModalToTop('add-shift-modal');
                
                // Set date if provided
                if (dateStr) {
                    document.getElementById('shift-date').value = dateStr;
                }
            }
        }
        
        function closeAddShiftModal() {
            const modal = document.getElementById('add-shift-modal');
            if (modal) {
                // Use modal manager if available
                if (window.modalManager) {
                    window.modalManager.hideModal('add-shift-modal');
                } else {
                    // Fallback to direct modal hide
                    modal.classList.remove('active');
                    document.body.classList.remove('modal-open');
                }
                // Reset modal to add mode
                resetAddModal();
            }
        }
        
        async function addShift() {
            const date = document.getElementById('shift-date').value;
            const startTime = document.getElementById('shift-start').value;
            const endTime = document.getElementById('shift-end').value;
            const location = document.getElementById('shift-location').value;
            const notes = document.getElementById('shift-notes').value;
            const type = document.querySelector('input[name="shift-type"]:checked').value;
            
            if (!date || !startTime || !endTime || !location) {
                alert('Please fill in all required fields.');
                return;
            }
            
            const newShift = {
                date: date,
                startTime: startTime,
                endTime: endTime,
                location: location,
                notes: notes,
                type: type
            };
            
            try {
                // Save to Firebase
                const savedShiftId = await saveShiftToFirebase(newShift);
                
                if (savedShiftId) {
                    // Add to local array with Firebase ID
                    newShift.id = savedShiftId;
                    shifts.push(newShift);
                    
                    // Update UI
                    if (currentTab === 'list') {
                        loadShifts();
                    } else {
                        renderCalendar();
                        updateSelectedDateShifts();
                    }
                    
                    // Refresh home page if it's active
                    if (window.homeModule && document.getElementById('home-page').classList.contains('active')) {
                        window.homeModule.loadHomeShifts();
                    }
                    
                    closeAddShiftModal();
                    
                    // Clear form
                    document.getElementById('shift-date').value = '';
                    document.getElementById('shift-start').value = '';
                    document.getElementById('shift-end').value = '';
                    document.getElementById('shift-location').value = '';
                    document.getElementById('shift-notes').value = '';
                } else {
                    alert('Failed to save shift. Please try again.');
                }
            } catch (error) {
                console.error('Error adding shift:', error);
                alert('Failed to save shift. Please try again.');
            }
        }
        
        function openDeleteModal(id) {
            shiftToDelete = id;
            const modal = document.getElementById('delete-modal');
            if (modal) {
                // Use modal manager if available
                if (window.modalManager) {
                    window.modalManager.showModal('delete-modal');
                } else {
                    // Fallback to direct modal show
                    modal.classList.add('active');
                    document.body.classList.add('modal-open');
                }
                
                // Scroll modal to top
                scrollModalToTop('delete-modal');
            }
        }
        
        function closeDeleteModal() {
            const modal = document.getElementById('delete-modal');
            if (modal) {
                // Use modal manager if available
                if (window.modalManager) {
                    window.modalManager.hideModal('delete-modal');
                } else {
                    // Fallback to direct modal hide
                    modal.classList.remove('active');
                    document.body.classList.remove('modal-open');
                }
            }
        }
        
        async function confirmDeleteShift() {
            if (shiftToDelete === null) return;
            
            try {
                // Delete from Firebase
                const success = await deleteShiftFromFirebase(shiftToDelete);
                
                if (success) {
                    // Find the shift element and add deleting animation
                    const shiftEl = document.querySelector(`.shift-item-container[data-id="${shiftToDelete}"]`);
                    if (shiftEl) {
                        shiftEl.classList.add('deleting');
                        
                        // Wait for animation to complete
                        setTimeout(() => {
                            // Remove the shift from the array
                            shifts = shifts.filter(shift => shift.id !== shiftToDelete);
                            
                            if (currentTab === 'list') {
                                loadShifts();
                            } else {
                                renderCalendar();
                                updateSelectedDateShifts();
                            }
                            
                            // Refresh home page if it's active
                            if (window.homeModule && document.getElementById('home-page').classList.contains('active')) {
                                window.homeModule.loadHomeShifts();
                            }
                            
                            closeDeleteModal();
                        }, 300);
                    } else {
                        // If element not found, just remove from array
                        shifts = shifts.filter(shift => shift.id !== shiftToDelete);
                        
                        if (currentTab === 'list') {
                            loadShifts();
                        } else {
                            renderCalendar();
                            updateSelectedDateShifts();
                        }
                        
                        closeDeleteModal();
                    }
                } else {
                    alert('Failed to delete shift. Please try again.');
                }
            } catch (error) {
                console.error('Error deleting shift:', error);
                alert('Failed to delete shift. Please try again.');
            }
        }
        
        function editShift(id) {
            // Find the shift to edit
            const shift = shifts.find(s => s.id == id);
            if (!shift) {
                console.error('Shift not found for editing:', id);
                return;
            }
            
            // Open the add modal and populate with shift data
            openAddShiftModal();
            
            // Populate form fields
            document.getElementById('shift-date').value = shift.date;
            document.getElementById('shift-start').value = shift.startTime;
            document.getElementById('shift-end').value = shift.endTime;
            document.getElementById('shift-location').value = shift.location;
            document.getElementById('shift-notes').value = shift.notes || '';
            
            // Set the correct shift type
            const shiftTypeRadios = document.querySelectorAll('input[name="shift-type"]');
            shiftTypeRadios.forEach(radio => {
                if (radio.value === shift.type) {
                    radio.checked = true;
                }
            });
            
            // Change the modal title and button
            const modalTitle = document.querySelector('#add-shift-modal .modal-title');
            const submitBtn = document.querySelector('#add-shift-modal .btn-primary');
            
            if (modalTitle) modalTitle.textContent = 'Edit Shift';
            if (submitBtn) {
                submitBtn.textContent = 'Update Shift';
                submitBtn.onclick = () => updateShift(id);
            }
        }
        
        async function updateShift(id) {
            const date = document.getElementById('shift-date').value;
            const startTime = document.getElementById('shift-start').value;
            const endTime = document.getElementById('shift-end').value;
            const location = document.getElementById('shift-location').value;
            const notes = document.getElementById('shift-notes').value;
            const type = document.querySelector('input[name="shift-type"]:checked').value;
            
            if (!date || !startTime || !endTime || !location) {
                alert('Please fill in all required fields.');
                return;
            }
            
            const updatedShift = {
                id: id,
                date: date,
                startTime: startTime,
                endTime: endTime,
                location: location,
                notes: notes,
                type: type
            };
            
            try {
                // Save to Firebase
                const savedShiftId = await saveShiftToFirebase(updatedShift);
                
                if (savedShiftId) {
                    // Update local array
                    const index = shifts.findIndex(s => s.id == id);
                    if (index !== -1) {
                        shifts[index] = { ...updatedShift, id: savedShiftId };
                    }
                    
                    // Update UI
                    if (currentTab === 'list') {
                        loadShifts();
                    } else {
                        renderCalendar();
                        updateSelectedDateShifts();
                    }
                    
                    // Refresh home page if it's active
                    if (window.homeModule && document.getElementById('home-page').classList.contains('active')) {
                        window.homeModule.loadHomeShifts();
                    }
                    
                    closeAddShiftModal();
                    
                    // Reset modal to add mode
                    resetAddModal();
                } else {
                    alert('Failed to update shift. Please try again.');
                }
            } catch (error) {
                console.error('Error updating shift:', error);
                alert('Failed to update shift. Please try again.');
            }
        }
        
        function resetAddModal() {
            // Reset form
            document.getElementById('shift-date').value = '';
            document.getElementById('shift-start').value = '';
            document.getElementById('shift-end').value = '';
            document.getElementById('shift-location').value = '';
            document.getElementById('shift-notes').value = '';
            
            // Reset modal title and button
            const modalTitle = document.querySelector('#add-shift-modal .modal-title');
            const submitBtn = document.querySelector('#add-shift-modal .btn-primary');
            
            if (modalTitle) modalTitle.textContent = 'Add New Shift';
            if (submitBtn) {
                submitBtn.textContent = 'Add Shift';
                submitBtn.onclick = addShift;
            }
        }
        
        // Initialize schedule module
        async function init() {
            // Load shifts from Firebase if user is logged in
            if (window.firebaseAuth && window.firebaseAuth.currentUser) {
                await loadShiftsFromFirebase();
            }
            
            // Initialize shift type radio button listeners
            initializeShiftTypeListeners();
        }
        
        // Initialize shift type radio button listeners
        function initializeShiftTypeListeners() {
            const shiftTypeRadios = document.querySelectorAll('input[name="shift-type"]');
            shiftTypeRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    const type = radio.value;
                    if (type === 'morning') {
                        document.getElementById('shift-start').value = '07:00';
                        document.getElementById('shift-end').value = '15:00';
                    } else if (type === 'evening') {
                        document.getElementById('shift-start').value = '15:00';
                        document.getElementById('shift-end').value = '23:00';
                    } else if (type === 'night') {
                        document.getElementById('shift-start').value = '23:00';
                        document.getElementById('shift-end').value = '07:00';
                    }
                });
            });
        }
        
        // Public API
        return {
            switchTab,
            loadShifts,
            renderCalendar,
            updateSelectedDateShifts,
            prevMonth,
            nextMonth,
            openAddShiftModal,
            closeAddShiftModal,
            addShift,
            openDeleteModal,
            closeDeleteModal,
            confirmDeleteShift,
            editShift,
            updateShift,
            resetAddModal,
            selectDate,
            initializeShiftTypeListeners,
            init,
            loadShiftsFromFirebase
        };
    })();
    
    // Make schedule functions globally accessible for HTML onclick handlers
    window.switchTab = scheduleModule.switchTab;
    window.prevMonth = scheduleModule.prevMonth;
    window.nextMonth = scheduleModule.nextMonth;
    window.openAddShiftModal = scheduleModule.openAddShiftModal;
    window.closeAddShiftModal = scheduleModule.closeAddShiftModal;
    window.addShift = scheduleModule.addShift;
    window.openDeleteModal = scheduleModule.openDeleteModal;
    window.closeDeleteModal = scheduleModule.closeDeleteModal;
    window.confirmDeleteShift = scheduleModule.confirmDeleteShift;
    window.editShift = scheduleModule.editShift;
    window.selectDate = scheduleModule.selectDate;
    
    // Make the module globally accessible
    window.scheduleModule = scheduleModule;
} 