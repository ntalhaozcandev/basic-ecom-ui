// Cart management functionality
class CartManager {
    constructor() {
        this.cart = [];
        this.isCartOpen = false;
        this.useServerCart = true; // Set to true if you want server-side cart management
    }

    // Check if user is authenticated
    isAuthenticated() {
        // Check if auth manager is available and reports authenticated
        if (typeof authManager !== 'undefined' && authManager.isAuthenticated) {
            return authManager.isAuthenticated();
        }
        
        // Fallback: check if we have a token
        const token = localStorage.getItem('authToken');
        return !!token;
    }

    // Method to switch to local cart mode (used during logout)
    switchToLocalMode() {
        console.log('Switching cart to local storage mode');
        this.useServerCart = false;
        this.loadCartFromStorage();
        this.updateCartDisplay();
    }

    // Method to clear cart on logout - shows empty cart for guest experience
    clearCartOnLogout() {
        console.log('Clearing cart for logout - switching to guest mode');
        this.useServerCart = false;
        
        // Clear the in-memory cart for UI
        this.cart = [];
        
        // Clear local storage cart so guest sees empty cart
        localStorage.removeItem('simpleEcomCart');
        
        // Update all displays
        this.updateCartDisplay();
        
        console.log('Cart cleared for guest experience');
    }

    async initialize() {
        this.initializeDOMElements();
        await this.loadCart();
        this.updateCartDisplay();
        this.setupEventListeners();
    }

    initializeDOMElements() {
        this.cartBtn = document.querySelector('.cart-btn');
        this.cartSidebar = document.getElementById('cart-sidebar');
        this.cartBackdrop = document.getElementById('cart-backdrop');
        this.cartCount = document.getElementById('cart-count');
        this.cartItems = document.getElementById('cart-items');
        this.cartTotal = document.getElementById('cart-total');
        this.checkoutBtn = document.querySelector('.checkout-btn');
    }

    setupEventListeners() {
        if (this.cartBtn) {
            this.cartBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleCartButtonClick();
            };
        }

        if (this.checkoutBtn) {
            this.checkoutBtn.addEventListener('click', () => this.proceedToCheckout());
        }

        // Close cart when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isCartOpen && 
                this.cartSidebar && !this.cartSidebar.contains(e.target) && 
                this.cartBtn && !this.cartBtn.contains(e.target) &&
                !e.target.closest('.quantity-btn-small')) {
                this.closeCart();
            }
        });

        if (this.cartSidebar) {
            this.cartSidebar.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    async loadCart() {
        console.log('Loading cart...');
        console.log('useServerCart:', this.useServerCart, 'isAuthenticated:', this.isAuthenticated());
        
        if (this.useServerCart && this.isAuthenticated()) {
            console.log('Loading cart from server...');
            console.log('🚀 DEBUG: New cart loading code is active!');
            try {
                // Double-check that we have a token before making the request
                const token = localStorage.getItem('authToken');
                if (!token) {
                    console.log('No auth token found, falling back to local storage');
                    this.useServerCart = false;
                    this.loadCartFromStorage();
                    return;
                }

                console.log('Getting cart for authenticated user');
                const response = await api.getCart();
                console.log('Cart response:', response);
                console.log('Cart response type:', typeof response);
                console.log('Cart response keys:', response ? Object.keys(response) : 'no response');
                
                // Handle different response formats from your backend
                let cartItems = [];
                
                if (response) {
                    if (response.items && Array.isArray(response.items)) {
                        cartItems = response.items;
                        console.log('Found items array:', cartItems);
                    } else if (response.cart && response.cart.items && Array.isArray(response.cart.items)) {
                        cartItems = response.cart.items;
                        console.log('Found cart.items array:', cartItems);
                    } else if (Array.isArray(response)) {
                        cartItems = response;
                        console.log('Response is direct array:', cartItems);
                    } else if (response.data && Array.isArray(response.data)) {
                        cartItems = response.data;
                        console.log('Found data array:', cartItems);
                    } else {
                        console.log('Unexpected response format, checking for cart properties');
                        // Log all properties to understand the structure
                        if (typeof response === 'object') {
                            Object.keys(response).forEach(key => {
                                console.log(`Response.${key}:`, response[key]);
                            });
                        }
                    }
                }
                
                this.cart = cartItems;
                console.log('Final parsed cart:', this.cart);
                console.log('Cart length:', this.cart.length);
                
                // Don't save to localStorage when using server cart to avoid conflicts
            } catch (error) {
                console.log('Failed to load cart:', error);
                console.log('Falling back to local cart storage');
                this.useServerCart = false;
                this.loadCartFromStorage();
            }
        } else {
            console.log('No authentication - using local cart storage');
            this.loadCartFromStorage();
        }
    }

    loadCartFromStorage() {
        console.log('Loading cart from localStorage...');
        const savedCart = localStorage.getItem('simpleEcomCart');
        console.log('Raw localStorage data:', savedCart);
        
        if (savedCart) {
            try {
                this.cart = JSON.parse(savedCart);
                console.log('Parsed cart from localStorage:', this.cart);
                console.log('Cart length after loading:', this.cart.length);
            } catch (error) {
                console.error('Error parsing cart from localStorage:', error);
                this.cart = [];
            }
        } else {
            console.log('No cart data in localStorage, initializing empty cart');
            this.cart = [];
        }
    }

    async saveCart() {
        try {
            if (this.useServerCart) {
                // If using server-side cart, the API calls handle saving
                return;
            } else {
                this.saveCartToStorage();
            }
        } catch (error) {
            console.error('Failed to save cart:', error);
            this.saveCartToStorage(); // Fallback to local storage
        }
    }

    saveCartToStorage() {
        console.log('Saving cart to localStorage:', this.cart);
        localStorage.setItem('simpleEcomCart', JSON.stringify(this.cart));
        console.log('Cart saved to localStorage. Verification:', localStorage.getItem('simpleEcomCart'));
    }

    async addToCart(productId, quantity = 1) {
        try {
            if (this.useServerCart && this.isAuthenticated()) {
                console.log('Attempting to add to server cart...');
                try {
                    const response = await api.addToCart(productId, quantity);
                    console.log('Add to cart response:', response);
                    
                    await this.loadCart();
                    this.updateCartDisplay();
                    this.showNotification('Item added to cart!');
                    return;
                } catch (serverError) {
                    console.log('Server cart failed, falling back to local cart:', serverError.message);
                    // Continue to local cart fallback below
                }
            }
            
            // Local cart (either by choice or as fallback)
            if (this.useServerCart && !this.isAuthenticated()) {
                console.log('No authentication - adding to local cart');
            }
            await this.addToCartLocal(productId, quantity);
            this.updateCartDisplay();
            this.showNotification('Item added to cart!');
            
        } catch (error) {
            console.error('Failed to add to cart:', error);
            this.showError('Failed to add item to cart. Please try again.');
        }
    }

    async addToCartLocal(productId, quantity = 1) {
        try {
            let product;
            
            // Try to get product details from API first
            try {
                product = await api.getProduct(productId);
            } catch (apiError) {
                console.log('Failed to fetch product from API, creating minimal product object:', apiError.message);
                // Create a minimal product object if API fails
                product = {
                    _id: productId,
                    id: productId,
                    title: `Product ${productId}`,
                    name: `Product ${productId}`,
                    price: 0, // Will need to be updated manually
                    image: '',
                    category: 'unknown',
                    stock: 100,
                    isActive: true
                };
            }
            
            const existingItem = this.cart.find(item => (item._id || item.id) === productId);
            
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                this.cart.push({
                    _id: product._id || product.id,
                    id: product._id || product.id, // Keep both for compatibility
                    title: product.title || product.name,
                    name: product.title || product.name, // Keep both for compatibility
                    price: product.price,
                    image: product.images || product.image || product.imageUrl,
                    category: product.category,
                    quantity: quantity,
                    stock: product.stock,
                    isActive: product.isActive
                });
            }
            
            await this.saveCart();
        } catch (error) {
            console.error('Failed to add product to local cart:', error);
            throw error;
        }
    }

    async updateCartItemQuantity(productId, change) {
        console.log('🚀 Updating cart item quantity:', { productId, change });
        console.log('🚀 Current cart items:', this.cart.map(item => ({
            itemId: item._id || item.id,
            productId: item.product?._id || item.product?.id,
            quantity: item.quantity
        })));
        
        try {
            // Try different ways to find the item
            let item = this.cart.find(item => (item._id || item.id) === productId);
            if (!item) {
                item = this.cart.find(item => (item.product?._id || item.product?.id) === productId);
            }
            
            console.log('🚀 Found item:', item);
            
            if (!item) {
                console.log('🚀 Item not found for productId:', productId);
                return;
            }

            const oldQuantity = item.quantity || 1;
            const newQuantity = oldQuantity + change;

            if (newQuantity <= 0) {
                await this.removeFromCart(productId);
                return;
            }

            if (this.useServerCart && this.isAuthenticated()) {
                try {
                    console.log('🚀 Updating on server...');
                    await api.updateCartItem(productId, newQuantity);
                    await this.loadCart();
                    this.updateCartDisplay();
                    this.showNotification(`Quantity updated (${oldQuantity} → ${newQuantity})`);
                    return;
                } catch (serverError) {
                    console.log('Server update failed, falling back to local update:', serverError.message);
                    // Continue to local update below
                }
            }

            // Local update (either by choice or as fallback)
            item.quantity = newQuantity;
            await this.saveCart();
            this.updateCartDisplay();
            this.showNotification(`Quantity updated (${oldQuantity} → ${newQuantity})`);
            
        } catch (error) {
            console.error('Failed to update cart item:', error);
            this.showError('Failed to update item quantity.');
        }
    }

    async removeFromCart(productId) {
        console.log('🚀 Removing cart item:', { productId });
        console.log('🚀 Current cart items:', this.cart.map(item => ({
            itemId: item._id || item.id,
            productId: item.product?._id || item.product?.id,
            title: item.title || item.name || item.product?.title || item.product?.name
        })));
        
        try {
            // Try different ways to find the item
            let item = this.cart.find(item => (item._id || item.id) === productId);
            if (!item) {
                item = this.cart.find(item => (item.product?._id || item.product?.id) === productId);
            }
            
            console.log('🚀 Found item to remove:', item);
            
            if (!item) {
                console.log('🚀 Item not found for productId:', productId);
                return;
            }

            const itemName = item.title || item.name || item.product?.title || item.product?.name || 'Item';

            if (this.useServerCart && this.isAuthenticated()) {
                try {
                    console.log('🚀 Removing from server...');
                    await api.removeFromCart(productId);
                    await this.loadCart();
                    this.updateCartDisplay();
                    this.showNotification(`${itemName} removed from cart`);
                    return;
                } catch (serverError) {
                    console.log('Server removal failed, falling back to local removal:', serverError.message);
                    // Continue to local removal below
                }
            }

            // Local removal (either by choice or as fallback)
            this.cart = this.cart.filter(item => (item._id || item.id) !== productId);
            await this.saveCart();
            this.updateCartDisplay();
            this.showNotification(`${itemName} removed from cart`);
            
        } catch (error) {
            console.error('Failed to remove from cart:', error);
            this.showError('Failed to remove item from cart.');
        }
    }

    async clearCart() {
        console.log('Clearing cart...');
        try {
            if (this.useServerCart && this.isAuthenticated()) {
                console.log('Clearing server cart...');
                await api.clearCart();
                // Also clear local cart to ensure sync
                this.cart = [];
                this.saveCartToStorage();
                console.log('Server and local cart cleared');
            } else {
                console.log('Clearing local cart...');
                // Clear local cart
                this.cart = [];
                this.saveCartToStorage();
                console.log('Local cart cleared');
            }

            this.updateCartDisplay();
            this.showNotification('Cart cleared');
            console.log('Cart clear complete, current cart:', this.cart);
        } catch (error) {
            console.error('Failed to clear cart:', error);
            // Fallback: always clear local cart even if server fails
            try {
                console.log('Fallback: clearing local cart...');
                this.cart = [];
                this.saveCartToStorage();
                this.updateCartDisplay();
                this.showNotification('Cart cleared locally');
                console.log('Fallback cart clear complete');
            } catch (localError) {
                this.showError('Failed to clear cart.');
            }
        }
    }

    // Force clear everything - for debugging
    forceClearCart() {
        console.log('Force clearing all cart data...');
        this.cart = [];
        localStorage.removeItem('simpleEcomCart');
        sessionStorage.removeItem('simpleEcomCart'); // Just in case
        this.updateCartDisplay();
        console.log('Force clear complete');
    }

    updateCartDisplay() {
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (this.cartCount) {
            this.cartCount.textContent = totalItems;
        }

        if (this.cartItems) {
            this.cartItems.innerHTML = '';
            
            if (this.cart.length === 0) {
                this.cartItems.innerHTML = '<li class="empty-cart">Your cart is empty</li>';
            } else {
                this.cart.forEach(item => {
                    const cartItem = this.createCartItem(item);
                    this.cartItems.appendChild(cartItem);
                });
            }
        }

        if (this.cartTotal) {
            const total = this.cart.reduce((sum, item) => {
                // Prioritize flat structure (server cart) over nested structure (local cart)
                const price = parseFloat(item.price || item.product?.price || 0);
                const quantity = parseInt(item.quantity || 0);
                return sum + (price * quantity);
            }, 0);
            this.cartTotal.innerHTML = `<strong>Total: ${this.formatPrice(total)}</strong>`;
        }

        if (this.checkoutBtn) {
            this.checkoutBtn.disabled = this.cart.length === 0;
        }
    }

    createCartItem(item) {
        const cartItem = document.createElement('li');
        cartItem.className = 'cart-item';
        
        // Handle both nested product structure (local cart) and flat structure (server cart)
        const product = item.product || item;
        const itemId = product._id || product.id || item._id || item.id;
        const itemName = item.title || item.name || product.title || product.name || 'Unknown Product';
        const itemPrice = parseFloat(item.price || product.price || 0);
        const itemQuantity = parseInt(item.quantity || 1);
        const itemImage = Array.isArray(item.images) ? item.images[0] : 
                         Array.isArray(item.image) ? item.image[0] : 
                         item.image || item.images ||
                         Array.isArray(product.images) ? product.images[0] : 
                         Array.isArray(product.image) ? product.image[0] : 
                         product.image || product.images;
        
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${itemName}</div>
                <div class="cart-item-price">${this.formatPrice(itemPrice)} x ${itemQuantity}</div>
                <div class="cart-item-controls">
                    <button class="quantity-btn-small" onclick="cartManager.updateCartItemQuantity('${itemId}', -1); event.stopPropagation();">-</button>
                    <span class="quantity-display">${itemQuantity}</span>
                    <button class="quantity-btn-small" onclick="cartManager.updateCartItemQuantity('${itemId}', 1); event.stopPropagation();">+</button>
                </div>
            </div>
            <button class="remove-btn" onclick="cartManager.removeFromCart('${itemId}'); event.stopPropagation();">Remove</button>
        `;
        return cartItem;
    }

    handleCartButtonClick() {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        
        if (currentPage === 'cart' || document.querySelector('.cart-main')) {
            this.showNotification('You are already viewing your cart!');
        } else if (this.cartSidebar) {
            this.toggleCart();
        } else {
            window.location.href = 'cart.html';
        }
    }

    toggleCart() {
        if (this.isCartOpen) {
            this.closeCart();
        } else {
            this.openCart();
        }
    }

    openCart() {
        if (this.cartSidebar) {
            this.cartSidebar.classList.add('open');
            this.isCartOpen = true;
        }
        if (this.cartBackdrop) {
            this.cartBackdrop.style.display = 'block';
            this.cartBackdrop.style.animation = 'fadeIn 0.3s ease-out';
        }
    }

    closeCart() {
        if (this.cartSidebar) {
            this.cartSidebar.classList.remove('open');
            this.isCartOpen = false;
        }
        if (this.cartBackdrop) {
            this.cartBackdrop.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                if (this.cartBackdrop) {
                    this.cartBackdrop.style.display = 'none';
                }
            }, 300);
        }
    }

    proceedToCheckout() {
        if (this.cart.length === 0) {
            this.showError('Your cart is empty!');
            return;
        }
        window.location.href = 'checkout.html';
    }

    calculateSubtotal() {
        console.log('🚀 Calculating subtotal for cart:', this.cart);
        
        const subtotal = this.cart.reduce((sum, item) => {
            const price = parseFloat(item.price || item.product?.price || 0);
            const quantity = parseFloat(item.quantity || 1);
            
            console.log('🚀 Item calculation:', {
                item: item.title || item.name || item.product?.title || 'Unknown',
                price,
                quantity,
                itemTotal: price * quantity
            });
            
            if (isNaN(price) || isNaN(quantity)) {
                console.warn('🚀 NaN detected in calculation:', { price, quantity, item });
                return sum;
            }
            
            return sum + (price * quantity);
        }, 0);
        
        console.log('🚀 Final subtotal:', subtotal);
        return subtotal;
    }

    calculateTax(subtotal = null) {
        const amount = parseFloat(subtotal || this.calculateSubtotal() || 0);
        if (isNaN(amount)) return 0;
        return amount * 0.08; // 8% tax rate
    }

    calculateShipping(subtotal = null) {
        const amount = parseFloat(subtotal || this.calculateSubtotal() || 0);
        if (isNaN(amount)) return 9.99;
        return amount > 50 ? 0 : 9.99; // Free shipping over $50
    }

    calculateTotal() {
        const subtotal = this.calculateSubtotal();
        const tax = this.calculateTax(subtotal);
        const shipping = this.calculateShipping(subtotal);
        return subtotal + tax + shipping;
    }

    showNotification(message) {
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
            z-index: 1000;
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

    formatPrice(price) {
        const numPrice = parseFloat(price) || 0;
        // Format with European style: thousands separator (.) and comma for decimals
        return numPrice.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' ₺';
    }
}

// Global cart manager instance
const cartManager = new CartManager();
