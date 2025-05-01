// Generate a favicon for 8-BitHub
function generateFavicon() {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  // Background color (dark grey)
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, 0, 32, 32);
  
  // Draw "8B" text in pixel style
  
  // Pixel grid for "8"
  const pixels8 = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1]
  ];
  
  // Pixel grid for "B"
  const pixelsB = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 0],
    [1, 0, 1],
    [1, 1, 1]
  ];
  
  // Draw the pixels for "8" (left side)
  ctx.fillStyle = '#FF5555'; // Red
  for (let y = 0; y < pixels8.length; y++) {
    for (let x = 0; x < pixels8[y].length; x++) {
      if (pixels8[y][x] === 1) {
        ctx.fillRect(4 + x * 3, 6 + y * 4, 3, 4);
      }
    }
  }
  
  // Draw the pixels for "B" (right side)
  ctx.fillStyle = '#55FF55'; // Green
  for (let y = 0; y < pixelsB.length; y++) {
    for (let x = 0; x < pixelsB[y].length; x++) {
      if (pixelsB[y][x] === 1) {
        ctx.fillRect(16 + x * 3, 6 + y * 4, 3, 4);
      }
    }
  }
  
  // Add a border
  ctx.strokeStyle = '#5555FF'; // Blue
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 28, 28);
  
  // Generate favicon
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = canvas.toDataURL('image/png');
  
  // Replace existing favicon or add new one
  const existingFavicon = document.querySelector('link[rel="icon"]');
  if (existingFavicon) {
    document.head.removeChild(existingFavicon);
  }
  document.head.appendChild(link);
  
  // Return the data URL in case it's needed
  return canvas.toDataURL('image/png');
}

// Export the function
window.generateFavicon = generateFavicon;

// Auto-execute when included directly
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', generateFavicon);
} 