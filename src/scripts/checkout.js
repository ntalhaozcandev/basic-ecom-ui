// Price formatting utility
function formatPrice(price) {
    const numPrice = parseFloat(price) || 0;
    // Format with European style: thousands separator (.) and comma for decimals
    return numPrice.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' ₺';
}

// Checkout page initialization - enhanced with payment and shipping
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Checkout page: DOMContentLoaded fired');
    
    // Wait for all managers to be available
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts && (
        typeof orderManager === 'undefined' ||
        typeof paymentManager === 'undefined' ||
        typeof shippingManager === 'undefined'
    )) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (typeof orderManager !== 'undefined' && 
        typeof paymentManager !== 'undefined' && 
        typeof shippingManager !== 'undefined') {
        console.log('Checkout page: All managers found, initializing...');
        await initializeEnhancedCheckout();
    } else {
        console.log('Checkout page: Managers not found, using fallback');
        await initializeFallbackCheckout();
    }
});

// Enhanced checkout initialization with payment and shipping
async function initializeEnhancedCheckout() {
    console.log('Checkout page: Using enhanced initialization with payment and shipping');
    
    const cart = JSON.parse(localStorage.getItem('simpleEcomCart') || '[]');
    
    if (cart.length === 0) {
        alert('Your cart is empty. Redirecting to home page.');
        window.location.href = 'home.html';
        return;
    }

    // Initialize all components
    displayCheckoutItems(cart);
    updateOrderSummary(cart);
    
    // Initialize payment manager
    paymentManager.initializePaymentForm('card-details');
    
    // Initialize shipping manager
    shippingManager.initializeShipping();
    
    // Setup enhanced event listeners
    initializeEnhancedEventListeners();
    
    // Initialize order manager
    await orderManager.initialize();
}

// Enhanced event listeners including payment and shipping
function initializeEnhancedEventListeners() {
    // Payment method switching
    const paymentMethods = document.querySelectorAll('input[name="payment"]');
    paymentMethods.forEach(method => {
        method.addEventListener('change', togglePaymentDetails);
    });

    // Same address checkbox
    const sameAddressCheckbox = document.getElementById('same-address');
    if (sameAddressCheckbox) {
        sameAddressCheckbox.addEventListener('change', toggleBillingAddress);
    }

    // Calculate shipping button
    const calculateShippingBtn = document.getElementById('calculate-shipping');
    if (calculateShippingBtn) {
        calculateShippingBtn.addEventListener('click', handleCalculateShipping);
    }

    // Auto-calculate shipping when address changes
    const addressFields = ['zip', 'state', 'city', 'country'];
    addressFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', debounce(autoCalculateShipping, 1000));
        }
    });

    // Card input formatting (handled by payment manager)
    // Payment form is now handled by paymentManager

    console.log('Enhanced event listeners initialized');
}

// Handle calculate shipping button click
async function handleCalculateShipping() {
    const button = document.getElementById('calculate-shipping');
    const loadingElement = document.querySelector('.loading-rates');
    
    try {
        // Show loading state
        if (button) {
            button.disabled = true;
            button.textContent = 'Calculating...';
        }
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }

        await shippingManager.calculateShippingForOrder();
        
        // Update button text
        if (button) {
            button.textContent = 'Recalculate Shipping';
        }
    } catch (error) {
        console.error('Failed to calculate shipping:', error);
        if (button) {
            button.textContent = 'Try Again';
        }
    } finally {
        // Hide loading state
        if (button) {
            button.disabled = false;
        }
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
}

// Auto-calculate shipping when address changes
async function autoCalculateShipping() {
    const zipInput = document.getElementById('zip');
    if (zipInput && zipInput.value.length >= 5) {
        console.log('Auto-calculating shipping for zip:', zipInput.value);
        try {
            await shippingManager.calculateShippingForOrder();
        } catch (error) {
            console.log('Auto-calculate shipping failed:', error);
            // Don't show error for auto-calculation
        }
    }
}

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Simplified fallback initialization - display only, no form handling
async function initializeFallbackCheckout() {
    console.log('Checkout page (legacy): Using fallback initialization');
    
    const cart = JSON.parse(localStorage.getItem('simpleEcomCart') || '[]');
    
    if (cart.length === 0) {
        alert('Your cart is empty. Redirecting to home page.');
        window.location.href = 'home.html';
        return;
    }

    // Only display functions, no form handling
    displayCheckoutItems(cart);
    updateOrderSummary(cart);
    initializeBasicEventListeners();
}

function displayCheckoutItems(cart) {
    const checkoutItemsContainer = document.getElementById('checkout-items');
    if (!checkoutItemsContainer) return;

    checkoutItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        checkoutItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        return;
    }
    
    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'checkout-item';
        
        // Handle both old and new cart item formats
        const product = item.product || item;
        const itemName = product.title || product.name || 'Unknown Product';
        const itemPrice = product.price || 0;
        const itemQuantity = item.quantity || 1;
        
        // Handle image URL with better validation
        let itemImage = '';
        if (product.image) {
            if (Array.isArray(product.image)) {
                itemImage = product.image[0];
            } else if (typeof product.image === 'string') {
                itemImage = product.image;
            }
        }
        
        // Validate image URL to prevent undefined or invalid URLs
        if (!itemImage || itemImage === 'undefined' || itemImage === 'null' || !itemImage.trim()) {
            itemImage = '';
        }
        
        // Create fallback image
        const fallbackImage = '../images/dummy-product.jpg';
        if (!itemImage) {
            itemImage = fallbackImage;
        }
        
        console.log('🚀 Checkout item details:', {
            name: itemName,
            price: itemPrice,
            quantity: itemQuantity,
            image: itemImage
        });
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${itemImage}" alt="${itemName}"
                     onerror="if(this.getAttribute('data-fallback-tried') !== 'true') { this.setAttribute('data-fallback-tried', 'true'); this.src='../images/dummy-product.jpg'; }">
            </div>
            <div class="item-details">
                <h4>${itemName}</h4>
                                <p class="item-price">${formatPrice(itemPrice)}</p>
                <div class="item-total">
                ${formatPrice(itemPrice * itemQuantity)}${parseFloat(itemPrice).toFixed(2)}</p>
                <p class="item-quantity">Qty: ${itemQuantity}</p>
            </div>
            <div class="item-total">
                $${(itemPrice * itemQuantity).toFixed(2)}
            </div>
        `;
        checkoutItemsContainer.appendChild(itemElement);
    });
}

function updateOrderSummary(cart) {
    console.log('🚀 Checkout: Updating order summary with cart:', cart);
    
    // Calculate totals using the same logic as cart manager
    let subtotal = 0;
    let totalItems = 0;
    
    cart.forEach(item => {
        const product = item.product || item;
        const price = parseFloat(product.price || 0);
        const quantity = parseInt(item.quantity || 1);
        
        subtotal += price * quantity;
        totalItems += quantity;
        
        console.log('🚀 Checkout item calculation:', {
            name: product.title || product.name,
            price: price,
            quantity: quantity,
            itemTotal: price * quantity
        });
    });
    
    const TAX_RATE = 0.08;
    const taxAmount = subtotal * TAX_RATE;
    const shippingCost = subtotal > 50 ? 0 : 9.99;
    const total = subtotal + taxAmount + shippingCost;
    
    console.log('🚀 Checkout totals:', {
        subtotal: subtotal,
        taxAmount: taxAmount,
        shippingCost: shippingCost,
        total: total,
        totalItems: totalItems
    });
    
    updateElement('total-items', totalItems);
    updateElement('subtotal', formatPrice(subtotal));
    updateElement('tax-amount', formatPrice(taxAmount));
    updateElement('shipping-cost', shippingCost === 0 ? 'FREE' : formatPrice(shippingCost));
    updateElement('order-total', formatPrice(total));
    updateElement('cart-count', totalItems);
}

// Basic event listeners for display only (no form submission)
function initializeBasicEventListeners() {
    // Shipping options for cost calculation
    const shippingOptions = document.querySelectorAll('input[name="shipping"]');
    shippingOptions.forEach(option => {
        option.addEventListener('change', updateShippingCost);
    });

    // Payment methods for UI display
    const paymentMethods = document.querySelectorAll('input[name="payment"]');
    paymentMethods.forEach(method => {
        method.addEventListener('change', togglePaymentDetails);
    });

    // Same address checkbox
    const sameAddressCheckbox = document.getElementById('same-address');
    if (sameAddressCheckbox) {
        sameAddressCheckbox.addEventListener('change', toggleBillingAddress);
    }

    // Form submission is now handled by order-manager.js
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        console.log('Checkout form found - form submission handled by order-manager.js');
    }

    // Card input formatting
    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', formatCardNumber);
    }

    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', formatExpiryDate);
    }

    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', validateCVV);
    }
}

function updateShippingCost() {
    // This function is now handled by shipping manager
    // Keep for compatibility but delegate to shipping manager
    const selectedRate = shippingManager.getSelectedRate();
    if (selectedRate) {
        const shippingCostElement = document.getElementById('shipping-cost');
        if (shippingCostElement) {
            shippingCostElement.textContent = `$${selectedRate.rate.toFixed(2)}`;
        }
        shippingManager.updateOrderTotal();
    }
}

function togglePaymentDetails() {
    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    if (!selectedPayment) return;

    const cardDetails = document.getElementById('card-details');
    if (!cardDetails) return;

    if (selectedPayment.value === 'card') {
        cardDetails.style.display = 'block';
        setRequiredFields(['card-number', 'expiry', 'cvv', 'card-name'], true);
    } else {
        cardDetails.style.display = 'none';
        setRequiredFields(['card-number', 'expiry', 'cvv', 'card-name'], false);
    }
}

function toggleBillingAddress() {
    const sameAddress = document.getElementById('same-address');
    if (!sameAddress) return;

    const billingSection = document.getElementById('billing-address');
    if (!billingSection) return;

    if (sameAddress.checked) {
        billingSection.style.display = 'none';
        setRequiredFields(['billing-address-line', 'billing-city', 'billing-state', 'billing-zip'], false);
    } else {
        billingSection.style.display = 'block';
        setRequiredFields(['billing-address-line', 'billing-city', 'billing-state', 'billing-zip'], true);
    }
}

function setRequiredFields(fieldIds, required) {
    fieldIds.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.required = required;
        }
    });
}

function formatCardNumber(e) {
    let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    if (formattedValue.length > 19) {
        formattedValue = formattedValue.substr(0, 19);
    }
    e.target.value = formattedValue;
}

function formatExpiryDate(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
}

function validateCVV(e) {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
}

// Legacy functions for backward compatibility
function goToCartPage() {
    window.location.href = 'cart.html';
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
};
