// const apiUrl =
//   "https://api.riyadh.sa/api/MomentProjects?_format=json&types[]=projects&types[]=metro_stations&langcode=en&lat[min]=24.66&lat[max]=24.70&lon[min]=46.60&lon[max]=46.64&on_ar=1";

let currentLocation = null;
let APP_LANG = "en";
let markersAdded = false;
let loaderHidden = false;

const USE_MOCK_LOCATIONS = true; // set to false in production

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
  }
};


/* ================= LOADER CONTROL ================= */

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

/* ---------------- UI ---------------- */
function showPopup(message) {
  const popup = document.getElementById("popup");
  popup.querySelector("p").textContent = message;
  popup.style.display = "block";
}

function applyLanguage(lang) {
  APP_LANG = lang in TRANSLATIONS ? lang : "en";

  document.documentElement.lang = APP_LANG;
  document.documentElement.dir = APP_LANG === "ar" ? "rtl" : "ltr";

  // Popup static texts
  document.querySelector("#popup h2").textContent =
    TRANSLATIONS[APP_LANG].error;

  document.querySelector("#popup button").textContent =
    TRANSLATIONS[APP_LANG].close;
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}
/* ---------------- DEVICE CHECK ---------------- */


async function getDeviceInfo() {
  try {
    const response = await TWK.getDeviceInfo();
    console.log("Device info:", response);

    // Normalize response (handles both shapes)
    const info = response.result ?? response;

    //Language
    applyLanguage(info.app_language || "en");

    //  Device check (SAFE)
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
    return false;
  }
}



async function getUserLocation() {
  try {
    const response = await TWK.getUserLocation();
    console.log("Location response:", response);

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

function getMockLocations(baseLocation) {
  return [
    {
      latitude: baseLocation.latitude + 0.001,
      longitude: baseLocation.longitude + 0.001,
      label: "مشروع الرياض الخضراء",
      distance: 150,
      type: "project",
    },
    {
      latitude: baseLocation.latitude - 0.001,
      longitude: baseLocation.longitude,
      label: "محطة مترو الملك عبدالله",
      distance: 250,
      type: "metro",
    },
    {
      latitude: baseLocation.latitude,
      longitude: baseLocation.longitude + 0.002,
      label: "منتزه الملك عبدالله",
      distance: 350,
      type: "project",
    },
  ];
}
/* ---------------- CAMERA ---------------- */


async function getCameraPermission() {
  try {
    const response = await TWK.askCameraPermission();
    console.log("Camera response:", response);

    const data = response.result ?? response;

    return data.granted === true;
  } catch (e) {
    console.error("Camera error:", e);
    return false;
  }
}

/* ---------------- API URL BUILDER ---------------- */

// function buildApiUrl(lat, lon, radius = 0.01) {
//   return `
//     https://api.riyadh.sa/api/MomentProjects?_format=json
//     &types[]=projects
//     &types[]=metro_stations
//     &langcode=en
//     &lat[min]=${lat - radius}
//     &lat[max]=${lat + radius}
//     &lon[min]=${lon - radius}
//     &lon[max]=${lon + radius}
//     &on_ar=1
//   `.replace(/\s/g, "");
// }
function buildApiUrl(lat, lon) {
  return `
    https://twk-services.rcrc.gov.sa/momentprojects.php?_format=json
    &types[]=projects
    &types[]=metro_stations
    &langcode=${APP_LANG}
    &lat[min]=${lat}
    &lat[max]=${lat}
    &lon[min]=${lon}
    &lon[max]=${lon}
    &on_ar=1
  `.replace(/\s/g, "");
}



/* ---------------- FETCH LOCATIONS ---------------- */
// async function fetchLocations(apiUrl) {
//   try {
//     const res = await fetch(apiUrl);
//     const data = await res.json();

//     if (!data.result?.items) return [];

//     return data.result.items
//       .filter(i => i.geofield?.lat && i.geofield?.lon)
//       .map(i => ({
//         latitude: i.geofield.lat,
//         longitude: i.geofield.lon,
//         label: i.title || "Location",
//       }));
//   } catch (e) {
//     console.error("API error:", e);
//     return [];
//   }
// }

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
      .map(i => ({
        latitude: Number(i.geofield.lat),
        longitude: Number(i.geofield.lon),
        label: i.title || "Location"
      }));

  } catch (e) {
    console.error("API error:", e);
    return [];
  }
}


/* ---------------- ADD AR MARKERS ---------------- */
function addMarkers(locations) {
  const scene = document.querySelector("a-scene");

  locations.forEach(loc => {
    const text = document.createElement("a-text");
    text.setAttribute("value", loc.label);
    text.setAttribute("scale", "15 15 15");
    text.setAttribute("align", "center");
    text.setAttribute("look-at", "[gps-camera]");
    text.setAttribute(
      "gps-entity-place",
      `latitude: ${loc.latitude}; longitude: ${loc.longitude}`
    );

    scene.appendChild(text);
  });
}


function waitForSceneAndGps(locations) {
  const scene = document.querySelector("a-scene");
  const camera = document.querySelector("[gps-camera]");

  if (!scene || !camera) {
    hideLoader();
    showPopup("AR scene initialization failed.");
    return;
  }

  let sceneReady = false;
  let gpsReady = false;

  function tryFinish() {
    if (sceneReady && gpsReady) {
      addMarkers(locations);
      hideLoader();
      console.log("AR fully ready");
    }
  }

  // Scene loaded
  if (scene.hasLoaded) {
    sceneReady = true;
  } else {
    scene.addEventListener("loaded", () => {
      sceneReady = true;
      tryFinish();
    });
  }

  // GPS ready
  camera.addEventListener(
    "gps-camera-update-position",
    () => {
      if (gpsReady) return;
      gpsReady = true;
      tryFinish();
    },
    { once: true }
  );
}

/* ---------------- INIT ---------------- */


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

    const apiUrl = buildApiUrl(
      currentLocation.latitude,
      currentLocation.longitude
    );

    // const locations = await fetchLocations(apiUrl);

    // if (!locations.length) {
    //   throw TRANSLATIONS[APP_LANG].noLocations;
    // }

    let locations = await fetchLocations(apiUrl);

    if (!locations.length && USE_MOCK_LOCATIONS) {
      console.warn("API returned no locations, using mock data");
      locations = getMockLocations(currentLocation);
    }

    if (!locations.length) {
      throw TRANSLATIONS[APP_LANG].noLocations;
    }


    waitForSceneAndGps(locations);

  } catch (message) {
    hideLoader();
    showPopup(message);
  }
}



window.addEventListener("load", initAR);
