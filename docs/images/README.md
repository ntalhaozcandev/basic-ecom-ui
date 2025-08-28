# Images Directory

## Required Files

### dummy-product.jpg
Place your dummy/placeholder product image here. This image will be used as a fallback for:
- Products without images
- Failed image loads
- Cart items without images
- Order items without images
- Admin panel product thumbnails

**Recommended specifications:**
- Format: JPG, PNG, or WebP
- Size: 400x400 pixels (square format works best)
- File size: Under 50KB for optimal loading
- Content: Generic product placeholder or your brand logo

## Usage
All fallback images throughout the application now reference `../src/images/dummy-product.jpg` instead of generating placeholder images or using external services.
