export const captureScreen = async () => {
  // Check if we're running in a Chrome extension context
  const isChromeExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  try {
    if (isChromeExtension) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
          resolve(response.screenshot);
        });
      });
    } else {
      // Development fallback using MediaDevices API
      const stream = await navigator.mediaDevices.getDisplayMedia({ preferCurrentTab: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      context?.drawImage(bitmap, 0, 0);
      
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      
      // Cleanup
      track.stop();
      stream.getTracks().forEach(track => track.stop());
      
      return base64Image;
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }
};