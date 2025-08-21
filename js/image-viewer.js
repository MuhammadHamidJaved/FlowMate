// Image Viewer Module
if (typeof window.imageViewer === 'undefined') {
    const imageViewer = (function() {
        // State variables
        let currentImages = [];
        let currentImageIndex = 0;
        let currentZoom = 1;
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let currentNoteTitle = 'image';
        
        // DOM elements
        let modal = null;
        let imageElement = null;
        let container = null;
        
        // Initialize the image viewer
        function init() {
            modal = document.getElementById('image-viewer-modal');
            imageElement = document.getElementById('viewer-image');
            container = document.getElementById('image-container');
            
            if (!modal || !imageElement || !container) {
                return;
            }
            
            // Ensure modal is hidden on initialization
            modal.classList.add('hidden');
            modal.style.display = 'none';
            
            setupEventListeners();
        }
        
        // Setup event listeners
        function setupEventListeners() {
            // Close button
            document.getElementById('close-image-viewer').addEventListener('click', closeViewer);
            
            // Navigation buttons
            document.getElementById('prev-image-btn').addEventListener('click', showPreviousImage);
            document.getElementById('next-image-btn').addEventListener('click', showNextImage);
            
            // Zoom controls
            document.getElementById('zoom-in-btn').addEventListener('click', zoomIn);
            document.getElementById('zoom-out-btn').addEventListener('click', zoomOut);
            document.getElementById('zoom-reset-btn').addEventListener('click', resetZoom);
            document.getElementById('download-image-btn').addEventListener('click', downloadImage);
            
            // Keyboard navigation
            document.addEventListener('keydown', handleKeyPress);
            
            // Mouse events for dragging
            imageElement.addEventListener('mousedown', startDrag);
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', stopDrag);
            
            // Touch events for mobile
            imageElement.addEventListener('touchstart', handleTouchStart);
            imageElement.addEventListener('touchmove', handleTouchMove);
            imageElement.addEventListener('touchend', handleTouchEnd);
            
            // Wheel zoom
            container.addEventListener('wheel', handleWheel);
            
            // Click outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeViewer();
                }
            });
        }
        
        // Open image viewer
        function openViewer(images, startIndex = 0, noteTitle = '') {
            if (!images || images.length === 0) {
                return;
            }
            
            // Validate startIndex
            if (startIndex < 0 || startIndex >= images.length) {
                startIndex = 0;
            }
            
            currentImages = images;
            currentImageIndex = startIndex;
            currentZoom = 1;
            isDragging = false;
            
            // Store note title for download
            currentNoteTitle = noteTitle || 'image';
            
            // Reset drag offsets
            dragOffsetX = 0;
            dragOffsetY = 0;
            
            // Show the modal
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            
            // Load the first image
            loadImage(currentImageIndex);
            
            // Update UI
            updateNavigationUI();
            updateZoomUI();
        }
        
        // Close image viewer
        function closeViewer() {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            
            // Reset state
            currentImages = [];
            currentImageIndex = 0;
            currentZoom = 1;
            isDragging = false;
            currentNoteTitle = 'image';
            
            // Reset image transform
            imageElement.style.transform = 'scale(1) translate(0px, 0px)';
            imageElement.classList.remove('zoomed');
        }
        
        // Load image at specific index
        function loadImage(index) {
            if (index < 0 || index >= currentImages.length) return;
            
            currentImageIndex = index;
            imageElement.src = currentImages[index];
            
            // Reset zoom and position
            currentZoom = 1;
            dragOffsetX = 0;
            dragOffsetY = 0;
            imageElement.style.transform = 'scale(1) translate(0px, 0px)';
            imageElement.classList.remove('zoomed');
            
            // Update counter
            document.getElementById('current-image-index').textContent = index + 1;
            document.getElementById('total-images').textContent = currentImages.length;
            
            // Update navigation UI
            updateNavigationUI();
            updateZoomUI();
        }
        
        // Show previous image
        function showPreviousImage() {
            if (currentImageIndex > 0) {
                loadImage(currentImageIndex - 1);
            }
        }
        
        // Show next image
        function showNextImage() {
            if (currentImageIndex < currentImages.length - 1) {
                loadImage(currentImageIndex + 1);
            }
        }
        
        // Zoom in
        function zoomIn() {
            if (currentZoom < 3) {
                currentZoom = Math.min(3, currentZoom + 0.5);
                applyTransform();
                updateZoomUI();
            }
        }
        
        // Zoom out
        function zoomOut() {
            if (currentZoom > 0.5) {
                currentZoom = Math.max(0.5, currentZoom - 0.5);
                applyTransform();
                updateZoomUI();
            }
        }
        
        // Reset zoom
        function resetZoom() {
            currentZoom = 1;
            dragOffsetX = 0;
            dragOffsetY = 0;
            applyTransform();
            updateZoomUI();
        }
        
        // Download current image
        function downloadImage() {
            if (!imageElement.src) return;
            
            // Create a temporary link element
            const link = document.createElement('a');
            link.href = imageElement.src;
            
            // Create filename using note title and image index
            const sanitizedTitle = currentNoteTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const imageNumber = currentImages.length > 1 ? `_${currentImageIndex + 1}` : '';
            const extension = getImageExtension(imageElement.src);
            const filename = `${sanitizedTitle}${imageNumber}.${extension}`;
            
            link.download = filename;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        // Helper function to get image extension
        function getImageExtension(src) {
            try {
                const url = new URL(src);
                const pathname = url.pathname;
                const extension = pathname.split('.').pop().toLowerCase();
                
                // Validate extension
                const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
                if (validExtensions.includes(extension)) {
                    return extension;
                }
            } catch (e) {
                // If URL parsing fails, try to extract from src
                const match = src.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
                if (match) {
                    const extension = match[1].toLowerCase();
                    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
                    if (validExtensions.includes(extension)) {
                        return extension;
                    }
                }
            }
            
            // Default to jpg if no valid extension found
            return 'jpg';
        }
        
        // Apply transform to image
        function applyTransform() {
            const transform = `scale(${currentZoom}) translate(${dragOffsetX}px, ${dragOffsetY}px)`;
            imageElement.style.transform = transform;
            
            if (currentZoom > 1) {
                imageElement.classList.add('zoomed');
            } else {
                imageElement.classList.remove('zoomed');
            }
        }
        
        // Update navigation UI
        function updateNavigationUI() {
            const prevBtn = document.getElementById('prev-image-btn');
            const nextBtn = document.getElementById('next-image-btn');
            
            if (currentImages.length <= 1) {
                prevBtn.classList.add('hidden');
                nextBtn.classList.add('hidden');
            } else {
                prevBtn.classList.remove('hidden');
                nextBtn.classList.remove('hidden');
                
                prevBtn.disabled = currentImageIndex === 0;
                nextBtn.disabled = currentImageIndex === currentImages.length - 1;
            }
        }
        
        // Update zoom UI
        function updateZoomUI() {
            const zoomInBtn = document.getElementById('zoom-in-btn');
            const zoomOutBtn = document.getElementById('zoom-out-btn');
            const zoomResetBtn = document.getElementById('zoom-reset-btn');
            const downloadBtn = document.getElementById('download-image-btn');
            
            zoomInBtn.disabled = currentZoom >= 3;
            zoomOutBtn.disabled = currentZoom <= 0.5;
            zoomResetBtn.disabled = currentZoom === 1 && dragOffsetX === 0 && dragOffsetY === 0;
            
            // Update download button tooltip
            if (downloadBtn) {
                const sanitizedTitle = currentNoteTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const imageNumber = currentImages.length > 1 ? `_${currentImageIndex + 1}` : '';
                const extension = getImageExtension(imageElement.src);
                const filename = `${sanitizedTitle}${imageNumber}.${extension}`;
                downloadBtn.title = `Download as: ${filename}`;
            }
        }
        
        // Handle keyboard navigation
        function handleKeyPress(e) {
            if (!modal.classList.contains('hidden')) {
                switch (e.key) {
                    case 'Escape':
                        closeViewer();
                        break;
                    case 'ArrowLeft':
                        showPreviousImage();
                        break;
                    case 'ArrowRight':
                        showNextImage();
                        break;
                    case '+':
                    case '=':
                        zoomIn();
                        break;
                    case '-':
                        zoomOut();
                        break;
                    case '0':
                        resetZoom();
                        break;
                }
            }
        }
        
        // Mouse drag functionality
        function startDrag(e) {
            if (currentZoom <= 1) return;
            
            isDragging = true;
            dragStartX = e.clientX - dragOffsetX;
            dragStartY = e.clientY - dragOffsetY;
            imageElement.style.cursor = 'grabbing';
        }
        
        function handleDrag(e) {
            if (!isDragging || currentZoom <= 1) return;
            
            dragOffsetX = e.clientX - dragStartX;
            dragOffsetY = e.clientY - dragStartY;
            applyTransform();
        }
        
        function stopDrag() {
            isDragging = false;
            imageElement.style.cursor = 'grab';
        }
        
        // Touch functionality for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartDistance = 0;
        let isPinching = false;
        
        function handleTouchStart(e) {
            if (e.touches.length === 1) {
                // Single touch - start drag
                if (currentZoom > 1) {
                    isDragging = true;
                    touchStartX = e.touches[0].clientX - dragOffsetX;
                    touchStartY = e.touches[0].clientY - dragOffsetY;
                }
            } else if (e.touches.length === 2) {
                // Two touches - start pinch
                isPinching = true;
                touchStartDistance = getDistance(e.touches[0], e.touches[1]);
            }
        }
        
        function handleTouchMove(e) {
            if (e.touches.length === 1 && isDragging && currentZoom > 1) {
                // Single touch drag
                dragOffsetX = e.touches[0].clientX - touchStartX;
                dragOffsetY = e.touches[0].clientY - touchStartY;
                applyTransform();
            } else if (e.touches.length === 2 && isPinching) {
                // Pinch zoom
                const currentDistance = getDistance(e.touches[0], e.touches[1]);
                const scale = currentDistance / touchStartDistance;
                const newZoom = Math.max(0.5, Math.min(3, currentZoom * scale));
                
                if (Math.abs(newZoom - currentZoom) > 0.1) {
                    currentZoom = newZoom;
                    touchStartDistance = currentDistance;
                    applyTransform();
                    updateZoomUI();
                }
            }
        }
        
        function handleTouchEnd(e) {
            isDragging = false;
            isPinching = false;
        }
        
        function getDistance(touch1, touch2) {
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        // Wheel zoom
        function handleWheel(e) {
            e.preventDefault();
            
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }
        
        // Public API
        return {
            init: init,
            openViewer: openViewer,
            closeViewer: closeViewer
        };
    })();
    
    // Make imageViewer available globally
    window.imageViewer = imageViewer;
    
    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Small delay to ensure all elements are properly rendered
            setTimeout(() => {
                imageViewer.init();
            }, 100);
        });
    } else {
        // Small delay to ensure all elements are properly rendered
        setTimeout(() => {
            imageViewer.init();
        }, 100);
    }
} 