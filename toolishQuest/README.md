# 🎮 Toolish Quest - Custom Multi-Domain Search App

A modern, meme-friendly web application that lets you create and manage your own search domains with enhanced queries and bookmark management.

## ✨ Features

### 🔧 Custom Domain Management
- **Create Your Own Domains**: Add unlimited custom search domains
- **Personalized Icons**: Choose from FontAwesome icons for each domain
- **Custom Keywords**: Define domain-specific keywords for query enhancement
- **Flexible Search Engines**: Use any search engine URL pattern
- **Persistent Storage**: All domains saved to localStorage

### 🚀 Smart Query Enhancement
- Automatically adds relevant domain-specific keywords to your search
- Improves search relevance and results quality
- Shows you exactly what enhanced query was used
- Keywords are customizable per domain

### 📱 Modern UI/UX
- Beautiful gradient design with glassmorphism effects
- Smooth animations and hover effects
- Fully responsive design for all devices
- Meme-friendly notifications and feedback
- Intuitive domain management interface

### 🔖 Bookmark Management
- Save interesting links for later
- Organize bookmarks by domain
- Quick access to saved content
- Persistent storage using localStorage

### 👁️ Link Preview
- Click any search result to see a preview
- Modal-based preview system
- Save links directly from preview
- Open links in new tabs

## 🎯 How to Use

### 1. Create Your First Domain
- Click **"Add New Domain"** to create your first search domain
- Fill in the domain details:
  - **Domain Name**: e.g., "Programming", "Gaming", "Shopping"
  - **Icon**: FontAwesome class (e.g., `fas fa-code`, `fas fa-gamepad`)
  - **Keywords**: Comma-separated keywords for enhancement
  - **Search Engine**: URL pattern for search queries
  - **Placeholder**: Custom search box placeholder text

### 2. Manage Your Domains
- Click **"Manage Domains"** to view, edit, or delete existing domains
- Edit domain properties anytime
- Remove domains you no longer need
- View all domain configurations at a glance

### 3. Search Across Domains
- Select a domain tab to activate it
- Type your search query
- The app automatically enhances your search with relevant keywords
- View enhanced query and results

### 4. Preview and Save
- Click any result to open a preview modal
- Use the preview to decide if you want to save the link
- Click "Save" to add to bookmarks
- Click "Open Link" to visit the page

### 5. Manage Bookmarks
- View all saved links in the bookmarks section
- Click on bookmarks to preview them again
- Remove individual bookmarks or clear all at once

## 🎨 Design Features

- **Gradient Backgrounds**: Beautiful purple-blue gradients
- **Glassmorphism**: Semi-transparent elements with backdrop blur
- **Smooth Animations**: Hover effects, transitions, and micro-interactions
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Custom Scrollbars**: Styled scrollbars for better aesthetics
- **Loading States**: Animated loading indicators
- **Empty States**: Helpful messages when no content is available

## 🚀 Technical Details

- **Pure HTML/CSS/JavaScript**: No external dependencies
- **ES6 Classes**: Modern JavaScript architecture
- **Local Storage**: Persistent domain and bookmark storage
- **Dynamic DOM Generation**: Tabs and content generated dynamically
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Keyboard navigation and screen reader friendly

## 🎮 Easter Eggs

- **Bouncing Title**: The title bounces continuously for fun
- **Arrow Key Animation**: Press arrow keys to trigger title animations
- **Meme Notifications**: Fun emoji-filled feedback messages
- **Smooth Transitions**: Every interaction has satisfying animations

## 📱 Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🔧 Customization Examples

### Programming Domain
```javascript
{
    name: "Programming",
    icon: "fas fa-code",
    keywords: ["tutorial", "documentation", "stack overflow", "github", "examples"],
    searchEngine: "https://www.google.com/search?q=",
    placeholder: "Search for code examples, tutorials..."
}
```

### Gaming Domain
```javascript
{
    name: "Gaming",
    icon: "fas fa-gamepad",
    keywords: ["guide", "walkthrough", "build", "strategy", "tips"],
    searchEngine: "https://www.google.com/search?q=",
    placeholder: "Search for game guides, strategies..."
}
```

### Shopping Domain
```javascript
{
    name: "Shopping",
    icon: "fas fa-shopping-cart",
    keywords: ["review", "price", "comparison", "deals", "ratings"],
    searchEngine: "https://www.google.com/search?q=",
    placeholder: "Search for products, reviews..."
}
```

## 🚀 Future Enhancements

- **Real Search APIs**: Integration with Google, Bing, or other search engines
- **Advanced Filters**: Date, language, and content type filtering
- **Search History**: Track and revisit previous searches
- **Export/Import**: Save and load domain configurations
- **Dark Mode**: Toggle between light and dark themes
- **Keyboard Shortcuts**: Power user keyboard navigation
- **Domain Templates**: Pre-built domain configurations
- **Collaborative Domains**: Share domain configurations with others

## 📄 License

This project is open source and available under the MIT License.

---

**Happy Questing! 🎮✨**
