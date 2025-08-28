// API Configuration and Helper Functions
class ApiClient {
    constructor() {
        // Configure your backend API base URL here
        // You can override at runtime by setting window.API_BASE_URL
        this.baseURL = (typeof window !== 'undefined' && window.API_BASE_URL)
            ? window.API_BASE_URL
            : 'https://basic-ecom-backend-kncy.onrender.com/api';
        this.headers = {
            'Content-Type': 'application/json',
        };
    }

    // Set authentication token
    setAuthToken(token) {
        if (token) {
            this.headers['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.headers['Authorization'];
        }
    }

    // Generic request method - used by admin
    async request(endpoint, method = 'GET', data = null) {
        console.log('🚀 DEBUG: New API request code is active!');
        
        // Ensure endpoint starts with a slash
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseURL}${cleanEndpoint}`;
        
        const config = {
            method: method,
            headers: this.headers
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        console.log('Making API request:', {
            url,
            method: config.method,
            headers: this.headers,
            body: config.body
        });

        try {
            const response = await fetch(url, config);
            
            console.log('API response status:', response.status);
            console.log('API response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            // Handle responses with no content (204 No Content)
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                console.log('API response: No content (204)');
                return null;
            }
            
            const data = await response.json();
            console.log('API response data:', data);
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            console.error('Failed URL:', url);
            console.error('Failed config:', config);
            throw error;
        }
    }

    // Internal fetch wrapper for other methods
    async _request(endpoint, options = {}) {
        console.log('🚀 DEBUG: New API request code is active!');
        
        // Ensure endpoint starts with a slash
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseURL}${cleanEndpoint}`;
        
        const config = {
            headers: this.headers,
            ...options,
        };

        console.log('Making API request:', {
            url,
            method: config.method || 'GET',
            headers: this.headers,
            body: config.body
        });

        try {
            const response = await fetch(url, config);
            
            console.log('API response status:', response.status);
            console.log('API response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            // Handle responses with no content (204 No Content)
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                console.log('API response: No content (204)');
                return null;
            }
            
            const data = await response.json();
            console.log('API response data:', data);
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            console.error('Failed URL:', url);
            console.error('Failed config:', config);
            throw error;
        }
    }

    // GET request
    async get(endpoint) {
        return this._request(endpoint, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data) {
        return this._request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // PUT request
    async put(endpoint, data) {
        return this._request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this._request(endpoint, { method: 'DELETE' });
    }

    // Products API methods
    async getProducts(filters = {}) {
        try {
            // Build query parameters from filters
            const queryParams = new URLSearchParams();
            
            if (filters.category && filters.category !== 'all') {
                queryParams.append('category', filters.category);
            }
            
            if (filters.minPrice) {
                queryParams.append('minPrice', filters.minPrice);
            }
            
            if (filters.maxPrice) {
                queryParams.append('maxPrice', filters.maxPrice);
            }
            
            if (filters.isActive !== undefined) {
                queryParams.append('isActive', filters.isActive);
            }
            
            if (filters.search) {
                queryParams.append('search', filters.search);
            }
            
            if (filters.page) {
                queryParams.append('page', filters.page);
            }
            
            if (filters.limit) {
                queryParams.append('limit', filters.limit);
            }
            
            const queryString = queryParams.toString();
            const endpoint = queryString ? `products?${queryString}` : 'products';
            
            const response = await this._request(endpoint, { method: 'GET' });
            
            // Handle different response formats - extract products array if wrapped
            if (response.products && Array.isArray(response.products)) {
                return response; // Return full response with pagination info
            } else if (Array.isArray(response)) {
                return { products: response, total: response.length, page: 1, pages: 1 };
            } else {
                return { products: [], total: 0, page: 1, pages: 1 };
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
            throw error;
        }
    }

    async getProduct(id) {
        return this.get(`/products/${id}`);
    }

    async createProduct(productData) {
        return this.post('/products', productData);
    }

    async updateProduct(id, productData) {
        return this.put(`/products/${id}`, productData);
    }

    async deleteProduct(id) {
        return this.delete(`/products/${id}`);
    }

    async searchProducts(query, filters = {}) {
        // For now, we'll filter on the frontend since backend doesn't have search endpoint
        const products = await this.getProducts(filters);
        if (!query) return products;
        
        return products.filter(product => 
            product.title?.toLowerCase().includes(query.toLowerCase()) ||
            product.description?.toLowerCase().includes(query.toLowerCase())
        );
    }

    async getCategories() {
        // Since backend doesn't have categories endpoint, we'll extract from products
        try {
            const response = await this.getProducts();
            const products = response.products || [];
            
            // Flatten category arrays and collect unique categories
            const allCategories = [];
            products.forEach(product => {
                if (product.category) {
                    if (Array.isArray(product.category)) {
                        allCategories.push(...product.category);
                    } else {
                        allCategories.push(product.category);
                    }
                }
            });
            
            const uniqueCategories = [...new Set(allCategories.filter(Boolean))];
            const categoryList = uniqueCategories.map(cat => ({ id: cat, name: cat }));
            
            // Always include "All Categories" option first
            return [
                { id: 'all', name: 'All Categories' },
                ...categoryList
            ];
        } catch (error) {
            // Fallback categories
            return [
                { id: 'all', name: 'All Categories' },
                { id: 'electronics', name: 'Electronics' },
                { id: 'fashion', name: 'Fashion' },
                { id: 'books', name: 'Books' }
            ];
        }
    }

    // Authentication endpoints
    async login(credentials) {
        return this._request('/users/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async register(userData) {
        return this._request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Cart endpoints
    async getCart() {
        // Your backend should find cart by authenticated user
        return this._request('/cart');
    }

    async addToCart(productId, quantity = 1) {
        // Your backend expects: { "product": { "_id": "..." }, "quantity": 1 }
        return this._request('/cart', {
            method: 'POST',
            body: JSON.stringify({ 
                product: { _id: productId }, 
                quantity 
            })
        });
    }

    async updateCartItem(productId, quantity) {
        // Your backend uses PUT /cart/:productId with { "quantity": 2 }
        return this._request(`/cart/${productId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity })
        });
    }

    async removeFromCart(productId) {
        // Your backend uses DELETE /cart/:productId
        return this._request(`/cart/${productId}`, {
            method: 'DELETE'
        });
    }

    async clearCart() {
        return this._request('/cart', {
            method: 'DELETE'
        });
    }

    // Order API methods
    async createOrder(orderData) {
        // Transform frontend order data to backend format
        const backendOrderData = {
            shippingAddress: {
                fullName: `${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`,
                line1: orderData.customerInfo.address,
                line2: orderData.customerInfo.addressLine2 || '',
                city: orderData.customerInfo.city,
                state: orderData.customerInfo.state,
                postalCode: orderData.customerInfo.zip,
                country: orderData.customerInfo.country || 'US',
                phone: orderData.customerInfo.phone
            },
            billingAddress: orderData.customerInfo.sameAddress ? null : {
                fullName: `${orderData.customerInfo.billingFirstName || orderData.customerInfo.firstName} ${orderData.customerInfo.billingLastName || orderData.customerInfo.lastName}`,
                line1: orderData.customerInfo.billingAddress || orderData.customerInfo.address,
                line2: orderData.customerInfo.billingAddressLine2 || orderData.customerInfo.addressLine2 || '',
                city: orderData.customerInfo.billingCity || orderData.customerInfo.city,
                state: orderData.customerInfo.billingState || orderData.customerInfo.state,
                postalCode: orderData.customerInfo.billingZip || orderData.customerInfo.zip,
                country: orderData.customerInfo.billingCountry || orderData.customerInfo.country || 'US',
                phone: orderData.customerInfo.billingPhone || orderData.customerInfo.phone
            },
            paymentMethod: orderData.paymentMethod === 'card' ? 'pos' : orderData.paymentMethod
        };

        // Use shipping address as billing if same-address is checked
        if (orderData.customerInfo.sameAddress) {
            backendOrderData.billingAddress = backendOrderData.shippingAddress;
        }

        return this.post('/orders', backendOrderData);
    }

    async getOrders() {
        return this.get('/orders');
    }

    async getMyOrders() {
        return this.get('/orders/myOrders');
    }

    async getOrder(orderId) {
        return this.get(`/orders/${orderId}`);
    }

    async updateOrderStatus(orderId, status) {
        return this.put(`/orders/${orderId}`, { status });
    }

    // Payment API methods
    async createPaymentIntent(amount, currency, orderId, metadata = {}) {
        return this.post('/payments/intents', {
            amount,
            currency,
            orderId,
            metadata
        });
    }

    async confirmPaymentIntent(paymentIntentId, paymentMethodData, processor = 'STRIPE') {
        return this.post(`/payments/intents/${paymentIntentId}/confirm`, {
            paymentIntentId,
            paymentMethodData,
            processor
        });
    }

    async getPaymentIntent(paymentIntentId) {
        return this.get(`/payments/intents/${paymentIntentId}`);
    }

    async processPayment(amount, orderId, paymentMethodData, processor = 'STRIPE') {
        return this.post('/payments/process', {
            amount,
            orderId,
            processor,
            paymentMethodData
        });
    }

    async refundPayment(transactionId, amount = 0, reason = '') {
        return this.post('/payments/refund', {
            transactionId,
            amount,
            reason
        });
    }

    async getTransaction(transactionId) {
        return this.get(`/payments/${transactionId}`);
    }

    async getPaymentHistory() {
        return this.get('/payments/history');
    }

    // Shipping API methods
    async calculateShippingRates(packageInfo, destination) {
        return this.post('/shipping/rates', {
            packageInfo,
            destination
        });
    }

    async createShippingLabel(orderId, selectedRate, packageInfo) {
        return this.post('/shipping/labels', {
            orderId,
            selectedRate,
            packageInfo
        });
    }

    async trackShipment(trackingNumber) {
        return this.get(`/shipping/track/${trackingNumber}`);
    }

    async getOrderShipping(orderId) {
        return this.get(`/shipping/orders/${orderId}`);
    }

    async cancelShipment(shipmentId) {
        return this.delete(`/shipping/shipments/${shipmentId}`);
    }

    // User/Admin API methods
    async getUser(userId) {
        return this.get(`/users/${userId}`);
    }

    async updateUser(userId, userData) {
        return this.put(`/users/${userId}`, userData);
    }

    async deleteUser(userId) {
        return this.delete(`/users/${userId}`);
    }

    async getAllUsers() {
        // Note: This endpoint may not be implemented in the backend
        // Backend developer should add GET /api/users with admin authorization
        return this.get('/users');
    }
}

// Create a singleton instance
const api = new ApiClient();

// Export for use in other scripts
window.api = api;
