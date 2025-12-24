// Simple Configuration
const CONFIG = {
  USE_MOCK_LOCATIONS: true,
  GPS_TIMEOUT: 8000,
  MIN_DISTANCE: 10, // meters
};

// State
let currentLanguage = 'en';
let isLoading = true;
let userLocation = null;

// Translations
const TRANSLATIONS = {
  en: {
    error: "Error",
    close: "Close",
    loading: "Loading AR...",
    gettingLocation: "Getting your location...",
    requestingCamera: "Accessing camera...",
    loadingLocations: "Finding nearby places...",
    deviceNotSupported: "Please use a mobile device with camera.",
    locationRequired: "Location permission is required.",
    cameraRequired: "Camera permission is required.",
    noLocations: "No places found nearby.",
    gpsAcquired: "Location found!",
    searching: "Searching for places...",
    ready: "AR is ready!"
  },
  ar: {
    error: "خطأ",
    close: "إغلاق",
    loading: "جاري تحميل الواقع المعزز...",
    gettingLocation: "جاري تحديد موقعك...",
    requestingCamera: "جاري الوصول للكاميرا...",
    loadingLocations: "جاري البحث عن أماكن قريبة...",
    deviceNotSupported: "يرجى استخدام جهاز محمول به كاميرا.",
    locationRequired: "يتطلب السماح بخدمة الموقع.",
    cameraRequired: "يتطلب السماح بالكاميرا.",
    noLocations: "لم يتم العثور على أماكن قريبة.",
    gpsAcquired: "تم تحديد الموقع!",
    searching: "جاري البحث عن أماكن...",
    ready: "الواقع المعزز جاهز!"
  }
};

// DOM Elements
const elements = {
  loader: null,
  loaderText: null,
  scene: null,
  camera: null,
  popup: null,
  statusBar: null,
  langButtons: null
};

// Initialize DOM
function initDOM() {
  elements.loader = document.getElementById('rd-loader');
  elements.loaderText = document.getElementById('loader-text');
  elements.scene = document.querySelector('a-scene');
  elements.camera = document.querySelector('[gps-camera]');
  elements.popup = document.getElementById('popup');
  elements.statusBar = document.getElementById('status-bar');
  elements.langButtons = document.querySelectorAll('.lang-btn');
  
  // Language buttons
  elements.langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLanguage(lang);
    });
  });
}

// Loader Functions
function showLoader() {
  if (elements.loader) {
    elements.loader.classList.remove('rd-loader--hidden');
  }
  isLoading = true;
}

function hideLoader() {
  if (elements.loader) {
    elements.loader.classList.add('rd-loader--hidden');
  }
  isLoading = false;
}

function updateLoaderText(key) {
  if (elements.loaderText) {
    elements.loaderText.textContent = TRANSLATIONS[currentLanguage][key] || key;
  }
}

// Popup Functions
function showPopup(messageKey) {
  const message = TRANSLATIONS[currentLanguage][messageKey] || messageKey;
  elements.popup.querySelector('p').textContent = message;
  elements.popup.style.display = 'block';
}

function closePopup() {
  elements.popup.style.display = 'none';
}

// Status Bar
function updateStatus(message) {
  if (elements.statusBar) {
    elements.statusBar.textContent = message;
    elements.statusBar.style.display = 'block';
  }
}

function hideStatus() {
  if (elements.statusBar) {
    elements.statusBar.style.display = 'none';
  }
}

// Language
function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return;
  
  currentLanguage = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  
  // Update buttons
  elements.langButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  
  // Update popup text
  elements.popup.querySelector('h2').textContent = TRANSLATIONS[lang].error;
  elements.popup.querySelector('button').textContent = TRANSLATIONS[lang].close;
}

// Check Device
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Get User Location
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// Get Camera Permission
async function getCameraPermission() {
  try {
    if (typeof TWK !== 'undefined' && TWK.askCameraPermission) {
      const response = await TWK.askCameraPermission();
      const data = response.result || response;
      return data.granted === true;
    }
    
    // Browser fallback
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment' 
      } 
    });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission error:', error);
    return false;
  }
}

// Mock Locations
function getMockLocations(baseLocation) {
  const locations = [];
  const baseLat = baseLocation.latitude;
  const baseLon = baseLocation.longitude;
  
  // Add 4 locations around the user
  const offsets = [
    { lat: 0.001, lon: 0.001, label: 'محطة مترو الرياض', type: 'metro' },
    { lat: -0.001, lon: 0.002, label: 'مشروع الرياض', type: 'project' },
    { lat: 0.002, lon: -0.001, label: 'منتزه الملك', type: 'park' },
    { lat: -0.002, lon: -0.002, label: 'متحف الرياض', type: 'museum' }
  ];
  
  offsets.forEach((offset, index) => {
    locations.push({
      id: index + 1,
      latitude: baseLat + offset.lat,
      longitude: baseLon + offset.lon,
      label: currentLanguage === 'ar' ? offset.label : `Location ${index + 1}`,
      type: offset.type,
      distance: Math.round(Math.random() * 300) + 100
    });
  });
  
  return locations;
}

// Create Marker
function createMarker(location) {
  const marker = document.createElement('a-entity');
  
  // Set GPS position
  marker.setAttribute('gps-entity-place', {
    latitude: location.latitude,
    longitude: location.longitude
  });
  
  // Make it look at camera
  marker.setAttribute('look-at', '[gps-camera]');
  
  // Container
  const container = document.createElement('a-entity');
  
  // Base (small sphere at ground level)
  const base = document.createElement('a-sphere');
  base.setAttribute('radius', '0.1');
  base.setAttribute('color', '#5c8a12');
  base.setAttribute('position', '0 0.1 0');
  container.appendChild(base);
  
  // Pole
  const pole = document.createElement('a-cylinder');
  pole.setAttribute('height', '1');
  pole.setAttribute('radius', '0.03');
  pole.setAttribute('color', '#5c8a12');
  pole.setAttribute('position', '0 0.6 0');
  container.appendChild(pole);
  
  // Icon
  const icon = document.createElement('a-ring');
  icon.setAttribute('radius-inner', '0.3');
  icon.setAttribute('radius-outer', '0.4');
  icon.setAttribute('color', '#5c8a12');
  icon.setAttribute('position', '0 1.2 0');
  container.appendChild(icon);
  
  // Text
  const text = document.createElement('a-text');
  text.setAttribute('value', location.label);
  text.setAttribute('align', 'center');
  text.setAttribute('color', '#FFFFFF');
  text.setAttribute('position', '0 1.7 0');
  text.setAttribute('scale', '2 2 2');
  text.setAttribute('width', '3');
  text.setAttribute('wrap-count', '15');
  container.appendChild(text);
  
  // Click handler
  marker.addEventListener('click', () => {
    const message = currentLanguage === 'ar' 
      ? `${location.label}\nالمسافة: ${location.distance} متر`
      : `${location.label}\nDistance: ${location.distance}m`;
    
    showPopup(message);
  });
  
  marker.appendChild(container);
  return marker;
}

// Add Markers to Scene
function addMarkers(locations) {
  if (!elements.scene) return;
  
  // Clear existing markers
  const existingMarkers = elements.scene.querySelectorAll('[gps-entity-place]');
  existingMarkers.forEach(marker => marker.remove());
  
  // Add new markers
  locations.forEach(location => {
    const marker = createMarker(location);
    elements.scene.appendChild(marker);
  });
  
  updateStatus(TRANSLATIONS[currentLanguage].ready);
}

// Wait for GPS
function waitForGPS(locations) {
  return new Promise((resolve) => {
    if (!elements.camera) {
      resolve(false);
      return;
    }
    
    let gpsTimeout = setTimeout(() => {
      console.log('GPS timeout - adding markers anyway');
      addMarkers(locations);
      hideLoader();
      resolve(false);
    }, CONFIG.GPS_TIMEOUT);
    
    elements.camera.addEventListener('gps-camera-update-position', () => {
      clearTimeout(gpsTimeout);
      console.log('GPS position updated');
      updateStatus(TRANSLATIONS[currentLanguage].gpsAcquired);
      resolve(true);
    }, { once: true });
  });
}

// Main Initialization
async function initAR() {
  try {
    showLoader();
    updateLoaderText('loading');
    
    // Initialize DOM
    initDOM();
    
    // Check device
    if (!isMobileDevice()) {
      throw 'deviceNotSupported';
    }
    
    // Get location
    updateLoaderText('gettingLocation');
    try {
      userLocation = await getUserLocation();
      console.log('User location:', userLocation);
    } catch (error) {
      console.error('Location error:', error);
      throw 'locationRequired';
    }
    
    // Get camera permission
    updateLoaderText('requestingCamera');
    const hasCamera = await getCameraPermission();
    if (!hasCamera) {
      throw 'cameraRequired';
    }
    
    // Load locations
    updateLoaderText('loadingLocations');
    let locations = [];
    
    if (CONFIG.USE_MOCK_LOCATIONS) {
      locations = getMockLocations(userLocation);
    } else {
      // You can add API call here later
      locations = getMockLocations(userLocation);
    }
    
    if (locations.length === 0) {
      throw 'noLocations';
    }
    
    console.log(`Found ${locations.length} locations`);
    
    // Wait for scene to load
    if (elements.scene.hasLoaded) {
      await initScene(locations);
    } else {
      elements.scene.addEventListener('loaded', async () => {
        await initScene(locations);
      });
    }
    
  } catch (error) {
    console.error('Init error:', error);
    hideLoader();
    
    if (typeof error === 'string' && TRANSLATIONS[currentLanguage][error]) {
      showPopup(error);
    } else {
      showPopup('Initialization failed');
    }
  }
}

// Initialize Scene
async function initScene(locations) {
  updateLoaderText('searching');
  
  // Add markers
  addMarkers(locations);
  
  // Wait for GPS
  const gpsReady = await waitForGPS(locations);
  
  if (gpsReady) {
    // Refresh markers with accurate GPS
    setTimeout(() => {
      addMarkers(locations);
      hideLoader();
    }, 1000);
  }
}

// Event Listeners
window.addEventListener('load', initAR);
window.closePopup = closePopup;

// Handle page visibility
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !isLoading) {
    // Page is visible again
    updateStatus(TRANSLATIONS[currentLanguage].searching);
  }
});