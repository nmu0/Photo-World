// ====== Firebase Setup ======
const firebaseConfig = {
    apiKey: "AIzaSyBIHbMOS0LhQT3D_DctalLTHdoUMQFg63w",
    authDomain: "world-of-vibes.firebaseapp.com",
    projectId: "world-of-vibes",
    storageBucket: "world-of-vibes.appspot.com",
    messagingSenderId: "50522382303",
    appId: "1:50522382303:web:8ac96e9d2cc55a7745ee6a",
    measurementId: "G-JTGPK5Q8HY"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, 2500);
}

// ====== Mapbox Setup ======
mapboxgl.accessToken = 'pk.eyJ1Ijoibm11cyIsImEiOiJjbThsYTdhemExMHpwMmpweDV5eXVzbm9qIn0.Fy0lhJ_EdhNGPG7BBVqnSQ';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [0, 20],
    zoom: 2
});

gsap.from("#map", {
    duration: 1,
    opacity: 0,
    y: 50
});

// ====== Variables ======
let selectedCoords = null;
let uploadedPhotoURL = null;

// ====== Handle map click ======
map.on('click', (e) => {
    selectedCoords = e.lngLat;
    alert("Location selected! Now enter your vibe and photo (optional), then click 'Drop a Vibe'.");
});

// ====== Photo Upload (Base64) ======
const photoInput = document.getElementById("photo-upload");

photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please upload an image file.");
        return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
        uploadedPhotoURL = reader.result; // base64 string
        alert("Photo ready to upload!");
    };

    reader.readAsDataURL(file); // Convert to base64
});

// ====== Drop a Vibe ======
document.getElementById("drop-vibe-btn").addEventListener("click", async () => {
    if (!selectedCoords) {
        alert("Click on the map to pick a location first.");
        return;
    }

    if (!uploadedPhotoURL) {
        alert("Please upload a photo first!");
        return;
    }

    document.getElementById("drop-vibe-btn").addEventListener("click", () => {
        if (isUploading) return showToast("Photo is still uploading — please wait!");
        if (!selectedCoords) return showToast("Click on the map to pick a location first.");
        if (!uploadedPhotoURL) return showToast("Please upload a photo first!");

        // Show the modal
        document.getElementById("vibe-modal").classList.remove("hidden");
        document.getElementById("vibe-input").value = "";
    });


    const vibeData = {
        vibeText: vibeText,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        photoURL: uploadedPhotoURL,
        timestamp: Date.now()
    };

    try {
        await db.collection("vibes").add(vibeData);
        alert("Vibe saved!");

        uploadedPhotoURL = null;
        photoInput.value = "";
    } catch (err) {
        console.error("Error saving vibe:", err);
    }
});

// ====== Show vibes on map ======
db.collection("vibes").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
            const data = change.doc.data();
            const popupHTML = `
        <p>${data.vibeText}</p>
        ${data.photoURL ? `<img src="${data.photoURL}" style="max-width: 100px; border-radius: 8px;" />` : ""}
      `;
            new mapboxgl.Marker()
                .setLngLat([data.lng, data.lat])
                .setPopup(new mapboxgl.Popup().setHTML(popupHTML))
                .addTo(map);
        }
    });
});

// ====== View Switching ======
const homeBtn = document.getElementById("home-btn");
const feedBtn = document.getElementById("feed-btn");
const mapView = document.getElementById("map");
const feedView = document.getElementById("feed");

homeBtn.addEventListener("click", () => {
    mapView.classList.remove("hidden");
    feedView.classList.add("hidden");
    setTimeout(() => map.resize(), 100);
});

feedBtn.addEventListener("click", () => {
    mapView.classList.add("hidden");
    feedView.classList.remove("hidden");
});

// ====== Load Photo Feed ======
const feedList = document.getElementById("feed-list");

db.collection("vibes")
    .orderBy("timestamp", "desc")
    .limit(30)
    .onSnapshot(snapshot => {
        feedList.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.photoURL) {
                const imgEl = document.createElement("img");
                imgEl.src = data.photoURL;
                imgEl.className = "feed-img";
                feedList.appendChild(imgEl);
            }
        });
    });

document.getElementById("vibe-cancel").addEventListener("click", () => {
    document.getElementById("vibe-modal").classList.add("hidden");
});

document.getElementById("vibe-submit").addEventListener("click", async () => {
    const vibeText = document.getElementById("vibe-input").value.trim();
    if (!vibeText) return showToast("Enter a vibe first!");

    const vibeData = {
        vibeText,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        photoURL: uploadedPhotoURL,
        timestamp: Date.now()
    };

    try {
        await db.collection("vibes").add(vibeData);
        showToast("Vibe saved!");
        document.getElementById("vibe-modal").classList.add("hidden");
        uploadedPhotoURL = null;
        document.getElementById("photo-upload").value = "";
    } catch (err) {
        console.error("Error saving vibe:", err);
        showToast("Something went wrong!");
    }
});
