//JS v1.5
//================
function generateSignatureFromParams(signatureParams, sharedSecret) {
  return new Promise((resolve) => {
    resolve(generateSignatureFromParamsHelper(signatureParams, sharedSecret));
  });
}
async function generateSignatureFromParamsHelper(
  signatureParams,
  sharedSecret
) {
  try {
    // Convert the message and key to ArrayBuffer
    const encoder = new TextEncoder();
    const encodedKey = encoder.encode(sharedSecret);
    const encodedMessage = encoder.encode(signatureParams);
    const keyBuffer = await crypto.subtle.importKey(
      "raw",
      encodedKey,
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      keyBuffer,
      encodedMessage
    );

    // Convert the signature buffer to a hexadecimal string
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureHex = signatureArray
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return btoa(signatureHex);
  } catch (error) {
    console.error("Error calculating HMAC:", error);
    return null;
  }
}

//Function to create a SHA-256 digest for a given message
function createDigest(message) {
  return new Promise((resolve) => {
    resolve(createDigestHelper(message));
  });
}
async function createDigestHelper(message) {
  var buffer = new TextEncoder("utf-8").encode(message);
  return await crypto.subtle.digest("SHA-256", buffer).then(function (hash) {
    const digestArray = Array.from(new Uint8Array(hash));
    const digestHex = digestArray
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return btoa(digestHex);
  });
}

// Generates a signature header using HMAC for all the headers (including the body digest)
function generateHttpHashHeaders(path, method, messageBody) {
  return new Promise((resolve) => {
    createDigest(messageBody).then((response) => {
      let digest = response;
      let requestTarget = `${method.toLowerCase()} ${path}`;
      let headers = {
        Digest: `SHA-256=${digest}`,
        "Date-Time": new Date().toUTCString(),
        "Host-Name": "localhost",
        "Request-Target": requestTarget,
      };

      var signatureParams = "";
      for (const [key, value] of Object.entries(headers)) {
        signatureParams += `${key}: ${value},`;
        if (ENABLELOG == true) {
          console.log(key + ":" + value);
        }
      }
      if (ENABLELOG == true) {
        console.log(signatureParams);
      }
      generateSignatureFromParams(signatureParams, SHAREDSECRET).then(
        (response) => {
          let signature = response;
          let sigend_headers = Object.keys(headers);
          let signatureHeader = `Signature: algorithm="HMAC-SHA256",headers="${sigend_headers}",signature="${signature}"`;
          // Add signature to header
          headers["Signature"] = signatureHeader;
          if (ENABLELOG == true) {
            console.log("Digest", digest);
            console.log("Signature Params", signatureParams);
            console.log("Generated Signature:", signature);
            console.log("signature Header:", signatureHeader);
            console.log("headers:", headers);
          }
          resolve(headers);
        }
      );
    });
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    // Check if the file is provided
    if (!file) {
      reject("No file provided");
      return;
    }

    // Create a new FileReader
    const reader = new FileReader();

    // Set up onload event
    reader.onload = () => {
      // Get the base64-encoded string from the data URL
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };

    // Set up onerror event
    reader.onerror = () => {
      reject("Error occurred while reading the file");
    };

    // Read the file as a data URL
    reader.readAsDataURL(file);
  });
}

function encodeBase64(array) {
  return new Promise((resolve) => {
    const blob = new Blob([array]);
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const [_, base64] = dataUrl.split(",");
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

async function getReturn(httpRequest, rawForce) {
  var textDecoder = new TextDecoder("utf-8");
  if (ENABLELOG == true) {
    console.log("rawforce " + rawForce);
  }
  var ret = {};
  if (httpRequest.readyState === XMLHttpRequest.DONE) {
    if (ENABLELOG == true) {
      console.log("httpRequest.status " + httpRequest.status);
    }
    try {
      var isRaw = false;
      var contentType = httpRequest.getResponseHeader("content-type");
      const buffer = httpRequest.response;
      const byteArray = new Uint8Array(buffer);

      if (rawForce) {
        isRaw = true;
      }
      if (ENABLELOG == true) {
        console.log(" contentType " + contentType + " " + isRaw);
      }
      var textContent = "";
      if (!isRaw) {
        if (ENABLELOG == true) {
          console.log("bytearray " + byteArray.length);
          console.log("bytearray " + byteArray.length);
        }
        textContent = textDecoder.decode(byteArray);
        if (ENABLELOG == true) {
          console.log("textContent " + textContent);
        }
      }

      if (isRaw) {
        if (httpRequest.status === 200) {
          ret.success = true;
          ret.result = {};
          ret.result.type = "file";
          ret.result.mime_type = contentType;
          ret.result.data = await encodeBase64(byteArray);
        }
      } else if (httpRequest.status == 200) {
        ret.success = true;
        ret.result = JSON.parse(textContent);
      } else {
        ret.success = false;
        try {
          ret.result = JSON.parse(textContent);
        } catch (error) {
          ret.result = textContent;
        }
      }
    } catch (error) {
      if (ENABLELOG == true) {
        console.log(error);
      }
      ret.success = false;
      ret.result = {
        error: error,
      };
    }
  }
  return ret;
}

function fileEndpointHelper() {
  return new Promise((resolveTop) => {
    httpHelper("/files").then((fileIdFetch) => {
      if (ENABLELOG == true) {
        console.log(fileIdFetch);
      }
      if (fileIdFetch.success) {
        TWK.getRawData(fileIdFetch.result.data).then((fileFetch) => {
          resolveTop(fileFetch);
        });
      } else {
        var ret = {};
        ret.success = false;
        ret.result = {};
        resolveTop(ret);
      }
    });
  });
}
function httpHelper(endpoint, rawForce) {
  if (ENABLELOG == true) {
    console.log("rawforce " + rawForce);
  }
  return new Promise((resolve) => {
    var httpRequest = new XMLHttpRequest();
    var address = TWKAPIBASE + endpoint;
    httpRequest.onreadystatechange = function loaded() {
      if (httpRequest.readyState === XMLHttpRequest.DONE) {
        resolve(getReturn(httpRequest, rawForce));
      }
    };

    httpRequest.ontimeout = function timeout(e) {
      var ret = {};
      ret.success = false;
      ret.result = {
        error: "timeout",
      };
      resolve(ret);
    };
    httpRequest.responseType = "arraybuffer";
    httpRequest.open("GET", address);

    generateHttpHashHeaders(address, "GET", "").then((headers) => {
      for (const [key, value] of Object.entries(headers)) {
        if (ENABLELOG == true) {
          console.log(key, value);
        }
        httpRequest.setRequestHeader(key, value);
      }
      httpRequest.send();
    });
  });
}

window.TWK = {
  getRawData: function (file) {
    return httpHelper("/gallery/raw_data?file_name=" + file, true);
  },
  getUserId: function () {
    return httpHelper("/user_data/user_id");
  },
  getUserType: function () {
    return httpHelper("/user_data/user_type");
  },
  getUserBirthDate: function () {
    return httpHelper("/user_data/birth_date");
  },
  getUserMobileNumber: function () {
    return httpHelper("/user_data/mobile_number");
  },
  getUserGender: function () {
    return httpHelper("/user_data/gender");
  },
  getUserLocation: function () {
    return httpHelper("/user_data/user_location");
  },
  getUserNationality: function () {
    return httpHelper("/user_data/nationality_name");
  },
  getUserNationalityISO: function () {
    return httpHelper("/user_data/nationality_iso");
  },
  getUserFullName: function () {
    return httpHelper("/user_data/full_name");
  },
  getUserMaritalStatus: function () {
    return httpHelper("/user_data/marital_status");
  },
  getUserHealthStatus: function () {
    return httpHelper("/user_data/health_status");
  },
  getUserDisabilityType: function () {
    return httpHelper("/user_data/disability_type");
  },
  getUserBloodType: function () {
    return httpHelper("/user_data/blood_type");
  },
  getUserNationalAddress: function () {
    return httpHelper("/user_data/national_address");
  },
  getUserDegreeType: function () {
    return httpHelper("/user_data/degree_type");
  },
  getUserOccupation: function () {
    return httpHelper("/user_data/occupation");
  },
  getUserFamilyMembers: function (minage, maxage, gender) {
    if (minage > 0 && maxage > 0) {
      return httpHelper(
        "/user_data/sponsors?age=" + minage + "-" + maxage + "&gender=" + gender
      );
    } else return httpHelper("/user_data/family_members");
  },
  getUserSponsors: function (minage, maxage, gender) {
    if (minage > 0 && maxage > 0) {
      return httpHelper(
        "/user_data/sponsors?age=" + minage + "-" + maxage + "&gender=" + gender
      );
    } else return httpHelper("/user_data/sponsors");
  },
  getUserUnPaidViolations: function () {
    return httpHelper("/user_data/violations/unpaid");
  },
  getUserPaidViolations: function () {
    return httpHelper("/user_data/violations/paid");
  },
  getUserVehicles: function () {
    return httpHelper("/user_data/vehicles");
  },
  getUserProfilePhoto: function () {
    return httpHelper("/user_data/user_photo");
  },
  getDeviceInfo: function () {
    return httpHelper("/capabilities");
  },
  getGallerySingle: function () {
    return httpHelper("/gallery/image/single");
  },
  getGalleryMulti: function () {
    return httpHelper("/gallery/image/multi");
  },
  getGallerySingleVideo: function () {
    return httpHelper("/gallery/video/single");
  },
  getGalleryMultiVideo: function () {
    return httpHelper("/gallery/video/multi");
  },
  getCameraPhoto: function () {
    return httpHelper("/camera/image");
  },
  getCameraVideo: function () {
    return httpHelper("/camera/video");
  },
  getFileBase64: function () {
    return fileEndpointHelper();
  },
  getFileId: function () {
    return httpHelper("/files");
  },
  askUserLocationPermission: function () {
    return httpHelper("/ask_permissions/location");
  },
  askUserPreciseLocationPermission: function () {
    return httpHelper("/ask_permissions/precise_location");
  },
  askCameraPermission: function () {
    return httpHelper("/ask_permissions/camera");
  },
  askGalleryPermission: function () {
    return httpHelper("/ask_permissions/gallery");
  },
  askPushNotificationPermission: function () {
    return httpHelper("/ask_permissions/push_notification");
  },
  authenticateBiometric: function () {
    return httpHelper("/authenticate/biometric");
  },
  shareScreenShot: function () {
    return httpHelper("/share/screenshot");
  },
  openScreen: function (screenType, valuesParam) {
    return new Promise((resolve) => {
      httpRequest = new XMLHttpRequest();
      var address = TWKAPIBASE + "/open_screen";
      httpRequest.onreadystatechange = function loaded() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
          resolve(getReturn(httpRequest));
        }
      };

      var toSend = {
        screenType: screenType,
        openParams: valuesParam,
      };
      httpRequest.responseType = "arraybuffer";
      httpRequest.open("POST", address);
      httpRequest.setRequestHeader("Content-type", "application/json");
      let messageBody = JSON.stringify(toSend);
      generateHttpHashHeaders(address, "POST", messageBody).then((headers) => {
        for (const [key, value] of Object.entries(headers)) {
          if (ENABLELOG == true) {
            console.log(key, value);
          }
          httpRequest.setRequestHeader(key, value);
        }
        httpRequest.send(JSON.stringify(toSend)); // Make sure to stringify
      });
    });
  },
  postCard: function (actionType, payload) {
    return new Promise((resolve) => {
      httpRequest = new XMLHttpRequest();
      var address = TWKAPIBASE + "/cards";
      httpRequest.onreadystatechange = function loaded() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
          resolve(getReturn(httpRequest));
        }
      };
      var toSend = {
        payload: payload,
        actionType: actionType,
      };

      httpRequest.open("POST", address);
      httpRequest.setRequestHeader(
        "Content-type",
        "application/json; charset=utf-8"
      );
      let messageBody = JSON.stringify(toSend);
      generateHttpHashHeaders(address, "POST", messageBody).then((headers) => {
        for (const [key, value] of Object.entries(headers)) {
          if (ENABLELOG == true) {
            console.log(key, value);
          }
          httpRequest.setRequestHeader(key, value);
        }

        httpRequest.responseType = "arraybuffer";
        httpRequest.send(JSON.stringify(toSend)); // Make sure to stringify
      });
    });
  },
  generateToken: function () {
    return httpHelper("/authenticate/generatetoken");
  },
  share: function (fileName, content, mimetype) {
    return new Promise((resolve) => {
      httpRequest = new XMLHttpRequest();
      var address = TWKAPIBASE + "/share/base64";
      httpRequest.onreadystatechange = function loaded() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
          resolve(getReturn(httpRequest));
        }
      };
      var toSend = {
        fileName: fileName,
        content: content,
        mimetype: mimetype,
      };

      httpRequest.open("POST", address);
      httpRequest.setRequestHeader(
        "Content-type",
        "application/json; charset=utf-8"
      );
      let messageBody = JSON.stringify(toSend);
      generateHttpHashHeaders(address, "POST", messageBody).then((headers) => {
        for (const [key, value] of Object.entries(headers)) {
          if (ENABLELOG == true) {
            console.log(key, value);
          }
          httpRequest.setRequestHeader(key, value);
        }

        httpRequest.responseType = "arraybuffer";
        httpRequest.send(JSON.stringify(toSend)); // Make sure to stringify
      });
    });
  },
  scanCode: function () {
    return httpHelper("/scan_code");
  },
  openService: function (serviceId, valuesParam) {
    return new Promise((resolve) => {
      httpRequest = new XMLHttpRequest();
      var address = TWKAPIBASE + "/open_service";
      httpRequest.onreadystatechange = function loaded() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
          resolve(getReturn(httpRequest));
        }
      };

      var toSend = {
        serviceId: serviceId,
        openParams: valuesParam,
      };
      httpRequest.responseType = "arraybuffer";
      httpRequest.open("POST", address);
      httpRequest.setRequestHeader("Content-type", "application/json");
      let messageBody = JSON.stringify(toSend);
      generateHttpHashHeaders(address, "POST", messageBody).then((headers) => {
        for (const [key, value] of Object.entries(headers)) {
          if (ENABLELOG == true) {
            console.log(key, value);
          }
          httpRequest.setRequestHeader(key, value);
        }
        httpRequest.send(JSON.stringify(toSend)); // Make sure to stringify
      });
    });
  },
  getImage: function (nationalId) {
    return new Promise((resolve) => {
      httpRequest = new XMLHttpRequest();
      var address = TWKAPIBASE + "user_data/image";
      httpRequest.onreadystatechange = function loaded() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
          resolve(getReturn(httpRequest));
        }
      };

      var toSend = {
        national_id: nationalId,
      };
      httpRequest.responseType = "arraybuffer";
      httpRequest.open("POST", address);
      httpRequest.setRequestHeader("Content-type", "application/json");
      let messageBody = JSON.stringify(toSend);
      generateHttpHashHeaders(address, "POST", messageBody).then((headers) => {
        for (const [key, value] of Object.entries(headers)) {
          if (ENABLELOG == true) {
            console.log(key, value);
          }
          httpRequest.setRequestHeader(key, value);
        }
        httpRequest.send(JSON.stringify(toSend)); // Make sure to stringify
      });
    });
  },
  setPaymentConfiguration: function (callbackSuccessUrlList, callbackFailureUrlList, successPageName, failurePageName) {
    if (!Array.isArray(callbackSuccessUrlList)) {
      throw new Error("callbackSuccessUrlList Argument must be an array");
    }
    if (!Array.isArray(callbackFailureUrlList)) {
      throw new Error("callbackFailureUrlList Argument must be an array");
    }

    let config = {
      callbackSuccessUrlList: callbackSuccessUrlList,
      callbackFailureUrlList: callbackFailureUrlList,
      successPageName: successPageName,
      failurePageName: failurePageName,
    };
 
    let jsonString = JSON.stringify(config)
    if (isValidJSON(jsonString)) {
      if (window.webkit) {
        window.webkit.messageHandlers.paymentHandler.postMessage(jsonString);
      } else if (window.PaymentConfigInterface) {
        window.PaymentConfigInterface.paymentConfig(jsonString);
      }
    }
  }
  // other properties
};

window.TWK.V2 = {
    generateToken: function () {
        return httpHelper("v2/authenticate/generatetoken");
      },
      getUserFullName: function () {
        return httpHelper("v2/user_data/full_name");
      },
      getUserFamilyMembers: function (minage, maxage, gender) {
        if (minage > 0 && maxage > 0) {
          return httpHelper(
            "v2/user_data/family_members?age=" + minage + "-" + maxage + "&gender=" + gender
          );
        } else return httpHelper("v2/user_data/family_members");
      }
};

