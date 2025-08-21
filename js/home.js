// Home Page Module - Real-time Data Loading
if (typeof window.homeModule === 'undefined') {
    const homeModule = (function() {
        
        // Load upcoming shifts for home page
        async function loadHomeShifts() {
            const container = document.getElementById('home-shifts-container');
            if (!container) return;
            
            if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDB) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📅</div>
                        <div class="empty-text">Sign in to view your shifts</div>
                    </div>
                `;
                return;
            }
            
            try {
                const currentUser = window.firebaseAuth.currentUser;
                const today = new Date().toISOString().split('T')[0];
                
                // Get upcoming shifts (today and future)
                const shiftsSnapshot = await window.firebaseDB
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('schedules')
                    .where('date', '>=', today)
                    .orderBy('date', 'asc')
                    .limit(3) // Show only next 3 shifts
                    .get();
                
                const shifts = [];
                shiftsSnapshot.forEach(doc => {
                    const shiftData = doc.data();
                    shifts.push({
                        id: doc.id,
                        ...shiftData
                    });
                });
                
                if (shifts.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">📅</div>
                            <div class="empty-text">No upcoming shifts</div>
                        </div>
                    `;
                    return;
                }
                
                // Render shifts
                container.innerHTML = '';
                shifts.forEach(shift => {
                    const shiftEl = createHomeShiftElement(shift);
                    container.appendChild(shiftEl);
                });
                
            } catch (error) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">❌</div>
                        <div class="empty-text">Failed to load shifts</div>
                    </div>
                `;
            }
        }
        
        // Create shift element for home page
        function createHomeShiftElement(shift) {
            const shiftEl = document.createElement('div');
            shiftEl.className = 'shift-item';
            
            const shiftDate = new Date(shift.date);
            const dayOfWeek = shiftDate.toLocaleDateString('en-US', { weekday: 'long' });
            const formattedDate = shiftDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            shiftEl.innerHTML = `
                <div class="shift-header">
                    <div class="shift-date">${dayOfWeek}, ${formattedDate}</div>
                    <div class="shift-time">${shift.startTime} - ${shift.endTime}</div>
                </div>
                <div class="shift-location">${shift.location}</div>
                ${shift.notes ? `<div class="shift-note">${shift.notes}</div>` : ''}
            `;
            
            return shiftEl;
        }
        
        // Load recent notes for home page
        async function loadHomeNotes() {
            const container = document.getElementById('home-notes-container');
            if (!container) return;
            
            if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDB) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <div class="empty-text">Sign in to view your notes</div>
                    </div>
                `;
                return;
            }
            
            try {
                const currentUser = window.firebaseAuth.currentUser;
                
                // Get recent notes
                const notesSnapshot = await window.firebaseDB
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('notes')
                    .orderBy('updatedAt', 'desc')
                    .limit(3) // Show only 3 most recent notes
                    .get();
                
                const notes = [];
                notesSnapshot.forEach(doc => {
                    const noteData = doc.data();
                    notes.push({
                        id: doc.id,
                        ...noteData
                    });
                });
                
                if (notes.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">📝</div>
                            <div class="empty-text">No recent notes</div>
                        </div>
                    `;
                    return;
                }
                
                // Render notes
                container.innerHTML = '';
                notes.forEach(note => {
                    const noteEl = createHomeNoteElement(note);
                    container.appendChild(noteEl);
                });
                
            } catch (error) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">❌</div>
                        <div class="empty-text">Failed to load notes</div>
                    </div>
                `;
            }
        }
        
        // Create note element for home page
        function createHomeNoteElement(note) {
            const noteEl = document.createElement('div');
            noteEl.className = 'note-item';
            
            const updatedAt = note.updatedAt ? note.updatedAt.toDate() : new Date();
            const formattedDate = updatedAt.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            // Truncate content for home page
            const truncatedContent = note.content ? 
                (note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content) : 
                'No content';
            
            // Create tags HTML
            const tagsHTML = note.tags && note.tags.length > 0 ? 
                note.tags.slice(0, 2).map(tag => `<div class="note-tag">${tag}</div>`).join('') : '';
            
            noteEl.innerHTML = `
                <div class="note-title">${note.title || 'Untitled Note'}</div>
                <div class="note-content">${truncatedContent}</div>
                <div class="note-footer">
                    ${tagsHTML ? `<div class="note-tags">${tagsHTML}</div>` : ''}
                    <div class="note-date">${formattedDate}</div>
                </div>
            `;
            
            return noteEl;
        }
        
        // Initialize home page
        async function init() {
            await loadHomeShifts();
            await loadHomeNotes();
        }
        
        // Refresh home page data
        async function refresh() {
            await loadHomeShifts();
            await loadHomeNotes();
        }
        
        // Public API
        return {
            init,
            refresh,
            loadHomeShifts,
            loadHomeNotes
        };
    })();
    
    // Make the module globally accessible
    window.homeModule = homeModule;
} 