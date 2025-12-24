// Configuration
const CONFIG = {
    USE_MOCK_LOCATIONS: true, // Set to false in production
    MIN_DISTANCE: 10, // Minimum distance in meters to show markers
    MAX_DISTANCE: 1000, // Maximum distance in meters
    MARKER_SCALE: 15,
    RENDER_DISTANCE: 100, // Distance to render markers in meters
};

// State
let currentLocation = null;
let APP_LANG = "en";
let markersAdded = false;
let loaderHidden = false;
let currentPlaces = [];
let activePlaceId = null;

// Translations
const TRANSLATIONS = {
    en: {
        error: "Error",
        close: "Close",
        deviceNotSupported: "AR works only on mobile devices.",
        locationRequired: "Location permission is required.",
        cameraRequired: "Camera permission is required.",
        noLocations: "No AR locations found nearby.",
        nearbyPlaces: "Nearby Places",
        distance: "Distance",
        meters: "m",
        loading: "Loading...",
        noPlacesNearby: "No places nearby",
        tapToNavigate: "Tap to navigate"
    },
    ar: {
        error: "خطأ",
        close: "إغلاق",
        deviceNotSupported: "الواقع المعزز يعمل على الجوال فقط.",
        locationRequired: "يتطلب السماح بخدمة الموقع.",
        cameraRequired: "يتطلب السماح بالكاميرا.",
        noLocations: "لا توجد مواقع قريبة للعرض.",
        nearbyPlaces: "الأماكن القريبة",
        distance: "المسافة",
        meters: "م",
        loading: "جاري التحميل...",
        noPlacesNearby: "لا توجد أماكن قريبة",
        tapToNavigate: "انقر للتنقل"
    }
};

/* ================= UI FUNCTIONS ================= */

function showLoader() {
    loaderHidden = false;
    const loader = document.getElementById("rd-loader");
    loader.classList.remove("rd-loader--hidden");
}

function hideLoader() {
    if (loaderHidden) return;
    loaderHidden = true;
    const loader = document.getElementById("rd-loader");
    loader.classList.add("rd-loader--hidden");
}

function applyLanguage(lang) {
    APP_LANG = lang in TRANSLATIONS ? lang : "en";
    document.documentElement.lang = APP_LANG;
    document.documentElement.dir = APP_LANG === "ar" ? "rtl" : "ltr";
    
    // Update UI texts
    document.querySelector("#places-panel h3").textContent = TRANSLATIONS[APP_LANG].nearbyPlaces;
    document.querySelector("#popup h2").textContent = TRANSLATIONS[APP_LANG].error;
    document.querySelector("#popup button").textContent = TRANSLATIONS[APP_LANG].close;
}

function showPopup(message) {
    const popup = document.getElementById("popup");
    popup.querySelector("p").textContent = message;
    popup.style.display = "block";
}

function closePopup() {
    document.getElementById("popup").style.display = "none";
}

/* ================= PLACES PANEL ================= */

function togglePlacesPanel() {
    const panel = document.getElementById("places-panel");
    const toggleBtn = document.getElementById("toggle-panel");
    
    if (panel.style.display === "block") {
        panel.style.display = "none";
        toggleBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
    } else {
        panel.style.display = "block";
        toggleBtn.innerHTML = '<i class="fas fa-times"></i>';
    }
}

function updatePlacesPanel(places) {
    const placesList = document.getElementById("places-list");
    placesList.innerHTML = "";
    
    if (places.length === 0) {
        const li = document.createElement("li");
        li.className = "place-item";
        li.textContent = TRANSLATIONS[APP_LANG].noPlacesNearby;
        placesList.appendChild(li);
        return;
    }
    
    places.forEach((place, index) => {
        const li = document.createElement("li");
        li.className = `place-item ${activePlaceId === place.id ? 'active' : ''}`;
        li.dataset.id = place.id;
        
        li.innerHTML = `
            <h4>${place.label}</h4>
            <p><span class="place-distance">${place.distance} ${TRANSLATIONS[APP_LANG].meters}</span></p>
            <p style="font-size: 11px; margin-top: 5px;">${TRANSLATIONS[APP_LANG].tapToNavigate}</p>
        `;
        
        li.addEventListener("click", () => {
            focusOnPlace(place);
        });
        
        placesList.appendChild(li);
    });
}

function focusOnPlace(place) {
    // Remove active class from all places
    document.querySelectorAll('.place-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked place
    const clickedItem = document.querySelector(`[data-id="${place.id}"]`);
    if (clickedItem) {
        clickedItem.classList.add('active');
    }
    
    activePlaceId = place.id;
    
    // Show info window
    showInfoWindow(place);
}

function showInfoWindow(place) {
    const infoWindow = document.getElementById("info-window");
    const infoTitle = document.getElementById("info-title");
    const infoDistance = document.getElementById("info-distance");
    const infoClose = document.getElementById("info-close");
    
    infoTitle.textContent = place.label;
    infoDistance.textContent = `${place.distance} ${TRANSLATIONS[APP_LANG].meters}`;
    
    // Position near the marker (this is simplified - you might need to adjust)
    infoWindow.style.display = 'block';
    infoWindow.style.left = '50%';
    infoWindow.style.top = '50%';
    infoWindow.style.transform = 'translate(-50%, -50%)';
    
    infoClose.onclick = () => {
        infoWindow.style.display = 'none';
    };
}

/* ================= DEVICE & PERMISSIONS ================= */

async function getDeviceInfo() {
    try {
        const response = await TWK.getDeviceInfo();
        const info = response.result ?? response;
        
        // Apply language
        applyLanguage(info.app_language || "en");
        
        // Check if mobile device
        const model = (info.device_model || "").toLowerCase();
        const userAgent = navigator.userAgent.toLowerCase();
        
        return (
            /iphone|ipad|ipod|android/.test(userAgent) ||
            model.includes("iphone") ||
            model.includes("apple") ||
            model.includes("ios") ||
            model.includes("android") ||
            model.includes("samsung") ||
            model.includes("ipad")
        );
    } catch (e) {
        console.error("getDeviceInfo error:", e);
        return false;
    }
}

async function getUserLocation() {
    try {
        const response = await TWK.getUserLocation();
        const data = response.result ?? response;
        
        if (!data.location || !data.location.latitude || !data.location.longitude) {
            return false;
        }
        
        currentLocation = {
            latitude: Number(data.location.latitude),
            longitude: Number(data.location.longitude),
        };
        
        console.log("User location:", currentLocation);
        return true;
    } catch (e) {
        console.error("Location error:", e);
        return false;
    }
}

async function getCameraPermission() {
    try {
        const response = await TWK.askCameraPermission();
        const data = response.result ?? response;
        return data.granted === true;
    } catch (e) {
        console.error("Camera error:", e);
        return false;
    }
}

/* ================= LOCATIONS DATA ================= */

function getMockLocations(baseLocation) {
    return [
        {
            id: "1",
            latitude: baseLocation.latitude + 0.001,
            longitude: baseLocation.longitude + 0.001,
            label: APP_LANG === "ar" ? "مشروع الرياض الخضراء" : "Riyadh Green Project",
            distance: 150,
            type: "project",
            description: "A green initiative project in Riyadh"
        },
        {
            id: "2",
            latitude: baseLocation.latitude - 0.001,
            longitude: baseLocation.longitude,
            label: APP_LANG === "ar" ? "محطة مترو الملك عبدالله" : "King Abdullah Metro Station",
            distance: 250,
            type: "metro",
            description: "Main metro station in Riyadh"
        },
        {
            id: "3",
            latitude: baseLocation.latitude,
            longitude: baseLocation.longitude + 0.002,
            label: APP_LANG === "ar" ? "منتزه الملك عبدالله" : "King Abdullah Park",
            distance: 350,
            type: "park",
            description: "Beautiful park in the city center"
        },
        {
            id: "4",
            latitude: baseLocation.latitude + 0.002,
            longitude: baseLocation.longitude - 0.001,
            label: APP_LANG === "ar" ? "المتحف الوطني" : "National Museum",
            distance: 450,
            type: "museum",
            description: "National Museum of Saudi Arabia"
        }
    ];
}

function buildApiUrl(lat, lon) {
    return `
        https://twk-services.rcrc.gov.sa/momentprojects.php?_format=json
        &types[]=projects
        &types[]=metro_stations
        &langcode=${APP_LANG}
        &lat[min]=${lat - 0.01}
        &lat[max]=${lat + 0.01}
        &lon[min]=${lon - 0.01}
        &lon[max]=${lon + 0.01}
        &on_ar=1
    `.replace(/\s/g, "");
}

async function fetchLocations(apiUrl) {
    try {
        console.log("Fetching:", apiUrl);
        const res = await fetch(apiUrl);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        console.log("API response:", data);
        
        const items = data?.result?.items;
        if (!Array.isArray(items)) return [];
        
        return items
            .filter(i => i.geofield?.lat && i.geofield?.lon)
            .map((i, index) => ({
                id: `api-${index}`,
                latitude: Number(i.geofield.lat),
                longitude: Number(i.geofield.lon),
                label: i.title || "Location",
                distance: Math.floor(Math.random() * 500) + 50, // Mock distance - calculate properly in production
                type: i.type || "location",
                description: i.description || ""
            }));
    } catch (e) {
        console.error("API error:", e);
        return [];
    }
}

/* ================= AR MARKERS ================= */

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return Math.floor(R * c);
}

function createMarker(place) {
    // Create a container for the marker
    const container = document.createElement("a-entity");
    container.setAttribute("class", "ar-marker");
    
    // Calculate position based on GPS coordinates
    container.setAttribute("gps-entity-place", {
        latitude: place.latitude,
        longitude: place.longitude
    });
    
    // Create text label
    const text = document.createElement("a-text");
    text.setAttribute("value", place.label);
    text.setAttribute("scale", `${CONFIG.MARKER_SCALE} ${CONFIG.MARKER_SCALE} ${CONFIG.MARKER_SCALE}`);
    text.setAttribute("align", "center");
    text.setAttribute("look-at", "[gps-camera]");
    text.setAttribute("color", "#FFFFFF");
    text.setAttribute("shader", "msdf");
    text.setAttribute("font", "https://cdn.aframe.io/fonts/Roboto-msdf.json");
    
    // Create background for better visibility
    const background = document.createElement("a-plane");
    background.setAttribute("width", "auto");
    background.setAttribute("height", "auto");
    background.setAttribute("scale", "1.2 1.2 1");
    background.setAttribute("material", {
        color: place.type === "metro" ? "#FF6B6B" : 
               place.type === "project" ? "#4ECDC4" : "#45B7D1",
        opacity: 0.9,
        transparent: true
    });
    background.setAttribute("position", "0 0 -0.01");
    background.setAttribute("look-at", "[gps-camera]");
    
    // Add distance indicator
    const distanceText = document.createElement("a-text");
    distanceText.setAttribute("value", `${place.distance}m`);
    distanceText.setAttribute("scale", `${CONFIG.MARKER_SCALE * 0.7} ${CONFIG.MARKER_SCALE * 0.7} ${CONFIG.MARKER_SCALE * 0.7}`);
    distanceText.setAttribute("align", "center");
    distanceText.setAttribute("position", "0 -0.2 0");
    distanceText.setAttribute("look-at", "[gps-camera]");
    distanceText.setAttribute("color", "#FDCB6E");
    
    // Add click event
    container.addEventListener("click", () => {
        focusOnPlace(place);
    });
    
    // Add hover effect
    container.addEventListener("mouseenter", () => {
        text.setAttribute("scale", `${CONFIG.MARKER_SCALE * 1.2} ${CONFIG.MARKER_SCALE * 1.2} ${CONFIG.MARKER_SCALE * 1.2}`);
    });
    
    container.addEventListener("mouseleave", () => {
        text.setAttribute("scale", `${CONFIG.MARKER_SCALE} ${CONFIG.MARKER_SCALE} ${CONFIG.MARKER_SCALE}`);
    });
    
    // Assemble the marker
    container.appendChild(background);
    container.appendChild(text);
    container.appendChild(distanceText);
    
    return container;
}

function addMarkers(places) {
    const scene = document.querySelector("a-scene");
    
    // Clear existing markers
    const existingMarkers = scene.querySelectorAll(".ar-marker");
    existingMarkers.forEach(marker => marker.parentNode.removeChild(marker));
    
    // Add new markers
    places.forEach(place => {
        const marker = createMarker(place);
        scene.appendChild(marker);
    });
    
    markersAdded = true;
    console.log(`Added ${places.length} markers`);
}

/* ================= MAIN INITIALIZATION ================= */

async function initAR() {
    showLoader();
    
    try {
        // 1. Check device compatibility
        if (!(await getDeviceInfo())) {
            throw TRANSLATIONS[APP_LANG].deviceNotSupported;
        }
        
        // 2. Get user location
        if (!(await getUserLocation())) {
            throw TRANSLATIONS[APP_LANG].locationRequired;
        }
        
        // 3. Get camera permission
        if (!(await getCameraPermission())) {
            throw TRANSLATIONS[APP_LANG].cameraRequired;
        }
        
        // 4. Fetch locations
        let places = [];
        
        if (CONFIG.USE_MOCK_LOCATIONS) {
            places = getMockLocations(currentLocation);
            console.log("Using mock locations:", places);
        } else {
            const apiUrl = buildApiUrl(currentLocation.latitude, currentLocation.longitude);
            places = await fetchLocations(apiUrl);
            
            if (!places.length) {
                places = getMockLocations(currentLocation);
                console.log("API returned no locations, using mock data");
            }
        }
        
        if (!places.length) {
            throw TRANSLATIONS[APP_LANG].noLocations;
        }
        
        // Calculate distances for each place
        places.forEach(place => {
            place.distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                place.latitude,
                place.longitude
            );
        });
        
        // Sort by distance
        places.sort((a, b) => a.distance - b.distance);
        
        // Filter by max distance
        places = places.filter(place => place.distance <= CONFIG.MAX_DISTANCE);
        
        // Store places globally
        currentPlaces = places;
        
        // Update UI
        updatePlacesPanel(places);
        
        // Wait for A-Frame scene to load
        const scene = document.querySelector("a-scene");
        if (scene.hasLoaded) {
            addMarkers(places);
            hideLoader();
        } else {
            scene.addEventListener("loaded", () => {
                addMarkers(places);
                hideLoader();
            });
        }
        
        // Setup event listeners for GPS updates
        const camera = document.querySelector("a-camera");
        if (camera) {
            camera.addEventListener("gps-camera-update-position", (evt) => {
                console.log("GPS position updated:", evt.detail.position);
                // You could update distances here if needed
            });
        }
        
    } catch (message) {
        hideLoader();
        showPopup(message);
    }
}

/* ================= EVENT LISTENERS ================= */

window.addEventListener("load", () => {
    // Initialize AR
    initAR();
    
    // Setup toggle button
    document.getElementById("toggle-panel").addEventListener("click", togglePlacesPanel);
    
    // Setup info window close button
    document.getElementById("info-close").addEventListener("click", () => {
        document.getElementById("info-window").style.display = 'none';
    });
    
    // Close info window when clicking outside
    document.addEventListener("click", (event) => {
        const infoWindow = document.getElementById("info-window");
        if (infoWindow.style.display === 'block' && 
            !infoWindow.contains(event.target) &&
            !event.target.closest('.ar-marker')) {
            infoWindow.style.display = 'none';
        }
    });
});

// Handle window resize
window.addEventListener("resize", () => {
    // Adjust UI if needed
});

// Handle orientation changes
window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        // Force redraw if needed
    }, 300);
});