// Payment Management Module
class PaymentManager {
    constructor() {
        this.currentPaymentIntent = null;
        this.paymentForm = null;
        this.isProcessing = false;
    }

    // Initialize payment form
    initializePaymentForm(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.paymentForm = {
            container,
            cardNumber: container.querySelector('#card-number'),
            expiryMonth: container.querySelector('#expiry-month'),
            expiryYear: container.querySelector('#expiry-year'),
            cvc: container.querySelector('#cvc'),
            email: container.querySelector('#billing-email'),
            submitButton: container.querySelector('#submit-payment')
        };

        // Add form validation
        this.setupFormValidation();
    }

    // Setup form validation
    setupFormValidation() {
        if (!this.paymentForm) return;

        const { cardNumber, expiryMonth, expiryYear, cvc } = this.paymentForm;

        // Format card number (add spaces every 4 digits)
        if (cardNumber) {
            cardNumber.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
                let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = formattedValue;
            });
        }

        // Validate expiry month
        if (expiryMonth) {
            expiryMonth.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                if (value < 1 || value > 12) {
                    e.target.setCustomValidity('Month must be between 1 and 12');
                } else {
                    e.target.setCustomValidity('');
                }
            });
        }

        // Validate expiry year
        if (expiryYear) {
            expiryYear.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                let currentYear = new Date().getFullYear();
                if (value < currentYear) {
                    e.target.setCustomValidity('Year cannot be in the past');
                } else {
                    e.target.setCustomValidity('');
                }
            });
        }

        // Validate CVC
        if (cvc) {
            cvc.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/gi, '');
            });
        }
    }

    // Create payment intent
    async createPaymentIntent(amount, currency = 'usd', orderId, metadata = {}) {
        try {
            this.showPaymentStatus('Creating payment intent...', 'processing');
            
            const response = await api.createPaymentIntent(amount, currency, orderId, metadata);
            this.currentPaymentIntent = response;
            
            this.showPaymentStatus('Payment intent created successfully', 'success');
            return response;
        } catch (error) {
            console.error('Failed to create payment intent:', error);
            this.showPaymentStatus('Failed to create payment intent: ' + error.message, 'error');
            throw error;
        }
    }

    // Process payment using payment intent
    async processPaymentWithIntent(paymentIntentId, paymentMethodData, processor = 'STRIPE') {
        try {
            this.isProcessing = true;
            this.showPaymentStatus('Processing payment...', 'processing');
            
            const response = await api.confirmPaymentIntent(paymentIntentId, paymentMethodData, processor);
            
            this.showPaymentStatus('Payment processed successfully!', 'success');
            this.isProcessing = false;
            
            return response;
        } catch (error) {
            console.error('Payment processing failed:', error);
            this.showPaymentStatus('Payment failed: ' + error.message, 'error');
            this.isProcessing = false;
            throw error;
        }
    }

    // Process payment directly (without intent)
    async processPaymentDirect(amount, orderId, paymentMethodData, processor = 'STRIPE') {
        try {
            this.isProcessing = true;
            this.showPaymentStatus('Processing payment...', 'processing');
            
            const response = await api.processPayment(amount, orderId, paymentMethodData, processor);
            
            this.showPaymentStatus('Payment processed successfully!', 'success');
            this.isProcessing = false;
            
            return response;
        } catch (error) {
            console.error('Payment processing failed:', error);
            this.showPaymentStatus('Payment failed: ' + error.message, 'error');
            this.isProcessing = false;
            throw error;
        }
    }

    // Get payment method data from form
    getPaymentMethodData() {
        if (!this.paymentForm) {
            throw new Error('Payment form not initialized');
        }

        const { cardNumber, expiryMonth, expiryYear, cvc, email } = this.paymentForm;

        // Remove spaces from card number
        const cleanCardNumber = cardNumber.value.replace(/\s/g, '');

        return {
            type: 'card',
            card: {
                number: cleanCardNumber,
                exp_month: parseInt(expiryMonth.value),
                exp_year: parseInt(expiryYear.value),
                cvc: cvc.value
            },
            billing_details: {
                email: email ? email.value : ''
            }
        };
    }

    // Validate payment form
    validatePaymentForm() {
        if (!this.paymentForm) return false;

        const { cardNumber, expiryMonth, expiryYear, cvc } = this.paymentForm;
        
        // Check if all required fields are filled
        const requiredFields = [cardNumber, expiryMonth, expiryYear, cvc];
        for (const field of requiredFields) {
            if (!field || !field.value.trim()) {
                this.showPaymentStatus('Please fill in all payment details', 'error');
                return false;
            }
        }

        // Validate card number (basic check)
        const cleanCardNumber = cardNumber.value.replace(/\s/g, '');
        if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
            this.showPaymentStatus('Please enter a valid card number', 'error');
            return false;
        }

        // Validate expiry
        const month = parseInt(expiryMonth.value);
        const year = parseInt(expiryYear.value);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        if (year < currentYear || (year === currentYear && month < currentMonth)) {
            this.showPaymentStatus('Card has expired', 'error');
            return false;
        }

        // Validate CVC
        if (cvc.value.length < 3 || cvc.value.length > 4) {
            this.showPaymentStatus('Please enter a valid CVC', 'error');
            return false;
        }

        return true;
    }

    // Process payment from form
    async processPaymentFromForm(amount, orderId, useIntent = false, processor = 'STRIPE') {
        if (this.isProcessing) {
            this.showPaymentStatus('Payment is already being processed...', 'warning');
            return;
        }

        if (!this.validatePaymentForm()) {
            return;
        }

        try {
            const paymentMethodData = this.getPaymentMethodData();

            let result;
            if (useIntent && this.currentPaymentIntent) {
                result = await this.processPaymentWithIntent(
                    this.currentPaymentIntent.paymentIntentId,
                    paymentMethodData,
                    processor
                );
            } else {
                result = await this.processPaymentDirect(
                    amount,
                    orderId,
                    paymentMethodData,
                    processor
                );
            }

            // Clear form on success
            this.clearPaymentForm();
            
            return result;
        } catch (error) {
            console.error('Payment processing error:', error);
            throw error;
        }
    }

    // Clear payment form
    clearPaymentForm() {
        if (!this.paymentForm) return;

        const { cardNumber, expiryMonth, expiryYear, cvc, email } = this.paymentForm;
        
        if (cardNumber) cardNumber.value = '';
        if (expiryMonth) expiryMonth.value = '';
        if (expiryYear) expiryYear.value = '';
        if (cvc) cvc.value = '';
        if (email) email.value = '';
    }

    // Show payment status
    showPaymentStatus(message, type = 'info') {
        console.log(`Payment Status (${type}):`, message);
        
        // Find or create status element
        let statusElement = document.getElementById('payment-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'payment-status';
            statusElement.className = 'payment-status';
            
            // Try to insert after payment form
            const paymentContainer = this.paymentForm?.container;
            if (paymentContainer) {
                paymentContainer.parentNode.insertBefore(statusElement, paymentContainer.nextSibling);
            } else {
                document.body.appendChild(statusElement);
            }
        }

        statusElement.textContent = message;
        statusElement.className = `payment-status payment-status-${type}`;
        
        // Auto-hide success/info messages after 5 seconds
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (statusElement.textContent === message) {
                    statusElement.textContent = '';
                    statusElement.className = 'payment-status';
                }
            }, 5000);
        }
    }

    // Get payment history
    async getPaymentHistory() {
        try {
            return await api.getPaymentHistory();
        } catch (error) {
            console.error('Failed to fetch payment history:', error);
            this.showPaymentStatus('Failed to load payment history', 'error');
            throw error;
        }
    }

    // Refund payment
    async refundPayment(transactionId, amount = 0, reason = '') {
        try {
            this.showPaymentStatus('Processing refund...', 'processing');
            
            const response = await api.refundPayment(transactionId, amount, reason);
            
            this.showPaymentStatus('Refund processed successfully', 'success');
            return response;
        } catch (error) {
            console.error('Refund failed:', error);
            this.showPaymentStatus('Refund failed: ' + error.message, 'error');
            throw error;
        }
    }

    // Get transaction details
    async getTransaction(transactionId) {
        try {
            return await api.getTransaction(transactionId);
        } catch (error) {
            console.error('Failed to fetch transaction:', error);
            throw error;
        }
    }
}

// Create global instance
const paymentManager = new PaymentManager();

// Export for use in other scripts
window.paymentManager = paymentManager;
