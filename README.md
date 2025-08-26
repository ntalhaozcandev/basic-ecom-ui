# E-commerce Frontend - Backend Integration Guide

This frontend has been reorganized to work with a backend API. The scripts are now modular and can easily integrate with your backend services.

## 📁 New File Structure

```
src/scripts/
├── api.js              # API client and configuration
├── products.js         # Product management and display
├── cart-manager.js     # Cart functionality 
├── order-manager.js    # Checkout and order processing
├── script.js           # Main application controller
├── cart.js             # Cart page specific functionality
├── product-detail.js   # Product detail page functionality
└── checkout.js         # Checkout page functionality
```

## 🔧 Configuration

### 1. Update API Base URL

In `src/scripts/api.js`, update the base URL to match your backend:

```javascript
constructor() {
    this.baseURL = 'http://localhost:3000/api'; // Update this to your backend URL
}
```

### 2. Authentication (Optional)

If your API requires authentication, you can set the token:

```javascript
// After user login
api.setAuthToken('your-jwt-token-here');
```

### 3. Enable Server-Side Cart (Optional)

In `src/scripts/cart-manager.js`, set `useServerCart` to `true` if you want server-side cart management:

```javascript
constructor() {
    this.useServerCart = true; // Set to true for server-side cart
}
```

## 🌐 Required API Endpoints

Your backend should implement these endpoints:

### Products
- `GET /api/products` - Get all products (supports query parameters for filtering)
- `GET /api/products/{id}` - Get product by ID
- `GET /api/products/search?q={query}&category={category}` - Search products
- `GET /api/categories` - Get all categories

### Cart (Optional - if using server-side cart)
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/items/{productId}` - Update cart item quantity
- `DELETE /api/cart/items/{productId}` - Remove item from cart
- `DELETE /api/cart` - Clear cart

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/{id}` - Get specific order

### Authentication (Optional)
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

## 📊 API Data Formats

### Product Object
```javascript
{
    id: 1,
    name: "Product Name",
    price: 29.99,
    originalPrice: 39.99, // optional
    category: "electronics",
    image: "https://example.com/image.jpg",
    imageUrl: "https://example.com/image.jpg", // alternative field name
    images: ["image1.jpg", "image2.jpg"], // for product gallery
    description: "Product description",
    features: ["Feature 1", "Feature 2"],
    specifications: {
        brand: "Brand Name",
        model: "Model",
        weight: "250g",
        dimensions: "10x5x2 cm"
    }
}
```

### Category Object
```javascript
{
    id: "electronics",
    name: "Electronics"
}
```

### Order Object
```javascript
{
    customerInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        // ... other form fields
    },
    items: [
        {
            id: 1,
            name: "Product Name",
            price: 29.99,
            quantity: 2,
            image: "image.jpg"
        }
    ],
    summary: {
        subtotal: 59.98,
        shipping: 9.99,
        tax: 4.80,
        total: 74.77
    },
    paymentMethod: "card",
    shippingMethod: "standard"
}
```

## 🔄 Fallback Behavior

The frontend includes fallback mechanisms:

1. **No Backend**: If API calls fail, the frontend will continue to work with localStorage
2. **Local Cart**: Cart data is stored locally by default, with optional server-side sync
3. **Error Handling**: User-friendly error messages for failed API calls

## 🚀 How to Include Scripts in HTML

Add these scripts to your HTML pages **in this order**:

```html
<!-- Core scripts (required on all pages) -->
<script src="scripts/api.js"></script>
<script src="scripts/cart-manager.js"></script>
<script src="scripts/script.js"></script>

<!-- Page-specific scripts -->
<!-- For home page -->
<script src="scripts/products.js"></script>

<!-- For product detail page -->
<script src="scripts/products.js"></script>
<script src="scripts/product-detail.js"></script>

<!-- For cart page -->
<script src="scripts/cart.js"></script>

<!-- For checkout page -->
<script src="scripts/order-manager.js"></script>
<script src="scripts/checkout.js"></script>
```

## 🛠️ Customization

### Adding New API Endpoints

Add new methods to the `ApiClient` class in `api.js`:

```javascript
async getRecommendations(productId) {
    return this.get(`/products/${productId}/recommendations`);
}
```

### Custom Error Handling

Override error handling in any manager:

```javascript
showError(message) {
    // Your custom error display logic
    console.error(message);
    // Show toast notification, modal, etc.
}
```

### Adding New Features

Each manager class can be extended with new methods. For example, in `ProductManager`:

```javascript
async getProductReviews(productId) {
    try {
        return await api.get(`/products/${productId}/reviews`);
    } catch (error) {
        console.error('Failed to load reviews:', error);
        return [];
    }
}
```

## 🔍 Debugging

Enable debug mode by setting this in browser console:

```javascript
localStorage.setItem('debugMode', 'true');
```

This will show additional console logs for API calls and state changes.

## 📝 Notes

- All API calls are asynchronous and use modern async/await syntax
- The code includes proper error handling and user feedback
- LocalStorage is used as a fallback when API calls fail
- The cart system supports both client-side and server-side storage
- All managers are globally accessible for easy debugging and extension

## 🤝 Backend Integration Examples

### Node.js/Express Example
```javascript
app.get('/api/products', async (req, res) => {
    const { category, limit, search } = req.query;
    // Your product fetching logic
    res.json(products);
});
```

### PHP Example
```php
if ($_GET['endpoint'] === 'products') {
    $products = getProducts($_GET['category'] ?? null);
    header('Content-Type: application/json');
    echo json_encode($products);
}
```

The frontend is designed to work with any backend technology as long as it follows the expected API contract.
