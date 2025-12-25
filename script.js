
window.onload = () => {
  // Initialize AR application
  initAR();
};

// Translation support
const TRANSLATIONS = {
  en: {
    error: "Error",
    close: "Close",
    deviceNotSupported: "AR works only on mobile devices.",
    locationRequired: "Location permission is required.",
    cameraRequired: "Camera permission is required.",
    noLocations: "No AR locations found nearby.",
  },
  ar: {
    error: "خطأ",
    close: "إغلاق",
    deviceNotSupported: "الواقع المعزز يعمل على الجوال فقط.",
    locationRequired: "يتطلب السماح بخدمة الموقع.",
    cameraRequired: "يتطلب السماح بالكاميرا.",
    noLocations: "لا توجد مواقع قريبة للعرض.",
  },
};

let currentLocation = null;
let APP_LANG = "en";
let markersAdded = false;
let loaderHidden = false;
let method = 'static'; // 'static' or 'dynamic'

// Use static or dynamic loading (set to 'static' for testing)
// method = 'static'; // Uncomment to use static places

/* ================= LOADER CONTROL ================= */
function showLoader() {
  loaderHidden = false;
  const loader = document.getElementById("rd-loader");
  if (loader) {
    loader.classList.remove("rd-loader--hidden");
  }
}

function hideLoader() {
  if (loaderHidden) return;
  loaderHidden = true;

  const loader = document.getElementById("rd-loader");
  if (loader) {
    loader.classList.add("rd-loader--hidden");
  }
}

/* ================= UI FUNCTIONS ================= */
function showPopup(message) {
  const popup = document.getElementById("popup");
  if (popup) {
    popup.querySelector("p").textContent = message;
    popup.style.display = "block";
  }
}

function applyLanguage(lang) {
  APP_LANG = lang in TRANSLATIONS ? lang : "en";
  document.documentElement.lang = APP_LANG;
  document.documentElement.dir = APP_LANG === "ar" ? "rtl" : "ltr";

  // Update popup text if exists
  const popupTitle = document.querySelector("#popup h2");
  const popupButton = document.querySelector("#popup button");

  if (popupTitle) popupTitle.textContent = TRANSLATIONS[APP_LANG].error;
  if (popupButton) popupButton.textContent = TRANSLATIONS[APP_LANG].close;
}

function closePopup() {
  const popup = document.getElementById("popup");
  if (popup) {
    popup.style.display = "none";
  }
}

/* ================= DEVICE & PERMISSIONS ================= */
async function getDeviceInfo() {
  try {
    // Check if TWK API is available
    if (typeof TWK === "undefined" || !TWK.getDeviceInfo) {
      console.warn("TWK API not available, using fallback device detection");
      return /Android|iPhone|iPad|iPod|Windows Phone/i.test(
        navigator.userAgent
      );
    }

    const response = await TWK.getDeviceInfo();
    console.log("Device info:", response);

    const info = response.result ?? response;
    applyLanguage(info.app_language || "en");

    const model = (info.device_model || "").toLowerCase();
    return (
      model.includes("iphone") ||
      model.includes("apple") ||
      model.includes("ios") ||
      model.includes("android") ||
      model.includes("samsung") ||
      model.includes("ipad")
    );
  } catch (e) {
    console.error("getDeviceInfo error:", e);
    return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
  }
}

async function getUserLocation() {
  try {
    // Try TWK API first
    if (typeof TWK !== "undefined" && TWK.getUserLocation) {
      const response = await TWK.getUserLocation();
      console.log("TWK Location response:", response);
      const data = response.result ?? response;

      if (data.location && data.location.latitude && data.location.longitude) {
        currentLocation = {
          latitude: Number(data.location.latitude),
          longitude: Number(data.location.longitude),
        };
        console.log("User location from TWK:", currentLocation);
        return true;
      }
    }

    // Fallback to browser geolocation
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log("User location from browser:", currentLocation);
          resolve(true);
        },
        (error) => {
          console.error("Geolocation error:", error);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        }
      );
    });
  } catch (e) {
    console.error("Location error:", e);
    return false;
  }
}

async function getCameraPermission() {
  try {
    // Check if TWK API is available
    if (typeof TWK === "undefined" || !TWK.askCameraPermission) {
      console.warn("TWK camera API not available, assuming granted");
      return true; // Assume granted for non-TWK environments
    }

    const response = await TWK.askCameraPermission();
    console.log("Camera response:", response);
    const data = response.result ?? response;
    return data.granted === true;
  } catch (e) {
    console.error("Camera error:", e);
    return false;
  }
}

/* ================= API URL BUILDER ================= */
function buildApiUrl(lat, lon) {
  const range = 0.02; // ~2km

  return (
    `https://twk-services.rcrc.gov.sa/momentprojects.php?_format=json` +
    `&types[]=projects` +
    `&types[]=metro_stations` +
    `&langcode=${APP_LANG}` +
    `&lat[min]=${lat - range}` +
    `&lat[max]=${lat + range}` +
    `&lon[min]=${lon - range}` +
    `&lon[max]=${lon + range}` +
    `&on_ar=1`
  );
}

/* ================= FETCH DYNAMIC LOCATIONS ================= */
async function dynamicLoadPlaces(apiUrl) {
  try {
    console.log("Fetching:", apiUrl);
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    console.log("API response:", data);

    const items = data?.result?.items;
    if (!Array.isArray(items)) return [];

    return items
      .filter((i) => i.geofield?.lat && i.geofield?.lon)
      .map((i) => ({
        name: i.title || "Location",
        location: {
          lat: Number(i.geofield.lat),
          lng: Number(i.geofield.lon),
        },
      }));
  } catch (e) {
    console.error("API error:", e);
    return [];
  }
}

/* ================= STATIC PLACES (for testing) ================= */
function staticLoadPlaces() {
  return [
    {
      name: "ساحة الكندي",
      location: {
        lat: 24.6821269,
        lng: 46.6234167,
      },
    },
    {
      name: "سفارة إندونيسيا",
      location: {
        lat: 24.681689,
        lng: 46.6245067,
      },
    },
    {
      name: "سفارة الدنمارك",
      location: {
        lat: 24.680275,
        lng: 46.624194,
      },
    },
  ];
}

/* ================= RENDER PLACES ================= */
function renderPlaces(places) {
  if (markersAdded) return;
  markersAdded = true;

  const scene = document.querySelector("a-scene");
  if (!scene) {
    console.error("Scene not found");
    return;
  }

  console.log(`Rendering ${places.length} places`);

  places.forEach((place) => {
    const latitude = place.location.lat;
    const longitude = place.location.lng;

    const icon = document.createElement("a-image");
    icon.setAttribute(
      "gps-entity-place",
      `latitude: ${latitude}; longitude: ${longitude}`
    );
    icon.setAttribute("name", place.name);
    icon.setAttribute("src", "assets/map-marker.png");
    icon.setAttribute("scale", "5 5 5");
    icon.setAttribute("look-at", "[gps-camera]");

    // Fire event ONLY when marker is actually ready
    icon.addEventListener("loaded", () => {
      window.dispatchEvent(new CustomEvent("gps-entity-place-loaded"));
    });

    // Correct A-Frame click handling
    icon.addEventListener("click", (ev) => {
      ev.stopPropagation();
      ev.preventDefault();

      const el =
        ev.detail &&
        ev.detail.intersection &&
        ev.detail.intersection.object.el;

      if (el !== ev.target) return;

      const name = ev.target.getAttribute("name");

      const existing = document.getElementById("place-label");
      if (existing) existing.remove();

      const container = document.createElement("div");
      container.id = "place-label";

      const label = document.createElement("span");
      label.innerText = name;

      container.appendChild(label);
      document.body.appendChild(container);

      setTimeout(() => {
        container.remove();
      }, 2000);
    });

    scene.appendChild(icon);
  });
}


/* ================= SCENE WAIT FUNCTION ================= */
function waitForSceneAndGps() {
  return new Promise((resolve, reject) => {
    const scene = document.querySelector("a-scene");
    const camera = document.querySelector("[gps-camera]");

    if (!scene || !camera) {
      reject("AR scene not ready");
      return;
    }

    let sceneReady = scene.hasLoaded;
    let gpsReady = false;

    function check() {
      if (sceneReady && gpsReady) {
        resolve(true);
      }
    }

    if (!sceneReady) {
      scene.addEventListener(
        "loaded",
        () => {
          sceneReady = true;
          check();
        },
        { once: true }
      );
    }

    camera.addEventListener(
      "gps-camera-update-position",
      () => {
        gpsReady = true;
        check();
      },
      { once: true }
    );
  });
}

/* ================= MAIN INITIALIZATION ================= */
async function initAR() {
    showLoader();

    try {
        if (!(await getDeviceInfo())) {
            throw TRANSLATIONS[APP_LANG].deviceNotSupported;
        }

        if (!(await getUserLocation())) {
            throw TRANSLATIONS[APP_LANG].locationRequired;
        }

        if (!(await getCameraPermission())) {
            throw TRANSLATIONS[APP_LANG].cameraRequired;
        }

        await waitForSceneAndGps();

        let places = [];

        if (method === 'static') {
            places = staticLoadPlaces();
        } else {
            const apiUrl = buildApiUrl(
                currentLocation.latitude,
                currentLocation.longitude
            );
            places = await dynamicLoadPlaces(apiUrl);
        }

        if (!places.length) {
            throw TRANSLATIONS[APP_LANG].noLocations;
        }

        renderPlaces(places);
        hideLoader();

        console.log("AR ready");

    } catch (err) {
        hideLoader();
        showPopup(typeof err === "string" ? err : "Initialization error");
        console.error(err);
    }
}


// Attach closePopup to window for HTML onclick
window.closePopup = closePopup;
