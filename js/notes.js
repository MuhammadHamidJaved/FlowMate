                    // Notes System Module - Clean implementation
        if (typeof window.notesSystem === 'undefined') {
        const notesSystem = (function() {
            // Notes data array
            let notesData = [];
            
            // Global variables
            let currentNoteId = null;
            let currentFilter = 'all';
            let currentNoteType = 'normal'; // Default note type
            let currentUser = null;
            let notesListScrollPosition = 0; // Store scroll position for notes list
            
            // Function to restore scroll position
            function restoreScrollPosition() {
                console.log('Restoring scroll position:', notesListScrollPosition);
                if (notesListScrollPosition > 0) {
                    setTimeout(() => {
                        // Check if notes page is actually visible
                        const notesPage = document.getElementById('notes-page');
                        if (notesPage && !notesPage.classList.contains('hidden')) {
                            window.scrollTo({
                                top: notesListScrollPosition,
                                behavior: 'smooth'
                            });
                            console.log('Scroll restored to:', notesListScrollPosition);
                        } else {
                            console.log('Notes page not visible, retrying...');
                            // Retry after a longer delay
                            setTimeout(() => {
                                window.scrollTo({
                                    top: notesListScrollPosition,
                                    behavior: 'smooth'
                                });
                            }, 500);
                        }
                    }, 150); // Slightly longer delay to ensure page transition is complete
                }
            }
            
                // Page Navigation - Updated to work with main app
            function showPage(pageId) {
                // Use the main navigation module if available
                if (window.navigationModule && typeof window.navigationModule.showPage === 'function') {
                    window.navigationModule.showPage(pageId);
                    
                    // If returning to notes page, restore scroll position
                    if (pageId === 'notes-page') {
                        setTimeout(() => {
                            restoreScrollPosition();
                        }, 200); // Wait for page transition to complete
                    }
                } else {
                    // Fallback navigation
                    // Hide all pages in the main app
                    document.querySelectorAll('.page').forEach(page => {
                        page.classList.add('hidden');
                    });
                    
                    // Show selected page
                    const targetPage = document.getElementById(pageId);
                    if (targetPage) {
                        targetPage.classList.remove('hidden');
                    }
                    
                    // Update navigation active state
                    document.querySelectorAll('.nav-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    // Set the appropriate nav item as active
                    if (pageId === 'notes-page') {
                        const navNotes = document.getElementById('nav-notes');
                        if (navNotes) {
                            navNotes.classList.add('active');
                        }
                        
                        // Restore scroll position when returning to notes page
                        setTimeout(() => {
                            restoreScrollPosition();
                        }, 200); // Wait for page transition to complete
                    } else if (pageId === 'note-detail-page') {
                        // Keep notes nav active when viewing detail
                        const navNotes = document.getElementById('nav-notes');
                        if (navNotes) {
                            navNotes.classList.add('active');
                        }
                    }
                }
            }
            
            // Generate a unique share ID
            function generateShareId() {
                return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            
            // Share a note
            async function shareNote(noteId) {
                if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDB) {
                    return null;
                }
                
                try {
                    // Generate a unique share ID
                    const shareId = generateShareId();
                    
                    // Update the note with sharing information
                    await window.firebaseDB
                        .collection('users')
                        .doc(currentUser.uid)
                        .collection('notes')
                        .doc(noteId)
                        .update({
                            shared: true,
                            shareId: shareId,
                            sharedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    
                    // Create a shareable link - use current URL as base
                    const currentUrl = window.location.href.split('?')[0]; // Remove any existing query params
                    const shareLink = `${currentUrl}?share=${shareId}`;
                    return shareLink;
                } catch (error) {
                    console.error('Error sharing note:', error);
                    return null;
                }
            }
            
            // Unshare a note
            async function unshareNote(noteId) {
                if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDB) {
                    return false;
                }
                
                try {
                    await window.firebaseDB
                        .collection('users')
                        .doc(currentUser.uid)
                        .collection('notes')
                        .doc(noteId)
                        .update({
                            shared: false,
                            shareId: null,
                            sharedAt: null
                        });
                    return true;
                } catch (error) {
                    console.error('Error unsharing note:', error);
                    return false;
                }
            }
            
            // Load a shared note by share ID
            async function loadSharedNote(shareId) {
                if (!window.firebaseDB) {
                    return null;
                }
                
                try {
                    // Search through all users to find the shared note
                    const usersSnapshot = await window.firebaseDB.collection('users').get();
                    
                    for (const userDoc of usersSnapshot.docs) {
                        try {
                            const notesSnapshot = await userDoc.ref
                                .collection('notes')
                                .where('shareId', '==', shareId)
                                .where('shared', '==', true)
                                .limit(1)
                                .get();
                            
                            if (!notesSnapshot.empty) {
                                const doc = notesSnapshot.docs[0];
                                const noteData = doc.data();
                                return {
                                    id: doc.id,
                                    ...noteData,
                                    createdAt: noteData.createdAt ? noteData.createdAt.toDate() : new Date(),
                                    updatedAt: noteData.updatedAt ? noteData.updatedAt.toDate() : new Date()
                                };
                            }
                        } catch (userError) {
                            continue; // Skip this user and try the next one
                        }
                    }
                    
                    return null;
                } catch (error) {
                    return null;
                }
            }
            
            // Show shared note (for external users)
            function showSharedNote(sharedNote) {
                // Navigate to notes page first
                showPage('notes-page');
                
                // Wait a bit for the page to load, then show the shared note
                setTimeout(() => {
                    // Create a temporary note in the local data for display
                    const tempNote = {
                        ...sharedNote,
                        isShared: true // Flag to identify this as a shared note
                    };
                    
                    // Add to notes data temporarily
                    notesData.unshift(tempNote);
                    
                    // Show the shared note detail
                    showNoteDetail(sharedNote.id);
                    
                    // Update the page title to indicate it's a shared note
                    const titleElement = document.getElementById('note-detail-title');
                    if (titleElement) {
                        titleElement.textContent = `${sharedNote.title} (Shared)`;
                    }
                    
                    // Hide edit and share buttons for shared notes
                    const editBtn = document.getElementById('edit-detail-note-btn');
                    const shareBtn = document.getElementById('share-note-btn');
                    const unshareBtn = document.getElementById('unshare-note-btn');
                    const copyBtn = document.getElementById('copy-to-my-notes-btn');
                    
                    if (editBtn) editBtn.style.display = 'none';
                    if (shareBtn) shareBtn.style.display = 'none';
                    if (unshareBtn) unshareBtn.style.display = 'none';
                    
                    // Show copy button for shared notes
                    if (copyBtn) {
                        copyBtn.style.display = 'inline-flex';
                        copyBtn.setAttribute('data-shared-note-id', sharedNote.id);
                        
                        // Add click event listener for copy button
                        copyBtn.onclick = async function() {
                            await copySharedNoteToMyNotes(sharedNote);
                        };
                    }
                    
                    // Update navigation to show notes page as active
                    if (window.navigationModule) {
                        window.navigationModule.updateActiveNav('notes');
                    }
                }, 100);
            }
            
            // Show shared note for anonymous users (with restrictions)
            function showSharedNoteForAnonymousUser(sharedNote) {
                // Navigate to notes page first
                showPage('notes-page');
                
                // Wait a bit for the page to load, then show the shared note
                setTimeout(() => {
                    // Create a temporary note in the local data for display
                    const tempNote = {
                        ...sharedNote,
                        isShared: true, // Flag to identify this as a shared note
                        isAnonymousView: true // Flag to indicate this is an anonymous view
                    };
                    
                    // Add to notes data temporarily
                    notesData.unshift(tempNote);
                    
                    // Show the shared note detail
                    showNoteDetail(sharedNote.id);
                    
                    // Update the page title to indicate it's a shared note
                    const titleElement = document.getElementById('note-detail-title');
                    if (titleElement) {
                        titleElement.textContent = `${sharedNote.title} (Shared)`;
                    }
                    
                    // Force hide ALL action buttons for anonymous users with a longer delay
                    setTimeout(() => {
                        const editBtn = document.getElementById('edit-detail-note-btn');
                        const shareBtn = document.getElementById('share-note-btn');
                        const unshareBtn = document.getElementById('unshare-note-btn');
                        const copyBtn = document.getElementById('copy-to-my-notes-btn');
                        
                        if (editBtn) editBtn.style.display = 'none';
                        if (shareBtn) shareBtn.style.display = 'none';
                        if (unshareBtn) unshareBtn.style.display = 'none';
                        if (copyBtn) copyBtn.style.display = 'none';
                        
                        // Hide the "Back to Notes" button (it's the button with onclick="notesSystem.showPage('notes-page')")
                        const backToNotesBtn = document.querySelector('button[onclick*="notesSystem.showPage(\'notes-page\')"]');
                        if (backToNotesBtn) backToNotesBtn.style.display = 'none';
                        
                        // Also hide any other back buttons that might exist
                        const headerBackBtn = document.querySelector('.back-btn');
                        if (headerBackBtn) headerBackBtn.style.display = 'none';
                        
                        // Set up a continuous check to ensure buttons stay hidden
                        const hideButtonsForAnonymous = () => {
                            const buttons = [
                                document.getElementById('edit-detail-note-btn'),
                                document.getElementById('share-note-btn'),
                                document.getElementById('unshare-note-btn'),
                                document.getElementById('copy-to-my-notes-btn'),
                                document.querySelector('button[onclick*="notesSystem.showPage(\'notes-page\')"]')
                            ];
                            
                            buttons.forEach(btn => {
                                if (btn && btn.style.display !== 'none') {
                                    btn.style.display = 'none';
                                }
                            });
                        };
                        
                        // Check every 500ms for 5 seconds to ensure buttons stay hidden
                        let checkCount = 0;
                        const checkInterval = setInterval(() => {
                            hideButtonsForAnonymous();
                            checkCount++;
                            if (checkCount >= 10) { // 5 seconds (10 * 500ms)
                                clearInterval(checkInterval);
                            }
                        }, 500);
                    }, 200);
                    
                    // Update navigation to show notes page as active
                    if (window.navigationModule) {
                        window.navigationModule.updateActiveNav('notes');
                    }
                }, 100);
            }
            
            // Firebase Integration Functions
            async function loadNotesFromFirebase() {
                if (!window.firebaseAuth || !window.firebaseAuth.currentUser) {
                    // Handle anonymous users
                    notesData = [];
                    renderNotes();
                    return;
                }
                
                currentUser = window.firebaseAuth.currentUser;
                
                try {
                    if (window.firebaseDB) {
                        const notesSnapshot = await window.firebaseDB
                            .collection('users')
                            .doc(currentUser.uid)
                            .collection('notes')
                            .orderBy('createdAt', 'desc')
                            .get();
                        
                        notesData = [];
                        notesSnapshot.forEach(doc => {
                            const noteData = doc.data();
                            notesData.push({
                                id: doc.id,
                                ...noteData,
                                createdAt: noteData.createdAt ? noteData.createdAt.toDate() : new Date(),
                                updatedAt: noteData.updatedAt ? noteData.updatedAt.toDate() : new Date()
                            });
                        });
                        
                        renderNotes();
                    }
                } catch (error) {
                    console.error('Error loading notes from Firebase:', error);
                }
            }
            
            async function saveNoteToFirebase(noteData) {
                if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDB) {
                    return null;
                }
                
                try {
                    const userDoc = window.firebaseDB.collection('users').doc(currentUser.uid);
                    const notesCollection = userDoc.collection('notes');
                    
                    if (currentNoteId) {
                        // Update existing note
                        await notesCollection.doc(currentNoteId).update({
                            ...noteData,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        return currentNoteId;
                    } else {
                        // Create new note
                        const docRef = await notesCollection.add({
                            ...noteData,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                            userId: currentUser.uid,
                            shared: false,
                            shareId: null
                        });
                        return docRef.id;
                    }
                } catch (error) {
                    console.error('Error saving note to Firebase:', error);
                    throw error;
                }
            }
            
            async function deleteNoteFromFirebase(noteId) {
                if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDB) {
                    return false;
                }
                
                try {
                    await window.firebaseDB
                        .collection('users')
                        .doc(currentUser.uid)
                        .collection('notes')
                        .doc(noteId)
                        .delete();
                    return true;
                } catch (error) {
                    console.error('Error deleting note from Firebase:', error);
                    return false;
                }
            }
            

            
            // Show Note Detail
            function showNoteDetail(noteId) {
                const note = notesData.find(n => n.id == noteId || n.id === noteId);
                if (!note) return;
                
                // Save current page scroll position
                notesListScrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
                console.log('Saved scroll position:', notesListScrollPosition);
                
                document.getElementById('note-detail-title').textContent = note.title;
                document.getElementById('note-detail-date').textContent = note.date;
                
                // Clear previous content
                document.getElementById('note-detail-type').innerHTML = '';
                document.getElementById('note-detail-soap-sections').innerHTML = '';
                document.getElementById('note-detail-content').innerHTML = '';
                document.getElementById('note-detail-images').innerHTML = '';
                document.getElementById('note-detail-tags').innerHTML = '';
                
                // Add note type badge
                const noteTypeEl = document.getElementById('note-detail-type');
                if (note.noteType === 'soap') {
                    noteTypeEl.innerHTML = `<span class="note-type-tag soap-note">SOAP Note</span>`;
                } else {
                    noteTypeEl.innerHTML = `<span class="note-type-tag normal-note">Normal Note</span>`;
                }
                
                // Add SOAP sections if they exist
                if (note.noteType === 'soap') {
                    const soapSections = document.getElementById('note-detail-soap-sections');
                    
                    if (note.subjective) {
                        const section = document.createElement('div');
                        section.className = 'soap-section soap-s-border mb-4';
                        section.innerHTML = `
                            <h3 class="font-medium mb-2 flex items-center">
                                <span class="soap-tag soap-s mr-2">S</span>
                                Subjective
                            </h3>
                            <p class="text-gray-600">${note.subjective}</p>
                        `;
                        soapSections.appendChild(section);
                    }
                    
                    if (note.objective) {
                        const section = document.createElement('div');
                        section.className = 'soap-section soap-o-border mb-4';
                        section.innerHTML = `
                            <h3 class="font-medium mb-2 flex items-center">
                                <span class="soap-tag soap-o mr-2">O</span>
                                Objective
                            </h3>
                            <p class="text-gray-600">${note.objective}</p>
                        `;
                        soapSections.appendChild(section);
                    }
                    
                    if (note.assessment) {
                        const section = document.createElement('div');
                        section.className = 'soap-section soap-a-border mb-4';
                        section.innerHTML = `
                            <h3 class="font-medium mb-2 flex items-center">
                                <span class="soap-tag soap-a mr-2">A</span>
                                Assessment
                            </h3>
                            <p class="text-gray-600">${note.assessment}</p>
                        `;
                        soapSections.appendChild(section);
                    }
                    
                    if (note.plan) {
                        const section = document.createElement('div');
                        section.className = 'soap-section soap-p-border mb-4';
                        section.innerHTML = `
                            <h3 class="font-medium mb-2 flex items-center">
                                <span class="soap-tag soap-p mr-2">P</span>
                                Plan
                            </h3>
                            <p class="text-gray-600">${note.plan.replace(/\n/g, '<br>')}</p>
                        `;
                        soapSections.appendChild(section);
                    }
                }
                
                // Add general content
                document.getElementById('note-detail-content').innerHTML = `<p class="text-gray-600">${note.content}</p>`;
                
                // Add images if they exist (append only after successful load)
if (Array.isArray(note.images)) {
  const images = note.images.filter(s => (s || "").trim() !== "");
  if (images.length > 0) {
    const imagesContainer = document.getElementById("note-detail-images");
    images.forEach((src, index) => {
      const img = new Image();
      img.alt = "Note image";
      img.className = "note-image mb-4 cursor-pointer";
      img.style.cursor = "pointer";
      img.title = "Click to view full size";

      img.onload = () => imagesContainer.appendChild(img);
      img.onerror = () => {}; // skip broken
      img.addEventListener("click", () => {
        if (window.imageViewer && images.length > 0) {
          window.imageViewer.openViewer(images, index, note.title);
        }
      });
      img.src = src;
    });
  }
}


                
                // Add tags
                const tagsContainer = document.getElementById('note-detail-tags');
                note.tags.forEach(tag => {
                    const tagSpan = document.createElement('span');
                    tagSpan.className = 'tag';
                    tagSpan.textContent = tag;
                    tagsContainer.appendChild(tagSpan);
                });
                
                // Set current note ID for edit button
                document.getElementById('edit-detail-note-btn').setAttribute('data-note-id', noteId);
                
                // Add sharing functionality
                const shareButton = document.getElementById('share-note-btn');
                const unshareButton = document.getElementById('unshare-note-btn');
                const copyButton = document.getElementById('copy-to-my-notes-btn');
                // The back button is the one with onclick="notesSystem.showPage('notes-page')"
                const backButton = document.querySelector('button[onclick*="notesSystem.showPage(\'notes-page\')"]');
                
                // Check if user is anonymous or if this is an anonymous view
                const isAnonymous = !window.firebaseAuth || !window.firebaseAuth.currentUser;
                const isAnonymousView = note.isAnonymousView;
                
                if (isAnonymous || isAnonymousView) {
                    // Hide ALL action buttons for anonymous users
                    if (shareButton) shareButton.style.display = 'none';
                    if (unshareButton) unshareButton.style.display = 'none';
                    if (copyButton) copyButton.style.display = 'none';
                    if (backButton) backButton.style.display = 'none';
                    
                    // Also hide the back button in the header if it exists
                    const headerBackBtn = document.querySelector('.back-btn');
                    if (headerBackBtn) headerBackBtn.style.display = 'none';
                } else {
                    // Show buttons based on note sharing status for authenticated users
                if (shareButton && unshareButton) {
                    if (note.shared) {
                        shareButton.style.display = 'none';
                        unshareButton.style.display = 'inline-flex';
                        unshareButton.setAttribute('data-note-id', noteId);
                    } else {
                        shareButton.style.display = 'inline-flex';
                        unshareButton.style.display = 'none';
                        shareButton.setAttribute('data-note-id', noteId);
                        }
                    }
                    
                    // Show copy button only for shared notes (when viewing someone else's shared note)
                    if (copyButton) {
                        if (note.isShared && !note.shared) {
                            copyButton.style.display = 'inline-flex';
                            copyButton.setAttribute('data-shared-note-id', noteId);
                        } else {
                            copyButton.style.display = 'none';
                        }
                    }
                }
                
                
                
                // Show the detail page
                showPage('note-detail-page');
            }
            
            // Filter Notes
            function filterNotes(filter) {
                currentFilter = filter;
                const notes = document.querySelectorAll('#notes-list > div.bg-white');
                
                // If no notes, don't hide the empty state
                if (notes.length === 0) return;
                
                notes.forEach(note => {
                    const noteType = note.getAttribute('data-note-type');
                    if (filter === 'all' || noteType === filter) {
                        note.style.display = '';
                    } else {
                        note.style.display = 'none';
                    }
                });
                
                // Update active tab
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.getAttribute('data-filter') === filter) {
                        tab.classList.add('active');
                    }
                });
                
                // Check if any notes are visible after filtering
                let visibleNotes = false;
                notes.forEach(note => {
                    if (note.style.display !== 'none') {
                        visibleNotes = true;
                    }
                });
                
                // Show empty state message if no notes are visible
                const emptyState = document.getElementById('empty-state');
                if (!visibleNotes) {
                    if (!emptyState) {
                        const emptyStateEl = document.createElement('div');
                        emptyStateEl.id = 'empty-state';
                        emptyStateEl.className = 'empty-state';
                        emptyStateEl.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 class="text-lg font-medium text-gray-900 mb-1">No ${filter === 'all' ? '' : filter} notes found</h3>
                            <p class="text-gray-500 mb-4">Create a new ${filter === 'all' ? '' : filter} note by clicking the "Add Note" button above.</p>
                        `;
                        document.getElementById('notes-list').appendChild(emptyStateEl);
                    } else {
                        emptyState.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 class="text-lg font-medium text-gray-900 mb-1">No ${filter === 'all' ? '' : filter} notes found</h3>
                            <p class="text-gray-500 mb-4">Create a new ${filter === 'all' ? '' : filter} note by clicking the "Add Note" button above.</p>
                        `;
                        emptyState.style.display = '';
                    }
                } else if (emptyState) {
                    emptyState.style.display = 'none';
                }
            }
            
            // Toggle Note Type in Modal
            function toggleNoteType(type) {
                currentNoteType = type;
                
                // Update toggle buttons
                document.querySelectorAll('.toggle-option').forEach(option => {
                    option.classList.remove('active');
                    if (option.getAttribute('data-type') === type) {
                        option.classList.add('active');
                    }
                });
                
                // Show/hide appropriate sections
                if (type === 'soap') {
                    document.getElementById('soap-sections').classList.remove('hidden');
                } else {
                    document.getElementById('soap-sections').classList.add('hidden');
                }
            }
            
            // Open Note Modal for Add/Edit
            function openNoteModal(mode, noteId = null) {
                const modal = document.getElementById('note-modal');
                const modalTitle = document.getElementById('note-modal-title');
                
                if (mode === 'edit' && noteId) {
                    // Find the note to edit - handle both string and number IDs
                    const note = notesData.find(n => n.id == noteId || n.id === noteId);
                    if (!note) {
                        console.error('Note not found for ID:', noteId, 'Available notes:', notesData.map(n => ({ id: n.id, title: n.title })));
                        return;
                    }
                    
                    console.log('Found note for editing:', note);
                    
                    modalTitle.textContent = 'Edit Note';
                    currentNoteId = note.id;
                    
                    // Set note type first before populating fields
                    toggleNoteType(note.noteType);
                    
                    // Populate form fields with existing note data
                    document.getElementById('note-title-input').value = note.title || '';
                    document.getElementById('note-content-input').value = note.content || '';
                    document.getElementById('note-tags-input').value = note.tags ? note.tags.join(', ') : '';
                    
                    // Fill SOAP sections if it's a SOAP note
                    if (note.noteType === 'soap') {
                        document.getElementById('subjective-input').value = note.subjective || '';
                        document.getElementById('objective-input').value = note.objective || '';
                        document.getElementById('assessment-input').value = note.assessment || '';
                        document.getElementById('plan-input').value = note.plan || '';
                    }
                    
                    // Show image preview if exists
                    if (note.images && note.images.length > 0) {
                        document.getElementById('image-name').textContent = 'Current image';
                        document.getElementById('image-preview-container').classList.remove('hidden');
                        document.getElementById('image-preview').src = note.images[0];
                    } else {
                        document.getElementById('image-name').textContent = 'No image selected';
                        document.getElementById('image-preview-container').classList.add('hidden');
                        document.getElementById('image-preview').src = '';
                    }
                } else {
                    // Reset form for new note
                    modalTitle.textContent = 'Add New Note';
                    currentNoteId = null;
                    
                    // Clear all form fields
                    document.getElementById('note-title-input').value = '';
                    document.getElementById('note-content-input').value = '';
                    document.getElementById('subjective-input').value = '';
                    document.getElementById('objective-input').value = '';
                    document.getElementById('assessment-input').value = '';
                    document.getElementById('plan-input').value = '';
                    document.getElementById('note-tags-input').value = '';
                    document.getElementById('image-name').textContent = 'No image selected';
                    document.getElementById('image-preview-container').classList.add('hidden');
                    document.getElementById('image-preview').src = '';
                    
                    // Clear the file input field to allow new uploads
                    const imageUpload = document.getElementById('image-upload');
                    if (imageUpload) {
                        imageUpload.value = '';
                    }
                    
                    // Set default note type to normal
                    toggleNoteType('normal');
                }
                
                // Show modal using modal manager
                if (window.modalManager) {
                    window.modalManager.showModal('note-modal');
                } else {
                    // Fallback to direct modal show
                    modal.classList.remove('hidden');
                    modal.style.display = 'flex';
                    document.body.classList.add('modal-open');
                    
                    // Scroll modal to top
                    if (modal) {
                        const modalContent = modal.querySelector('div');
                        if (modalContent) {
                            modalContent.scrollTop = 0;
                        }
                    }
                }
            }
            
            // Global variables to track save state and cancellation
            let isSavingNote = false;
            let saveCancelled = false;
            let currentSaveAbortController = null;
            
            async function saveNote() {
                // Prevent multiple simultaneous saves
                if (isSavingNote) {
                    console.log('Save already in progress, ignoring duplicate click');
                    return;
                }
                
                const title = document.getElementById('note-title-input').value.trim();
                const content = document.getElementById('note-content-input').value.trim();
                const tagsInput = document.getElementById('note-tags-input').value.trim();
                const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
                
                if (!title) {
                    alert('Please enter a title for your note');
                    return;
                }
                
                // Reset cancellation flag and create abort controller
                saveCancelled = false;
                currentSaveAbortController = new AbortController();
                
                // Set saving state
                isSavingNote = true;
                
                // Update save button to show saving status
                const saveButton = document.querySelector('#note-modal .btn-primary');
                const originalButtonText = saveButton ? saveButton.textContent : 'Save Note';
                if (saveButton) {
                    saveButton.textContent = 'Saving';
                    saveButton.disabled = true;
                    saveButton.style.opacity = '0.7';
                    saveButton.style.cursor = 'not-allowed';
                    saveButton.classList.add('btn-loading');
                }
                
                // Hide cancel button during save operation
                const cancelButton = document.getElementById('cancel-note-btn');
                const originalCancelDisplay = cancelButton ? cancelButton.style.display : 'block';
                if (cancelButton) {
                    cancelButton.style.display = 'none';
                    cancelButton.style.transition = 'opacity 0.3s ease';
                    cancelButton.style.opacity = '0';
                }
                
                try {
                // Get image if uploaded
                const imagePreview = document.getElementById('image-preview');
                let images = [];
                if (!imagePreview.classList.contains('hidden') && imagePreview.src) {
                    images.push(imagePreview.src);
                }
                
                // Create note object based on type
                let noteData = {
                    title,
                    content,
                    tags,
                    noteType: currentNoteType,
                    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    images
                };
                
                // Add SOAP fields if it's a SOAP note
                if (currentNoteType === 'soap') {
                    noteData.subjective = document.getElementById('subjective-input').value.trim();
                    noteData.objective = document.getElementById('objective-input').value.trim();
                    noteData.assessment = document.getElementById('assessment-input').value.trim();
                    noteData.plan = document.getElementById('plan-input').value.trim();
                }
                
                // If editing existing note, preserve sharing status and existing images
                if (currentNoteId) {
                    const existingNote = notesData.find(n => n.id === currentNoteId);
                    if (existingNote) {
                        noteData.shared = existingNote.shared || false;
                        noteData.shareId = existingNote.shareId || null;
                        
                        // Preserve existing images if no new image was uploaded
                        if (images.length === 0 && existingNote.images) {
                            noteData.images = existingNote.images;
                        }
                    }
                }
                
                    // Check if save was cancelled before proceeding
                    if (saveCancelled) {
                        console.log('Save operation was cancelled');
                        return;
                }
                
                    // Save to Firebase
                    const savedNoteId = await saveNoteToFirebase(noteData);
                    
                    // Check again if save was cancelled during Firebase operation
                    if (saveCancelled) {
                        console.log('Save operation was cancelled during Firebase save');
                        return;
                    }
                    
                    if (savedNoteId) {
                        // Update local data
                        if (currentNoteId) {
                            const noteIndex = notesData.findIndex(n => n.id === currentNoteId);
                            if (noteIndex !== -1) {
                                notesData[noteIndex] = {
                                    ...notesData[noteIndex],
                                    ...noteData,
                                    id: savedNoteId
                                };
                            }
                        } else {
                            // Add new note to beginning of array
                            const newNote = {
                                id: savedNoteId,
                                ...noteData,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            };
                            notesData.unshift(newNote);
                        }
                        
                        // Close modal and refresh notes list
                        if (window.modalManager) {
                            window.modalManager.hideModal('note-modal');
                        } else {
                            // Fallback to direct modal hide
                            document.getElementById('note-modal').classList.add('hidden');
                            document.getElementById('note-modal').style.display = 'none';
                            document.body.classList.remove('modal-open');
                        }
                        
                        // Clear the file input field to allow new uploads
                        const imageUpload = document.getElementById('image-upload');
                        if (imageUpload) {
                            imageUpload.value = '';
                        }
                        
                        renderNotes();
                        
                        // Show success message
                        showSaveSuccessMessage();
                    }
                } catch (error) {
                    // Only show error if save wasn't cancelled
                    if (!saveCancelled) {
                    console.error('Error saving note:', error);
                    alert('Failed to save note. Please try again.');
                    }
                } finally {
                    // Reset saving state
                    isSavingNote = false;
                    saveCancelled = false;
                    currentSaveAbortController = null;
                    
                    // Restore save button
                    if (saveButton) {
                        saveButton.textContent = originalButtonText;
                        saveButton.disabled = false;
                        saveButton.style.opacity = '1';
                        saveButton.style.cursor = 'pointer';
                        saveButton.classList.remove('btn-loading');
                    }
                    
                    // Restore cancel button
                    const cancelButton = document.getElementById('cancel-note-btn');
                    if (cancelButton) {
                        cancelButton.style.display = originalCancelDisplay;
                        cancelButton.style.opacity = '1';
                    }
                }
            }
            
            // Function to show save success message
            function showSaveSuccessMessage() {
                // Create a temporary success message
                const successMessage = document.createElement('div');
                successMessage.className = 'save-success-message';
                successMessage.textContent = 'Note saved successfully!';
                successMessage.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background-color: #10b981;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 10000;
                    font-weight: 500;
                    animation: slideInRight 0.3s ease-out;
                `;
                
                document.body.appendChild(successMessage);
                
                // Remove the message after 3 seconds
                setTimeout(() => {
                    if (successMessage.parentNode) {
                        successMessage.style.animation = 'slideOutRight 0.3s ease-in';
                        setTimeout(() => {
                            if (successMessage.parentNode) {
                                successMessage.parentNode.removeChild(successMessage);
                            }
                        }, 300);
                    }
                }, 3000);
            }
            
            // Delete Note
            async function deleteNote(noteId) {
                try {
                    // Delete from Firebase
                    const success = await deleteNoteFromFirebase(noteId);
                    
                    if (success) {
                        // Remove from local data
                        const noteIndex = notesData.findIndex(n => n.id === noteId);
                        if (noteIndex !== -1) {
                            notesData.splice(noteIndex, 1);
                            renderNotes();
                            
                            // If we're on the detail page, go back to notes list
                            if (document.getElementById('note-detail-page').classList.contains('hidden') === false) {
                                showPage('notes-page');
                            }
                        }
                    } else {
                        alert('Failed to delete note. Please try again.');
                    }
                } catch (error) {
                    console.error('Error deleting note:', error);
                    alert('Failed to delete note. Please try again.');
                }
            }
            
            // Render Notes List
            function renderNotes() {
                const notesList = document.getElementById('notes-list');
                notesList.innerHTML = '';
                
                // Show empty state if no notes
                if (notesData.length === 0) {
                    const emptyState = document.createElement('div');
                    emptyState.id = 'empty-state';
                    emptyState.className = 'empty-state';
                    
                    // Check if user is authenticated
                    const isAuthenticated = window.firebaseAuth && window.firebaseAuth.currentUser;
                    
                    if (isAuthenticated) {
                    emptyState.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 class="text-lg font-medium text-gray-900 mb-1">No notes yet</h3>
                        <p class="text-gray-500 mb-4">Create your first note by clicking the "Add Note" button above.</p>
                    `;
                    } else {
                        emptyState.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 class="text-lg font-medium text-gray-900 mb-1">Sign in to access Notes</h3>
                            <p class="text-gray-500 mb-4">Create, manage, and share your clinical notes by signing in to your account.</p>
                            <button onclick="window.showLoginModal ? window.showLoginModal() : alert('Please sign in to access Notes')" class="btn btn-primary">
                                Sign In to Continue
                            </button>
                        `;
                    }
                    
                    notesList.appendChild(emptyState);
                    return;
                }
                
                notesData.forEach(note => {
                    const noteElement = document.createElement('div');
                    noteElement.className = 'bg-white rounded-lg shadow p-4';
                    noteElement.setAttribute('data-note-id', note.id);
                    noteElement.setAttribute('data-note-type', note.noteType);
                    
                    // Create note HTML
                    let noteHTML = `
                        <div class="flex justify-between items-start">
                            <div class="flex items-center mb-2">
                                <h3 class="font-medium text-lg">${note.title}</h3>
                                <span class="note-type-tag ${note.noteType === 'soap' ? 'soap-note' : 'normal-note'} ml-2">
                                    ${note.noteType === 'soap' ? 'SOAP' : 'Normal'}
                                </span>
                                ${note.shared ? `
                                    <span class="ml-2 text-green-500" title="Shared Note">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                        </svg>
                                    </span>
                                ` : ''}
                            </div>
                            <div class="flex space-x-2">
                                <button class="text-blue-500 hover:text-blue-700 edit-note-btn" data-note-id="${note.id}">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                ${note.shared ? `
                                    <button class="text-green-500 hover:text-green-700 unshare-note-list-btn" data-note-id="${note.id}" title="Unshare Note">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                ` : `
                                    <button class="text-green-500 hover:text-green-700 share-note-list-btn" data-note-id="${note.id}" title="Share Note">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                        </svg>
                                    </button>
                                `}
                                <button class="text-red-500 hover:text-red-700 delete-note-btn" data-note-id="${note.id}">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                    
                    noteElement.innerHTML = noteHTML;
                    
                    // Add SOAP sections preview if it's a SOAP note
                    if (note.noteType === 'soap') {
                        // Create a condensed preview of SOAP sections
                        const soapPreview = document.createElement('div');
                        soapPreview.className = 'mb-3';
                        
                        if (note.subjective) {
                            const section = document.createElement('div');
                            section.className = 'soap-section soap-s-border mb-2';
                            section.innerHTML = `
                                <div class="flex items-center">
                                    <span class="soap-tag soap-s mr-2">S</span>
                                    <p class="text-gray-600 text-sm line-clamp-1">${note.subjective}</p>
                                </div>
                            `;
                            soapPreview.appendChild(section);
                        }
                        
                        if (note.objective) {
                            const section = document.createElement('div');
                            section.className = 'soap-section soap-o-border mb-2';
                            section.innerHTML = `
                                <div class="flex items-center">
                                    <span class="soap-tag soap-o mr-2">O</span>
                                    <p class="text-gray-600 text-sm line-clamp-1">${note.objective}</p>
                                </div>
                            `;
                            soapPreview.appendChild(section);
                        }
                        
                        if (note.assessment) {
                            const section = document.createElement('div');
                            section.className = 'soap-section soap-a-border mb-2';
                            section.innerHTML = `
                                <div class="flex items-center">
                                    <span class="soap-tag soap-a mr-2">A</span>
                                    <p class="text-gray-600 text-sm line-clamp-1">${note.assessment}</p>
                                </div>
                            `;
                            soapPreview.appendChild(section);
                        }
                        
                        if (note.plan) {
                            const section = document.createElement('div');
                            section.className = 'soap-section soap-p-border mb-2';
                            section.innerHTML = `
                                <div class="flex items-center">
                                    <span class="soap-tag soap-p mr-2">P</span>
                                    <p class="text-gray-600 text-sm line-clamp-1">${note.plan.split('\n')[0]}</p>
                                </div>
                            `;
                            soapPreview.appendChild(section);
                        }
                        
                        noteElement.appendChild(soapPreview);
                    }
                    
                    // Add general content
                    const content = document.createElement('p');
                    content.className = 'text-gray-600 mb-3';
                    content.textContent = note.content;
                    noteElement.appendChild(content);
                    
                    // Add image if exists (append only after successful load)
if (Array.isArray(note.images)) {
  const first = (note.images[0] || "").trim();
  if (first) {
    const imageContainer = document.createElement("div");
    imageContainer.className = "mb-3";

    const img = new Image();
    img.alt = "Note image";
    img.className = "note-image";

    img.onload = () => {
      imageContainer.appendChild(img);
      noteElement.appendChild(imageContainer);
    };
    img.onerror = () => {}; // don't append on error
    img.src = first;
  }
}



                    // Add tags
                    const tagsContainer = document.createElement('div');
                    tagsContainer.className = 'flex flex-wrap gap-2 mb-3';
                    note.tags.forEach(tag => {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'tag';
                        tagSpan.textContent = tag;
                        tagsContainer.appendChild(tagSpan);
                    });
                    noteElement.appendChild(tagsContainer);
                    
                    // Add date
                    const dateP = document.createElement('p');
                    dateP.className = 'text-gray-500 text-sm';
                    dateP.textContent = note.date;
                    noteElement.appendChild(dateP);
                    
                    // Make the note clickable to view details
                    noteElement.addEventListener('click', function(e) {
                        // Don't trigger if clicking on edit or delete buttons
                        if (!e.target.closest('button')) {
                            showNoteDetail(note.id);
                        }
                    });
                    
                    notesList.appendChild(noteElement);
                });
                
                // Apply current filter
                filterNotes(currentFilter);
                
                // Add event listeners for edit and delete buttons
                document.querySelectorAll('.edit-note-btn').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const noteId = this.getAttribute('data-note-id');
                        openNoteModal('edit', noteId);
                    });
                });
                
                document.querySelectorAll('.delete-note-btn').forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const noteId = this.getAttribute('data-note-id');
                        
                        // Show delete confirmation modal
                        if (window.modalManager) {
                            window.modalManager.showModal('delete-note-modal');
                        } else {
                            // Fallback to direct modal show
                            const deleteModal = document.getElementById('delete-note-modal');
                            deleteModal.classList.remove('hidden');
                            deleteModal.style.display = 'flex';
                            document.body.classList.add('modal-open');
                        }
                        document.getElementById('confirm-delete-btn').setAttribute('data-note-id', noteId);
                    });
                });
                
                // Note: Share and unshare buttons are now handled by event delegation in setupEventDelegation()
            }
            
            // Initialize the notes system
            let isInitialized = false;
            
            async function init() {
                // Always load notes when init is called, even if already initialized
                // This ensures notes are loaded when navigating to notes page after refresh
                
                // Set up event listeners only once
                if (!isInitialized) {
                isInitialized = true;
                
                // Add Note Button
                document.getElementById('add-note-btn').addEventListener('click', function() {
                    openNoteModal('add');
                });
                
                // Cancel Note Button
                document.getElementById('cancel-note-btn').addEventListener('click', function() {
                    // If save is in progress, cancel it
                    if (isSavingNote) {
                        saveCancelled = true;
                        console.log('Save operation cancelled by user');
                        
                        // Abort any ongoing Firebase operations if possible
                        if (currentSaveAbortController) {
                            currentSaveAbortController.abort();
                        }
                        
                        // Reset save button immediately
                        const saveButton = document.querySelector('#note-modal .btn-primary');
                        if (saveButton) {
                            saveButton.textContent = 'Save Note';
                            saveButton.disabled = false;
                            saveButton.style.opacity = '1';
                            saveButton.style.cursor = 'pointer';
                        }
                        
                        // Reset saving state
                        isSavingNote = false;
                    }
                    
                    // Close modal
                    if (window.modalManager) {
                        window.modalManager.hideModal('note-modal');
                    } else {
                        // Fallback to direct modal hide
                        document.getElementById('note-modal').classList.add('hidden');
                        document.getElementById('note-modal').style.display = 'none';
                        document.body.classList.remove('modal-open');
                    }
                    
                    // Clear the file input field to allow new uploads
                    const imageUpload = document.getElementById('image-upload');
                    if (imageUpload) {
                        imageUpload.value = '';
                    }
                    
                    // Reset image preview
                    const imageName = document.getElementById('image-name');
                    const imagePreview = document.getElementById('image-preview');
                    const previewContainer = document.getElementById('image-preview-container');
                    
                    if (imageName) imageName.textContent = 'No image selected';
                    if (imagePreview) imagePreview.classList.remove('loading');
                    if (previewContainer) previewContainer.classList.add('hidden');
                });
                
                // Save Note Button
                document.getElementById('save-note-btn').addEventListener('click', saveNote);
                
                // Note Type Toggle
                document.querySelectorAll('.toggle-option').forEach(option => {
                    option.addEventListener('click', function() {
                        toggleNoteType(this.getAttribute('data-type'));
                    });
                });
                
                // Filter Tabs
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.addEventListener('click', function() {
                        filterNotes(this.getAttribute('data-filter'));
                    });
                });
                
                // Image Upload with debouncing to prevent multiple rapid uploads
                let imageProcessingTimeout;
                document.getElementById('image-upload').addEventListener('change', function() {
                    const file = this.files[0];
                    if (file) {
                        // Clear any existing timeout
                        if (imageProcessingTimeout) {
                            clearTimeout(imageProcessingTimeout);
                        }
                        
                        // Show loading state with processing indicator
                        const imageName = document.getElementById('image-name');
                        imageName.textContent = 'Processing image...';
                        imageName.className = 'image-processing';
                        
                        // Add loading class to preview container
                        const previewContainer = document.getElementById('image-preview-container');
                        const imagePreview = document.getElementById('image-preview');
                        if (previewContainer) {
                            previewContainer.classList.remove('hidden');
                            imagePreview.classList.add('loading');
                        }
                        
                        // Validate file type
                        if (!file.type.startsWith('image/')) {
                            alert('Please select a valid image file.');
                            this.value = '';
                            
                            // Reset loading states
                            const imageName = document.getElementById('image-name');
                            const imagePreview = document.getElementById('image-preview');
                            const previewContainer = document.getElementById('image-preview-container');
                            
                            imageName.className = '';
                            imageName.textContent = 'No image selected';
                            imagePreview.classList.remove('loading');
                            previewContainer.classList.add('hidden');
                            return;
                        }
                        
                        // Check file size (limit to 5MB)
                        const maxSize = 5 * 1024 * 1024; // 5MB
                        if (file.size > maxSize) {
                            alert('Image size must be less than 5MB. Please choose a smaller image.');
                            this.value = '';
                            
                            // Reset loading states
                            const imageName = document.getElementById('image-name');
                            const imagePreview = document.getElementById('image-preview');
                            const previewContainer = document.getElementById('image-preview-container');
                            
                            imageName.className = '';
                            imageName.textContent = 'No image selected';
                            imagePreview.classList.remove('loading');
                            previewContainer.classList.add('hidden');
                            return;
                        }
                        
                        // Add a small delay to prevent UI blocking
                        imageProcessingTimeout = setTimeout(() => {
                            compressAndDisplayImage(file);
                        }, 50);
                    }
                });
                
                // Image compression function
                function compressAndDisplayImage(file) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    
                    img.onload = function() {
                        // Calculate new dimensions (max 800px width/height)
                        const maxDimension = 800;
                        let { width, height } = img;
                        
                        if (width > height) {
                            if (width > maxDimension) {
                                height = (height * maxDimension) / width;
                                width = maxDimension;
                            }
                        } else {
                            if (height > maxDimension) {
                                width = (width * maxDimension) / height;
                                height = maxDimension;
                            }
                        }
                        
                        // Set canvas dimensions
                        canvas.width = width;
                        canvas.height = height;
                        
                        // Draw and compress image
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // Convert to compressed JPEG (0.8 quality)
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        
                        // Update UI
                        const imageName = document.getElementById('image-name');
                        const imagePreview = document.getElementById('image-preview');
                        const previewContainer = document.getElementById('image-preview-container');
                        
                        // Remove loading states
                        imageName.className = '';
                        imageName.textContent = file.name;
                        imagePreview.classList.remove('loading');
                        imagePreview.src = compressedDataUrl;
                        previewContainer.classList.remove('hidden');
                        
                        // Show compression info
                        const originalSize = (file.size / 1024 / 1024).toFixed(2);
                        const compressedSize = (compressedDataUrl.length * 0.75 / 1024 / 1024).toFixed(2);
                        console.log(`Image compressed: ${originalSize}MB → ${compressedSize}MB`);
                        
                        // Show compression success message
                        if (parseFloat(originalSize) > parseFloat(compressedSize)) {
                            imageName.textContent = `${file.name} (compressed)`;
                        }
                    };
                    
                    img.onerror = function() {
                        alert('Error loading image. Please try again.');
                        document.getElementById('image-upload').value = '';
                        
                        // Reset loading states
                        const imageName = document.getElementById('image-name');
                        const imagePreview = document.getElementById('image-preview');
                        const previewContainer = document.getElementById('image-preview-container');
                        
                        imageName.className = '';
                        imageName.textContent = 'No image selected';
                        imagePreview.classList.remove('loading');
                        previewContainer.classList.add('hidden');
                    };
                    
                    // Create object URL for better performance
                    const objectUrl = URL.createObjectURL(file);
                    
                    // Store the original onload function
                    const originalOnload = img.onload;
                    
                    // Set up the onload handler
                    img.onload = function() {
                        // Clean up object URL
                        URL.revokeObjectURL(objectUrl);
                        
                        // Call the original onload function
                        if (originalOnload) {
                            originalOnload.call(this);
                        }
                    };
                    
                    img.src = objectUrl;
                }
                
                // Edit Note from Detail Page
                document.getElementById('edit-detail-note-btn').addEventListener('click', function() {
                    const noteId = this.getAttribute('data-note-id');
                    openNoteModal('edit', noteId);
                });
                
                // Share Note Button
                document.getElementById('share-note-btn').addEventListener('click', async function() {
                    const noteId = this.getAttribute('data-note-id');
                    if (noteId) {
                        await handleShareNote(noteId);
                    }
                });
                
                // Unshare Note Button
                document.getElementById('unshare-note-btn').addEventListener('click', async function() {
                    const noteId = this.getAttribute('data-note-id');
                    if (noteId) {
                        await handleUnshareNote(noteId);
                    }
                });
                
                // Delete Confirmation Modal
                document.getElementById('cancel-delete-btn').addEventListener('click', function() {
                    if (window.modalManager) {
                        window.modalManager.hideModal('delete-note-modal');
                    } else {
                        // Fallback to direct modal hide
                        document.getElementById('delete-note-modal').classList.add('hidden');
                        document.getElementById('delete-note-modal').style.display = 'none';
                        document.body.classList.remove('modal-open');
                    }
                });
                
                document.getElementById('confirm-delete-btn').addEventListener('click', function() {
                    const noteId = this.getAttribute('data-note-id');
                    deleteNote(noteId);
                    if (window.modalManager) {
                        window.modalManager.hideModal('delete-note-modal');
                    } else {
                        // Fallback to direct modal hide
                        document.getElementById('delete-note-modal').classList.add('hidden');
                        document.getElementById('delete-note-modal').style.display = 'none';
                        document.body.classList.remove('modal-open');
                    }
                });
                
                // Search Notes
                document.getElementById('search-notes').addEventListener('input', function() {
                    const searchTerm = this.value.toLowerCase();
                    const notes = document.querySelectorAll('#notes-list > div.bg-white');
                    
                    // If no notes, don't do anything
                    if (notes.length === 0) return;
                    
                    let visibleNotes = false;
                    
                    notes.forEach(note => {
                        // Only search visible notes (respecting current filter)
                        if (note.style.display !== 'none' || currentFilter === 'all') {
                            const title = note.querySelector('h3').textContent.toLowerCase();
                            const content = Array.from(note.querySelectorAll('p')).map(p => p.textContent.toLowerCase()).join(' ');
                            const tags = Array.from(note.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase());
                            
                            if (title.includes(searchTerm) || content.includes(searchTerm) || tags.some(tag => tag.includes(searchTerm))) {
                                note.style.display = '';
                                visibleNotes = true;
                            } else {
                                note.style.display = 'none';
                            }
                        }
                    });
                    
                    // Show empty state message if no notes are visible
                    const emptyState = document.getElementById('empty-state');
                    if (!visibleNotes) {
                        if (!emptyState) {
                            const emptyStateEl = document.createElement('div');
                            emptyStateEl.id = 'empty-state';
                            emptyStateEl.className = 'empty-state';
                            emptyStateEl.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 class="text-lg font-medium text-gray-900 mb-1">No results found</h3>
                                <p class="text-gray-500 mb-4">Try adjusting your search or filter to find what you're looking for.</p>
                            `;
                            document.getElementById('notes-list').appendChild(emptyStateEl);
                        } else {
                            emptyState.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 class="text-lg font-medium text-gray-900 mb-1">No results found</h3>
                                <p class="text-gray-500 mb-4">Try adjusting your search or filter to find what you're looking for.</p>
                            `;
                            emptyState.style.display = '';
                        }
                    } else if (emptyState) {
                        emptyState.style.display = 'none';
                    }
                });
                }
                
                // Browser navigation listener for scroll position restoration
                window.addEventListener('popstate', function(event) {
                    // Check if we're returning to the notes page
                    const currentPage = document.querySelector('.page:not(.hidden)');
                    if (currentPage && currentPage.id === 'notes-page') {
                        restoreScrollPosition();
                    }
                });
                
                // Always load notes from Firebase if user is logged in
                if (window.firebaseAuth && window.firebaseAuth.currentUser) {
                    await loadNotesFromFirebase();
                } else {
                    // Render empty notes list if not logged in
                    renderNotes();
                }
                
                // Set up event delegation for dynamically created buttons
                setupEventDelegation();
                
                // Handle shared note loading on page load
                await handleSharedNoteOnLoad();
            }
            
            // Set up event delegation for dynamically created buttons
            function setupEventDelegation() {
                // Event delegation for share buttons in notes list
                document.addEventListener('click', async function(e) {
                    // Share note button in list
                    if (e.target.closest('.share-note-list-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const button = e.target.closest('.share-note-list-btn');
                        const noteId = button.getAttribute('data-note-id');
                        
                        if (noteId) {
                            await handleShareNote(noteId);
                        }
                    }
                    
                    // Unshare note button in list
                    if (e.target.closest('.unshare-note-list-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const button = e.target.closest('.unshare-note-list-btn');
                        const noteId = button.getAttribute('data-note-id');
                        
                        if (noteId) {
                            await handleUnshareNote(noteId);
                        }
                    }
                    
                    // Copy to my notes button in detail page
                    if (e.target.closest('#copy-to-my-notes-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const button = e.target.closest('#copy-to-my-notes-btn');
                        const sharedNoteId = button.getAttribute('data-shared-note-id');
                        
                        if (sharedNoteId) {
                            // Find the shared note in the temporary data
                            const sharedNote = notesData.find(note => note.id === sharedNoteId && note.isShared);
                            if (sharedNote) {
                                await copySharedNoteToMyNotes(sharedNote);
                            }
                        }
                    }
                    
                    // Edit note button
                    if (e.target.closest('.edit-note-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const button = e.target.closest('.edit-note-btn');
                        const noteId = button.getAttribute('data-note-id');
                        
                        if (noteId) {
                            openNoteModal('edit', noteId);
                        }
                    }
                    
                    // Delete note button
                    if (e.target.closest('.delete-note-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const button = e.target.closest('.delete-note-btn');
                        const noteId = button.getAttribute('data-note-id');
                        
                        if (noteId) {
                            deleteNote(noteId);
                        }
                    }
                });
            }
            
            // Handle share note with mobile-friendly sharing
            async function handleShareNote(noteId) {
                try {
                    // Show loading state
                    const button = document.querySelector(`[data-note-id="${noteId}"].share-note-list-btn`);
                    if (button) {
                        const originalHTML = button.innerHTML;
                        button.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        `;
                        button.disabled = true;
                        
                        // Share the note
                        const shareLink = await shareNote(noteId);
                        
                        // Reset button
                        button.innerHTML = originalHTML;
                        button.disabled = false;
                        
                        if (shareLink) {
                            // Update the note's sharing status in local data
                            const note = notesData.find(n => n.id === noteId);
                            if (note) {
                                note.shared = true;
                                note.shareId = shareLink.split('share=')[1];
                                renderNotes(); // Re-render to update UI
                            }
                            
                            // Mobile-friendly sharing
                            await shareNoteMobile(shareLink, note?.title || 'Shared Note');
                        } else {
                            showShareError('Failed to share note. Please try again.');
                        }
                    }
                } catch (error) {
                    console.error('Error sharing note:', error);
                    showShareError('Failed to share note. Please try again.');
                }
            }
            
            // Handle unshare note
            async function handleUnshareNote(noteId) {
                try {
                    const success = await unshareNote(noteId);
                    if (success) {
                        // Update the note's sharing status in local data
                        const note = notesData.find(n => n.id === noteId);
                        if (note) {
                            note.shared = false;
                            note.shareId = null;
                            renderNotes(); // Re-render to update UI
                        }
                        showShareSuccess('Note unshared successfully!');
                    } else {
                        showShareError('Failed to unshare note. Please try again.');
                    }
                } catch (error) {
                    console.error('Error unsharing note:', error);
                    showShareError('Failed to unshare note. Please try again.');
                }
            }
            
            // Mobile-friendly sharing function
            async function shareNoteMobile(shareLink, title) {
                try {
                    // Check if Web Share API is available (mobile browsers)
                    if (navigator.share && navigator.canShare) {
                        const shareData = {
                            title: title,
                            text: `Check out this note: ${title}`,
                            url: shareLink
                        };
                        
                        // Check if the data can be shared
                        if (navigator.canShare(shareData)) {
                            await navigator.share(shareData);
                            showShareSuccess('Note shared successfully!');
                            return;
                        }
                    }
                    
                    // Fallback for desktop or browsers without Web Share API
                    const copySuccess = await copyToClipboard(shareLink);
                    if (copySuccess) {
                        showShareSuccess('Share link copied to clipboard!');
                    } else {
                        // If clipboard copy fails, show the link directly
                        showShareError('Failed to copy to clipboard. Please copy this link: ' + shareLink);
                        
                        // Also try to open in a new tab as another option
                        setTimeout(() => {
                            if (confirm('Would you like to open the share link in a new tab?')) {
                                window.open(shareLink, '_blank');
                            }
                        }, 1000);
                    }
                    
                } catch (error) {
                    if (error.name === 'AbortError') {
                        // User cancelled sharing
                        return;
                    }
                    
                    // Fallback to clipboard copy
                    try {
                        const copySuccess = await copyToClipboard(shareLink);
                        if (copySuccess) {
                            showShareSuccess('Share link copied to clipboard!');
                        } else {
                            // Final fallback - show the link in an alert
                            showShareError('Failed to share automatically. Please copy this link: ' + shareLink);
                            
                            // Also try to open in a new tab as another option
                            setTimeout(() => {
                                if (confirm('Would you like to open the share link in a new tab?')) {
                                    window.open(shareLink, '_blank');
                                }
                            }, 1000);
                        }
                    } catch (clipboardError) {
                        // Final fallback - show the link in an alert
                        showShareError('Failed to share automatically. Please copy this link: ' + shareLink);
                        
                        // Also try to open in a new tab as another option
                        setTimeout(() => {
                            if (confirm('Would you like to open the share link in a new tab?')) {
                                window.open(shareLink, '_blank');
                            }
                        }, 1000);
                    }
                }
            }
            
            // Copy to clipboard function
            async function copyToClipboard(text) {
                try {
                    // Check if modern clipboard API is available and we're in a secure context
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(text);
                        return true;
                    } else {
                        // Fallback for older browsers or non-secure contexts
                        const textArea = document.createElement('textarea');
                        textArea.value = text;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        textArea.style.opacity = '0';
                        textArea.style.pointerEvents = 'none';
                        textArea.style.zIndex = '-1';
                        
                        document.body.appendChild(textArea);
                        
                        // Select the text
                        textArea.select();
                        textArea.setSelectionRange(0, 99999); // For mobile devices
                        
                        // Try to copy
                        const successful = document.execCommand('copy');
                        
                        // Clean up
                        document.body.removeChild(textArea);
                        
                        return successful;
                    }
                } catch (error) {
                    console.error('Clipboard copy failed:', error);
                    return false;
                }
            }
            
            // Show share success message
            function showShareSuccess(message) {
                const toast = document.createElement('div');
                toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
                toast.textContent = message;
                document.body.appendChild(toast);
                
                // Animate in
                setTimeout(() => {
                    toast.classList.remove('translate-x-full');
                }, 100);
                
                // Remove after 3 seconds
                setTimeout(() => {
                    toast.classList.add('translate-x-full');
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 300);
                }, 3000);
            }
            
            // Show share error message
            function showShareError(message) {
                const toast = document.createElement('div');
                toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
                toast.textContent = message;
                document.body.appendChild(toast);
                
                // Animate in
                setTimeout(() => {
                    toast.classList.remove('translate-x-full');
                }, 100);
                
                // Remove after 5 seconds
                setTimeout(() => {
                    toast.classList.add('translate-x-full');
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 300);
                }, 5000);
            }
            
            // Handle shared note loading on page load
            async function handleSharedNoteOnLoad() {
                const urlParams = new URLSearchParams(window.location.search);
                const shareId = urlParams.get('share');
                
                if (shareId) {
                    // Wait a bit for user system to initialize
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Check if user is authenticated using the isAuthenticated function
                    const isAuthenticated = window.userSystem && window.userSystem.isAuthenticated && window.userSystem.isAuthenticated();
                    
                    if (isAuthenticated) {
                        // Set up a timeout to force remove loading after 10 seconds
                        const loadingTimeout = setTimeout(() => {
                            if (window.notesSystem && window.notesSystem.removeShareLoading) {
                                window.notesSystem.removeShareLoading();
                            }
                        }, 10000);
                        
                        try {
                            // Show loading state for authenticated users
                        showShareLoading('Loading shared note...');
                        
                        const sharedNote = await loadSharedNote(shareId);
                            
                            // Clear the timeout since we're removing loading normally
                            clearTimeout(loadingTimeout);
                            
                            // Remove loading state
                            removeShareLoading();
                        
                        if (sharedNote) {
                            // Clear the URL parameter to prevent reloading on refresh
                            const newUrl = window.location.href.split('?')[0];
                            window.history.replaceState({}, document.title, newUrl);
                            
                            // Show the shared note
                            showSharedNote(sharedNote);
                            
                            // Navigate to notes page
                            if (window.navigationModule) {
                                window.navigationModule.showPage('note-detail-page');
                            }
                                
                                // Show success message
                                showShareSuccess('Shared note loaded successfully!');
                        } else {
                            showShareError('Shared note not found or has been removed.');
                        }
                    } catch (error) {
                        console.error('Error loading shared note:', error);
                            
                            // Clear the timeout since we're handling the error
                            clearTimeout(loadingTimeout);
                            
                        showShareError('Failed to load shared note. Please try again.');
                        }
                    }
                }
            }
            
            // Show share loading message
            function showShareLoading(message) {
                // Remove any existing loading toast first
                if (window.currentShareLoadingToast) {
                    removeShareLoading();
                }
                
                const toast = document.createElement('div');
                toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                toast.innerHTML = `
                    <div class="flex items-center">
                        <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ${message}
                    </div>
                `;
                document.body.appendChild(toast);
                
                // Store reference for removal
                window.currentShareLoadingToast = toast;
            }
            
            // Remove share loading message
            function removeShareLoading() {
                if (window.currentShareLoadingToast) {
                    const toast = window.currentShareLoadingToast;
                    window.currentShareLoadingToast = null; // Clear reference immediately
                    
                    // Remove immediately
                    if (toast && toast.parentNode) {
                        document.body.removeChild(toast);
                    }
                }
            }
            
            // Copy shared note to user's notes
            async function copySharedNoteToMyNotes(sharedNote) {
                if (!window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firebaseDB) {
                    showShareError('You must be logged in to copy notes.');
                    return false;
                }
                
                try {
                    // Show loading state
                    const button = document.getElementById('copy-to-my-notes-btn');
                    if (button) {
                        const originalHTML = button.innerHTML;
                        button.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Copying...</span>
                        `;
                        button.disabled = true;
                        
                        // Create a new note based on the shared note
                        const newNoteData = {
                            title: `${sharedNote.title} (Copied)`,
                            content: sharedNote.content,
                            noteType: sharedNote.noteType,
                            tags: [...(sharedNote.tags || [])],
                            images: [...(sharedNote.images || [])],
                            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                            // SOAP sections if it's a SOAP note
                            ...(sharedNote.noteType === 'soap' && {
                                subjective: sharedNote.subjective,
                                objective: sharedNote.objective,
                                assessment: sharedNote.assessment,
                                plan: sharedNote.plan
                            }),
                            // Metadata
                            shared: false,
                            shareId: null,
                            isCopied: true,
                            originalShareId: sharedNote.shareId,
                            copiedFrom: sharedNote.title
                        };
                        
                        // Save to Firebase
                        const newNoteId = await saveNoteToFirebase(newNoteData);
                        
                        if (newNoteId) {
                            // Add to local data
                            const newNote = {
                                id: newNoteId,
                                ...newNoteData,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            };
                            notesData.unshift(newNote);
                            
                            // Reset button
                            button.innerHTML = originalHTML;
                            button.disabled = false;
                            
                            // Show success message
                            showShareSuccess('Note copied to your notes successfully!');
                            
                            // Navigate to the new note
                    setTimeout(() => {
                                showNoteDetail(newNoteId);
                            }, 1000);
                            
                            return true;
                        } else {
                            throw new Error('Failed to save note');
                        }
                    }
                } catch (error) {
                    console.error('Error copying shared note:', error);
                    
                    // Reset button
                    const button = document.getElementById('copy-to-my-notes-btn');
                    if (button) {
                        button.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy to My Notes</span>
                        `;
                        button.disabled = false;
                    }
                    
                    showShareError('Failed to copy note. Please try again.');
                    return false;
                }
            }
            

            
            // Return public methods
            return {
                init: init,
                showPage: showPage,
                loadSharedNote: loadSharedNote,
                showSharedNote: showSharedNote,
                showSharedNoteForAnonymousUser: showSharedNoteForAnonymousUser,
                handleSharedNoteOnLoad: handleSharedNoteOnLoad,
                shareNote: shareNote,
                unshareNote: unshareNote,
                shareNoteMobile: shareNoteMobile,
                copySharedNoteToMyNotes: copySharedNoteToMyNotes,
                showShareLoading: showShareLoading,
                showShareSuccess: showShareSuccess,
                showShareError: showShareError,
                removeShareLoading: removeShareLoading,
                addNote: function(noteData) {
                    // Add a new note programmatically
                    const newNote = {
                        id: Date.now(), // Use timestamp as ID
                        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                        ...noteData
                    };
                    notesData.unshift(newNote);
                    renderNotes();
                },
                getNotes: function() {
                    // Get all notes
                    return [...notesData];
                }
            };
        })();
        
            // Make notesSystem available globally for the main app
            window.notesSystem = notesSystem;
        }