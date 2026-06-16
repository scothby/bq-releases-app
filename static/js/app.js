document.addEventListener('DOMContentLoaded', () => {
    // State
    let releases = [];
    let selectedIds = new Set();
    let activeCategory = 'all';
    let searchQuery = '';
    
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const chips = document.querySelectorAll('.chip');
    const visibleCountEl = document.getElementById('visible-count');
    const totalCountEl = document.getElementById('total-count');
    const selectedCountEl = document.getElementById('selected-count');
    const selectionBanner = document.getElementById('selection-banner');
    const tweetSelectedBtn = document.getElementById('tweet-selected-btn');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessageEl = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const retryBtn = document.getElementById('retry-btn');
    const notesGrid = document.getElementById('notes-grid');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const postTweetBtn = document.getElementById('post-tweet-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountEl = document.getElementById('char-count');
    const tweetOriginalSource = document.getElementById('tweet-original-source');
    
    // Initialize
    fetchReleases();
    
    // Event Listeners
    refreshBtn.addEventListener('click', fetchReleases);
    retryBtn.addEventListener('click', fetchReleases);
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderCards();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderCards();
    });
    
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeCategory = chip.dataset.category;
            renderCards();
        });
    });
    
    clearSelectionBtn.addEventListener('click', clearSelection);
    tweetSelectedBtn.addEventListener('click', handleTweetSelected);
    
    // Modal Event Listeners
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    
    tweetTextarea.addEventListener('input', updateCharCount);
    
    postTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        closeTweetModal();
    });
    
    copyTweetBtn.addEventListener('click', async () => {
        const text = tweetTextarea.value;
        try {
            await navigator.clipboard.writeText(text);
            showCopyFeedback(true);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            try {
                tweetTextarea.select();
                document.execCommand('copy');
                window.getSelection().removeAllRanges();
                showCopyFeedback(true);
            } catch (fallbackErr) {
                showCopyFeedback(false);
            }
        }
    });

    function showCopyFeedback(success) {
        const originalHtml = copyTweetBtn.innerHTML;
        if (success) {
            copyTweetBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #10b981;"></i> Copied!';
            copyTweetBtn.style.borderColor = '#10b981';
        } else {
            copyTweetBtn.innerHTML = '<i class="fa-solid fa-xmark" style="color: #f43f5e;"></i> Failed';
            copyTweetBtn.style.borderColor = '#f43f5e';
        }
        
        setTimeout(() => {
            copyTweetBtn.innerHTML = originalHtml;
            copyTweetBtn.style.borderColor = '';
        }, 1500);
    }
    
    // Fetch Releases from Backend
    async function fetchReleases() {
        showState('loading');
        refreshIcon.classList.add('loading');
        refreshBtn.disabled = true;
        
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.status === 'success') {
                releases = data.releases;
                renderCards();
                showState('grid');
            } else {
                throw new Error(data.message || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            errorMessageEl.textContent = error.message;
            showState('error');
        } finally {
            refreshIcon.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }
    
    // Show/Hide States
    function showState(state) {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        emptyState.style.display = 'none';
        notesGrid.style.display = 'none';
        
        if (state === 'loading') {
            loadingState.style.display = 'flex';
        } else if (state === 'error') {
            errorState.style.display = 'flex';
        } else if (state === 'empty') {
            emptyState.style.display = 'flex';
        } else if (state === 'grid') {
            notesGrid.style.display = 'grid';
        }
    }
    
    // Render Cards
    function renderCards() {
        // Clear previous grid items
        notesGrid.innerHTML = '';
        
        // Filter releases
        const filtered = releases.filter(release => {
            // Category filter
            const matchesCategory = 
                activeCategory === 'all' || 
                (activeCategory === 'feature' && release.category.toLowerCase() === 'feature') ||
                (activeCategory === 'issue' && release.category.toLowerCase() === 'issue') ||
                (activeCategory === 'deprecation' && release.category.toLowerCase() === 'deprecation') ||
                (activeCategory === 'other' && !['feature', 'issue', 'deprecation'].includes(release.category.toLowerCase()));
            
            // Search text filter
            const matchesSearch = 
                !searchQuery || 
                release.date.toLowerCase().includes(searchQuery) ||
                release.category.toLowerCase().includes(searchQuery) ||
                release.text.toLowerCase().includes(searchQuery);
                
            return matchesCategory && matchesSearch;
        });
        
        // Update Stats
        totalCountEl.textContent = releases.length;
        visibleCountEl.textContent = filtered.length;
        
        if (filtered.length === 0) {
            showState('empty');
            return;
        }
        
        // Build cards
        filtered.forEach(release => {
            const isSelected = selectedIds.has(release.id);
            const card = document.createElement('div');
            card.className = `note-card ${isSelected ? 'selected' : ''}`;
            card.dataset.id = release.id;
            
            // Category Badge Class
            let badgeClass = 'badge-other';
            const catLower = release.category.toLowerCase();
            if (catLower === 'feature') badgeClass = 'badge-feature';
            else if (catLower === 'issue') badgeClass = 'badge-issue';
            else if (catLower === 'deprecation') badgeClass = 'badge-deprecation';
            
            card.innerHTML = `
                <div class="card-meta">
                    <span class="card-date"><i class="fa-regular fa-calendar-days"></i> ${release.date}</span>
                    <span class="badge ${badgeClass}">${release.category}</span>
                </div>
                <div class="card-body">
                    ${release.html}
                </div>
                <div class="card-actions">
                    <label class="select-checkbox-container">
                        <input type="checkbox" class="card-select-checkbox" data-id="${release.id}" ${isSelected ? 'checked' : ''}>
                        <span class="custom-checkbox"></span>
                        <span>Select</span>
                    </label>
                    <button class="tweet-btn-small" data-id="${release.id}">
                        <i class="fa-brands fa-x-twitter"></i> Tweet
                    </button>
                </div>
            `;
            
            // Add Handlers
            const checkbox = card.querySelector('.card-select-checkbox');
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                toggleSelect(release.id, e.target.checked);
            });
            
            // Allow selecting card by clicking anywhere (except on links/buttons)
            card.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'a' || e.target.closest('a') || e.target.closest('.tweet-btn-small') || e.target.closest('.select-checkbox-container')) {
                    return; // Don't trigger select on link/button clicks
                }
                const newCheck = !checkbox.checked;
                checkbox.checked = newCheck;
                toggleSelect(release.id, newCheck);
            });
            
            // Single Tweet Button
            const tweetBtn = card.querySelector('.tweet-btn-small');
            tweetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openTweetComposer(release);
            });
            
            notesGrid.appendChild(card);
        });
        
        showState('grid');
    }
    
    // Toggle Select State
    function toggleSelect(id, isChecked) {
        const card = document.querySelector(`.note-card[data-id="${id}"]`);
        if (isChecked) {
            selectedIds.add(id);
            if (card) card.classList.add('selected');
        } else {
            selectedIds.delete(id);
            if (card) card.classList.remove('selected');
        }
        updateSelectionBanner();
    }
    
    // Clear All Selection
    function clearSelection() {
        selectedIds.clear();
        document.querySelectorAll('.card-select-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.note-card').forEach(card => card.classList.remove('selected'));
        updateSelectionBanner();
    }
    
    // Update Selection Banner
    function updateSelectionBanner() {
        const count = selectedIds.size;
        selectedCountEl.textContent = count;
        
        if (count > 0) {
            selectionBanner.classList.add('active');
        } else {
            selectionBanner.classList.remove('active');
        }
    }
    
    // Open Tweet Composer Modal for Single Update
    function openTweetComposer(release) {
        // Format Single Tweet
        // "BigQuery Feature (June 15, 2026): Use Gemini Cloud Assist..."
        const header = `BigQuery ${release.category} (${release.date}): `;
        const link = `\nSource: ${release.link}`;
        
        // Calculate max description length
        // Total = 280 - header length - link length
        const maxDescLength = 280 - header.length - link.length;
        let description = release.text;
        
        if (description.length > maxDescLength) {
            description = description.substring(0, maxDescLength - 3) + '...';
        }
        
        const tweetText = `${header}${description}${link}`;
        
        tweetTextarea.value = tweetText;
        tweetOriginalSource.innerHTML = `
            <strong>Original Update Source:</strong><br>
            <em>${release.date} - ${release.category}</em><br>
            ${release.text.substring(0, 150)}${release.text.length > 150 ? '...' : ''}
        `;
        
        updateCharCount();
        
        tweetModal.classList.add('active');
    }
    
    // Handle Tweet Selected
    function handleTweetSelected() {
        if (selectedIds.size === 0) return;
        
        // Gather selected updates
        const selectedUpdates = releases.filter(r => selectedIds.has(r.id));
        
        let header = "Latest BigQuery Updates:\n";
        let link = "\nRelease Notes: https://docs.cloud.google.com/bigquery/docs/release-notes";
        
        // Build items
        let items = "";
        selectedUpdates.forEach(u => {
            items += `\n- [${u.category}] ${u.text}`;
        });
        
        // Calculate available space
        const maxItemsLength = 280 - header.length - link.length;
        
        if (items.length > maxItemsLength) {
            // Truncate individual items so they fit
            items = "";
            const spacePerItem = Math.floor(maxItemsLength / selectedUpdates.length) - 5;
            
            selectedUpdates.forEach(u => {
                let text = u.text;
                if (text.length > spacePerItem) {
                    text = text.substring(0, spacePerItem) + "...";
                }
                items += `\n- [${u.category}] ${text}`;
            });
        }
        
        const tweetText = `${header}${items}${link}`;
        tweetTextarea.value = tweetText;
        
        tweetOriginalSource.innerHTML = `
            <strong>Combined Updates Summary:</strong><br>
            ${selectedUpdates.length} update(s) compiled.
        `;
        
        updateCharCount();
        tweetModal.classList.add('active');
    }
    
    // Close Modal
    function closeTweetModal() {
        tweetModal.classList.remove('active');
    }
    
    // Update Character Count in TextArea
    function updateCharCount() {
        const len = tweetTextarea.value.length;
        charCountEl.textContent = len;
        
        if (len > 280) {
            charCountEl.classList.add('error');
            postTweetBtn.disabled = true;
        } else {
            charCountEl.classList.remove('error');
            postTweetBtn.disabled = false;
        }
    }
});
