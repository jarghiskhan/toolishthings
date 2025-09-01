// Shared Navbar Component
class SharedNavbar {
    constructor() {
        this.navbarContainer = document.getElementById('navbar-placeholder');
        this.currentPage = this.getCurrentPage();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return 'home';
        if (path.includes('workoutApp')) return 'workout';
        if (path.includes('toolishQuest')) return 'toolishquest';
        return 'home';
    }

    async loadNavbar() {
        try {
            const response = await fetch('/navbar.html');
            const navbarHtml = await response.text();
            
            if (this.navbarContainer) {
                this.navbarContainer.innerHTML = navbarHtml;
                this.highlightCurrentPage();
            }
        } catch (error) {
            console.error('Error loading navbar:', error);
            // Fallback to inline navbar if fetch fails
            this.loadFallbackNavbar();
        }
    }

    loadFallbackNavbar() {
        const fallbackNavbar = `
            <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
                <div class="container">
                    <a class="navbar-brand fw-bold" href="/">Toolish Things</a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav me-auto" id="app-links">
                            <li class="nav-item">
                                <a class="nav-link" href="/workoutApp/">Toolish Gains</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="/toolishQuest/">Toolish Quest</a>
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

    highlightCurrentPage() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            
            const href = link.getAttribute('href');
            if (this.currentPage === 'home' && (href === '/' || href === '/index.html')) {
                link.classList.add('active');
            } else if (this.currentPage === 'workout' && href.includes('workoutApp')) {
                link.classList.add('active');
            } else if (this.currentPage === 'toolishquest' && href.includes('toolishQuest')) {
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
