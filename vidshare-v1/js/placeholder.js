// Function to create and save the placeholder image
function createPlaceholderImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 200, 200);

    // Draw user icon
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(100, 80, 40, 0, Math.PI * 2);
    ctx.fill();

    // Draw body
    ctx.beginPath();
    ctx.arc(100, 220, 80, Math.PI * 1.2, Math.PI * 1.8);
    ctx.fill();

    return canvas.toDataURL('image/png');
}

// Export the placeholder image as a data URL
export const placeholderImage = createPlaceholderImage();
