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
    }, 3000);
}

function openModal() {
    document.getElementById("vibe-modal").classList.remove("hidden");
    document.getElementById("vibe-input").value = "";
    setTimeout(() => document.getElementById("vibe-input").focus(), 50);
}

function closeModal() {
    document.getElementById("vibe-modal").classList.add("hidden");
}

// ====== Mapbox Setup ======
mapboxgl.accessToken = 'pk.eyJ1Ijoibm11cyIsImEiOiJjbThsYTdhemExMHpwMmpweDV5eXVzbm9qIn0.Fy0lhJ_EdhNGPG7BBVqnSQ';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [0, 20],
    zoom: 2
});

gsap.from("#map", { duration: 1, opacity: 0, y: 50 });

// ====== Variables ======
let selectedCoords = null;
let uploadedPhotoURL = null;
let isUploading = false;

// ====== Photo Upload (Base64) ======
document.getElementById("photo-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("Please upload an image file.");

    isUploading = true;
    const reader = new FileReader();
    reader.onloadend = () => {
        uploadedPhotoURL = reader.result;
        isUploading = false;
        showToast("📷 Photo ready! Now tap a spot on the map.");
    };
    reader.readAsDataURL(file);
});

// ====== Map click → open modal ======
map.on('click', (e) => {
    if (e.originalEvent.target !== map.getCanvas()) return;
    if (isUploading) return showToast("Photo is still uploading — please wait!");
    if (!uploadedPhotoURL) return showToast("Upload a photo first, then tap a location!");

    selectedCoords = e.lngLat;
    openModal();
});

// ====== Drop a Vibe button ======
document.getElementById("drop-vibe-btn").addEventListener("click", () => {
    if (isUploading) return showToast("Photo is still uploading — please wait!");
    if (!uploadedPhotoURL) return showToast("Please upload a photo first!");
    if (!selectedCoords) return showToast("Tap the map to pick a location!");
    openModal();
});

// ====== Close modal on backdrop click ======
document.getElementById("vibe-modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("vibe-modal")) closeModal();
});

// ====== Cancel modal ======
document.getElementById("vibe-cancel").addEventListener("click", closeModal);

// ====== Submit vibe ======
document.getElementById("vibe-submit").addEventListener("click", () => {
    const vibeText = document.getElementById("vibe-input").value.trim();
    if (!vibeText) return showToast("Enter a vibe first!");
    if (!selectedCoords) return showToast("No location — close and tap the map again.");

    const MAX_SIZE = 900000;
    if (uploadedPhotoURL && uploadedPhotoURL.length > MAX_SIZE) {
        return showToast("⚠️ Photo too large — try a smaller image!");
    }

    const vibeData = {
        vibeText,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        photoURL: uploadedPhotoURL,
        timestamp: Date.now()
    };

    // Close the modal immediately — don't wait for Firestore
    closeModal();
    showToast("Dropping vibe... 🌍");

    const capturedCoords = selectedCoords;
    uploadedPhotoURL = null;
    selectedCoords = null;
    document.getElementById("photo-upload").value = "";

    db.collection("vibes").add(vibeData)
        .then(() => showToast("Vibe dropped! 🌍"))
        .catch((err) => {
            console.error("Firestore error:", err);
            showToast("Error: " + err.message);
        });
});

// ====== Show vibes on map ======
db.collection("vibes").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
            const data = change.doc.data();
            if (!data.lat || !data.lng) return;
            const popupHTML = `
                <p>${data.vibeText || ""}</p>
                ${data.photoURL ? `<img src="${data.photoURL}" style="max-width:100px;border-radius:8px;" />` : ""}
            `;
            new mapboxgl.Marker()
                .setLngLat([data.lng, data.lat])
                .setPopup(new mapboxgl.Popup().setHTML(popupHTML))
                .addTo(map);
        }
    });
}, (err) => console.error("Snapshot error:", err));

// ====== View Switching ======
document.getElementById("home-btn").addEventListener("click", () => {
    document.getElementById("map").classList.remove("hidden");
    document.getElementById("feed").classList.add("hidden");
    setTimeout(() => map.resize(), 100);
});

document.getElementById("feed-btn").addEventListener("click", () => {
    document.getElementById("map").classList.add("hidden");
    document.getElementById("feed").classList.remove("hidden");
});

// ====== Load Photo Feed ======
db.collection("vibes")
    .orderBy("timestamp", "desc")
    .limit(30)
    .onSnapshot(snapshot => {
        const feedList = document.getElementById("feed-list");
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
    }, (err) => console.error("Feed error:", err));