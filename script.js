document.addEventListener('DOMContentLoaded', () => {

    // =========================================
    // NAVIGATION & MOBILE MENU
    // =========================================
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');
    const navLinks = document.querySelectorAll('.nav-links a');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            menuToggle.textContent = nav.classList.contains('active') ? '✕' : '☰';
        });

        // Close menu when clicking a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                menuToggle.textContent = '☰';
            });
        });
    }

    // =========================================
    // SCROLL REVEAL ANIMATIONS
    // =========================================
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        observer.observe(el);
    });

    // =========================================
    // BACKEND INTEGRATION & PLAYGROUND LOGIC
    // =========================================
    
    // Global State
    let currentUploadedUrl = null;
    const USER_ID = 'DObRu1vyStbUynoQmTcHBlhs55z2';
    
    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const uploadZone = document.getElementById('upload-zone');
    const previewImage = document.getElementById('preview-image');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultImage = document.getElementById('result-final');
    const resultPlaceholder = document.querySelector('.result-placeholder');
    const loadingState = document.getElementById('loading-state');
    const downloadBtn = document.getElementById('download-btn');
    const uploadContent = document.querySelector('.upload-content');

    // --- HELPER FUNCTIONS ---

    // Generate nanoid for unique filename
    function generateNanoId(length = 21) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // UI: Show Loading State
    function showLoading() {
        if (loadingState) loadingState.classList.remove('hidden');
        if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
        if (resultImage) resultImage.classList.add('hidden');
        // Hide video if exists from previous run
        const video = document.getElementById('result-video');
        if (video) video.style.display = 'none';
    }

    // UI: Hide Loading State
    function hideLoading() {
        if (loadingState) loadingState.classList.add('hidden');
    }

    // UI: Update Status Text
    function updateStatus(text) {
        // Try to find a status text element, create if missing in loading state
        let statusEl = document.querySelector('#loading-state p');
        if (statusEl) statusEl.textContent = text;
        
        // Update button text
        if (generateBtn) {
            if (text.includes('PROCESSING') || text.includes('UPLOADING') || text.includes('SUBMITTING')) {
                generateBtn.disabled = true;
                generateBtn.textContent = text;
            } else if (text === 'READY') {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Stencil';
            } else if (text === 'COMPLETE') {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Again';
            }
        }
    }

    // UI: Show Error
    function showError(msg) {
        alert('Error: ' + msg);
    }

    // UI: Show Preview
    function showPreview(url) {
        if (previewImage) {
            previewImage.src = url;
            previewImage.classList.remove('hidden');
        }
        if (uploadContent) uploadContent.classList.add('hidden');
    }

    // UI: Show Result Media (Image or Video)
    function showResultMedia(url) {
        const container = document.getElementById('result-container');
        if (!container) return;
        
        const isVideo = url.toLowerCase().match(/\.(mp4|webm)(\?.*)?$/i);
        
        // Ensure placeholder is hidden
        if (resultPlaceholder) resultPlaceholder.classList.add('hidden');

        if (isVideo) {
            // Hide image
            if (resultImage) {
                resultImage.classList.add('hidden');
                resultImage.style.display = 'none';
            }
            
            // Show/Create video
            let video = document.getElementById('result-video');
            if (!video) {
                video = document.createElement('video');
                video.id = 'result-video';
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.className = 'w-full h-auto rounded-lg shadow-lg';
                // Insert after placeholder or inside container
                container.appendChild(video);
            }
            video.src = url;
            video.style.display = 'block';
        } else {
            // Hide video
            const video = document.getElementById('result-video');
            if (video) video.style.display = 'none';
            
            // Show image
            if (resultImage) {
                resultImage.src = url + '?t=' + new Date().getTime(); // Prevent caching
                resultImage.classList.remove('hidden');
                resultImage.style.display = 'block';
                // Remove the simulated filter from original script if it exists
                resultImage.style.filter = 'none';
            }
        }
    }

    // UI: Prepare Download Button
    function showDownloadButton(url) {
        if (downloadBtn) {
            downloadBtn.dataset.url = url;
            downloadBtn.classList.remove('disabled');
            downloadBtn.removeAttribute('disabled'); // Ensure attribute is gone
        }
    }

    // --- API FUNCTIONS ---

    // Upload file to CDN storage
    async function uploadFile(file) {
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const uniqueId = generateNanoId();
        const fileName = uniqueId + '.' + fileExtension;
        
        // Step 1: Get signed URL
        const signedUrlResponse = await fetch(
            'https://api.chromastudio.ai/get-emd-upload-url?fileName=' + encodeURIComponent(fileName),
            { method: 'GET' }
        );
        
        if (!signedUrlResponse.ok) {
            throw new Error('Failed to get signed URL: ' + signedUrlResponse.statusText);
        }
        
        const signedUrl = await signedUrlResponse.text();
        console.log('Got signed URL');
        
        // Step 2: PUT file to signed URL
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file: ' + uploadResponse.statusText);
        }
        
        // Step 3: Return download URL
        const downloadUrl = 'https://contents.maxstudio.ai/' + fileName;
        console.log('Uploaded to:', downloadUrl);
        return downloadUrl;
    }

    // Submit generation job
    async function submitImageGenJob(imageUrl) {
        // Configuration
        const isVideo = 'image-effects' === 'video-effects'; // Evaluates to false
        const endpoint = isVideo ? 'https://api.chromastudio.ai/video-gen' : 'https://api.chromastudio.ai/image-gen';
        
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
        };

        let body = {};
        if (isVideo) {
            body = {
                imageUrl: [imageUrl],
                effectId: 'stencilMaker',
                userId: USER_ID,
                removeWatermark: true,
                model: 'video-effects',
                isPrivate: true
            };
        } else {
            body = {
                model: 'image-effects',
                toolType: 'image-effects',
                effectId: 'stencilMaker',
                imageUrl: imageUrl,
                userId: USER_ID,
                removeWatermark: true,
                isPrivate: true
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit job: ' + response.statusText);
        }
        
        const data = await response.json();
        console.log('Job submitted:', data.jobId, 'Status:', data.status);
        return data;
    }

    // Poll job status
    async function pollJobStatus(jobId) {
        const isVideo = 'image-effects' === 'video-effects';
        const baseUrl = isVideo ? 'https://api.chromastudio.ai/video-gen' : 'https://api.chromastudio.ai/image-gen';
        const POLL_INTERVAL = 2000;
        const MAX_POLLS = 60;
        
        let polls = 0;
        
        while (polls < MAX_POLLS) {
            const response = await fetch(
                `${baseUrl}/${USER_ID}/${jobId}/status`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to check status: ' + response.statusText);
            }
            
            const data = await response.json();
            console.log('Poll', polls + 1, '- Status:', data.status);
            
            if (data.status === 'completed') {
                return data;
            }
            
            if (data.status === 'failed' || data.status === 'error') {
                throw new Error(data.error || 'Job processing failed');
            }
            
            // Update UI with progress
            updateStatus('PROCESSING... (' + (polls + 1) + ')');
            
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            polls++;
        }
        
        throw new Error('Job timed out after ' + MAX_POLLS + ' polls');
    }

    // --- EVENT HANDLERS ---

    // Handle File Selection
    async function handleFileSelect(file) {
        if (!file) return;
        
        // Show local preview immediately for UX
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImage) {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
            }
            if (uploadContent) uploadContent.classList.add('hidden');
        };
        reader.readAsDataURL(file);

        try {
            // Update UI
            if (loadingState) loadingState.classList.remove('hidden'); // Optional: show mini loader over image
            updateStatus('UPLOADING...');
            
            // Perform Upload
            const uploadedUrl = await uploadFile(file);
            currentUploadedUrl = uploadedUrl;
            
            // Ensure preview is using the online URL (optional, ensures consistency)
            showPreview(uploadedUrl);
            
            updateStatus('READY');
            hideLoading();
            
        } catch (error) {
            hideLoading();
            updateStatus('ERROR');
            showError('Upload failed: ' + error.message);
            console.error(error);
        }
    }

    // Handle Generate Click
    async function handleGenerate() {
        if (!currentUploadedUrl) {
            alert('Please upload an image first.');
            return;
        }
        
        try {
            showLoading();
            updateStatus('SUBMITTING JOB...');
            
            // 1. Submit Job
            const jobData = await submitImageGenJob(currentUploadedUrl);
            
            updateStatus('JOB QUEUED...');
            
            // 2. Poll for Result
            const result = await pollJobStatus(jobData.jobId);
            
            // 3. Extract Result URL
            const resultItem = Array.isArray(result.result) ? result.result[0] : result.result;
            const resultUrl = resultItem?.mediaUrl || resultItem?.video || resultItem?.image;
            
            if (!resultUrl) {
                throw new Error('No media URL in response');
            }
            
            console.log('Result URL:', resultUrl);
            currentUploadedUrl = resultUrl; // Store result for download
            
            // 4. Update UI
            showResultMedia(resultUrl);
            showDownloadButton(resultUrl);
            
            updateStatus('COMPLETE');
            hideLoading();
            
        } catch (error) {
            hideLoading();
            updateStatus('ERROR');
            showError('Generation failed: ' + error.message);
            console.error(error);
        }
    }

    // --- WIRING LISTENERS ---

    // File Input Change
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileSelect(file);
        });
    }

    // Drag & Drop
    if (uploadZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        uploadZone.addEventListener('dragenter', () => uploadZone.style.borderColor = 'var(--primary)');
        uploadZone.addEventListener('dragleave', () => uploadZone.style.borderColor = 'var(--text-muted)');
        
        uploadZone.addEventListener('drop', (e) => {
            uploadZone.style.borderColor = 'var(--text-muted)';
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) handleFileSelect(files[0]);
        });
        
        // Click to upload
        uploadZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }

    // Generate Button
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // Download Button - Robust Strategy
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const url = downloadBtn.dataset.url;
            if (!url) return;
            
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Downloading...';
            downloadBtn.style.opacity = '0.7';
            downloadBtn.style.pointerEvents = 'none';
            
            try {
                // STRATEGY 1: Proxy
                const proxyUrl = 'https://api.chromastudio.ai/download-proxy?url=' + encodeURIComponent(url);
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Proxy failed');
                
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                
                // Determine extension
                const contentType = response.headers.get('content-type') || '';
                let extension = 'png';
                if (contentType.includes('jpeg') || url.match(/\.jpe?g/i)) extension = 'jpg';
                else if (contentType.includes('webp') || url.match(/\.webp/i)) extension = 'webp';
                else if (contentType.includes('mp4') || url.match(/\.mp4/i)) extension = 'mp4';
                
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = 'stencil_' + generateNanoId(8) + '.' + extension;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                
            } catch (proxyErr) {
                console.warn('Proxy download failed, trying direct fetch:', proxyErr);
                
                // STRATEGY 2: Direct Fetch
                try {
                    const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
                    const response = await fetch(fetchUrl);
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = 'stencil_' + generateNanoId(8) + '.png';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                        return;
                    }
                } catch (fetchErr) {
                    console.warn('Direct fetch failed:', fetchErr);
                }
                
                // STRATEGY 3: Canvas (Images only)
                try {
                    const img = document.getElementById('result-final');
                    if (img && img.complete && img.naturalWidth > 0 && !img.classList.contains('hidden')) {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        
                        const tempImg = new Image();
                        tempImg.crossOrigin = 'anonymous';
                        tempImg.onload = function() {
                            ctx.drawImage(tempImg, 0, 0);
                            canvas.toBlob((blob) => {
                                if (blob) {
                                    const link = document.createElement('a');
                                    link.href = URL.createObjectURL(blob);
                                    link.download = 'stencil_' + generateNanoId(8) + '.png';
                                    link.click();
                                    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
                                }
                            }, 'image/png');
                        };
                        tempImg.onerror = function() { showFinalFallback(); };
                        tempImg.src = url + '?t=' + Date.now();
                        return;
                    }
                } catch (canvasErr) {
                    console.warn('Canvas approach failed:', canvasErr);
                }
                
                // STRATEGY 4: Final Fallback
                showFinalFallback();
                
                function showFinalFallback() {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'result.png';
                    link.target = '_blank';
                    link.rel = 'noopener';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            } finally {
                downloadBtn.textContent = originalText;
                downloadBtn.style.opacity = '1';
                downloadBtn.style.pointerEvents = 'auto';
            }
        });
    }

    // Reset Button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentUploadedUrl = null;
            if (fileInput) fileInput.value = '';
            
            if (previewImage) {
                previewImage.src = '';
                previewImage.classList.add('hidden');
            }
            if (uploadContent) uploadContent.classList.remove('hidden');
            
            if (resultImage) {
                resultImage.src = '';
                resultImage.classList.add('hidden');
                resultImage.style.display = 'none';
            }
            
            const video = document.getElementById('result-video');
            if (video) video.style.display = 'none';
            
            if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');
            if (loadingState) loadingState.classList.add('hidden');
            
            if (downloadBtn) {
                downloadBtn.classList.add('disabled');
                downloadBtn.dataset.url = '';
            }
            
            if (generateBtn) {
                generateBtn.textContent = 'Generate Stencil';
                generateBtn.disabled = false;
            }
        });
    }

    // =========================================
    // FAQ ACCORDION
    // =========================================
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const answer = btn.nextElementSibling;
            const isActive = btn.classList.contains('active');
            
            // Close all others
            document.querySelectorAll('.faq-question').forEach(item => {
                item.classList.remove('active');
                item.nextElementSibling.style.maxHeight = null;
            });

            // Toggle current
            if (!isActive) {
                btn.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });

    // =========================================
    // MODALS (Privacy & Terms)
    // =========================================
    const openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    const closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    document.querySelectorAll('[data-modal-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-modal-target');
            openModal(targetId);
        });
    });

    document.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-modal-close');
            closeModal(targetId);
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // =========================================
    // MOUSE TRACKING EFFECT
    // =========================================
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        document.documentElement.style.setProperty('--mouse-x', x);
        document.documentElement.style.setProperty('--mouse-y', y);
    });
});