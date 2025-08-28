// Admin dashboard functionality
class AdminManager {
    constructor() {
        this.currentTab = 'users';
        this.users = [];
        this.orders = [];
        this.products = [];
        this.editingItem = null;
    }

    async initialize() {
        console.log('Admin: Initializing...');
        
        // Check if user is admin
        if (!authManager.isAuthenticated() || !this.isAdmin()) {
            console.log('Admin: User not authorized, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        // Update admin header with user info
        const user = authManager.getCurrentUser();
        const adminUserInfo = document.getElementById('admin-user-info');
        if (adminUserInfo && user) {
            adminUserInfo.textContent = `Welcome, ${user.name || user.email} (Admin)`;
        }

        this.setupEventListeners();
        await this.loadInitialData();
        console.log('Admin: Initialization complete');
    }

    isAdmin() {
        const user = authManager.getCurrentUser();
        console.log('Admin: Checking admin role for user:', user);
        
        // For debugging - log the user role
        if (user) {
            console.log('Admin: User role:', user.role);
        }
        
        // Temporary: Allow any authenticated user for testing
        // Remove this line once you have proper admin role set
        if (user && !user.role) {
            console.log('Admin: No role set, allowing access for testing. Set user.role = "admin" in database for proper access control.');
            return true;
        }
        
        return user && user.role === 'admin';
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Form submissions
        document.getElementById('user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserFormSubmit();
        });

        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProductFormSubmit();
        });

        // Modal close on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // Load data if needed
        if (tabName === 'users' && this.users.length === 0) {
            this.loadUsers();
        } else if (tabName === 'orders' && this.orders.length === 0) {
            this.loadOrders();
        } else if (tabName === 'products' && this.products.length === 0) {
            this.loadProducts();
        }
    }

    async loadInitialData() {
        // Load users by default
        await this.loadUsers();
    }

    async loadUsers() {
        console.log('Admin: Loading users...');
        this.showLoading('users');

        try {
            const response = await api.request('users', 'GET');
            console.log('Admin: Users response:', response);
            
            // Handle different response formats
            this.users = response.users || response || [];
            console.log('Admin: Loaded users:', this.users);
            
            this.renderUsersTable();
            this.hideLoading('users');
        } catch (error) {
            console.error('Admin: Error loading users:', error);
            this.showError('users', 'Failed to load users: ' + error.message);
        }
    }

    async loadOrders() {
        console.log('Admin: Loading orders...');
        this.showLoading('orders');

        try {
            const response = await api.request('orders', 'GET');
            this.orders = response.orders || response || [];
            this.renderOrdersTable();
            this.hideLoading('orders');
        } catch (error) {
            console.error('Admin: Error loading orders:', error);
            this.showError('orders', 'Failed to load orders: ' + error.message);
        }
    }

    async loadProducts() {
        console.log('Admin: Loading products...');
        this.showLoading('products');

        try {
            const response = await api.request('products', 'GET');
            this.products = response.products || response || [];
            this.renderProductsTable();
            this.hideLoading('products');
        } catch (error) {
            console.error('Admin: Error loading products:', error);
            this.showError('products', 'Failed to load products: ' + error.message);
        }
    }

    renderUsersTable() {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';

        this.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user._id || user.id}</td>
                <td>${user.name || user.firstName + ' ' + user.lastName || 'N/A'}</td>
                <td>${user.email}</td>
                <td>${this.capitalizeFirst(user.role || 'customer')}</td>
                <td>
                    <span class="status-badge ${user.isActive !== false ? 'status-active' : 'status-inactive'}">
                        ${user.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${this.formatDate(user.createdAt || user.created)}</td>
                <td class="actions">
                    <button class="btn-secondary" onclick="adminManager.editUser('${user._id || user.id}')">Edit</button>
                    <button class="btn-danger" onclick="adminManager.deleteUser('${user._id || user.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('users-table-container').style.display = 'block';
    }

    async renderOrdersTable() {
        const tbody = document.getElementById('orders-table-body');
        tbody.innerHTML = '';

        // First render the table with basic info, then load user details
        this.orders.forEach(order => {
            const row = document.createElement('tr');
            const itemCount = order.items ? order.items.length : 0;
            const total = order.total || order.totalAmount || 0;
            
            row.innerHTML = `
                <td>#${order._id ? order._id.slice(-8) : order.id}</td>
                <td id="customer-${order._id || order.id}">Loading...</td>
                <td>${itemCount} items</td>
                <td>${this.formatPrice(total)}</td>
                <td>
                    <span class="status-badge status-${order.status || 'pending'}">
                        ${this.capitalizeFirst(order.status || 'pending')}
                    </span>
                </td>
                <td>${this.formatDate(order.createdAt || order.created)}</td>
                <td class="actions">
                    <button class="btn-secondary" onclick="adminManager.viewOrder('${order._id || order.id}')">View</button>
                    <button class="btn-secondary" onclick="adminManager.updateOrderStatus('${order._id || order.id}')">Update Status</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('orders-table-container').style.display = 'block';

        // Load customer details asynchronously
        this.loadCustomerNamesForOrders();
    }

    async loadCustomerNamesForOrders() {
        for (const order of this.orders) {
            const customerCell = document.getElementById(`customer-${order._id || order.id}`);
            if (!customerCell) continue;

            let customerName = 'N/A';
            
            if (order.user && typeof order.user === 'string') {
                try {
                    const user = await this.getUserDetails(order.user);
                    customerName = user?.name || user?.email || 'N/A';
                } catch (error) {
                    customerName = 'N/A';
                }
            } else if (order.user?.name || order.user?.email) {
                customerName = order.user.name || order.user.email;
            } else {
                customerName = order.customerName || 'N/A';
            }
            
            customerCell.textContent = customerName;
        }
    }

    renderProductsTable() {
        const tbody = document.getElementById('products-table-body');
        tbody.innerHTML = '';

        this.products.forEach(product => {
            const row = document.createElement('tr');
            const imageUrl = Array.isArray(product.images) ? product.images[0] : product.image;
            
            row.innerHTML = `
                <td>${product._id ? product._id.slice(-8) : product.id}</td>
                <td>
                    <img src="${imageUrl || '../basic-ecom-ui/src/images/dummy-product.jpg'}" 
                         alt="${product.title || product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                </td>
                <td>${product.title || product.name}</td>
                <td>${this.formatPrice(product.price)}</td>
                <td>${product.stock || 0}</td>
                <td>${this.formatCategory(product.category)}</td>
                <td>
                    <span class="status-badge ${product.isActive !== false ? 'status-active' : 'status-inactive'}">
                        ${product.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn-secondary" onclick="adminManager.editProduct('${product._id || product.id}')">Edit</button>
                    <button class="btn-danger" onclick="adminManager.deleteProduct('${product._id || product.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        document.getElementById('products-table-container').style.display = 'block';
    }

    // User Management
    showAddUserModal() {
        this.editingItem = null;
        document.getElementById('user-modal-title').textContent = 'Add User';
        document.getElementById('user-form').reset();
        document.getElementById('user-modal').style.display = 'block';
    }

    async editUser(userId) {
        const user = this.users.find(u => (u._id || u.id) === userId);
        if (!user) return;

        this.editingItem = user;
        document.getElementById('user-modal-title').textContent = 'Edit User';
        document.getElementById('user-name').value = user.name || '';
        document.getElementById('user-email').value = user.email || '';
        document.getElementById('user-role').value = user.role || 'customer';
        document.getElementById('user-password').value = '';
        document.getElementById('user-password').required = false;
        document.getElementById('user-modal').style.display = 'block';
    }

    async handleUserFormSubmit() {
        const formData = new FormData(document.getElementById('user-form'));
        const userData = Object.fromEntries(formData);

        try {
            if (this.editingItem) {
                // Update user
                if (!userData.password) {
                    delete userData.password;
                }
                await api.request(`users/${this.editingItem._id || this.editingItem.id}`, 'PUT', userData);
                this.showNotification('User updated successfully');
            } else {
                // Create user
                await api.request('users', 'POST', userData);
                this.showNotification('User created successfully');
            }

            this.closeModal('user-modal');
            await this.loadUsers(); // Now we can reload the users list
        } catch (error) {
            console.error('Admin: Error saving user:', error);
            this.showNotification('Error saving user: ' + error.message, 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            await api.request(`users/${userId}`, 'DELETE');
            this.showNotification('User deleted successfully');
            await this.loadUsers();
        } catch (error) {
            console.error('Admin: Error deleting user:', error);
            this.showNotification('Error deleting user: ' + error.message, 'error');
        }
    }

    // Product Management
    showAddProductModal() {
        this.editingItem = null;
        document.getElementById('product-modal-title').textContent = 'Add Product';
        document.getElementById('product-form').reset();
        document.getElementById('product-modal').style.display = 'block';
    }

    async editProduct(productId) {
        const product = this.products.find(p => (p._id || p.id) === productId);
        if (!product) return;

        this.editingItem = product;
        document.getElementById('product-modal-title').textContent = 'Edit Product';
        document.getElementById('product-title').value = product.title || product.name || '';
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = parseFloat(product.price).toFixed(2);
        document.getElementById('product-stock').value = product.stock || 0;
        document.getElementById('product-sku').value = product.sku || '';
        
        // Handle category array for form display
        const categoryValue = Array.isArray(product.category) ? 
            product.category.join(', ') : 
            (product.category || '');
        document.getElementById('product-category').value = categoryValue;
        
        const images = Array.isArray(product.images) ? product.images.join(', ') : (product.image || '');
        document.getElementById('product-images').value = images;
        
        document.getElementById('product-modal').style.display = 'block';
    }

    async handleProductFormSubmit() {
        const formData = new FormData(document.getElementById('product-form'));
        const productData = Object.fromEntries(formData);

        // Handle price - keep as decimal value
        productData.price = parseFloat(productData.price);
        productData.stock = parseInt(productData.stock);

        // Handle category - convert comma-separated string to array
        if (productData.category) {
            productData.category = productData.category.split(',').map(cat => cat.trim()).filter(cat => cat);
        } else {
            productData.category = [];
        }

        // Handle images
        if (productData.images) {
            productData.images = productData.images.split(',').map(url => url.trim()).filter(url => url);
        } else {
            productData.images = [];
        }

        try {
            if (this.editingItem) {
                // Update product
                await api.request(`products/${this.editingItem._id || this.editingItem.id}`, 'PUT', productData);
                this.showNotification('Product updated successfully');
            } else {
                // Create product
                await api.request('products', 'POST', productData);
                this.showNotification('Product created successfully');
            }

            this.closeModal('product-modal');
            await this.loadProducts();
        } catch (error) {
            console.error('Admin: Error saving product:', error);
            this.showNotification('Error saving product: ' + error.message, 'error');
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            await api.request(`products/${productId}`, 'DELETE');
            this.showNotification('Product deleted successfully');
            await this.loadProducts();
        } catch (error) {
            console.error('Admin: Error deleting product:', error);
            this.showNotification('Error deleting product: ' + error.message, 'error');
        }
    }

    // Order Management
    async getUserDetails(userId) {
        try {
            if (!userId) return null;
            
            // Check if we already have this user in our users array
            const cachedUser = this.users.find(u => (u._id || u.id) === userId);
            if (cachedUser) {
                return cachedUser;
            }
            
            // Fetch user details from API
            const response = await api.request(`users/${userId}`, 'GET');
            return response.user || response;
        } catch (error) {
            console.error('Admin: Error fetching user details:', error);
            return null;
        }
    }

    async viewOrder(orderId) {
        const order = this.orders.find(o => (o._id || o.id) === orderId);
        if (!order) return;

        const content = document.getElementById('order-details-content');
        const total = order.total || order.totalAmount || 0;
        
        // Fetch customer details
        let customerName = 'N/A';
        let customerEmail = 'N/A';
        
        if (order.user && typeof order.user === 'string') {
            try {
                const user = await this.getUserDetails(order.user);
                if (user) {
                    customerName = user.name || user.firstName + ' ' + user.lastName || 'N/A';
                    customerEmail = user.email || 'N/A';
                }
            } catch (error) {
                console.error('Error fetching user details:', error);
            }
        } else if (order.user?.name || order.user?.email) {
            customerName = order.user.name || 'N/A';
            customerEmail = order.user.email || 'N/A';
        } else {
            customerName = order.customerName || 'N/A';
            customerEmail = order.customerEmail || 'N/A';
        }
        
        content.innerHTML = `
            <div class="order-info">
                <h4>Order #${order._id ? order._id.slice(-8) : order.id}</h4>
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${customerEmail}</p>
                <p><strong>Status:</strong> ${this.capitalizeFirst(order.status || 'pending')}</p>
                <p><strong>Total:</strong> ${this.formatPrice(total)}</p>
                <p><strong>Date:</strong> ${this.formatDate(order.createdAt || order.created)}</p>
                
                <h5>Items:</h5>
                <div class="order-items">
                    ${order.items ? order.items.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                            <span>${item.product?.title || item.title || item.name || 'Product'}</span>
                            <span>Qty: ${item.quantity} x ${this.formatPrice(item.price || 0)}</span>
                        </div>
                    `).join('') : 'No items found'}
                </div>
                
                <div style="margin-top: 1rem;">
                    <label for="order-status-select"><strong>Update Status:</strong></label>
                    <select id="order-status-select" style="margin-left: 0.5rem; padding: 0.25rem;">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Paid</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="canceled" ${order.status === 'canceled' ? 'selected' : ''}>Canceled</option>
                    </select>
                    <button class="btn-primary" onclick="adminManager.updateOrderStatusFromModal('${order._id || order.id}')" style="margin-left: 0.5rem;">Update</button>
                </div>
            </div>
        `;

        document.getElementById('order-modal').style.display = 'block';
    }

    async updateOrderStatusFromModal(orderId) {
        const newStatus = document.getElementById('order-status-select').value;
        await this.updateOrderStatus(orderId, newStatus);
        this.closeModal('order-modal');
    }

    async updateOrderStatus(orderId, newStatus = null) {
        try {
            if (!newStatus) {
                newStatus = prompt('Enter new status (pending, paid, shipped, completed, canceled):');
                if (!newStatus) return;
            }

            await api.request(`orders/${orderId}`, 'PUT', { status: newStatus });
            this.showNotification('Order status updated successfully');
            await this.loadOrders();
        } catch (error) {
            console.error('Admin: Error updating order status:', error);
            this.showNotification('Error updating order status: ' + error.message, 'error');
        }
    }

    // Utility methods
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        this.editingItem = null;
        
        // Reset password field requirement when closing user modal
        if (modalId === 'user-modal') {
            document.getElementById('user-password').required = true;
        }
    }

    showLoading(section) {
        document.getElementById(`${section}-loading`).style.display = 'block';
        document.getElementById(`${section}-error`).style.display = 'none';
        document.getElementById(`${section}-table-container`).style.display = 'none';
    }

    hideLoading(section) {
        document.getElementById(`${section}-loading`).style.display = 'none';
    }

    showError(section, message) {
        document.getElementById(`${section}-loading`).style.display = 'none';
        const errorEl = document.getElementById(`${section}-error`);
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    }

    formatCategory(category) {
        if (!category) return 'N/A';
        
        // Handle arrays
        if (Array.isArray(category)) {
            if (category.length === 0) return 'N/A';
            return category.map(cat => 
                cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : ''
            ).join(', ');
        }
        
        // Handle strings
        return category.charAt(0).toUpperCase() + category.slice(1);
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

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 4px;
            color: white;
            z-index: 2000;
            max-width: 300px;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Global admin manager instance
const adminManager = new AdminManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin: DOMContentLoaded fired');
    
    // Initialize auth manager first
    if (typeof authManager !== 'undefined') {
        const isAuthenticated = authManager.initialize();
        
        if (!isAuthenticated) {
            console.log('Admin: User not authenticated, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('Admin: User authenticated, initializing AdminManager');
        await adminManager.initialize();
    } else {
        console.error('Admin: Auth manager not available');
        window.location.href = 'login.html';
    }
});
