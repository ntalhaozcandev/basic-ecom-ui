// Product detail page initialization
document.addEventListener('DOMContentLoaded', async function() {
    // Wait for managers to be available
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
        if (typeof cartManager !== 'undefined' && 
            typeof productDetailManager !== 'undefined') {
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (typeof cartManager !== 'undefined') {
        await cartManager.initialize();
    }

    if (typeof productDetailManager !== 'undefined') {
        await productDetailManager.initialize();
    }
});

// Legacy function support for direct HTML calls
function changeQuantity(change) {
    if (typeof productDetailManager !== 'undefined') {
        productDetailManager.changeQuantity(change);
    }
}

function addToCartWithQuantity(productId, quantity) {
    if (typeof productDetailManager !== 'undefined') {
        productDetailManager.addToCartWithQuantity();
    }
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-header').forEach(header => {
        header.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Find the header with matching data-tab attribute
    const selectedHeader = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedHeader) {
        selectedHeader.classList.add('active');
    }
}

function navigateToProduct(id) {
    window.location.href = `product-detail.html?id=${id}`;
}

function addToCart(productId) {
    if (typeof cartManager !== 'undefined') {
        cartManager.addToCart(productId);
    }
}

function updateCartItemQuantity(productId, change) {
    if (typeof cartManager !== 'undefined') {
        cartManager.updateCartItemQuantity(productId, change);
    }
}

function removeFromCart(productId) {
    if (typeof cartManager !== 'undefined') {
        cartManager.removeFromCart(productId);
    }
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
}

function proceedToCheckout() {
    if (typeof cartManager !== 'undefined') {
        cartManager.proceedToCheckout();
    }
}

function goToCartPage() {
    window.location.href = 'cart.html';
}

function showNotification(message) {
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
    }, 3000);
}
