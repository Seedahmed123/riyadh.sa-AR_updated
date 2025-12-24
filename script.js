// // const apiUrl =
// //   "https://api.riyadh.sa/api/MomentProjects?_format=json&types[]=projects&types[]=metro_stations&langcode=en&lat[min]=24.66&lat[max]=24.70&lon[min]=46.60&lon[max]=46.64&on_ar=1";





// let currentLocation = null;
// let APP_LANG = "en";
// let markersAdded = false;
// let loaderHidden = false;

// const USE_MOCK_LOCATIONS = true; // set to false in production

// const TRANSLATIONS = {
//   en: {
//     error: "Error",
//     close: "Close",
//     deviceNotSupported: "AR works only on mobile devices.",
//     locationRequired: "Location permission is required.",
//     cameraRequired: "Camera permission is required.",
//     noLocations: "No AR locations found nearby.",
//   },
//   ar: {
//     error: "خطأ",
//     close: "إغلاق",
//     deviceNotSupported: "الواقع المعزز يعمل على الجوال فقط.",
//     locationRequired: "يتطلب السماح بخدمة الموقع.",
//     cameraRequired: "يتطلب السماح بالكاميرا.",
//     noLocations: "لا توجد مواقع قريبة للعرض.",
//   }
// };


// /* ================= LOADER CONTROL ================= */

// function showLoader() {
//   loaderHidden = false;
//   const loader = document.getElementById("rd-loader");
//   loader.classList.remove("rd-loader--hidden");
// }

// function hideLoader() {
//   if (loaderHidden) return;
//   loaderHidden = true;

//   const loader = document.getElementById("rd-loader");
//   loader.classList.add("rd-loader--hidden");
// }

// /* ---------------- UI ---------------- */
// function showPopup(message) {
//   const popup = document.getElementById("popup");
//   popup.querySelector("p").textContent = message;
//   popup.style.display = "block";
// }

// function applyLanguage(lang) {
//   APP_LANG = lang in TRANSLATIONS ? lang : "en";

//   document.documentElement.lang = APP_LANG;
//   document.documentElement.dir = APP_LANG === "ar" ? "rtl" : "ltr";

//   // Popup static texts
//   document.querySelector("#popup h2").textContent =
//     TRANSLATIONS[APP_LANG].error;

//   document.querySelector("#popup button").textContent =
//     TRANSLATIONS[APP_LANG].close;
// }

// function closePopup() {
//   document.getElementById("popup").style.display = "none";
// }
// /* ---------------- DEVICE CHECK ---------------- */


// async function getDeviceInfo() {
//   try {
//     const response = await TWK.getDeviceInfo();
//     console.log("Device info:", response);

//     // Normalize response (handles both shapes)
//     const info = response.result ?? response;

//     //Language
//     applyLanguage(info.app_language || "en");

//     //  Device check (SAFE)
//     const model = (info.device_model || "").toLowerCase();

//     return (
//       model.includes("iphone") ||
//       model.includes("apple") ||
//       model.includes("ios") ||
//       model.includes("android") ||
//       model.includes("samsung") || 
//       model.includes("ipad")
//     );
//   } catch (e) {
//     console.error("getDeviceInfo error:", e);
//     return false;
//   }
// }



// async function getUserLocation() {
//   try {
//     const response = await TWK.getUserLocation();
//     console.log("Location response:", response);

//     const data = response.result ?? response;

//     if (!data.location || !data.location.latitude || !data.location.longitude) {
//       return false;
//     }

//     currentLocation = {
//       latitude: Number(data.location.latitude),
//       longitude: Number(data.location.longitude),
//     };

//     console.log("User location:", currentLocation);
//     return true;
//   } catch (e) {
//     console.error("Location error:", e);
//     return false;
//   }
// }

// function getMockLocations(baseLocation) {
//   return [
//     {
//       latitude: baseLocation.latitude + 0.001,
//       longitude: baseLocation.longitude + 0.001,
//       label: "مشروع الرياض الخضراء",
//       distance: 150,
//       type: "project",
//     },
//     {
//       latitude: baseLocation.latitude - 0.001,
//       longitude: baseLocation.longitude,
//       label: "محطة مترو الملك عبدالله",
//       distance: 250,
//       type: "metro",
//     },
//     {
//       latitude: baseLocation.latitude,
//       longitude: baseLocation.longitude + 0.002,
//       label: "منتزه الملك عبدالله",
//       distance: 350,
//       type: "project",
//     },
//   ];
// }
// /* ---------------- CAMERA ---------------- */


// async function getCameraPermission() {
//   try {
//     const response = await TWK.askCameraPermission();
//     console.log("Camera response:", response);

//     const data = response.result ?? response;

//     return data.granted === true;
//   } catch (e) {
//     console.error("Camera error:", e);
//     return false;
//   }
// }

// /* ---------------- API URL BUILDER ---------------- */

// // function buildApiUrl(lat, lon, radius = 0.01) {
// //   return `
// //     https://api.riyadh.sa/api/MomentProjects?_format=json
// //     &types[]=projects
// //     &types[]=metro_stations
// //     &langcode=en
// //     &lat[min]=${lat - radius}
// //     &lat[max]=${lat + radius}
// //     &lon[min]=${lon - radius}
// //     &lon[max]=${lon + radius}
// //     &on_ar=1
// //   `.replace(/\s/g, "");
// // }
// function buildApiUrl(lat, lon) {
//   return `
//     https://twk-services.rcrc.gov.sa/momentprojects.php?_format=json
//     &types[]=projects
//     &types[]=metro_stations
//     &langcode=${APP_LANG}
//     &lat[min]=${lat}
//     &lat[max]=${lat}
//     &lon[min]=${lon}
//     &lon[max]=${lon}
//     &on_ar=1
//   `.replace(/\s/g, "");
// }



// /* ---------------- FETCH LOCATIONS ---------------- */
// // async function fetchLocations(apiUrl) {
// //   try {
// //     const res = await fetch(apiUrl);
// //     const data = await res.json();

// //     if (!data.result?.items) return [];

// //     return data.result.items
// //       .filter(i => i.geofield?.lat && i.geofield?.lon)
// //       .map(i => ({
// //         latitude: i.geofield.lat,
// //         longitude: i.geofield.lon,
// //         label: i.title || "Location",
// //       }));
// //   } catch (e) {
// //     console.error("API error:", e);
// //     return [];
// //   }
// // }

// async function fetchLocations(apiUrl) {
//   try {
//     console.log("Fetching:", apiUrl);

//     const res = await fetch(apiUrl);
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);

//     const data = await res.json();
//     console.log("API response:", data);

//     const items = data?.result?.items;
//     if (!Array.isArray(items)) return [];

//     return items
//       .filter(i => i.geofield?.lat && i.geofield?.lon)
//       .map(i => ({
//         latitude: Number(i.geofield.lat),
//         longitude: Number(i.geofield.lon),
//         label: i.title || "Location"
//       }));

//   } catch (e) {
//     console.error("API error:", e);
//     return [];
//   }
// }


// /* ---------------- ADD AR MARKERS ---------------- */
// // function addMarkers(locations) {
// //   const scene = document.querySelector("a-scene");

// //   locations.forEach(loc => {
// //     const text = document.createElement("a-text");
// //     text.setAttribute("value", loc.label);
// //     text.setAttribute("scale", "15 15 15");
// //     text.setAttribute("align", "center");
// //     text.setAttribute("look-at", "[gps-camera]");
// //     text.setAttribute(
// //       "gps-entity-place",
// //       `latitude: ${loc.latitude}; longitude: ${loc.longitude}`
// //     );

// //     scene.appendChild(text);
// //   });
// // }

// /* ---------------- ADD AR MARKERS ---------------- */
// function addMarkers(locations) {
//   const scene = document.querySelector("a-scene");

//   locations.forEach(loc => {
//     // Create a container entity for each marker
//     const marker = document.createElement("a-entity");
//     marker.setAttribute(
//       "gps-entity-place",
//       `latitude: ${loc.latitude}; longitude: ${loc.longitude}`
//     );
//     marker.setAttribute("look-at", "[gps-camera]");

//     // Create circular background (like in the image)
//     const circle = document.createElement("a-circle");
//     circle.setAttribute("radius", "1.5");
//     circle.setAttribute("color", "#5c8a12"); // Green color from your button
//     circle.setAttribute("position", "0 0.8 0");
//     marker.appendChild(circle);

//     // Create text label (positioned above the circle)
//     const text = document.createElement("a-text");
//     text.setAttribute("value", loc.label);
//     text.setAttribute("align", "center");
//     text.setAttribute("color", "#FFFFFF"); // White text
//     text.setAttribute("position", "0 0.8 0.1"); // Slightly in front of the circle
//     text.setAttribute("scale", "2 2 2");
//     text.setAttribute("width", "5");
//     text.setAttribute("wrap-count", "20");
//     marker.appendChild(text);

//     // Optional: Add a small pointer/dot at the bottom
//     const pointer = document.createElement("a-circle");
//     pointer.setAttribute("radius", "0.2");
//     pointer.setAttribute("color", "#5c8a12");
//     pointer.setAttribute("position", "0 -0.5 0");
//     marker.appendChild(pointer);

//     // Add click event (optional)
//     marker.setAttribute("class", "clickable");
//     marker.addEventListener("click", () => {
//       console.log(`Clicked on: ${loc.label}`);
//       // Add your click handling logic here
//     });

//     scene.appendChild(marker);
//   });
// }
// // function waitForGpsAndAddMarkers(locations) {
// //   const camera = document.querySelector("[gps-camera]");
// //   if (!camera) return;

// //   camera.addEventListener(
// //     "gps-camera-update-position",
// //     () => {
// //       if (markersAdded) return;
// //       markersAdded = true;

// //       console.log("GPS ready, adding markers");
// //       addMarkers(locations);

// //        hideLoader();
// //     },
// //     { once: true }
// //   );
// // }
// function waitForSceneAndGps(locations) {
//   const scene = document.querySelector("a-scene");
//   const camera = document.querySelector("[gps-camera]");

//   if (!scene || !camera) {
//     hideLoader();
//     showPopup("AR scene initialization failed.");
//     return;
//   }

//   let sceneReady = false;
//   let gpsReady = false;

//   function tryFinish() {
//     if (sceneReady && gpsReady) {
//       addMarkers(locations);
//       hideLoader();
//       console.log("AR fully ready");
//     }
//   }

//   // Scene loaded
//   if (scene.hasLoaded) {
//     sceneReady = true;
//   } else {
//     scene.addEventListener("loaded", () => {
//       sceneReady = true;
//       tryFinish();
//     });
//   }

//   // GPS ready
//   camera.addEventListener(
//     "gps-camera-update-position",
//     () => {
//       if (gpsReady) return;
//       gpsReady = true;
//       tryFinish();
//     },
//     { once: true }
//   );
// }

// /* ---------------- INIT ---------------- */

// // async function initAR() {

// //     showLoader();

// //   if (!(await getDeviceInfo())) {
// //     showPopup(TRANSLATIONS[APP_LANG].deviceNotSupported);
// //     return;
// //   }

// //   if (!(await getUserLocation())) {
// //     showPopup(TRANSLATIONS[APP_LANG].locationRequired);
// //     return;
// //   }

// //   if (!(await getCameraPermission())) {
// //     showPopup(TRANSLATIONS[APP_LANG].cameraRequired);
// //     return;
// //   }

// //   const apiUrl = buildApiUrl(
// //     currentLocation.latitude,
// //     currentLocation.longitude
// //   );

// //   const locations = await fetchLocations(apiUrl);

// //   if (!locations.length) {
// //       hideLoader();
// //     showPopup(TRANSLATIONS[APP_LANG].noLocations);
// //     return;
// //   }

// //   waitForGpsAndAddMarkers(locations);
// // }
// async function initAR() {
//   showLoader();

//   try {
//     if (!(await getDeviceInfo())) {
//       throw TRANSLATIONS[APP_LANG].deviceNotSupported;
//     }

//     if (!(await getUserLocation())) {
//       throw TRANSLATIONS[APP_LANG].locationRequired;
//     }

//     if (!(await getCameraPermission())) {
//       throw TRANSLATIONS[APP_LANG].cameraRequired;
//     }

//     const apiUrl = buildApiUrl(
//       currentLocation.latitude,
//       currentLocation.longitude
//     );

//     // const locations = await fetchLocations(apiUrl);

//     // if (!locations.length) {
//     //   throw TRANSLATIONS[APP_LANG].noLocations;
//     // }

//     let locations = await fetchLocations(apiUrl);

//     if (!locations.length && USE_MOCK_LOCATIONS) {
//       console.warn("API returned no locations, using mock data");
//       locations = getMockLocations(currentLocation);
//     }

//     if (!locations.length) {
//       throw TRANSLATIONS[APP_LANG].noLocations;
//     }


//     waitForSceneAndGps(locations);

//   } catch (message) {
//     hideLoader();
//     showPopup(message);
//   }
// }



// window.addEventListener("load", initAR);



const apiUrl =
  "https://twk-services.rcrc.gov.sa/momentprojects.php?_format=json&types[]=projects&types[]=metro_stations&langcode=en&lat[min]=24.66&lat[max]=24.70&lon[min]=46.60&lon[max]=46.64&on_ar=1";

let currentLocation = null;

// Function to get the user's geolocation
async function getUserLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to fetch location. Please enable location services.");
        reject(error);
      },
      { enableHighAccuracy: true }
    );
  });
}

// Fetch location data from API
async function fetchLocations() {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.result?.items) {
      return data.result.items
        .filter((item) => item.geofield?.lat && item.geofield?.lon)
        .map((item) => ({
          latitude: item.geofield.lat,
          longitude: item.geofield.lon,
          label: item.title || "Unknown Location",
        }));
    } else {
      console.warn("Invalid API response:", data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching locations from API:", error);
    alert("Failed to fetch locations from API.");
    return [];
  }
}

// Calculate distance between two geographic coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Add markers dynamically to the scene
function addMarkers(locations) {
  const scene = document.querySelector("a-scene");

  locations.forEach((location) => {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      location.latitude,
      location.longitude
    ).toFixed(2);

    // Create a text marker
    const marker = document.createElement("a-text");
    marker.setAttribute("value", `${location.label}\n(${distance} km)`);
    marker.setAttribute("look-at", "[gps-camera]");
    marker.setAttribute("scale", "10 10 10");
    marker.setAttribute(
      "gps-entity-place",
      `latitude: ${location.latitude}; longitude: ${location.longitude}`
    );

    // Append the marker to the scene
    scene.appendChild(marker);
  });
}

// Initialize the AR scene
async function initAR() {
  try {
    console.log("Initializing AR...");
    currentLocation = await getUserLocation();
    console.log("User location:", currentLocation);

    const locations = await fetchLocations();
    if (locations.length === 0) {
      alert("No locations found to display.");
      return;
    }

    addMarkers(locations);
    console.log("Markers added to the scene.");
  } catch (error) {
    console.error("Error initializing AR:", error);
  }
}

// Start the AR experience when the page loads
window.onload = initAR;
