// Product management and display functionality with advanced filtering
class ProductManager {
    constructor() {
        this.products = [];
        this.categories = [];
        this.currentFilters = {
            page: 1,
            limit: 12
        };
        this.pagination = {
            total: 0,
            pages: 0,
            currentPage: 1
        };
    }

    async initialize() {
        try {
            await this.loadCategories();
            await this.setupFilterSidebar();
            await this.loadProducts();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize products:', error);
            this.showError('Failed to load products. Please try again later.');
        }
    }

    async loadCategories() {
        try {
            this.categories = await api.getCategories();
            this.renderCategoryFilter();
            this.renderCategoryFilters();
        } catch (error) {
            console.error('Failed to load categories:', error);
            // Fallback to default categories
            this.categories = [
                { id: 'all', name: 'All Categories' },
                { id: 'electronics', name: 'Electronics' },
                { id: 'fashion', name: 'Fashion' },
                { id: 'books', name: 'Books' }
            ];
            this.renderCategoryFilter();
            this.renderCategoryFilters();
        }
    }

    async loadProducts(filters = {}) {
        try {
            // Merge filters with current filters
            this.currentFilters = { ...this.currentFilters, ...filters };
            
            // Apply sorting
            const sortOption = document.getElementById('sort-options')?.value;
            if (sortOption) {
                this.applySorting(sortOption);
            }
            
            const response = await api.getProducts(this.currentFilters);
            
            this.products = response.products || [];
            this.pagination = {
                total: response.total || 0,
                pages: response.pages || 1,
                currentPage: response.page || 1
            };
            
            this.renderProducts();
            this.renderPagination();
            this.updateResultsInfo();
        } catch (error) {
            console.error('Failed to load products:', error);
            this.showError('Failed to load products. Please try again later.');
        }
    }

    async searchProducts(query) {
        try {
            const filters = { ...this.currentFilters, search: query, page: 1 };
            if (!query.trim()) {
                delete filters.search;
            }
            await this.loadProducts(filters);
        } catch (error) {
            console.error('Failed to search products:', error);
            this.showError('Search failed. Please try again.');
        }
    }

    async filterByCategory(category) {
        try {
            const filters = { ...this.currentFilters, page: 1 };
            if (category && category !== 'all') {
                filters.category = category;
            } else {
                delete filters.category;
            }
            await this.loadProducts(filters);
        } catch (error) {
            console.error('Failed to filter products:', error);
            this.showError('Filter failed. Please try again.');
        }
    }

    async applyFilters() {
        const filters = { ...this.currentFilters, page: 1 };
        
        // Category filters
        const selectedCategories = Array.from(document.querySelectorAll('#category-filters input:checked'))
            .map(input => input.value);
        
        if (selectedCategories.length > 0 && !selectedCategories.includes('all')) {
            // For now, use the first selected category (backend expects single category)
            filters.category = selectedCategories[0];
        } else {
            delete filters.category;
        }
        
        // Price filters
        const minPrice = document.getElementById('min-price')?.value;
        const maxPrice = document.getElementById('max-price')?.value;
        
        if (minPrice) {
            filters.minPrice = parseFloat(minPrice) * 100; // Convert to cents
        } else {
            delete filters.minPrice;
        }
        
        if (maxPrice) {
            filters.maxPrice = parseFloat(maxPrice) * 100; // Convert to cents
        } else {
            delete filters.maxPrice;
        }
        
        // Availability filters
        const inStock = document.getElementById('in-stock')?.checked;
        const outOfStock = document.getElementById('out-of-stock')?.checked;
        
        if (inStock && !outOfStock) {
            filters.isActive = true;
        } else if (outOfStock && !inStock) {
            filters.isActive = false;
        } else {
            delete filters.isActive;
        }
        
        await this.loadProducts(filters);
    }

    applySorting(sortOption) {
        // Since backend doesn't support sorting in the current API, we'll sort on frontend
        // For production, you should add sorting to the backend API
        if (!this.products || this.products.length === 0) return;
        
        switch (sortOption) {
            case 'price-low':
                this.products.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case 'price-high':
                this.products.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'name-asc':
                this.products.sort((a, b) => {
                    const nameA = (a.title || a.name || '').toLowerCase();
                    const nameB = (b.title || b.name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                break;
            case 'name-desc':
                this.products.sort((a, b) => {
                    const nameA = (a.title || a.name || '').toLowerCase();
                    const nameB = (b.title || b.name || '').toLowerCase();
                    return nameB.localeCompare(nameA);
                });
                break;
            case 'newest':
                this.products.sort((a, b) => {
                    const dateA = new Date(a.createdAt || a.created || 0);
                    const dateB = new Date(b.createdAt || b.created || 0);
                    return dateB - dateA;
                });
                break;
        }
    }

    setupEventListeners() {
        // Filter toggle for mobile
        const toggleBtn = document.getElementById('toggle-filters');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.toggleFilters.bind(this));
        }
        
        // Clear filters
        const clearBtn = document.getElementById('clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', this.clearFilters.bind(this));
        }
        
        // Price filter apply
        const applyPriceBtn = document.getElementById('apply-price-filter');
        if (applyPriceBtn) {
            applyPriceBtn.addEventListener('click', this.applyFilters.bind(this));
        }
        
        // Sort options
        const sortSelect = document.getElementById('sort-options');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.applySorting(sortSelect.value);
                this.renderProducts();
            });
        }
        
        // Category filters (will be set up after rendering)
        // Availability filters (will be set up after rendering)
    }

    setupFilterSidebar() {
        this.setupCategoryFilterListeners();
        this.setupAvailabilityFilterListeners();
    }

    setupCategoryFilterListeners() {
        const categoryFilters = document.getElementById('category-filters');
        if (categoryFilters) {
            categoryFilters.addEventListener('change', this.applyFilters.bind(this));
        }
    }

    setupAvailabilityFilterListeners() {
        const inStockFilter = document.getElementById('in-stock');
        const outOfStockFilter = document.getElementById('out-of-stock');
        
        if (inStockFilter) {
            inStockFilter.addEventListener('change', this.applyFilters.bind(this));
        }
        
        if (outOfStockFilter) {
            outOfStockFilter.addEventListener('change', this.applyFilters.bind(this));
        }
    }

    renderCategoryFilters() {
        const container = document.getElementById('category-filters');
        if (!container) return;
        
        container.innerHTML = '';
        this.categories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            
            label.innerHTML = `
                <input type="checkbox" value="${category.id}" ${category.id === 'all' ? 'checked' : ''}>
                <span>${category.name}</span>
            `;
            
            container.appendChild(label);
        });
    }

    renderProducts() {
        const productList = document.getElementById('product-list');
        if (!productList) return;

        if (this.products.length === 0) {
            productList.innerHTML = '<div class="no-products">No products found</div>';
            return;
        }

        productList.innerHTML = '';
        this.products.forEach(product => {
            const productCard = this.createProductCard(product);
            productList.appendChild(productCard);
        });
    }

    createProductCard(product) {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.onclick = () => navigateToProduct(product._id || product.id);

        const productImage = Array.isArray(product.images) ? product.images[0] : product.image;
        const productTitle = product.title || product.name;
        const productId = product._id || product.id;
        const productPrice = this.formatPrice(product.price);

        productCard.innerHTML = `
            <img src="${productImage}" alt="${productTitle}" 
                 onerror="this.src='../src/images/dummy-product.jpg'">
            <h3>${productTitle}</h3>
            <p class="price">${productPrice}</p>
            <p class="category">${this.capitalizeFirst(product.category || '')}</p>
            <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart('${productId}')">
                Add to Cart
            </button>
        `;

        return productCard;
    }

    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;
        
        const { currentPage, pages } = this.pagination;
        
        if (pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button onclick="productManager.goToPage(${currentPage - 1})" 
                    ${currentPage === 1 ? 'disabled' : ''}>
                ← Previous
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(pages, currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button onclick="productManager.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span>...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button onclick="productManager.goToPage(${i})" 
                        ${i === currentPage ? 'class="active"' : ''}>
                    ${i}
                </button>
            `;
        }
        
        if (endPage < pages) {
            if (endPage < pages - 1) {
                paginationHTML += `<span>...</span>`;
            }
            paginationHTML += `<button onclick="productManager.goToPage(${pages})">${pages}</button>`;
        }
        
        // Next button
        paginationHTML += `
            <button onclick="productManager.goToPage(${currentPage + 1})" 
                    ${currentPage === pages ? 'disabled' : ''}>
                Next →
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
    }

    async goToPage(page) {
        if (page < 1 || page > this.pagination.pages) return;
        
        const filters = { ...this.currentFilters, page };
        await this.loadProducts(filters);
    }

    updateResultsInfo() {
        const resultsInfo = document.getElementById('product-count');
        if (!resultsInfo) return;
        
        const { total, currentPage, pages } = this.pagination;
        const start = (currentPage - 1) * this.currentFilters.limit + 1;
        const end = Math.min(currentPage * this.currentFilters.limit, total);
        
        if (total === 0) {
            resultsInfo.textContent = 'No products found';
        } else {
            resultsInfo.textContent = `Showing ${start}-${end} of ${total} products`;
        }
    }

    toggleFilters() {
        const sidebar = document.querySelector('.filter-sidebar');
        const backdrop = document.getElementById('filter-backdrop');
        
        if (sidebar && backdrop) {
            sidebar.classList.toggle('active');
            backdrop.classList.toggle('active');
        }
    }

    closeFilters() {
        const sidebar = document.querySelector('.filter-sidebar');
        const backdrop = document.getElementById('filter-backdrop');
        
        if (sidebar && backdrop) {
            sidebar.classList.remove('active');
            backdrop.classList.remove('active');
        }
    }

    clearFilters() {
        // Reset form inputs
        document.querySelectorAll('#category-filters input').forEach(input => {
            input.checked = input.value === 'all';
        });
        
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        document.getElementById('in-stock').checked = false;
        document.getElementById('out-of-stock').checked = false;
        document.getElementById('sort-options').value = '';
        
        // Reset filters and reload
        this.currentFilters = { page: 1, limit: 12 };
        this.loadProducts();
    }

    renderCategoryFilter() {
        const categorySelect = document.getElementById('category');
        if (!categorySelect) return;

        categorySelect.innerHTML = '';
        
        // Always add "All Categories" option first
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Categories';
        categorySelect.appendChild(allOption);
        
        // Add other categories (but skip if it's already "all")
        this.categories.forEach(category => {
            if (category.id !== 'all') {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            }
        });
    }

    navigateToProduct(productId) {
        window.location.href = `product-detail.html?id=${productId}`;
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

    capitalizeFirst(str) {
        if (!str) return '';
        
        // Handle arrays (like categories)
        if (Array.isArray(str)) {
            if (str.length === 0) return '';
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
}

// Global functions for navigation and cart
function navigateToProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}

function addToCart(productId) {
    if (typeof cartManager !== 'undefined') {
        cartManager.addToCart(productId);
    }
}

function closeFilters() {
    if (typeof productManager !== 'undefined') {
        productManager.closeFilters();
    }
}

// Product Detail Manager
class ProductDetailManager {
    constructor() {
        this.product = null;
        this.relatedProducts = [];
    }

    async initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (!productId) {
            window.location.href = 'home.html';
            return;
        }

        try {
            await this.loadProduct(productId);
            await this.loadRelatedProducts();
        } catch (error) {
            console.error('Failed to initialize product detail:', error);
            this.showError('Failed to load product details.');
        }
    }

    async loadProduct(productId) {
        try {
            this.product = await api.getProduct(productId);
            this.renderProductDetail();
        } catch (error) {
            console.error('Failed to load product:', error);
            window.location.href = 'home.html';
        }
    }

    async loadRelatedProducts() {
        if (!this.product) return;

        try {
            const response = await api.getProducts({ 
                limit: 10  // Get more products to filter from
            });
            
            // Extract products array from response
            const allProducts = response.products || response || [];
            
            // Filter related products by category, excluding current product
            const productId = this.product._id || this.product.id;
            const currentCategories = Array.isArray(this.product.category) ? this.product.category : [this.product.category];
            
            this.relatedProducts = allProducts
                .filter(p => {
                    // Exclude current product
                    if ((p._id || p.id) === productId) return false;
                    
                    // Get product categories as array
                    const productCategories = Array.isArray(p.category) ? p.category : [p.category];
                    
                    // Check if there's any overlap in categories
                    return currentCategories.some(cat => 
                        productCategories.some(pCat => 
                            cat && pCat && cat.toLowerCase() === pCat.toLowerCase()
                        )
                    );
                })
                .slice(0, 6);
            
            this.renderRelatedProducts();
        } catch (error) {
            console.error('Failed to load related products:', error);
        }
    }

    renderProductDetail() {
        if (!this.product) return;

        // Handle different field names from backend
        const productName = this.product.title || this.product.name || 'Unknown Product';
        const productPrice = parseFloat(this.product.price || 0);
        const productImage = this.product.images || this.product.image || this.product.imageUrl;
        const productDescription = this.product.description || 'No description available';
        const productCategory = this.product.category || 'uncategorized';

        document.title = `${productName} - Simple Ecom`;
        
        // Update product information
        this.updateElement('product-category', this.capitalizeFirst(productCategory));
        this.updateElement('product-name', productName);
        this.updateElement('product-title', productName);
        this.updateElement('product-price-value', this.formatPrice(productPrice));
        this.updateElement('product-description-text', productDescription);

        // Update product image
        const productImageEl = document.getElementById('product-image');
        if (productImageEl) {
            productImageEl.src = productImage;
            productImageEl.alt = productName;
            productImageEl.onerror = function() {
                this.src = '../src/images/dummy-product.jpg';
            };
        }

        // Update original price if exists
        const originalPriceElement = document.querySelector('.original-price');
        if (originalPriceElement) {
            if (this.product.originalPrice && this.product.originalPrice > productPrice) {
                originalPriceElement.textContent = this.formatPrice(this.product.originalPrice);
                originalPriceElement.style.display = 'inline';
            } else {
                originalPriceElement.style.display = 'none';
            }
        }

        // Update stock information
        this.updateElement('product-stock', `Stock: ${this.product.stock || 'N/A'}`);
        this.updateElement('product-sku', `SKU: ${this.product.sku || 'N/A'}`);

        // Update features list (if product has features)
        this.renderFeatures();
        
        // Update specifications
        this.renderSpecifications();

        // Load image gallery if available
        this.loadImageGallery();

        // Handle stock availability
        this.updateAddToCartButton();
    }

    renderFeatures() {
        const featuresList = document.getElementById('product-features-list');
        if (!featuresList) return;

        featuresList.innerHTML = '';
        
        // Since backend doesn't have features, we'll create some based on product data
        const features = [];
        
        if (this.product.sku) {
            features.push(`Product Code: ${this.product.sku}`);
        }
        
        if (this.product.stock > 0) {
            features.push(`${this.product.stock} items available`);
        }
        
        if (this.product.isActive) {
            features.push('Currently available');
        }
        
        // Add any custom features from product.features if they exist
        if (this.product.features && Array.isArray(this.product.features)) {
            features.push(...this.product.features);
        }
        
        if (features.length === 0) {
            features.push('High quality product');
            features.push('Fast shipping available');
            features.push('Customer satisfaction guaranteed');
        }

        features.forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            featuresList.appendChild(li);
        });
    }

    renderSpecifications() {
        // Since backend doesn't have detailed specifications, we'll use available data
        const productName = this.product.title || this.product.name || 'Unknown Product';
        
        this.updateElement('spec-brand', 'Simple Ecom'); // Default brand
        this.updateElement('spec-model', this.product.sku || 'N/A');
        this.updateElement('spec-weight', 'Varies'); // Default since not in backend
        this.updateElement('spec-dimensions', 'See product description');
    }

    updateAddToCartButton() {
        const addToCartBtn = document.getElementById('add-to-cart-detail');
        const buyNowBtn = document.querySelector('.buy-now-btn');
        
        const isAvailable = this.product.isActive && this.product.stock > 0;
        
        if (addToCartBtn) {
            addToCartBtn.disabled = !isAvailable;
            addToCartBtn.textContent = !this.product.isActive ? 'Unavailable' : 
                                      this.product.stock <= 0 ? 'Out of Stock' : 'Add to Cart';
        }
        
        if (buyNowBtn) {
            buyNowBtn.disabled = !isAvailable;
            buyNowBtn.textContent = !this.product.isActive ? 'Unavailable' : 
                                   this.product.stock <= 0 ? 'Out of Stock' : 'Buy Now';
        }
    }

    loadImageGallery() {
        // For backend, images might be a single string or array
        let images = [];
        
        if (this.product.images) {
            if (Array.isArray(this.product.images)) {
                // Filter out empty strings and null/undefined values
                images = this.product.images.filter(img => img && img.trim() !== '');
            } else if (typeof this.product.images === 'string' && this.product.images.trim() !== '') {
                images = [this.product.images];
            }
        }
        
        // Also check for single image property
        if (images.length === 0 && this.product.image && this.product.image.trim() !== '') {
            images = [this.product.image];
        }
        
        // If no valid images, use placeholder
        if (images.length === 0) {
            images = ['../src/images/dummy-product.jpg'];
        }
        
        this.renderImageThumbnails(images);
    }

    renderImageThumbnails(images) {
        const thumbnailContainer = document.querySelector('.image-thumbnails');
        if (!thumbnailContainer) return;

        thumbnailContainer.innerHTML = '';
        
        images.forEach((imageSrc, index) => {
            const thumbnail = document.createElement('img');
            thumbnail.src = imageSrc;
            thumbnail.alt = `Product image ${index + 1}`;
            thumbnail.className = 'thumbnail';
            if (index === 0) thumbnail.classList.add('active');
            
            // Add error handling for broken images
            thumbnail.onerror = function() {
                this.src = '../src/images/dummy-product.jpg';
            };
            
            thumbnail.addEventListener('click', () => {
                const mainImage = document.getElementById('product-image');
                if (mainImage) {
                    mainImage.src = imageSrc;
                }
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumbnail.classList.add('active');
            });
            
            thumbnailContainer.appendChild(thumbnail);
        });
    }

    renderRelatedProducts() {
        const container = document.getElementById('related-products-list');
        if (!container) return;

        container.innerHTML = '';
        
        this.relatedProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'related-product-card';
            
            const productName = product.title || product.name || 'Unknown Product';
            const productPrice = parseFloat(product.price || 0);
            const productImage = product.images || product.image || product.imageUrl;
            const productId = product._id || product.id;
            
            productCard.innerHTML = `
                <img src="${productImage}" alt="${productName}" 
                     onclick="productDetailManager.navigateToProduct('${productId}')"
                     onerror="this.src='../src/images/dummy-product.jpg'">
                <div class="related-product-info">
                    <h4 onclick="productDetailManager.navigateToProduct('${productId}')">${productName}</h4>
                    <p class="related-product-price">${this.formatPrice(productPrice)}</p>
                    <button class="add-to-cart-btn small" onclick="cartManager.addToCart('${productId}')"
                            ${!product.isActive || product.stock <= 0 ? 'disabled' : ''}>
                        ${!product.isActive ? 'Unavailable' : product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                </div>
            `;
            container.appendChild(productCard);
        });
    }

    navigateToProduct(id) {
        window.location.href = `product-detail.html?id=${id}`;
    }

    addToCartWithQuantity() {
        const quantityInput = document.getElementById('quantity');
        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
        
        if (this.product) {
            const productId = this.product._id || this.product.id;
            cartManager.addToCart(productId, quantity);
        }
    }

    changeQuantity(change) {
        const quantityInput = document.getElementById('quantity');
        if (!quantityInput) return;

        let newValue = parseInt(quantityInput.value) + change;
        
        if (newValue < 1) newValue = 1;
        if (newValue > 10) newValue = 10;
        
        quantityInput.value = newValue;
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    capitalizeFirst(str) {
        if (!str) return '';
        
        // Handle arrays (like categories)
        if (Array.isArray(str)) {
            if (str.length === 0) return '';
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

// Global instances
const productManager = new ProductManager();
const productDetailManager = new ProductDetailManager();
