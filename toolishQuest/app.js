

class ToolishQuest {
    constructor() {
        this.currentDomain = null;
        this.bookmarks = {}; // Changed to object to store bookmarks per domain
        this.domains = JSON.parse(localStorage.getItem('toolishQuestDomains')) || this.getDefaultDomains();
        this.editingDomainId = null;
        
        // Load bookmarks for all domains
        this.loadBookmarks();
        
        this.init();
    }

    getDefaultDomains() {
        return [
            {
                id: 'general',
                name: 'General',
                icon: 'fas fa-globe',
                keywords: ['guide', 'tutorial', 'how to', 'tips', 'best practices'],
                searchEngine: 'https://www.google.com/search?q=',
                placeholder: 'Search for anything...'
            }
        ];
    }

    init() {
        this.bindEvents();
        this.renderDomains();
        this.renderBookmarks();
        this.showEmptyState('results');
        
        // Set first domain as active if none selected
        if (this.domains.length > 0 && !this.currentDomain) {
            this.switchToDomain(this.domains[0].id);
        }
    }

    bindEvents() {
        // Domain management
        document.getElementById('addDomainBtn').addEventListener('click', () => this.openModal('addDomainModal'));
        document.getElementById('manageDomainsBtn').addEventListener('click', () => this.openModal('manageDomainsModal'));
        document.getElementById('saveDomainBtn').addEventListener('click', () => this.saveDomain());
        document.getElementById('updateDomainBtn').addEventListener('click', () => this.updateDomain());

        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.performSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Clear buttons
        document.getElementById('clearResults').addEventListener('click', () => this.clearResults());
        document.getElementById('clearBookmarks').addEventListener('click', () => this.clearBookmarks());
        
        // Content tabs
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchContentTab(tab.dataset.tab));
        });

        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal.id);
            });
        });

        // Preview modal events
        document.getElementById('openLink').addEventListener('click', () => this.openLink());
        document.getElementById('saveLink').addEventListener('click', () => this.saveCurrentLink());

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    renderDomains() {
        const tabsContainer = document.getElementById('domainTabs');
        tabsContainer.innerHTML = '';

        this.domains.forEach(domain => {
            const tab = document.createElement('button');
            tab.className = `tab ${domain.id === this.currentDomain ? 'active' : ''}`;
            tab.dataset.domainId = domain.id;
            tab.innerHTML = `
                <i class="${domain.icon}"></i>
                ${domain.name}
            `;
            
            tab.addEventListener('click', () => this.switchToDomain(domain.id));
            tabsContainer.appendChild(tab);
        });
    }

    switchToDomain(domainId) {
        const domain = this.domains.find(d => d.id === domainId);
        if (!domain) return;

        this.currentDomain = domainId;
        
        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-domain-id="${domainId}"]`).classList.add('active');
        
        // Update search placeholder
        document.getElementById('searchInput').placeholder = domain.placeholder;
        
        // Clear previous results
        this.clearResults();
        
        // Refresh bookmarks for the new domain
        this.renderBookmarks();
        
        this.showNotification(`Switched to ${domain.name} mode! 🎮`);
    }

    openModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
        
        if (modalId === 'manageDomainsModal') {
            this.renderDomainsList();
        }
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        
        if (modalId === 'addDomainModal') {
            this.resetAddDomainForm();
        } else if (modalId === 'editDomainModal') {
            this.editingDomainId = null;
            this.resetEditDomainForm();
        }
    }

    resetAddDomainForm() {
        document.getElementById('addDomainForm').reset();
        document.getElementById('domainIcon').value = 'fas fa-globe';
        document.getElementById('searchEngine').value = 'https://www.google.com/search?q=';
        document.getElementById('placeholderText').value = 'Search for anything...';
    }

    resetEditDomainForm() {
        document.getElementById('editDomainForm').reset();
    }

    saveDomain() {
        const formData = this.getFormData('addDomainForm');
        if (!formData) return;

        const domain = {
            id: this.generateDomainId(formData.name),
            name: formData.name,
            icon: formData.icon,
            keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : [],
            searchEngine: formData.searchEngine,
            placeholder: 'Search for anything...'
        };

        // Check if domain with same name already exists
        if (this.domains.some(d => d.name.toLowerCase() === domain.name.toLowerCase())) {
            this.showNotification('A domain with this name already exists! 😅', 'error');
            return;
        }

        this.domains.push(domain);
        this.saveDomains();
        this.renderDomains();
        this.closeModal('addDomainModal');
        this.showNotification(`Domain "${domain.name}" added successfully! ✨`);
    }

    updateDomain() {
        if (!this.editingDomainId) return;

        const formData = this.getFormData('editDomainForm');
        if (!formData) return;

        const domainIndex = this.domains.findIndex(d => d.id === this.editingDomainId);
        if (domainIndex === -1) return;

        const updatedDomain = {
            ...this.domains[domainIndex],
            name: formData.name,
            icon: formData.icon,
            keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : [],
            searchEngine: formData.searchEngine,
            placeholder: 'Search for anything...'
        };

        // Check if name conflicts with other domains
        if (this.domains.some(d => d.id !== this.editingDomainId && d.name.toLowerCase() === updatedDomain.name.toLowerCase())) {
            this.showNotification('A domain with this name already exists! 😅', 'error');
            return;
        }

        this.domains[domainIndex] = updatedDomain;
        this.saveDomains();
        this.renderDomains();
        this.closeModal('editDomainModal');
        this.showNotification(`Domain "${updatedDomain.name}" updated successfully! ✨`);
    }

    editDomain(domainId) {
        const domain = this.domains.find(d => d.id === domainId);
        if (!domain) return;

        this.editingDomainId = domainId;
        
        // Populate edit form
        document.getElementById('editDomainName').value = domain.name;
        document.getElementById('editDomainIcon').value = domain.icon;
        document.getElementById('editDomainKeywords').value = domain.keywords.join(', ');
        document.getElementById('editSearchEngine').value = domain.searchEngine;
        
        this.closeModal('manageDomainsModal');
        this.openModal('editDomainModal');
    }

    deleteDomain(domainId) {
        const domain = this.domains.find(d => d.id === domainId);
        if (!domain) return;

        // Don't allow deleting the last domain
        if (this.domains.length === 1) {
            this.showNotification('Cannot delete the last domain! Add another one first. 😅', 'error');
            return;
        }

        if (confirm(`Are you sure you want to delete "${domain.name}"? This action cannot be undone.`)) {
            this.domains = this.domains.filter(d => d.id !== domainId);
            this.saveDomains();
            
            // If deleted domain was active, switch to first available domain
            if (this.currentDomain === domainId) {
                this.switchToDomain(this.domains[0].id);
            }
            
            this.renderDomains();
            this.renderDomainsList();
            this.showNotification(`Domain "${domain.name}" deleted successfully! 🗑️`);
        }
    }

    renderDomainsList() {
        const domainsList = document.getElementById('domainsList');
        domainsList.innerHTML = '';

        if (this.domains.length === 0) {
            domainsList.innerHTML = '<div class="empty-state"><p>No domains created yet. Add your first domain!</p></div>';
            return;
        }

        this.domains.forEach(domain => {
            const domainElement = document.createElement('div');
            domainElement.className = 'domain-item';
            domainElement.innerHTML = `
                <div class="domain-info">
                    <div class="domain-name">
                        <i class="${domain.icon}"></i>
                        ${domain.name}
                    </div>
                    <div class="domain-details">
                        Keywords: ${domain.keywords.join(', ')} | 
                        Search Engine: ${domain.searchEngine}
                    </div>
                </div>
                <div class="domain-actions">
                    <button class="edit-domain" onclick="app.editDomain('${domain.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-domain" onclick="app.deleteDomain('${domain.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            
            domainsList.appendChild(domainElement);
        });
    }

    getFormData(formId) {
        let data = {};
        
        if (formId === 'addDomainForm') {
            data = {
                name: document.getElementById('domainName').value,
                icon: document.getElementById('domainIcon').value,
                keywords: document.getElementById('domainKeywords').value,
                searchEngine: document.getElementById('searchEngine').value
            };
        } else if (formId === 'editDomainForm') {
            data = {
                name: document.getElementById('editDomainName').value,
                icon: document.getElementById('editDomainIcon').value,
                keywords: document.getElementById('editDomainKeywords').value,
                searchEngine: document.getElementById('editSearchEngine').value
            };
        }

        // Validation - only name and icon are required
        if (!data.name.trim() || !data.icon.trim()) {
            this.showNotification('Please fill in all required fields! 🔍', 'error');
            return null;
        }

        return data;
    }

    generateDomainId(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    saveDomains() {
        localStorage.setItem('toolishQuestDomains', JSON.stringify(this.domains));
    }

    async performSearch() {
        if (!this.currentDomain) {
            this.showNotification('Please select a domain first! 🎯', 'error');
            return;
        }

        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            this.showNotification('Please enter a search query! 🔍', 'error');
            return;
        }

        const domain = this.domains.find(d => d.id === this.currentDomain);
        if (!domain) return;

        // Switch to Search Results tab if currently on Saved Links tab
        const bookmarksTab = document.querySelector('[data-tab="bookmarks"]');
        if (bookmarksTab.classList.contains('active')) {
            this.switchContentTab('results');
        }

        // Show enhanced query
        const enhancedQuery = this.enhanceQuery(query, domain);
        const enhancedQueryEl = document.getElementById('enhancedQuery');
        enhancedQueryEl.textContent = `Enhanced query: ${enhancedQuery}`;
        enhancedQueryEl.classList.add('show');

        // Show loading state
        this.showLoading();

        try {
            // Generate Google search results (with site: operator if applicable)
            const results = this.generateDomainSpecificResults(query, enhancedQuery, domain);
            this.displayResults(results);
            
            this.showNotification(`Found ${results.length} results! 🎉`);
        } catch (error) {
            this.showNotification('Search failed! Please try again. 😅', 'error');
            console.error('Search error:', error);
        }
    }

    enhanceQuery(query, domain) {
        const keywords = domain.keywords;
        const randomKeywords = keywords
            .filter(keyword => !query.toLowerCase().includes(keyword.toLowerCase()))
            .sort(() => 0.5 - Math.random())
            .slice(0, 2);
        
        return `${query} ${randomKeywords.join(' ')}`.trim();
    }

    generateDomainSpecificResults(query, enhancedQuery, domain) {
        const results = [];
        
        // Check if domain has a specific site configured
        if (domain.searchEngine && domain.searchEngine.trim() !== '' && domain.searchEngine !== 'https://www.google.com/search?q=') {
            // searchEngine should store just the domain name, but handle old format too
            let siteDomain = domain.searchEngine.trim();
            
            // If it's still the old URL format, extract the domain
            if (siteDomain.startsWith('http')) {
                try {
                    const url = new URL(siteDomain);
                    siteDomain = url.hostname.replace('www.', '');
                } catch (e) {
                    // If URL parsing fails, skip this domain
                    siteDomain = '';
                }
            }
            
            if (siteDomain && siteDomain !== 'google.com') {
                // Use the structure: enhancedQuery + site:domain (includes keywords)
                const siteSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(enhancedQuery)} site:${siteDomain}`;
                results.push(
                    {
                        title: `${query} - ${siteDomain} (via Google)`,
                        url: siteSearchUrl,
                        snippet: `Search for "${query}" specifically on ${siteDomain} using Google's site: operator.`
                    }
                );
            }
        }
        
        // Always include regular Google search results
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(enhancedQuery)}`;
        results.push(
            {
                title: `${query} - Google Search`,
                url: googleSearchUrl,
                snippet: `Search for "${enhancedQuery}" on Google, the world's most popular search engine.`
            }
        );
        
        // Add a few more relevant Google search variations
        const variations = [
            {
                title: `${query} - Google (Exact Match)`,
                url: `https://www.google.com/search?q="${encodeURIComponent(query)}"`,
                snippet: `Search for the exact phrase "${query}" on Google.`
            },
            {
                title: `${query} - Google (Recent)`,
                url: `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=qdr:m`,
                snippet: `Find recent results for "${query}" from the past month on Google.`
            },
            {
                title: `${query} - Google (Images)`,
                url: `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=isch`,
                snippet: `Search for images related to "${query}" on Google Images.`
            }
        ];
        
        results.push(...variations);
        
        return results;
    }

    displayResults(results) {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            this.showEmptyState('results');
            return;
        }

        results.forEach((result, index) => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item';
            
            // Check if already bookmarked
            const currentBookmarks = this.getCurrentBookmarks();
            const isBookmarked = currentBookmarks.some(bookmark => bookmark.url === result.url);
            
            resultElement.innerHTML = `
                <div class="result-content">
                    <div class="result-title">${result.title}</div>
                    <div class="result-url">${result.url}</div>
                    <div class="result-snippet">${result.snippet}</div>
                </div>
                <div class="result-actions">
                    <button class="btn-open" onclick="app.openResultLink('${result.url}')">
                        <i class="fas fa-external-link-alt"></i> Open
                    </button>
                    <button class="btn-save ${isBookmarked ? 'saved' : ''}" onclick="app.saveResultLink(${index})">
                        <i class="fas fa-${isBookmarked ? 'check' : 'bookmark'}"></i> ${isBookmarked ? 'Saved' : 'Save'}
                    </button>
                </div>
            `;
            
            // Store the result data for the save button
            resultElement.dataset.resultIndex = index;
            resultsContainer.appendChild(resultElement);
        });
        
        // Update button states after displaying results
        this.updateSearchResultButtons();
    }

    openPreview(result) {
        const modal = document.getElementById('previewModal');
        const modalTitle = document.getElementById('modalTitle');
        const previewFrame = document.getElementById('previewFrame');
        
        modalTitle.textContent = result.title;
        
        // For demo purposes, we'll show a placeholder
        previewFrame.src = 'about:blank';
        
        // Store current result for bookmark functionality
        this.currentPreviewResult = result;
        
        modal.style.display = 'block';
        
        // Check if already bookmarked
        const isBookmarked = this.bookmarks.some(bookmark => bookmark.url === result.url);
        const saveButton = document.getElementById('saveLink');
        if (isBookmarked) {
            saveButton.innerHTML = '<i class="fas fa-check"></i> Saved';
            saveButton.disabled = true;
        } else {
            saveButton.innerHTML = '<i class="fas fa-bookmark"></i> Save';
            saveButton.disabled = false;
        }
    }

    openResultLink(url) {
        window.open(url, '_blank');
    }

    saveResultLink(index) {
        // Get the current search results
        const resultsContainer = document.getElementById('results');
        const resultElements = resultsContainer.querySelectorAll('.result-item');
        
        if (index >= 0 && index < resultElements.length) {
            const resultElement = resultElements[index];
            const title = resultElement.querySelector('.result-title').textContent;
            const url = resultElement.querySelector('.result-url').textContent;
            const snippet = resultElement.querySelector('.result-snippet').textContent;
            
            const result = { title, url, snippet };
            
            // Check if already bookmarked
            const currentBookmarks = this.getCurrentBookmarks();
            const isBookmarked = currentBookmarks.some(bookmark => bookmark.url === url);
            
            if (isBookmarked) {
                this.showNotification('Link already bookmarked! 📚');
                return;
            }
            
            // Save the bookmark
            this.addBookmark(result);
            
            // Update the button to show saved state
            const saveButton = resultElement.querySelector('.btn-save');
            saveButton.innerHTML = '<i class="fas fa-check"></i> Saved';
            saveButton.classList.add('saved');
        }
    }

    addBookmark(result) {
        if (!this.currentDomain) return;

        // Check if already bookmarked in current domain
        const currentBookmarks = this.getCurrentBookmarks();
        if (currentBookmarks.some(bookmark => bookmark.url === result.url)) {
            this.showNotification('Link already bookmarked! 📚');
            return;
        }

        const bookmark = {
            title: result.title,
            url: result.url,
            timestamp: new Date().toISOString()
        };

        if (!this.bookmarks[this.currentDomain]) {
            this.bookmarks[this.currentDomain] = [];
        }

        this.bookmarks[this.currentDomain].unshift(bookmark);
        this.saveBookmarks();
        this.renderBookmarks();
        this.updateSearchResultButtons();
        this.showNotification('Link saved to bookmarks! 💾');
    }

    removeBookmark(url) {
        if (!this.currentDomain) return;

        if (this.bookmarks[this.currentDomain]) {
            this.bookmarks[this.currentDomain] = this.bookmarks[this.currentDomain].filter(bookmark => bookmark.url !== url);
        }
        this.saveBookmarks();
        this.renderBookmarks();
        this.updateSearchResultButtons();
        this.showNotification('Bookmark removed! 🗑️');
    }

    renderBookmarks() {
        const bookmarksContainer = document.getElementById('bookmarks');
        const bookmarkCount = document.getElementById('bookmarkCount');
        bookmarksContainer.innerHTML = '';

        const currentBookmarks = this.getCurrentBookmarks();

        // Update bookmark count
        if (currentBookmarks.length > 0) {
            bookmarkCount.textContent = ` (${currentBookmarks.length})`;
            bookmarkCount.style.display = 'inline';
        } else {
            bookmarkCount.style.display = 'none';
        }

        if (currentBookmarks.length === 0) {
            this.showEmptyState('bookmarks');
            return;
        }

        currentBookmarks.forEach(bookmark => {
            const bookmarkElement = document.createElement('div');
            bookmarkElement.className = 'bookmark-item';
            bookmarkElement.innerHTML = `
                <div class="bookmark-info">
                    <div class="bookmark-title">${bookmark.title}</div>
                    <div class="bookmark-url">${bookmark.url}</div>
                </div>
                <button class="remove-bookmark" onclick="app.removeBookmark('${bookmark.url}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            bookmarkElement.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-bookmark')) {
                    // Open the link directly in a new tab
                    window.open(bookmark.url, '_blank');
                }
            });
            
            bookmarksContainer.appendChild(bookmarkElement);
        });
    }

    clearResults() {
        document.getElementById('results').innerHTML = '';
        document.getElementById('enhancedQuery').classList.remove('show');
        this.showEmptyState('results');
    }

    clearBookmarks() {
        if (!this.currentDomain) return;

        const currentBookmarks = this.getCurrentBookmarks();
        if (currentBookmarks.length === 0) {
            this.showNotification('No bookmarks to clear! 📚');
            return;
        }

        if (confirm('Are you sure you want to clear all bookmarks for this domain? This action cannot be undone.')) {
            this.bookmarks[this.currentDomain] = [];
            this.saveBookmarks();
            this.renderBookmarks();
            this.showNotification('All bookmarks cleared! 🗑️');
        }
    }

    loadBookmarks() {
        const savedBookmarks = JSON.parse(localStorage.getItem('toolishQuestBookmarks')) || {};
        
        // Handle migration from old array format to new object format
        if (Array.isArray(savedBookmarks)) {
            // Convert old array format to new object format
            this.bookmarks = {
                'general': savedBookmarks // Put old bookmarks in general domain
            };
            // Save the converted format
            this.saveBookmarks();
        } else {
            this.bookmarks = savedBookmarks;
        }
        
        console.log('Bookmarks loaded:', this.bookmarks); // Debug log
    }

    saveBookmarks() {
        localStorage.setItem('toolishQuestBookmarks', JSON.stringify(this.bookmarks));
        console.log('Bookmarks saved:', this.bookmarks); // Debug log
    }

    getCurrentBookmarks() {
        if (!this.currentDomain) return [];
        const bookmarks = this.bookmarks[this.currentDomain] || [];
        console.log(`Current bookmarks for ${this.currentDomain}:`, bookmarks); // Debug log
        return bookmarks;
    }

    showLoading() {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '<div class="loading">Generating Google search results...</div>';
    }

    switchContentTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    updateSearchResultButtons() {
        // Update save button states in search results
        const resultsContainer = document.getElementById('results');
        const resultElements = resultsContainer.querySelectorAll('.result-item');
        const currentBookmarks = this.getCurrentBookmarks();
        
        resultElements.forEach(resultElement => {
            const url = resultElement.querySelector('.result-url').textContent;
            const saveButton = resultElement.querySelector('.btn-save');
            
            if (saveButton) {
                const isBookmarked = currentBookmarks.some(bookmark => bookmark.url === url);
                
                if (isBookmarked) {
                    saveButton.innerHTML = '<i class="fas fa-check"></i> Saved';
                    saveButton.classList.add('saved');
                } else {
                    saveButton.innerHTML = '<i class="fas fa-bookmark"></i> Save';
                    saveButton.classList.remove('saved');
                }
            }
        });
    }

    showEmptyState(type) {
        const container = document.getElementById(type === 'results' ? 'results' : 'bookmarks');
        const messages = {
            results: {
                icon: 'fas fa-search',
                text: 'No search results yet. Start your quest! 🔍'
            },
            bookmarks: {
                icon: 'fas fa-bookmark',
                text: 'No saved links yet. Save some interesting finds! 📚'
            }
        };

        const message = messages[type];
        container.innerHTML = `
            <div class="empty-state">
                <i class="${message.icon}"></i>
                <p>${message.text}</p>
            </div>
        `;
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ToolishQuest();
});

// Add some meme-friendly Easter eggs
document.addEventListener('keydown', (e) => {
    // Arrow key animation for title
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const title = document.querySelector('.title');
        title.style.animation = 'bounce 0.5s ease';
        setTimeout(() => {
            title.style.animation = 'bounce 2s infinite';
        }, 500);
    }
});
