// Cart page specific functionality
class CartPageManager {
    constructor() {
        this.promoApplied = false;
        this.discountAmount = 0;
    }

    async initialize() {
        console.log('Cart page: Initializing...');
        console.log('Cart page: cartManager available?', typeof cartManager !== 'undefined');
        
        if (typeof cartManager !== 'undefined') {
            console.log('Cart page: Current cart before any action:', cartManager.cart);
            console.log('Cart page: Current localStorage:', localStorage.getItem('simpleEcomCart'));
            
            // Force reload from localStorage to ensure sync
            console.log('Cart page: Force reloading from localStorage...');
            cartManager.loadCartFromStorage();
            console.log('Cart page: Cart after force reload:', cartManager.cart);
        }
        
        this.updateCartPageDisplay();
        this.setupCartPageEventListeners();
        console.log('Cart page: Initialization complete');
    }

    setupCartPageEventListeners() {
        const proceedCheckoutBtn = document.getElementById('proceed-checkout');
        if (proceedCheckoutBtn) {
            proceedCheckoutBtn.addEventListener('click', () => {
                this.handleProceedToCheckout();
            });
        }

        const applyPromoBtn = document.querySelector('.apply-promo-btn');
        if (applyPromoBtn) {
            applyPromoBtn.addEventListener('click', () => this.applyPromoCode());
        }

        const promoCodeInput = document.getElementById('promo-code');
        if (promoCodeInput) {
            promoCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyPromoCode();
                }
            });
        }
    }

    updateCartPageDisplay() {
        console.log('Cart page: Updating display...');
        console.log('Cart page: cartManager.cart =', cartManager.cart);
        console.log('Cart page: cartManager.cart.length =', cartManager.cart.length);
        
        const cartItemsContainer = document.getElementById('cart-items-container');
        const cartEmpty = document.getElementById('cart-empty');
        const cartItemsList = document.getElementById('cart-items-list');

        if (!cartItemsContainer || !cartEmpty || !cartItemsList) {
            console.warn('Cart page elements not found');
            return;
        }

        if (cartManager.cart.length === 0) {
            console.log('Cart page: Showing empty cart');
            cartItemsContainer.style.display = 'none';
            cartEmpty.style.display = 'block';
        } else {
            console.log('Cart page: Showing cart with', cartManager.cart.length, 'items');
            cartItemsContainer.style.display = 'block';
            cartEmpty.style.display = 'none';

            cartItemsList.innerHTML = '';

            cartManager.cart.forEach(item => {
                const cartItemElement = this.createCartPageItem(item);
                cartItemsList.appendChild(cartItemElement);
            });
        }

        this.updateCartSummary();
        cartManager.updateCartDisplay(); // Update header cart display
    }

    createCartPageItem(item) {
        console.log('🚀 Creating cart item for:', item);
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item-row';
        
        // Handle different possible ID fields
        const itemId = item._id || item.id || item.product?._id || item.product?.id;
        
        // For cart operations, we need the product ID that the backend expects
        // This might be different from the cart item ID
        const productId = item.product?._id || item.product?.id || item._id || item.id;
        
        console.log('🚀 Item IDs:', { itemId, productId });
        
        // Handle different possible name fields
        const itemName = item.title || item.name || item.product?.title || item.product?.name || 'Unknown Product';
        
        // Handle different possible price fields (prices are already in dollars)
        const itemPrice = item.price || item.product?.price || 0;
        
        // Handle different possible image fields
        let itemImage = '';
        if (item.images && Array.isArray(item.images) && item.images[0]) {
            itemImage = item.images[0];
        } else if (item.image) {
            itemImage = Array.isArray(item.image) ? item.image[0] : item.image;
        } else if (item.product?.images && Array.isArray(item.product.images) && item.product.images[0]) {
            itemImage = item.product.images[0];
        } else if (item.product?.image) {
            itemImage = Array.isArray(item.product.image) ? item.product.image[0] : item.product.image;
        }
        
        // Handle category
        const itemCategory = item.category || item.product?.category || '';
        
        // Handle quantity
        const itemQuantity = item.quantity || 1;
        
        console.log('🚀 Parsed item data:', {
            itemId, itemName, itemPrice, itemImage, itemCategory, itemQuantity
        });
        
        cartItem.innerHTML = `
            <div class="cart-item-product">
                <img src="${itemImage || '../src/images/dummy-product.jpg'}" alt="${itemName}" class="cart-item-image"
                     onerror="this.src='../src/images/dummy-product.jpg'">
                <div class="cart-item-details">
                    <h4>${itemName}</h4>
                    <p class="cart-item-category">${this.capitalizeFirst(itemCategory)}</p>
                </div>
            </div>
            <div class="cart-item-price">${this.formatPrice(itemPrice)}</div>
            <div class="cart-item-quantity">
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="cartPageManager.updateCartItemQuantity('${productId}', -1)">-</button>
                    <span class="quantity-value">${itemQuantity}</span>
                    <button class="quantity-btn" onclick="cartPageManager.updateCartItemQuantity('${productId}', 1)">+</button>
                </div>
            </div>
            <div class="cart-item-total">${this.formatPrice(itemPrice * itemQuantity)}</div>
            <div class="cart-item-actions">
                <button class="remove-item-btn" onclick="cartPageManager.removeFromCartPage('${productId}')">
                    🗑️ Remove
                </button>
            </div>
        `;
        return cartItem;
    }

    async updateCartItemQuantity(productId, change) {
        await cartManager.updateCartItemQuantity(productId, change);
        this.updateCartPageDisplay();
    }

    async removeFromCartPage(productId) {
        await cartManager.removeFromCart(productId);
        this.updateCartPageDisplay();
    }

    updateCartSummary() {
        console.log('🚀 Updating cart summary...');
        console.log('🚀 Cart items for summary:', cartManager.cart);
        
        const totalItems = cartManager.cart.reduce((sum, item) => {
            const quantity = parseFloat(item.quantity || 1);
            return sum + quantity;
        }, 0);
        
        const subtotal = cartManager.calculateSubtotal();
        console.log('🚀 Calculated subtotal:', subtotal);
        
        // Cart manager returns values in the correct dollar format
        const tax = cartManager.calculateTax(subtotal);
        const shipping = cartManager.calculateShipping(subtotal);
        
        console.log('🚀 Tax:', tax, 'Shipping:', shipping, 'Discount:', this.discountAmount);
        
        // Apply discount if promo is applied
        const discountedSubtotal = subtotal - (this.discountAmount || 0);
        const finalTax = cartManager.calculateTax(discountedSubtotal);
        const total = discountedSubtotal + finalTax + shipping;
        
        console.log('🚀 Final calculations:', {
            totalItems,
            subtotal,
            discountedSubtotal,
            finalTax,
            total
        });

        this.updateElement('total-items', totalItems);
        this.updateElement('subtotal', this.formatPrice(isNaN(subtotal) ? 0 : subtotal));
        this.updateElement('tax-amount', this.formatPrice(isNaN(finalTax) ? 0 : finalTax));
        this.updateElement('shipping-cost', shipping === 0 ? 'FREE' : this.formatPrice(isNaN(shipping) ? 0 : shipping));
        this.updateElement('cart-total', this.formatPrice(isNaN(total) ? 0 : total));

        // Update discount row if applicable
        this.updateDiscountDisplay();

        // Update sidebar total if exists
        const sidebarTotal = document.getElementById('cart-total-sidebar');
        if (sidebarTotal) {
            sidebarTotal.innerHTML = `<strong>Total: ${this.formatPrice(total)}</strong>`;
        }

        // Update header cart count
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = totalItems;
        }
    }

    updateDiscountDisplay() {
        let discountRow = document.getElementById('discount-row');
        
        if (this.promoApplied && this.discountAmount > 0) {
            if (!discountRow) {
                // Create discount row
                const summaryContainer = document.querySelector('.cart-summary');
                const taxRow = document.querySelector('.tax-row');
                
                discountRow = document.createElement('div');
                discountRow.id = 'discount-row';
                discountRow.className = 'summary-row';
                discountRow.innerHTML = `
                    <span>İndirim:</span>
                    <span class="discount-amount">-${this.formatPrice(this.discountAmount)}</span>
                `;
                
                if (summaryContainer && taxRow) {
                    summaryContainer.insertBefore(discountRow, taxRow);
                }
            } else {
                discountRow.querySelector('.discount-amount').textContent = `-${this.formatPrice(this.discountAmount)}`;
            }
        } else if (discountRow) {
            discountRow.remove();
        }
    }

    applyPromoCode() {
        const promoCodeInput = document.getElementById('promo-code');
        if (!promoCodeInput) return;

        const promoCode = promoCodeInput.value.trim().toUpperCase();

        if (!promoCode) {
            this.showError('Please enter a promo code');
            return;
        }

        if (this.promoApplied) {
            this.showNotification('A promo code is already applied');
            return;
        }

        const promoCodes = {
            'SAVE10': { discount: 0.10, type: 'percentage', description: '10% off' },
            'WELCOME': { discount: 5, type: 'fixed', description: '$5 off' },
            'FREESHIP': { discount: 9.99, type: 'shipping', description: 'Free shipping' }
        };

        const promo = promoCodes[promoCode];

        if (promo) {
            const subtotal = cartManager.calculateSubtotal();
            
            if (promo.type === 'percentage') {
                this.discountAmount = subtotal * promo.discount;
            } else if (promo.type === 'fixed') {
                this.discountAmount = Math.min(promo.discount, subtotal);
            } else if (promo.type === 'shipping') {
                // Handle shipping discount separately if needed
                this.discountAmount = 0;
            }

            this.promoApplied = true;
            this.showNotification(`Promo code "${promoCode}" applied: ${promo.description}`);
            promoCodeInput.value = '';
            promoCodeInput.disabled = true;
            
            // Update the apply button
            const applyBtn = document.querySelector('.apply-promo-btn');
            if (applyBtn) {
                applyBtn.textContent = 'Applied';
                applyBtn.disabled = true;
            }

            this.updateCartSummary();
        } else {
            this.showError('Invalid promo code');
        }
    }

    handleProceedToCheckout() {
        if (cartManager.cart.length === 0) {
            this.showError('Your cart is empty!');
            return;
        }

        window.location.href = 'checkout.html';
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            // Handle special case for cart-total which has a <strong> tag
            if (id === 'cart-total') {
                element.innerHTML = `<strong>${content}</strong>`;
            } else {
                element.textContent = content;
            }
            console.log(`Updated element ${id} with value: ${content}`);
        } else {
            console.error(`Element with id '${id}' not found`);
        }
    }

    capitalizeFirst(str) {
        if (!str) return '';
        
        // Handle arrays (like categories)
        if (Array.isArray(str)) {
            if (str.length === 0) return 'N/A';
            return str.map(item => 
                item ? item.charAt(0).toUpperCase() + item.slice(1) : ''
            ).join(', ');
        }
        
        // Handle strings
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatPrice(price) {
        const numPrice = parseFloat(price) || 0;
        // Format with European style: thousands separator (.) and comma for decimals
        return numPrice.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' ₺';
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
}

// Global cart page manager instance
const cartPageManager = new CartPageManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Cart page: DOMContentLoaded fired');
    
    // Wait for cart manager to be available
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts && typeof cartManager === 'undefined') {
        console.log('Cart page: Waiting for cartManager... attempt', attempts + 1);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (typeof cartManager !== 'undefined') {
        console.log('Cart page: cartManager found, initializing CartPageManager');
        await cartPageManager.initialize();
    } else {
        console.error('Cart manager not available');
    }
});

// Legacy function support
function updateCartPageDisplay() {
    if (cartPageManager) {
        cartPageManager.updateCartPageDisplay();
    }
}

function removeFromCartPage(productId) {
    if (cartPageManager) {
        cartPageManager.removeFromCartPage(productId);
    }
}

function applyPromoCode() {
    if (cartPageManager) {
        cartPageManager.applyPromoCode();
    }
}
