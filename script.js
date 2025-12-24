let currentLocation = null;
let APP_LANG = "en";
let loaderHidden = false;

const USE_MOCK_LOCATIONS = true;

/* ================= LOADER ================= */

function showLoader() {
  loaderHidden = false;
  document.getElementById("rd-loader").classList.remove("rd-loader--hidden");
}

function hideLoader() {
  if (loaderHidden) return;
  loaderHidden = true;
  document.getElementById("rd-loader").classList.add("rd-loader--hidden");
}

/* ================= POPUP ================= */

function showPopup(msg) {
  const popup = document.getElementById("popup");
  popup.querySelector("p").textContent = msg;
  popup.style.display = "block";
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

/* ================= DEVICE ================= */

async function getDeviceInfo() {
  try {
    const res = await TWK.getDeviceInfo();
    const info = res.result ?? res;

    APP_LANG = info.app_language || "en";

    return /ios|android|iphone|ipad/i.test(info.device_model || "");
  } catch {
    return false;
  }
}

/* ================= LOCATION ================= */

async function getUserLocation() {
  try {
    const res = await TWK.getUserLocation();
    const loc = res.result?.location;

    if (!loc) return false;

    currentLocation = {
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
    };
    return true;
  } catch {
    return false;
  }
}

/* ================= CAMERA ================= */

async function getCameraPermission() {
  try {
    const res = await TWK.askCameraPermission();
    return res.result?.granted === true;
  } catch {
    return false;
  }
}

/* ================= API ================= */

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

async function fetchLocations(url) {
  try {
    const res = await fetch(url);
    const data = await res.json();

    return (data.result?.items || [])
      .filter(i => i.geofield?.lat && i.geofield?.lon)
      .map(i => ({
        latitude: i.geofield.lat,
        longitude: i.geofield.lon,
        label: i.title || "Location",
      }));
  } catch {
    return [];
  }
}

/* ================= MOCK ================= */

function getMockLocations(base) {
  return [
    {
      latitude: base.latitude + 0.001,
      longitude: base.longitude + 0.001,
      label: "مشروع الرياض الخضراء",
    },
    {
      latitude: base.latitude - 0.001,
      longitude: base.longitude,
      label: "محطة مترو",
    },
  ];
}

/* ================= MARKERS ================= */

function addMarkers(locations) {
  const scene = document.querySelector("a-scene");

  locations.forEach(loc => {
    const marker = document.createElement("a-entity");

    marker.setAttribute(
      "gps-entity-place",
      `latitude: ${loc.latitude}; longitude: ${loc.longitude}`
    );

    marker.setAttribute("look-at", "[gps-camera]");
    marker.setAttribute("scale", "20 20 20");

    marker.innerHTML = `
      <a-image
        src="img/pin.png"
        width="1"
        height="1"
      ></a-image>

      <a-text
        value="${loc.label}"
        align="center"
        position="0 1.2 0"
        scale="2 2 2"
        color="#ff7a00"
      ></a-text>
    `;

    scene.appendChild(marker);
  });
}

/* ================= INIT ================= */

async function initAR() {
  showLoader();

  try {
    if (!(await getDeviceInfo())) throw "Mobile only";
    if (!(await getUserLocation())) throw "Location required";
    if (!(await getCameraPermission())) throw "Camera required";

    const url = buildApiUrl(
      currentLocation.latitude,
      currentLocation.longitude
    );

    let locations = await fetchLocations(url);

    if (!locations.length && USE_MOCK_LOCATIONS) {
      locations = getMockLocations(currentLocation);
    }

    if (!locations.length) throw "No locations";

    const camera = document.querySelector("[gps-camera]");

    camera.addEventListener(
      "gps-camera-update-position",
      () => {
        addMarkers(locations);
        hideLoader();
      },
      { once: true }
    );

  } catch (e) {
    hideLoader();
    showPopup(e);
  }
}

window.addEventListener("load", initAR);
