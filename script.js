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

// ====== Toast ======
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

// ====== Modal ======
function openModal() {
    document.getElementById("vibe-modal").classList.remove("hidden");
    document.getElementById("vibe-input").value = "";
    setTimeout(() => document.getElementById("vibe-input").focus(), 50);
}

function closeModal() {
    document.getElementById("vibe-modal").classList.add("hidden");
}

// ====== Mapbox ======
mapboxgl.accessToken = 'pk.eyJ1Ijoibm11cyIsImEiOiJjbThsYTdhemExMHpwMmpweDV5eXVzbm9qIn0.Fy0lhJ_EdhNGPG7BBVqnSQ';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [0, 20],
    zoom: 2
});

gsap.from("#header", { duration: 0.6, opacity: 0, y: -10 });
gsap.from("#map", { duration: 0.8, opacity: 0, delay: 0.2 });

// ====== State ======
let selectedCoords = null;
let uploadedPhotoURL = null;
let isUploading = false;

// ====== Photo Upload ======
const photoUpload = document.getElementById("photo-upload");
const uploadLabel = document.getElementById("upload-label");
const postBtn = document.getElementById("post-btn");

photoUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return showToast("Image files only.");

    isUploading = true;
    uploadLabel.textContent = "Loading...";

    const reader = new FileReader();
    reader.onloadend = () => {
        if (reader.result.length > 900000) {
            isUploading = false;
            uploadLabel.textContent = "Choose photo";
            return showToast("Photo too large — try under 700KB.");
        }
        uploadedPhotoURL = reader.result;
        isUploading = false;
        uploadLabel.textContent = "Photo ready";
        uploadLabel.classList.add("ready");
        postBtn.disabled = false;
        showToast("Photo loaded. Tap the map to place it.");
    };
    reader.readAsDataURL(file);
});

// ====== Post button → needs location ======
postBtn.addEventListener("click", () => {
    if (!selectedCoords) {
        // Show hint on map
        const hint = document.getElementById("map-hint");
        hint.classList.add("visible");
        setTimeout(() => hint.classList.remove("visible"), 3000);

        // Switch to map if on feed
        document.getElementById("map").classList.remove("hidden");
        document.getElementById("feed").classList.add("hidden");
        homeBtn.classList.add("active");
        feedBtn.classList.remove("active");
        setTimeout(() => map.resize(), 100);
        return;
    }
    openModal();
});

// ====== Map click ======
map.on('click', (e) => {
    if (e.originalEvent.target !== map.getCanvas()) return;
    if (!uploadedPhotoURL) {
        showToast("Choose a photo first.");
        return;
    }
    selectedCoords = e.lngLat;
    showToast("Location set.");
    openModal();
});

// ====== Modal buttons ======
document.getElementById("vibe-modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("vibe-modal")) closeModal();
});
document.getElementById("vibe-cancel").addEventListener("click", closeModal);

document.getElementById("vibe-submit").addEventListener("click", () => {
    const caption = document.getElementById("vibe-input").value.trim();
    if (!caption) return showToast("Add a caption.");
    if (!selectedCoords) return showToast("No location set.");

    const vibeData = {
        vibeText: caption,
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        photoURL: uploadedPhotoURL,
        timestamp: Date.now()
    };

    closeModal();
    showToast("Posting...");

    uploadedPhotoURL = null;
    selectedCoords = null;
    photoUpload.value = "";
    uploadLabel.textContent = "Choose photo";
    uploadLabel.classList.remove("ready");
    postBtn.disabled = true;

    db.collection("vibes").add(vibeData)
        .then(() => showToast("Posted."))
        .catch((err) => showToast("Error: " + err.message));
});

// ====== Load vibes on map ======
db.collection("vibes").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
            const data = change.doc.data();
            if (!data.lat || !data.lng) return;

            // Custom marker with thumbnail
            const el = document.createElement("div");
            el.style.cssText = `
                width: 36px; height: 36px;
                border: 2px solid #0a0a0a;
                border-radius: 0;
                background: #0a0a0a;
                overflow: hidden;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            `;
            if (data.photoURL) {
                el.style.backgroundImage = `url(${data.photoURL})`;
                el.style.backgroundSize = "cover";
                el.style.backgroundPosition = "center";
            }

            const popupHTML = `
                <div style="font-family:'Helvetica Neue',sans-serif; max-width:200px;">
                    ${data.photoURL ? `<img src="${data.photoURL}" style="width:100%;display:block;margin-bottom:8px;" />` : ""}
                    <div style="font-size:0.75rem;letter-spacing:0.06em;color:#444;padding:0 2px 4px;">${data.vibeText || ""}</div>
                </div>
            `;

            new mapboxgl.Marker({ element: el })
                .setLngLat([data.lng, data.lat])
                .setPopup(new mapboxgl.Popup({ offset: 20, closeButton: false })
                    .setHTML(popupHTML))
                .addTo(map);
        }
    });
}, (err) => console.error("Snapshot error:", err));

// ====== Feed ======
db.collection("vibes")
    .orderBy("timestamp", "desc")
    .limit(30)
    .onSnapshot(snapshot => {
        const feedList = document.getElementById("feed-list");
        feedList.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.photoURL) return;

            const wrap = document.createElement("div");
            wrap.className = "feed-img-wrap";

            const img = document.createElement("img");
            img.src = data.photoURL;
            img.className = "feed-img";
            img.loading = "lazy";
            wrap.appendChild(img);

            if (data.vibeText) {
                const caption = document.createElement("div");
                caption.className = "feed-vibe-text";
                caption.textContent = data.vibeText;
                wrap.appendChild(caption);
            }

            feedList.appendChild(wrap);
        });
    }, (err) => console.error("Feed error:", err));

// ====== Nav ======
const homeBtn = document.getElementById("home-btn");
const feedBtn = document.getElementById("feed-btn");

homeBtn.addEventListener("click", () => {
    document.getElementById("map").classList.remove("hidden");
    document.getElementById("feed").classList.add("hidden");
    homeBtn.classList.add("active");
    feedBtn.classList.remove("active");
    setTimeout(() => map.resize(), 100);
});

feedBtn.addEventListener("click", () => {
    document.getElementById("map").classList.add("hidden");
    document.getElementById("feed").classList.remove("hidden");
    feedBtn.classList.add("active");
    homeBtn.classList.remove("active");
});