// Order management and checkout functionality
class OrderManager {
    constructor() {
        this.currentOrder = null;
        this.shippingCost = 0;
        this.TAX_RATE = 0.08;
        this.isProcessingOrder = false;
    }

    async initialize() {
        console.log('Order manager: Initializing...');
        
        // Wait for cart manager to be available
        let attempts = 0;
        const maxAttempts = 50;

        while (attempts < maxAttempts && typeof cartManager === 'undefined') {
            console.log('Order manager: Waiting for cart manager... attempt', attempts + 1);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof cartManager === 'undefined') {
            console.error('Order manager: Cart manager not available');
            this.showError('Cart system not available. Please refresh the page.');
            return;
        }
        
        console.log('Order manager: Cart manager available, loading cart...');
        
        // Store the authentication state before loading
        const isAuth = cartManager.isAuthenticated();
        console.log('Order manager: User authentication state:', isAuth);
        
        await cartManager.loadCart();
        console.log('Order manager: Cart loaded, items:', cartManager.cart.length);
        console.log('Order manager: Cart contents:', cartManager.cart);
        
        // Add a small delay to ensure cart is fully loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Double-check cart after delay
        console.log('Order manager: After delay - Cart items:', cartManager.cart.length);
        
        if (cartManager.cart.length === 0) {
            console.log('Order manager: Cart is empty, checking localStorage as fallback...');
            
            // Check localStorage as fallback
            const localCart = JSON.parse(localStorage.getItem('simpleEcomCart') || '[]');
            console.log('Order manager: localStorage cart:', localCart.length, 'items');
            
            if (localCart.length > 0) {
                console.log('Order manager: Found items in localStorage, forcing cart manager to use local storage');
                cartManager.loadCartFromStorage();
                console.log('Order manager: After loadCartFromStorage, cart items:', cartManager.cart.length);
            } else {
                // If no local cart either, try to force reload from server one more time
                console.log('Order manager: No local cart found, attempting force reload from server...');
                try {
                    if (cartManager.isAuthenticated()) {
                        console.log('Order manager: User is authenticated, forcing server cart reload...');
                        cartManager.useServerCart = true;
                        await cartManager.loadCart();
                        console.log('Order manager: After force server reload, cart items:', cartManager.cart.length);
                    }
                } catch (error) {
                    console.error('Order manager: Force server reload failed:', error);
                }
            }
            
            // Final check
            if (cartManager.cart.length === 0) {
                this.showError('Your cart is empty. Redirecting to home page.');
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 2000);
                return;
            }
        }

        this.displayCheckoutItems();
        this.updateOrderSummary();
        this.initializeEventListeners();
        
        console.log('Order manager: Initialization complete');
    }

    initializeEventListeners() {
        // Shipping options
        const shippingOptions = document.querySelectorAll('input[name="shipping"]');
        shippingOptions.forEach(option => {
            option.addEventListener('change', () => this.updateShippingCost());
        });

        // Payment methods
        const paymentMethods = document.querySelectorAll('input[name="payment"]');
        paymentMethods.forEach(method => {
            method.addEventListener('change', () => this.togglePaymentDetails());
        });

        // Same address checkbox
        const sameAddressCheckbox = document.getElementById('same-address');
        if (sameAddressCheckbox) {
            sameAddressCheckbox.addEventListener('change', () => this.toggleBillingAddress());
        }

        // Form submission - ensure we only add one listener
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            // Remove any existing listeners to prevent duplicates
            const existingListener = checkoutForm.getAttribute('data-order-listener');
            if (!existingListener) {
                checkoutForm.addEventListener('submit', (e) => this.handleFormSubmission(e));
                checkoutForm.setAttribute('data-order-listener', 'true');
                console.log('Order manager: Form submission listener added');
            } else {
                console.log('Order manager: Form submission listener already exists');
            }
        }

        // Card input formatting
        const cardNumberInput = document.getElementById('card-number');
        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', this.formatCardNumber);
        }

        const expiryInput = document.getElementById('expiry');
        if (expiryInput) {
            expiryInput.addEventListener('input', this.formatExpiryDate);
        }

        const cvvInput = document.getElementById('cvv');
        if (cvvInput) {
            cvvInput.addEventListener('input', this.validateCVV);
        }
    }

    displayCheckoutItems() {
        const checkoutItemsContainer = document.getElementById('checkout-items');
        if (!checkoutItemsContainer) return;

        checkoutItemsContainer.innerHTML = '';
        
        if (cartManager.cart.length === 0) {
            checkoutItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            return;
        }
        
        cartManager.cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'checkout-item';
            
            // Handle different possible data structures for cart items
            const itemName = item.title || item.name || item.product?.title || item.product?.name || 'Unknown Product';
            const itemPrice = item.price || item.product?.price || 0;
            const itemQuantity = item.quantity || 1;
            
            // Handle image with fallback
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
            
            itemElement.innerHTML = `
                <div class="item-image">
                    <img src="${itemImage || '../images/dummy-product.jpg'}" alt="${itemName}"
                         onerror="this.src='../images/dummy-product.jpg'">
                </div>
                <div class="item-details">
                    <h4>${itemName}</h4>
                    <p class="item-price">${this.formatPrice(itemPrice)}</p>
                    <p class="item-quantity">Qty: ${itemQuantity}</p>
                </div>
                <div class="item-total">
                    ${this.formatPrice(itemPrice * itemQuantity)}
                </div>
            `;
            checkoutItemsContainer.appendChild(itemElement);
        });
    }

    updateShippingCost() {
        const selectedShipping = document.querySelector('input[name="shipping"]:checked');
        if (!selectedShipping) return;

        const shippingCostElement = document.getElementById('shipping-cost');
        
        switch (selectedShipping.value) {
            case 'standard':
                this.shippingCost = 0;
                if (shippingCostElement) shippingCostElement.textContent = 'FREE';
                break;
            case 'express':
                this.shippingCost = 9.99;
                if (shippingCostElement) shippingCostElement.textContent = '$9.99';
                break;
            case 'overnight':
                this.shippingCost = 19.99;
                if (shippingCostElement) shippingCostElement.textContent = '$19.99';
                break;
            default:
                this.shippingCost = 0;
                if (shippingCostElement) shippingCostElement.textContent = 'FREE';
        }
        
        this.updateOrderSummary();
    }

    togglePaymentDetails() {
        const selectedPayment = document.querySelector('input[name="payment"]:checked');
        if (!selectedPayment) return;

        const cardDetails = document.getElementById('card-details');
        if (!cardDetails) return;

        if (selectedPayment.value === 'card') {
            cardDetails.style.display = 'block';
            this.setRequiredFields(['card-number', 'expiry', 'cvv', 'card-name'], true);
        } else {
            cardDetails.style.display = 'none';
            this.setRequiredFields(['card-number', 'expiry', 'cvv', 'card-name'], false);
        }
    }

    toggleBillingAddress() {
        const sameAddress = document.getElementById('same-address');
        if (!sameAddress) return;

        const billingSection = document.getElementById('billing-address');
        if (!billingSection) return;

        if (sameAddress.checked) {
            billingSection.style.display = 'none';
            this.setRequiredFields(['billing-address-line', 'billing-city', 'billing-state', 'billing-zip'], false);
        } else {
            billingSection.style.display = 'block';
            this.setRequiredFields(['billing-address-line', 'billing-city', 'billing-state', 'billing-zip'], true);
        }
    }

    setRequiredFields(fieldIds, required) {
        fieldIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.required = required;
            }
        });
    }

    formatCardNumber(e) {
        let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        if (formattedValue.length > 19) {
            formattedValue = formattedValue.substr(0, 19);
        }
        e.target.value = formattedValue;
    }

    formatExpiryDate(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
    }

    validateCVV(e) {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
    }

    updateOrderSummary() {
        console.log('Order manager: updateOrderSummary called');
        console.log('Order manager: cartManager.cart length:', cartManager.cart.length);
        console.log('Order manager: cartManager.cart contents:', cartManager.cart);
        
        const subtotal = cartManager.calculateSubtotal();
        console.log('Order manager: calculated subtotal:', subtotal);
        
        const taxAmount = subtotal * this.TAX_RATE;
        const total = subtotal + this.shippingCost + taxAmount;
        
        // Calculate total items with proper quantity handling
        const totalItems = cartManager.cart.reduce((total, item) => {
            const quantity = parseFloat(item.quantity || 1);
            return total + quantity;
        }, 0);
        
        console.log('Order summary calculations:', {
            subtotal,
            taxAmount,
            shippingCost: this.shippingCost,
            total,
            totalItems
        });
        
        this.updateElement('total-items', totalItems);
        this.updateElement('subtotal', this.formatPrice(subtotal));
        this.updateElement('tax-amount', this.formatPrice(taxAmount));
        this.updateElement('shipping-cost', this.shippingCost === 0 ? 'FREE' : this.formatPrice(this.shippingCost));
        this.updateElement('order-total', this.formatPrice(total));
        this.updateElement('cart-count', totalItems);
    }

    async handleFormSubmission(e) {
        e.preventDefault();
        
        // Prevent multiple submissions
        if (this.isProcessingOrder) {
            console.log('Order already being processed, ignoring duplicate submission');
            return;
        }
        
        if (!this.validateForm()) {
            return;
        }

        const submitButton = document.querySelector('.place-order-btn');
        if (submitButton) {
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Processing...';
            submitButton.disabled = true;
            this.isProcessingOrder = true;

            try {
                await this.processOrder();
            } catch (error) {
                console.error('Order processing failed:', error);
                this.showError('Order processing failed. Please try again.');
                submitButton.textContent = originalText;
                submitButton.disabled = false;
                this.isProcessingOrder = false;
            }
        }
    }

    validateForm() {
        if (cartManager.cart.length === 0) {
            this.showError('Your cart is empty!');
            return false;
        }
        
        const form = document.getElementById('checkout-form');
        if (!form || !form.checkValidity()) {
            if (form) form.reportValidity();
            return false;
        }
        
        const selectedPayment = document.querySelector('input[name="payment"]:checked');
        if (selectedPayment && selectedPayment.value === 'card') {
            return this.validateCardDetails();
        }
        
        return true;
    }

    validateCardDetails() {
        const cardNumber = document.getElementById('card-number');
        const expiry = document.getElementById('expiry');
        const cvv = document.getElementById('cvv');

        if (cardNumber) {
            const cardNumberValue = cardNumber.value.replace(/\s/g, '');
            if (cardNumberValue.length < 13 || cardNumberValue.length > 19) {
                this.showError('Please enter a valid card number');
                cardNumber.focus();
                return false;
            }
        }
        
        if (expiry && !/^\d{2}\/\d{2}$/.test(expiry.value)) {
            this.showError('Please enter a valid expiry date (MM/YY)');
            expiry.focus();
            return false;
        }
        
        if (cvv && (cvv.value.length < 3 || cvv.value.length > 4)) {
            this.showError('Please enter a valid CVV');
            cvv.focus();
            return false;
        }
        
        return true;
    }

    async processOrder() {
        const formData = new FormData(document.getElementById('checkout-form'));
        const orderData = Object.fromEntries(formData);
        
        const subtotal = cartManager.calculateSubtotal();
        const taxAmount = subtotal * this.TAX_RATE;
        
        // Get shipping cost from shipping manager if available
        let shippingCost = this.shippingCost;
        if (typeof shippingManager !== 'undefined') {
            const selectedRate = shippingManager.getSelectedRate();
            if (selectedRate) {
                shippingCost = selectedRate.rate;
            }
        }
        
        const total = subtotal + shippingCost + taxAmount;
        
        const orderPayload = {
            customerInfo: orderData,
            items: cartManager.cart.map(item => ({
                id: item.product?._id || item.id,
                name: item.product?.title || item.name,
                price: item.product?.price || item.price,
                quantity: item.quantity,
                image: item.product?.image || item.image
            })),
            summary: {
                subtotal: subtotal,
                shipping: shippingCost,
                tax: taxAmount,
                total: total
            },
            paymentMethod: document.querySelector('input[name="payment"]:checked')?.value || 'card',
            shippingMethod: document.querySelector('input[name="shipping"]:checked')?.value || 'standard'
        };

        try {
            // Create order
            console.log('Creating order with payload:', orderPayload);
            const orderResponse = await api.createOrder(orderPayload);
            console.log('Order created successfully:', orderResponse);
            
            this.currentOrder = orderResponse;
            
            // Process payment if card payment is selected
            const selectedPayment = document.querySelector('input[name="payment"]:checked');
            if (selectedPayment && selectedPayment.value === 'card' && typeof paymentManager !== 'undefined') {
                console.log('Processing card payment...');
                
                try {
                    const amountInCents = Math.round(total * 100); // Convert to cents
                    await paymentManager.processPaymentFromForm(
                        amountInCents,
                        orderResponse._id || orderResponse.id,
                        false, // Don't use payment intent
                        'STRIPE'
                    );
                    
                    console.log('Payment processed successfully');
                } catch (paymentError) {
                    console.error('Payment processing failed:', paymentError);
                    // Order was created but payment failed
                    this.showError('Order created but payment failed. Please contact support with order ID: ' + (orderResponse._id || orderResponse.id));
                    return;
                }
            }
            
            // Create shipping label if shipping manager is available
            if (typeof shippingManager !== 'undefined' && shippingManager.getSelectedRate()) {
                try {
                    console.log('Creating shipping label...');
                    await shippingManager.createShippingLabel(orderResponse._id || orderResponse.id);
                    console.log('Shipping label created successfully');
                } catch (shippingError) {
                    console.error('Failed to create shipping label:', shippingError);
                    // Don't fail the order for shipping label issues
                    console.log('Order successful but shipping label creation failed');
                }
            }
            
            // Clear cart and redirect to success page
            await cartManager.clearCart();
            this.showSuccess('Order placed successfully!');
            
            // Store order details for confirmation page
            localStorage.setItem('lastOrder', JSON.stringify(this.currentOrder));
            
            // Redirect to success/confirmation page
            setTimeout(() => {
                window.location.href = 'order-confirmation.html?orderId=' + (orderResponse._id || orderResponse.id);
            }, 2000);
            
        } catch (error) {
            console.error('Order processing failed:', error);
            throw error;
        }
    }

    generateOrderNumber() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `ORD-${timestamp}-${random}`;
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #28a745;
            color: white;
            padding: 2rem;
            border-radius: 8px;
            z-index: 2000;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        successDiv.innerHTML = `
            <h3>Order Successful!</h3>
            <p>${message}</p>
            <p>Redirecting to home page...</p>
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
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

// Global order manager instance
const orderManager = new OrderManager();
