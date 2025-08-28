// Shipping Management Module
class ShippingManager {
    constructor() {
        this.shippingRates = [];
        this.selectedRate = null;
        this.trackingInfo = null;
    }

    // Calculate shipping rates
    async calculateShippingRates(packageInfo, destination) {
        try {
            console.log('Calculating shipping rates...');
            
            const response = await api.calculateShippingRates(packageInfo, destination);
            this.shippingRates = response.rates || [];
            
            console.log('Shipping rates:', this.shippingRates);
            this.displayShippingRates();
            
            return this.shippingRates;
        } catch (error) {
            console.error('Failed to calculate shipping rates:', error);
            this.showShippingError('Failed to calculate shipping rates: ' + error.message);
            throw error;
        }
    }

    // Display shipping rates in the UI
    displayShippingRates() {
        const container = document.getElementById('shipping-rates');
        if (!container) return;

        if (this.shippingRates.length === 0) {
            container.innerHTML = '<p class="no-rates">No shipping options available</p>';
            return;
        }

        const ratesHtml = this.shippingRates.map((rate, index) => `
            <div class="shipping-rate ${index === 0 ? 'selected' : ''}" 
                 data-rate-index="${index}"
                 onclick="shippingManager.selectShippingRate(${index})">
                <div class="rate-header">
                    <div class="carrier-info">
                        <strong>${rate.carrierName}</strong>
                        <span class="service-name">${rate.serviceName}</span>
                    </div>
                    <div class="rate-price">$${rate.rate.toFixed(2)}</div>
                </div>
                <div class="rate-details">
                    <span class="delivery-time">
                        ${rate.estimatedDeliveryDays} business day${rate.estimatedDeliveryDays > 1 ? 's' : ''}
                        ${rate.estimatedDeliveryDate ? ` (by ${new Date(rate.estimatedDeliveryDate).toLocaleDateString()})` : ''}
                    </span>
                </div>
                <input type="radio" name="shipping-rate" value="${index}" ${index === 0 ? 'checked' : ''}>
            </div>
        `).join('');

        container.innerHTML = ratesHtml;

        // Auto-select first rate
        if (this.shippingRates.length > 0) {
            this.selectedRate = this.shippingRates[0];
            this.updateShippingTotal();
        }
    }

    // Select a shipping rate
    selectShippingRate(index) {
        if (index < 0 || index >= this.shippingRates.length) return;

        // Update selected rate
        this.selectedRate = this.shippingRates[index];

        // Update UI
        const rateElements = document.querySelectorAll('.shipping-rate');
        rateElements.forEach((el, i) => {
            el.classList.toggle('selected', i === index);
            const radio = el.querySelector('input[type="radio"]');
            if (radio) radio.checked = i === index;
        });

        this.updateShippingTotal();
        console.log('Selected shipping rate:', this.selectedRate);
    }

    // Update shipping total in order summary
    updateShippingTotal() {
        if (!this.selectedRate) return;

        const shippingElement = document.getElementById('shipping-cost');
        if (shippingElement) {
            shippingElement.textContent = `$${this.selectedRate.rate.toFixed(2)}`;
        }

        // Update total
        this.updateOrderTotal();
    }

    // Update order total including shipping
    updateOrderTotal() {
        const subtotalElement = document.getElementById('subtotal');
        const shippingElement = document.getElementById('shipping-cost');
        const taxElement = document.getElementById('tax');
        const totalElement = document.getElementById('total');

        if (!subtotalElement || !shippingElement || !totalElement) return;

        const subtotal = parseFloat(subtotalElement.textContent.replace('$', '')) || 0;
        const shipping = parseFloat(shippingElement.textContent.replace('$', '')) || 0;
        const tax = parseFloat(taxElement?.textContent.replace('$', '') || '0') || 0;

        const total = subtotal + shipping + tax;
        totalElement.textContent = `$${total.toFixed(2)}`;
    }

    // Get package info from cart
    getPackageInfoFromCart() {
        const cartItems = cartManager.getCartItems();
        
        // Default package info (you might want to get this from product data)
        let totalWeight = 0;
        let maxLength = 0;
        let maxWidth = 0;
        let maxHeight = 0;

        cartItems.forEach(item => {
            // Default weights and dimensions if not provided
            const itemWeight = item.weight || 1; // 1 lb default
            const itemLength = item.dimensions?.length || 12; // 12 inches default
            const itemWidth = item.dimensions?.width || 8;
            const itemHeight = item.dimensions?.height || 2;

            totalWeight += itemWeight * item.quantity;
            maxLength = Math.max(maxLength, itemLength);
            maxWidth = Math.max(maxWidth, itemWidth);
            maxHeight = Math.max(maxHeight, itemHeight * item.quantity);
        });

        return {
            weight: Math.max(totalWeight, 1), // Minimum 1 lb
            dimensions: {
                length: Math.max(maxLength, 12),
                width: Math.max(maxWidth, 8),
                height: Math.max(maxHeight, 2)
            }
        };
    }

    // Get destination from shipping form
    getDestinationFromForm() {
        const form = document.querySelector('.checkout-form') || document;
        
        return {
            country: form.querySelector('#country')?.value || 'US',
            state: form.querySelector('#state')?.value || '',
            city: form.querySelector('#city')?.value || '',
            postalCode: form.querySelector('#zip')?.value || ''
        };
    }

    // Calculate shipping for current cart and destination
    async calculateShippingForOrder() {
        try {
            const packageInfo = this.getPackageInfoFromCart();
            const destination = this.getDestinationFromForm();

            if (!destination.postalCode) {
                this.showShippingError('Please enter a zip code to calculate shipping');
                return;
            }

            return await this.calculateShippingRates(packageInfo, destination);
        } catch (error) {
            console.error('Failed to calculate shipping for order:', error);
            throw error;
        }
    }

    // Create shipping label for order
    async createShippingLabel(orderId, packageInfo = null) {
        try {
            if (!this.selectedRate) {
                throw new Error('No shipping rate selected');
            }

            if (!packageInfo) {
                packageInfo = this.getPackageInfoFromCart();
            }

            console.log('Creating shipping label for order:', orderId);
            
            const response = await api.createShippingLabel(orderId, this.selectedRate, packageInfo);
            
            console.log('Shipping label created:', response);
            return response;
        } catch (error) {
            console.error('Failed to create shipping label:', error);
            this.showShippingError('Failed to create shipping label: ' + error.message);
            throw error;
        }
    }

    // Track shipment
    async trackShipment(trackingNumber) {
        try {
            console.log('Tracking shipment:', trackingNumber);
            
            const response = await api.trackShipment(trackingNumber);
            this.trackingInfo = response;
            
            console.log('Tracking info:', this.trackingInfo);
            this.displayTrackingInfo();
            
            return this.trackingInfo;
        } catch (error) {
            console.error('Failed to track shipment:', error);
            this.showShippingError('Failed to track shipment: ' + error.message);
            throw error;
        }
    }

    // Display tracking information
    displayTrackingInfo() {
        const container = document.getElementById('tracking-info');
        if (!container || !this.trackingInfo) return;

        const tracking = this.trackingInfo;
        
        const trackingHtml = `
            <div class="tracking-header">
                <h3>Tracking: ${tracking.trackingNumber}</h3>
                <span class="tracking-status status-${tracking.status?.toLowerCase().replace(/\s/g, '-')}">${tracking.status}</span>
            </div>
            <div class="tracking-details">
                <p><strong>Carrier:</strong> ${tracking.carrier}</p>
                <p><strong>Service:</strong> ${tracking.service}</p>
                ${tracking.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(tracking.estimatedDelivery).toLocaleDateString()}</p>` : ''}
            </div>
            ${tracking.events && tracking.events.length > 0 ? `
                <div class="tracking-events">
                    <h4>Tracking History</h4>
                    <div class="events-list">
                        ${tracking.events.map(event => `
                            <div class="tracking-event">
                                <div class="event-date">${new Date(event.timestamp).toLocaleString()}</div>
                                <div class="event-description">${event.description}</div>
                                ${event.location ? `<div class="event-location">${event.location}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        container.innerHTML = trackingHtml;
    }

    // Get order shipping info
    async getOrderShipping(orderId) {
        try {
            const response = await api.getOrderShipping(orderId);
            console.log('Order shipping info:', response);
            return response;
        } catch (error) {
            console.error('Failed to get order shipping info:', error);
            throw error;
        }
    }

    // Cancel shipment
    async cancelShipment(shipmentId) {
        try {
            console.log('Cancelling shipment:', shipmentId);
            
            const response = await api.cancelShipment(shipmentId);
            
            console.log('Shipment cancelled:', response);
            return response;
        } catch (error) {
            console.error('Failed to cancel shipment:', error);
            this.showShippingError('Failed to cancel shipment: ' + error.message);
            throw error;
        }
    }

    // Show shipping error
    showShippingError(message) {
        console.error('Shipping Error:', message);
        
        // Find or create error element
        let errorElement = document.getElementById('shipping-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'shipping-error';
            errorElement.className = 'shipping-error error-message';
            
            // Try to insert in shipping section
            const shippingSection = document.getElementById('shipping-section') || 
                                  document.getElementById('shipping-rates') ||
                                  document.querySelector('.shipping-options');
            
            if (shippingSection) {
                shippingSection.parentNode.insertBefore(errorElement, shippingSection);
            } else {
                document.body.appendChild(errorElement);
            }
        }

        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 10000);
    }

    // Get selected shipping rate
    getSelectedRate() {
        return this.selectedRate;
    }

    // Initialize shipping calculation on page load
    initializeShipping() {
        // Auto-calculate shipping when zip code changes
        const zipInput = document.getElementById('zip');
        if (zipInput) {
            zipInput.addEventListener('blur', () => {
                if (zipInput.value.length >= 5) {
                    this.calculateShippingForOrder();
                }
            });
        }

        // Auto-calculate when any address field changes
        const addressFields = ['country', 'state', 'city'];
        addressFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('change', () => {
                    const zipInput = document.getElementById('zip');
                    if (zipInput && zipInput.value.length >= 5) {
                        this.calculateShippingForOrder();
                    }
                });
            }
        });
    }
}

// Create global instance
const shippingManager = new ShippingManager();

// Export for use in other scripts
window.shippingManager = shippingManager;
