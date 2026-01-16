// Utility to detect if the app is running on web/desktop or mobile app
export const isWebPlatform = () => {
  // Check if running in Capacitor (mobile app)
  if (window.Capacitor) {
    return false
  }
  
  // Otherwise, it's running on web
  return true
}

export const isMobileApp = () => {
  return !isWebPlatform()
}
