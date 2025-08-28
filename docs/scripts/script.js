// Main application controller - coordinates all managers

class AppController {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.isInitialized = false;
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'home';
        return page;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing application for page:', this.currentPage);

            // Wait for managers to be available
            await this.waitForManagers();
            console.log('All required managers loaded successfully');

            // Initialize authentication first
            if (typeof authManager !== 'undefined') {
                try {
                    await authManager.initialize();
                    console.log('Auth manager initialized');
                } catch (error) {
                    console.error('Auth manager initialization failed:', error);
                    // Continue with app initialization even if auth fails
                }
            }

            // Initialize cart manager first (needed by all pages)
            if (typeof cartManager !== 'undefined') {
                await cartManager.initialize();
                console.log('Cart manager initialized');
            }

            // Initialize page-specific functionality
            switch (this.currentPage) {
                case 'home':
                case 'index':
                    await this.initializeHomePage();
                    break;
                case 'product-detail':
                    await this.initializeProductDetailPage();
                    break;
                case 'cart':
                    await this.initializeCartPage();
                    break;
                case 'checkout':
                    await this.initializeCheckoutPage();
                    break;
            }

            this.setupGlobalEventListeners();
            this.isInitialized = true;
            console.log('Application initialization complete');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Application failed to load. Please refresh the page.');
        }
    }

    async waitForManagers() {
        console.log('Checking for required managers...');
        
        // Immediate check - if all managers are available, return right away
        const managersAvailable = this.checkManagersAvailability();
        if (managersAvailable.allReady) {
            console.log('All managers are immediately available');
            return;
        }

        console.log('Manager availability:', managersAvailable);
        console.log('Waiting for missing managers to load...');
        
        let attempts = 0;
        const maxAttempts = 20; // Reduced to 2 seconds max
        const checkInterval = 100; // 100ms intervals

        while (attempts < maxAttempts) {
            const currentStatus = this.checkManagersAvailability();
            
            if (currentStatus.allReady) {
                console.log(`All managers loaded after ${attempts * checkInterval}ms`);
                return;
            }
            
            console.log(`Attempt ${attempts + 1}/${maxAttempts}:`, currentStatus.missing);
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            attempts++;
        }

        // Final check and detailed error
        const finalStatus = this.checkManagersAvailability();
        console.error('Timeout waiting for managers. Final state:', finalStatus);
        
        throw new Error(`Managers not loaded: ${finalStatus.missing.join(', ')}`);
    }

    checkManagersAvailability() {
        const managers = {
            api: typeof api !== 'undefined',
            authManager: typeof authManager !== 'undefined',
            cartManager: typeof cartManager !== 'undefined',
            productManager: typeof productManager !== 'undefined'
        };

        // Add page-specific requirements
        switch (this.currentPage) {
            case 'product-detail':
                managers.productDetailManager = typeof productDetailManager !== 'undefined';
                break;
            case 'checkout':
                managers.orderManager = typeof orderManager !== 'undefined';
                break;
        }

        const missing = Object.entries(managers)
            .filter(([name, available]) => !available)
            .map(([name]) => name);

        return {
            allReady: missing.length === 0,
            available: Object.entries(managers).filter(([name, available]) => available).map(([name]) => name),
            missing: missing,
            managers: managers
        };
    }

    async initializeHomePage() {
        if (typeof productManager !== 'undefined') {
            await productManager.initialize();
            this.setupSearchAndFilter();
        }
    }

    async initializeProductDetailPage() {
        if (typeof productDetailManager !== 'undefined') {
            await productDetailManager.initialize();
            this.setupProductDetailEventListeners();
        }
    }

    async initializeCartPage() {
        // Cart page functionality is handled by CartPageManager in cart.js
        // The CartPageManager has its own initialization, so we just need to ensure it's ready
        console.log('App: Cart page detected, CartPageManager should handle initialization');
        
        // Wait a bit for CartPageManager to initialize if needed
        if (typeof cartPageManager !== 'undefined') {
            console.log('App: CartPageManager available');
            // Refresh the display in case cart data has changed
            cartPageManager.updateCartPageDisplay();
        } else {
            console.log('App: CartPageManager not yet available, it will initialize via its own DOMContentLoaded');
        }
    }

    async initializeCheckoutPage() {
        if (typeof orderManager !== 'undefined') {
            await orderManager.initialize();
        }
    }

    setupSearchAndFilter() {
        const searchInput = document.getElementById('search');
        const categorySelect = document.getElementById('category');

        if (searchInput && typeof productManager !== 'undefined') {
            searchInput.addEventListener('input', () => {
                productManager.searchProducts(searchInput.value);
            });
        }

        if (categorySelect && typeof productManager !== 'undefined') {
            categorySelect.addEventListener('change', () => {
                productManager.filterByCategory(categorySelect.value);
            });
        }
    }

    setupProductDetailEventListeners() {
        const addToCartBtn = document.getElementById('add-to-cart-detail');
        const buyNowBtn = document.querySelector('.buy-now-btn');
        const quantityButtons = document.querySelectorAll('.quantity-btn');

        if (addToCartBtn && typeof productDetailManager !== 'undefined') {
            addToCartBtn.addEventListener('click', () => {
                productDetailManager.addToCartWithQuantity();
            });
        }

        if (buyNowBtn && typeof productDetailManager !== 'undefined') {
            buyNowBtn.addEventListener('click', () => {
                productDetailManager.addToCartWithQuantity();
                setTimeout(() => {
                    window.location.href = 'checkout.html';
                }, 500);
            });
        }

        // Quantity controls
        quantityButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const change = btn.textContent === '+' ? 1 : -1;
                if (typeof productDetailManager !== 'undefined') {
                    productDetailManager.changeQuantity(change);
                }
            });
        });
    }

    setupGlobalEventListeners() {
        // Global tab functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-header')) {
                this.handleTabClick(e);
            }
        });

        // Global navigation
        document.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-navigate')) {
                const destination = e.target.getAttribute('data-navigate');
                window.location.href = destination;
            }
        });
    }

    handleTabClick(event) {
        const tabName = event.target.getAttribute('data-tab');
        if (!tabName) return;

        // Remove active class from all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        document.querySelectorAll('.tab-header').forEach(header => {
            header.classList.remove('active');
        });

        // Add active class to selected tab
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
            event.target.classList.add('active');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'app-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #dc3545;
            color: white;
            padding: 2rem;
            border-radius: 8px;
            z-index: 2000;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        errorDiv.innerHTML = `
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #dc3545;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 1rem;
            ">Refresh Page</button>
        `;
        
        document.body.appendChild(errorDiv);
    }
}

// Global functions for backward compatibility and direct HTML calls
function addToCart(productId, quantity = 1) {
    if (typeof cartManager !== 'undefined') {
        cartManager.addToCart(productId, quantity);
    }
}

function navigateToProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}

function updateCartItemQuantity(productId, change) {
    if (typeof cartManager !== 'undefined') {
        cartManager.updateCartItemQuantity(productId, change);
    }
}

function removeFromCart(productId) {
    if (typeof cartManager !== 'undefined') {
        cartManager.removeFromCart(productId);
    }
}

function openCart() {
    if (typeof cartManager !== 'undefined') {
        cartManager.openCart();
    }
}

function closeCart() {
    if (typeof cartManager !== 'undefined') {
        cartManager.closeCart();
    }
}

function toggleCart() {
    if (typeof cartManager !== 'undefined') {
        cartManager.toggleCart();
    }
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-header').forEach(header => {
        header.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    const selectedHeader = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedHeader) {
        selectedHeader.classList.add('active');
    }
}

function changeQuantity(change) {
    if (typeof productDetailManager !== 'undefined') {
        productDetailManager.changeQuantity(change);
    }
}

function proceedToCheckout() {
    if (typeof cartManager !== 'undefined') {
        cartManager.proceedToCheckout();
    }
}

function clearCart() {
    if (typeof cartManager !== 'undefined') {
        cartManager.clearCart();
    }
}

function forceClearCart() {
    if (typeof cartManager !== 'undefined') {
        cartManager.forceClearCart();
    }
}

function refreshCartPage() {
    if (typeof cartPageManager !== 'undefined') {
        console.log('Refreshing cart page display...');
        cartPageManager.updateCartPageDisplay();
    }
}

function syncCartFromStorage() {
    if (typeof cartManager !== 'undefined') {
        console.log('Force syncing cart from localStorage...');
        cartManager.loadCartFromStorage();
        cartManager.updateCartDisplay();
        
        // Also refresh cart page if we're on it
        if (typeof cartPageManager !== 'undefined') {
            cartPageManager.updateCartPageDisplay();
        }
        
        console.log('Cart synced. Current cart:', cartManager.cart);
    }
}

function debugCart() {
    console.log('=== CART DEBUG INFO ===');
    console.log('cartManager.cart:', cartManager?.cart);
    console.log('cartManager.cart.length:', cartManager?.cart?.length);
    console.log('localStorage cart:', localStorage.getItem('simpleEcomCart'));
    console.log('cartManager.useServerCart:', cartManager?.useServerCart);
    console.log('cartManager.isAuthenticated():', cartManager?.isAuthenticated());
    console.log('======================');
}

function goToCartPage() {
    window.location.href = 'cart.html';
}

// Notification helper function
function showNotification(message) {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem;
        border-radius: 4px;
        z-index: 1000;
        animation: fadeInOut 2s ease-in-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 2000);
}

// Utility function to create fallback image
function createFallbackImage(width = 150, height = 150, text = 'No Image') {
    // Return path to dummy image instead of generating data URLs
    return '../basic-ecom-ui/src/images/dummy-product.jpg';
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    // Prevent multiple initializations
    if (window.appInitialized) {
        console.log('Application already initialized, skipping...');
        return;
    }
    
    try {
        console.log('Starting application initialization...');
        window.appInitialized = true;
        
        const app = new AppController();
        
        // Initialize immediately since scripts are now loaded in order
        await app.initialize();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        window.appInitialized = false; // Reset flag on error
        
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #dc3545;
            color: white;
            padding: 2rem;
            border-radius: 8px;
            z-index: 2000;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        errorDiv.innerHTML = `
            <h3>Loading Error</h3>
            <p>Failed to load the application. Please refresh the page.</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #dc3545;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 1rem;
            ">Refresh Page</button>
        `;
        document.body.appendChild(errorDiv);
    }
});
