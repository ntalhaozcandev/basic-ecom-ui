// Authentication management functionality
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.loginModal = null;
        this.initialized = false; // Add initialization flag
    }

    async initialize() {
        try {
            this.createLoginModal();
            this.setupEventListeners();
            await this.checkAuthStatus();
            this.updateAuthDisplay();
            this.initialized = true; // Add initialization flag
            console.log('AuthManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AuthManager:', error);
            // Don't throw the error, just log it so the app can continue
        }
    }

    createLoginModal() {
        // Check if modal already exists
        if (document.getElementById('auth-modal')) {
            console.log('Auth modal already exists');
            this.loginModal = document.getElementById('auth-modal');
            return;
        }

        // Create modal HTML
        const modalHTML = `
            <div id="auth-modal" class="auth-modal" style="display: none;">
                <div class="auth-modal-content">
                    <div class="auth-modal-header">
                        <h2 id="auth-modal-title">Login</h2>
                        <button class="auth-modal-close" onclick="authManager.closeAuthModal()">&times;</button>
                    </div>
                    
                    <div class="auth-modal-body">
                        <!-- Login Form -->
                        <form id="login-form" class="auth-form">
                            <div class="form-group">
                                <label for="login-email">Email:</label>
                                <input type="email" id="login-email" required>
                            </div>
                            <div class="form-group">
                                <label for="login-password">Password:</label>
                                <input type="password" id="login-password" required>
                            </div>
                            <button type="submit" class="auth-btn primary">Login</button>
                            <p class="auth-switch">
                                Don't have an account? 
                                <a href="#" onclick="authManager.switchToRegister()">Register here</a>
                            </p>
                        </form>

                        <!-- Register Form -->
                        <form id="register-form" class="auth-form" style="display: none;">
                            <div class="form-group">
                                <label for="register-name">Full Name:</label>
                                <input type="text" id="register-name" required>
                            </div>
                            <div class="form-group">
                                <label for="register-email">Email:</label>
                                <input type="email" id="register-email" required>
                            </div>
                            <div class="form-group">
                                <label for="register-password">Password:</label>
                                <input type="password" id="register-password" required minlength="6">
                            </div>
                            <div class="form-group">
                                <label for="register-confirm">Confirm Password:</label>
                                <input type="password" id="register-confirm" required>
                            </div>
                            <button type="submit" class="auth-btn primary">Register</button>
                            <p class="auth-switch">
                                Already have an account? 
                                <a href="#" onclick="authManager.switchToLogin()">Login here</a>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        `;

        try {
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.loginModal = document.getElementById('auth-modal');

            // Add styles
            this.addAuthStyles();
        } catch (error) {
            console.error('Failed to create login modal:', error);
        }
    }

    addAuthStyles() {
        // Check if styles already exist
        if (document.getElementById('auth-styles')) {
            return;
        }

        const styles = `
            <style id="auth-styles">
                .auth-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 2000;
                }

                .auth-modal-content {
                    background: white;
                    padding: 0;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 400px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }

                .auth-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid #eee;
                }

                .auth-modal-header h2 {
                    margin: 0;
                    color: #333;
                }

                .auth-modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .auth-modal-close:hover {
                    color: #333;
                    background: #f5f5f5;
                    border-radius: 50%;
                }

                .auth-modal-body {
                    padding: 1.5rem;
                }

                .auth-form .form-group {
                    margin-bottom: 1rem;
                }

                .auth-form label {
                    display: block;
                    margin-bottom: 0.5rem;
                    color: #333;
                    font-weight: 500;
                }

                .auth-form input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 1rem;
                    box-sizing: border-box;
                }

                .auth-form input:focus {
                    outline: none;
                    border-color: #007bff;
                    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
                }

                .auth-btn {
                    width: 100%;
                    padding: 0.75rem;
                    border: none;
                    border-radius: 4px;
                    font-size: 1rem;
                    cursor: pointer;
                    margin-top: 1rem;
                }

                .auth-btn.primary {
                    background: #007bff;
                    color: white;
                }

                .auth-btn.primary:hover {
                    background: #0056b3;
                }

                .auth-switch {
                    text-align: center;
                    margin-top: 1rem;
                    color: #666;
                }

                .auth-switch a {
                    color: #007bff;
                    text-decoration: none;
                }

                .auth-switch a:hover {
                    text-decoration: underline;
                }

                .user-menu {
                    position: relative;
                    display: inline-block;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .admin-link {
                    background: #28a745;
                    color: white;
                    text-decoration: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    font-size: 0.9rem;
                    transition: background-color 0.3s ease;
                    display: inline-block;
                    margin-right: 0.5rem;
                }

                .admin-link:hover {
                    background: #218838;
                    color: white;
                    text-decoration: none;
                }

                .user-menu-btn {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9rem;
                }

                .user-menu-btn:hover {
                    background: #0056b3;
                }

                .user-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    min-width: 150px;
                    z-index: 1000;
                    display: none;
                }

                .user-dropdown.show {
                    display: block;
                }

                .user-dropdown a {
                    display: block;
                    padding: 0.75rem 1rem;
                    color: #333;
                    text-decoration: none;
                    border-bottom: 1px solid #eee;
                }

                .user-dropdown a:hover {
                    background: #f5f5f5;
                }

                .user-dropdown a:last-child {
                    border-bottom: none;
                }

                .login-btn {
                    background: #2c5aa0;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    margin-left: 1rem;
                }

                .login-btn:hover {
                    background: #1e3f73;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Close modal when clicking outside
        this.loginModal?.addEventListener('click', (e) => {
            if (e.target === this.loginModal) {
                this.closeAuthModal();
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            console.log('Attempting login for:', email);
            const response = await api.login({ email, password });
            
            if (response.token) {
                // Store auth token and user data
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                
                // Set token in API client for future requests
                if (typeof api !== 'undefined') {
                    api.setAuthToken(response.token);
                }
                
                this.currentUser = response.user;
                this.isLoggedIn = true;

                // Update UI
                this.closeAuthModal();
                this.updateAuthDisplay();
                this.showNotification('Successfully logged in!');
                
                // Now sync cart with server - the token is stored so it should work
                if (typeof cartManager !== 'undefined') {
                    try {
                        // Switch to server cart mode and load user's cart
                        cartManager.useServerCart = true;
                        await cartManager.loadCart();
                        cartManager.updateCartDisplay();
                        
                        // Also update cart page if we're on it
                        if (typeof cartPageManager !== 'undefined') {
                            cartPageManager.updateCartPageDisplay();
                        }
                        
                        console.log('Cart synced with server after login');
                    } catch (cartError) {
                        console.error('Failed to sync cart after login:', cartError);
                        // Cart sync failed, but login was successful - fallback to local mode
                        cartManager.useServerCart = false;
                        cartManager.loadCartFromStorage();
                        cartManager.updateCartDisplay();
                        this.showNotification('Logged in successfully, but cart sync failed');
                    }
                }
            }
        } catch (error) {
            console.error('Login failed:', error);
            this.showError('Login failed. Please check your credentials.');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;

        if (password !== confirmPassword) {
            this.showError('Passwords do not match.');
            return;
        }

        try {
            console.log('Attempting registration for:', email);
            const response = await api.register({ name, email, password });
            
            if (response.token) {
                // Store auth token and user data
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                
                // Set token in API client for future requests
                if (typeof api !== 'undefined') {
                    api.setAuthToken(response.token);
                }
                
                this.currentUser = response.user;
                this.isLoggedIn = true;

                // Update UI
                this.closeAuthModal();
                this.updateAuthDisplay();
                this.showNotification('Account created successfully!');
                
                // Now sync cart with server - the token is stored so it should work
                if (typeof cartManager !== 'undefined') {
                    try {
                        // Switch to server cart mode and load user's cart
                        cartManager.useServerCart = true;
                        await cartManager.loadCart();
                        cartManager.updateCartDisplay();
                        
                        // Also update cart page if we're on it
                        if (typeof cartPageManager !== 'undefined') {
                            cartPageManager.updateCartPageDisplay();
                        }
                        
                        console.log('Cart synced with server after registration');
                    } catch (cartError) {
                        console.error('Failed to sync cart after registration:', cartError);
                        // Cart sync failed, but registration was successful - fallback to local mode
                        cartManager.useServerCart = false;
                        cartManager.loadCartFromStorage();
                        cartManager.updateCartDisplay();
                        this.showNotification('Account created successfully, but cart sync failed');
                    }
                }
            }
        } catch (error) {
            console.error('Registration failed:', error);
            this.showError('Registration failed. Please try again.');
        }
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        if (token) {
            // Set the token in the API client for authenticated requests
            if (typeof api !== 'undefined') {
                api.setAuthToken(token);
            }
            
            // Since there's no /me endpoint, we'll assume the token is valid
            // and extract user info from the token or use stored data
            const storedUser = localStorage.getItem('currentUser');
            
            if (storedUser) {
                try {
                    this.currentUser = JSON.parse(storedUser);
                    this.isLoggedIn = true;
                    console.log('User authenticated from stored data:', this.currentUser);
                } catch (error) {
                    console.log('Failed to parse stored user data, clearing token');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('currentUser');
                    this.currentUser = null;
                    this.isLoggedIn = false;
                }
            } else {
                // We have a token but no user data - this shouldn't happen normally
                // but let's handle it gracefully
                console.log('Token found but no user data, assuming authenticated');
                this.currentUser = { name: 'User' }; // Fallback user object
                this.isLoggedIn = true;
            }
        } else {
            this.currentUser = null;
            this.isLoggedIn = false;
        }
    }

    updateAuthDisplay() {
        // Update header with login/user info
        this.updateHeaderAuth();
        
        // Hide the static login link in navigation when auth manager is active
        this.hideStaticLoginLink();
    }

    hideStaticLoginLink() {
        const loginLinks = document.querySelectorAll('nav a[href="login.html"]');
        loginLinks.forEach(link => {
            link.style.display = 'none';
        });
    }

    updateHeaderAuth() {
        const header = document.querySelector('header');
        if (!header) {
            console.log('Header not found, skipping auth display update');
            return;
        }

        // Look for header-right container first, then header-content, then header
        let targetContainer = header.querySelector('.header-right');
        if (!targetContainer) {
            targetContainer = header.querySelector('.header-content');
        }
        if (!targetContainer) {
            targetContainer = header;
        }

        // Remove existing auth elements
        const existingAuth = targetContainer.querySelector('.auth-section');
        if (existingAuth) {
            existingAuth.remove();
        }

        // Create auth section
        const authSection = document.createElement('div');
        authSection.className = 'auth-section';

        if (this.isLoggedIn) {
            // Show user menu
            const isAdmin = this.currentUser?.role === 'admin';
            console.log('Auth: Creating user menu, isAdmin:', isAdmin, 'user:', this.currentUser);
            authSection.innerHTML = `
                <div class="user-menu">
                    ${isAdmin ? '<a href="admin.html" class="admin-link">🔧 Admin</a>' : ''}
                    <button class="user-menu-btn" onclick="authManager.toggleUserMenu()">
                        👤 ${this.currentUser?.name || this.currentUser?.email || 'User'}
                    </button>
                    <div class="user-dropdown" id="user-dropdown">
                        <a href="#" onclick="authManager.showProfile()">Profile</a>
                        <a href="#" onclick="authManager.showOrders()">My Orders</a>
                        ${isAdmin ? '<a href="admin.html">Admin Dashboard</a>' : ''}
                        <a href="#" onclick="authManager.logout()">Logout</a>
                    </div>
                </div>
            `;
        } else {
            // Show login button
            authSection.innerHTML = `
                <button class="login-btn" onclick="authManager.showLoginModal()">Login</button>
            `;
        }

        // Try to insert before cart button, fallback to prepend to container
        const cartBtn = targetContainer.querySelector('.cart-btn');
        if (cartBtn && cartBtn.parentNode === targetContainer) {
            try {
                targetContainer.insertBefore(authSection, cartBtn);
            } catch (error) {
                console.error('Failed to insert auth section before cart button:', error);
                targetContainer.prepend(authSection);
            }
        } else {
            // If no cart button found or it's not a direct child, prepend to container
            targetContainer.prepend(authSection);
        }
    }

    showLoginModal() {
        this.switchToLogin();
        this.loginModal.style.display = 'flex';
    }

    closeAuthModal() {
        this.loginModal.style.display = 'none';
        this.clearForms();
    }

    switchToLogin() {
        document.getElementById('auth-modal-title').textContent = 'Login';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
    }

    switchToRegister() {
        document.getElementById('auth-modal-title').textContent = 'Register';
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    }

    clearForms() {
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
    }

    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    showProfile() {
        this.toggleUserMenu();
        this.showNotification('Profile feature coming soon!');
    }

    showOrders() {
        this.toggleUserMenu();
        this.showNotification('Order history feature coming soon!');
    }

    async logout() {
        this.toggleUserMenu();
        
        try {
            // Clear local auth data
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            this.currentUser = null;
            this.isLoggedIn = false;
            
            // Clear auth token from API client
            if (typeof api !== 'undefined') {
                api.setAuthToken(null);
            }
            
            // Note: No server-side logout since endpoint doesn't exist
            console.log('Logout: Cleared local authentication data');
            
            // Clear cart UI and switch to guest mode (empty cart)
            if (typeof cartManager !== 'undefined') {
                cartManager.clearCartOnLogout();
                console.log('Logout: Cleared cart UI and switched to guest mode');
            }
            
            // Also update cart page if we're on it
            if (typeof cartPageManager !== 'undefined') {
                cartPageManager.updateCartPageDisplay();
            }
            
            this.updateAuthDisplay();
            this.showNotification('Successfully logged out');
        } catch (error) {
            console.error('Logout error:', error);
            // Still update UI even if there are errors
            this.updateAuthDisplay();
            this.showNotification('Logged out');
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.isLoggedIn;
    }

    showNotification(message) {
        if (typeof showNotification === 'function') {
            showNotification(message);
        } else {
            console.log('Notification:', message);
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 1rem;
            border-radius: 4px;
            z-index: 3000;
            max-width: 300px;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Global auth manager instance
const authManager = new AuthManager();

// Close user dropdown when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('user-dropdown');
    
    if (userMenu && dropdown && !userMenu.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});
