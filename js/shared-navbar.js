// Shared Navbar Component
class SharedNavbar {
    constructor() {
        this.navbarContainer = document.getElementById('navbar-placeholder');
        this.currentPage = this.getCurrentPage();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path.endsWith('/index.html') || path.endsWith('index.html')) return 'home';
        if (path.includes('workoutApp')) return 'workout';
        if (path.includes('toolishQuest')) return 'toolishquest';
        if (path.includes('toolishIdle')) return 'toolishidle';
        return 'home';
    }

    async loadNavbar() {
        try {
            const basePath = this.getBasePath();
            const response = await fetch(`${basePath}navbar.html`);
            const navbarHtml = await response.text();
            
            if (this.navbarContainer) {
                this.navbarContainer.innerHTML = navbarHtml;
                this.fixNavbarPaths();
                this.highlightCurrentPage();
            }
        } catch (error) {
            console.error('Error loading navbar:', error);
            // Fallback to inline navbar if fetch fails
            this.loadFallbackNavbar();
        }
    }

    fixNavbarPaths() {
        const basePath = this.getBasePath();
        const links = this.navbarContainer.querySelectorAll('a');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                // Fix paths that are relative to root
                if (href === 'index.html' || href.startsWith('workoutApp/') || 
                    href.startsWith('toolishQuest/') || href.startsWith('toolishIdle/')) {
                    link.setAttribute('href', basePath + href);
                }
                // Also handle cases where href ends with / and needs index.html
                if (href.endsWith('/workoutApp/') || href.endsWith('/toolishQuest/') || href.endsWith('/toolishIdle/')) {
                    link.setAttribute('href', href.replace(/\/$/, '/index.html'));
                }
            }
        });
    }

    loadFallbackNavbar() {
        // Calculate base path based on current location
        const basePath = this.getBasePath();
        
        const fallbackNavbar = `
            <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
                <div class="container">
                    <a class="navbar-brand fw-bold" href="${basePath}index.html">Toolish Things</a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav me-auto" id="app-links">
                            <li class="nav-item">
                                <a class="nav-link" href="${basePath}workoutApp/index.html">Toolish Gains</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="${basePath}toolishQuest/index.html">Toolish Quest</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="${basePath}toolishIdle/index.html">ToolishIdle</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        `;
        
        if (this.navbarContainer) {
            this.navbarContainer.innerHTML = fallbackNavbar;
            this.highlightCurrentPage();
        }
    }

    getBasePath() {
        const path = window.location.pathname;
        // If we're in a subdirectory, go up one level
        if (path.includes('/workoutApp/') || path.includes('/toolishQuest/') || path.includes('/toolishIdle/')) {
            return '../';
        }
        // If we're at the root, no prefix needed
        return '';
    }

    highlightCurrentPage() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            
            const href = link.getAttribute('href');
            if (this.currentPage === 'home' && (href === 'index.html' || href.endsWith('/index.html') || href.endsWith('index.html'))) {
                link.classList.add('active');
            } else if (this.currentPage === 'workout' && (href.includes('workoutApp') || href.includes('workoutApp/'))) {
                link.classList.add('active');
            } else if (this.currentPage === 'toolishquest' && (href.includes('toolishQuest') || href.includes('toolishQuest/'))) {
                link.classList.add('active');
            } else if (this.currentPage === 'toolishidle' && (href.includes('toolishIdle') || href.includes('toolishIdle/'))) {
                link.classList.add('active');
            }
        });
    }
}

// Initialize shared navbar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const sharedNavbar = new SharedNavbar();
    sharedNavbar.loadNavbar();
});
