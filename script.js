// ====== Firebase Setup ======
const firebaseConfig = {
    apiKey: "AIzaSyBIHbMOS0LHQT3D_DctaLITHdoUMQFg63w",
    authDomain: "world-of-vibes.firebaseapp.com",
    projectId: "world-of-vibes",
    storageBucket: "world-of-vibes.firebasestorage.app",
    messagingSenderId: "50522382303",
    appId: "1:50522382303:web:8ac96e9d2cc55a7745ee6a",
    measurementId: "G-JTGPK5Q8HY"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ====== State ======
let currentUser = null;
let selectedCoords = null;
let uploadedPhotoURL = null;
let isUploading = false;
let mapInitialized = false;
let map = null;

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

// ====== Auth ======
document.getElementById("google-signin-btn").addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        console.error(err);
        showToast("Sign in failed. Try again.");
    });
});

document.getElementById("signout-btn").addEventListener("click", () => {
    auth.signOut();
});

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");

        // Set avatar
        const avatar = document.getElementById("user-avatar");
        if (user.photoURL) {
            avatar.src = user.photoURL;
            avatar.style.display = "block";
        }

        if (!mapInitialized) initMap();
    } else {
        currentUser = null;
        document.getElementById("login-screen").classList.remove("hidden");
        document.getElementById("app").classList.add("hidden");
    }
});

// ====== Init Map (only after login) ======
function initMap() {
    mapInitialized = true;

    mapboxgl.accessToken = 'pk.eyJ1Ijoibm11cyIsImEiOiJjbThsYTdhemExMHpwMmpweDV5eXVzbm9qIn0.Fy0lhJ_EdhNGPG7BBVqnSQ';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [0, 20],
        zoom: 2
    });

    gsap.from("#header", { duration: 0.6, opacity: 0, y: -10 });
    gsap.from("#map", { duration: 0.8, opacity: 0, delay: 0.2 });

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

    loadVibes();
}

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

// ====== Post button ======
postBtn.addEventListener("click", () => {
    if (!selectedCoords) {
        const hint = document.getElementById("map-hint");
        hint.classList.add("visible");
        setTimeout(() => hint.classList.remove("visible"), 3000);
        document.getElementById("map").classList.remove("hidden");
        document.getElementById("feed").classList.add("hidden");
        document.getElementById("home-btn").classList.add("active");
        document.getElementById("feed-btn").classList.remove("active");
        setTimeout(() => map.resize(), 100);
        return;
    }
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
        timestamp: Date.now(),
        uid: currentUser.uid,
        displayName: currentUser.displayName || "anonymous",
        userPhoto: currentUser.photoURL || ""
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

// ====== Load vibes on map + feed ======
function loadVibes() {
    // Map markers
    db.collection("vibes").onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
                const data = change.doc.data();
                const docId = change.doc.id;
                if (!data.lat || !data.lng) return;

                const el = document.createElement("div");
                el.style.cssText = `
                    width: 36px; height: 36px;
                    border: 2px solid #0a0a0a;
                    background: #0a0a0a;
                    overflow: hidden;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                `;
                if (data.photoURL) {
                    el.style.backgroundImage = `url(${data.photoURL})`;
                    el.style.backgroundSize = "cover";
                    el.style.backgroundPosition = "center";
                }

                const isOwner = currentUser && data.uid === currentUser.uid;
                const deleteBtn = isOwner
                    ? `<button onclick="deleteVibe('${docId}', this)" style="
                        margin-top:8px; width:100%; padding:6px;
                        font-size:0.65rem; letter-spacing:0.12em; text-transform:uppercase;
                        background:none; border:1px solid #d4d4d4; color:#999; cursor:pointer;
                        font-family:'Helvetica Neue',sans-serif;">Delete</button>`
                    : "";

                const popupHTML = `
                    <div style="font-family:'Helvetica Neue',sans-serif; max-width:200px;">
                        ${data.photoURL ? `<img src="${data.photoURL}" style="width:100%;display:block;margin-bottom:8px;" />` : ""}
                        <div style="font-size:0.75rem;letter-spacing:0.06em;color:#444;padding:0 2px 2px;">${data.vibeText || ""}</div>
                        <div style="font-size:0.65rem;letter-spacing:0.08em;color:#999;padding:0 2px 4px;">${data.displayName || ""}</div>
                        ${deleteBtn}
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

    // Feed
    db.collection("vibes")
        .orderBy("timestamp", "desc")
        .limit(30)
        .onSnapshot(snapshot => {
            const feedList = document.getElementById("feed-list");
            feedList.innerHTML = "";
            snapshot.forEach(doc => {
                const data = doc.data();
                const docId = doc.id;
                if (!data.photoURL) return;

                const isOwner = currentUser && data.uid === currentUser.uid;

                const wrap = document.createElement("div");
                wrap.className = "feed-img-wrap";

                const img = document.createElement("img");
                img.src = data.photoURL;
                img.className = "feed-img";
                img.loading = "lazy";
                wrap.appendChild(img);

                const meta = document.createElement("div");
                meta.className = "feed-meta";
                meta.innerHTML = `
                    <span class="feed-caption">${data.vibeText || ""}</span>
                    <span class="feed-author">${data.displayName || ""}</span>
                    ${isOwner ? `<button class="feed-delete-btn" onclick="deleteVibe('${docId}', this)">Delete</button>` : ""}
                `;
                wrap.appendChild(meta);
                feedList.appendChild(wrap);
            });
        }, (err) => console.error("Feed error:", err));
}

// ====== Delete vibe ======
window.deleteVibe = function(docId, btn) {
    if (!currentUser) return;
    btn.textContent = "Deleting...";
    db.collection("vibes").doc(docId).delete()
        .then(() => showToast("Deleted."))
        .catch(err => showToast("Error: " + err.message));
};

// ====== Nav ======
document.getElementById("home-btn").addEventListener("click", () => {
    document.getElementById("map").classList.remove("hidden");
    document.getElementById("feed").classList.add("hidden");
    document.getElementById("home-btn").classList.add("active");
    document.getElementById("feed-btn").classList.remove("active");
    setTimeout(() => map && map.resize(), 100);
});

document.getElementById("feed-btn").addEventListener("click", () => {
    document.getElementById("map").classList.add("hidden");
    document.getElementById("feed").classList.remove("hidden");
    document.getElementById("feed-btn").classList.add("active");
    document.getElementById("home-btn").classList.remove("active");
});