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

let currentUser = null, selectedCoords = null, uploadedPhotoURL = null;
let map = null, mapReady = false, allVibes = [], activeTab = 'world';

// ── Toast ──
function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toast-text').textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 3000);
}

function timeAgo(ts) {
    const d = Date.now() - ts, m = Math.floor(d/60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m/60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h/24) + 'd ago';
}

// ── Auth ──
document.getElementById('google-signin-btn').addEventListener('click', () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
        .catch(err => showToast('Sign in failed: ' + err.code));
});

document.getElementById('signout-x-btn').addEventListener('click', () => {
    document.getElementById('signout-modal').classList.remove('hidden');
});
document.getElementById('signout-confirm').addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        if (user.photoURL) {
            ['user-avatar','taskbar-avatar','profile-avatar-large'].forEach(id => {
                const el = document.getElementById(id);
                el.src = user.photoURL;
                el.classList.remove('hidden');
            });
        }
        document.getElementById('profile-name').textContent = user.displayName || 'You';
        document.getElementById('status-user').textContent = user.displayName || user.email;
        if (!mapReady) initMap();
    } else {
        currentUser = null;
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
    }
});

// ── Map ──
function initMap() {
    mapReady = true;
    mapboxgl.accessToken = 'pk.eyJ1Ijoibm11cyIsImEiOiJjbThsYTdhemExMHpwMmpweDV5eXVzbm9qIn0.Fy0lhJ_EdhNGPG7BBVqnSQ';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [0, 20], zoom: 2,
        attributionControl: false
    });

    // Tint the map aqua/blue once loaded
    map.on('load', () => {
        map.resize();
        // Tint water layers aqua
        map.setPaintProperty('water', 'fill-color', '#a8d8f0');
        map.setPaintProperty('water-shadow', 'fill-color', '#80c0e8');
        // Land slightly lavender
        try {
            map.setPaintProperty('land', 'background-color', '#e8ecff');
        } catch(e) {}
        // Country fills
        ['landcover','national-park','land-structure-polygon'].forEach(layer => {
            try { map.setPaintProperty(layer, 'fill-color', '#dce4ff'); } catch(e) {}
        });
        loadVibes();
    });

    map.on('click', e => {
        if (!uploadedPhotoURL) { flashHint(); return; }
        selectedCoords = e.lngLat;
        openCaptionModal();
    });

    gsap.from('#main-window', { duration: 0.5, opacity: 0, scale: 0.97, ease: 'power2.out' });
}

function flashHint() {
    const h = document.getElementById('map-hint');
    h.classList.add('visible');
    clearTimeout(h._t);
    h._t = setTimeout(() => h.classList.remove('visible'), 2500);
}

// ── Upload ──
const photoUpload = document.getElementById('photo-upload');
const uploadLabel = document.getElementById('upload-label');
const previewWrap = document.getElementById('photo-preview-wrap');
const previewImg  = document.getElementById('photo-preview');
const postBtn     = document.getElementById('post-btn');

photoUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 1500000) return showToast('Photo too large — try under 1MB');
    const reader = new FileReader();
    reader.onloadend = () => {
        if (reader.result.length > 900000) return showToast('Photo too large after encoding');
        uploadedPhotoURL = reader.result;
        previewImg.src = uploadedPhotoURL;
        previewWrap.classList.remove('hidden');
        uploadLabel.classList.add('hidden');
        postBtn.disabled = false;
        showToast('📍 Click map to drop your photo');
        flashHint();
    };
    reader.readAsDataURL(file);
});

document.getElementById('photo-clear').addEventListener('click', () => {
    uploadedPhotoURL = null; selectedCoords = null;
    photoUpload.value = ''; previewImg.src = '';
    previewWrap.classList.add('hidden');
    uploadLabel.classList.remove('hidden');
    postBtn.disabled = true;
});

postBtn.addEventListener('click', () => {
    if (!selectedCoords) { flashHint(); showToast('Click map to pick a spot'); return; }
    openCaptionModal();
});

// ── Caption modal ──
const captionModal = document.getElementById('caption-modal');
const captionInput = document.getElementById('caption-input');
const captionPreview = document.getElementById('caption-preview-img');

function openCaptionModal() {
    captionPreview.src = uploadedPhotoURL;
    captionInput.value = '';
    document.getElementById('caption-char-count').textContent = '0 / 120 characters';
    captionModal.classList.remove('hidden');
    setTimeout(() => captionInput.focus(), 80);
}
function closeCaptionModal() { captionModal.classList.add('hidden'); }

captionInput.addEventListener('input', () => {
    document.getElementById('caption-char-count').textContent = captionInput.value.length + ' / 120 characters';
});
captionInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('caption-submit').click();
});

document.getElementById('caption-close-btn').onclick = closeCaptionModal;
document.getElementById('caption-cancel').onclick = closeCaptionModal;
captionModal.addEventListener('click', e => { if (e.target === captionModal) closeCaptionModal(); });

document.getElementById('caption-submit').addEventListener('click', () => {
    const text = captionInput.value.trim();
    if (!text) return showToast('Add a caption first');
    if (!selectedCoords) return showToast('Pick a location on the map');

    const vibe = {
        vibeText: text,
        lat: selectedCoords.lat, lng: selectedCoords.lng,
        photoURL: uploadedPhotoURL,
        timestamp: Date.now(),
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'anon',
        userPhoto: currentUser.photoURL || ''
    };

    closeCaptionModal();
    showToast('Posting... 💾');

    const coords = { lat: selectedCoords.lat, lng: selectedCoords.lng };
    uploadedPhotoURL = null; selectedCoords = null;
    photoUpload.value = ''; previewImg.src = '';
    previewWrap.classList.add('hidden');
    uploadLabel.classList.remove('hidden');
    postBtn.disabled = true;

    db.collection('vibes').add(vibe).then(() => {
        showToast('Posted! 🌍');
        map.flyTo({ center: [coords.lng, coords.lat], zoom: 10, duration: 1600 });
        document.getElementById('address-bar').textContent =
            '🌍 photoworld://map/' + coords.lat.toFixed(2) + ',' + coords.lng.toFixed(2);
    }).catch(err => showToast('Error: ' + err.message));
});

// ── Load vibes ──
function loadVibes() {
    db.collection('vibes').onSnapshot(snapshot => {
        allVibes = [];
        snapshot.forEach(doc => allVibes.push({ id: doc.id, ...doc.data() }));
        document.getElementById('status-count').textContent = allVibes.length + ' objects';
        renderFeed();
        renderMarkers();
    }, err => console.error(err));
}

let markersOnMap = [];
function renderMarkers() {
    markersOnMap.forEach(m => m.remove());
    markersOnMap = [];
    allVibes.forEach(v => {
        if (!v.lat || !v.lng) return;
        const el = document.createElement('div');
        el.className = 'map-marker';
        if (v.photoURL) el.style.backgroundImage = `url(${v.photoURL})`;

        const isOwner = currentUser && v.uid === currentUser.uid;
        const popup = new mapboxgl.Popup({ offset: 22, closeButton: true, maxWidth: '210px' })
            .setHTML(`
                ${v.photoURL ? `<img class="popup-img" src="${v.photoURL}" />` : ''}
                <div class="popup-body">
                    <div class="popup-caption">${v.vibeText || ''}</div>
                    <div class="popup-author">${v.displayName || ''}</div>
                    <div class="popup-time">${timeAgo(v.timestamp)}</div>
                    ${isOwner ? `<button class="popup-delete" onclick="deleteVibe('${v.id}')">🗑 Delete</button>` : ''}
                </div>
            `);

        const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([v.lng, v.lat])
            .setPopup(popup)
            .addTo(map);
        markersOnMap.push(marker);
    });
}

function renderFeed() {
    const list = document.getElementById('feed-list');
    list.innerHTML = '';
    const myVibes = allVibes.filter(v => currentUser && v.uid === currentUser.uid);
    const vibes = activeTab === 'profile' ? myVibes : allVibes;
    vibes.sort((a,b) => b.timestamp - a.timestamp);

    document.getElementById('profile-post-count').textContent =
        myVibes.length + ' post' + (myVibes.length !== 1 ? 's' : '');

    const profileHeader = document.getElementById('profile-header');
    profileHeader.classList.toggle('hidden', activeTab !== 'profile');

    vibes.forEach(v => {
        if (!v.photoURL) return;
        const isOwner = currentUser && v.uid === currentUser.uid;
        const item = document.createElement('div');
        item.className = 'feed-item';
        item.innerHTML = `
            <img class="feed-item-img" src="${v.photoURL}" loading="lazy" />
            <div class="feed-item-info">
                <div class="feed-item-caption">${v.vibeText || ''}</div>
                <div class="feed-item-meta">${v.displayName || ''} · ${timeAgo(v.timestamp)}</div>
            </div>
            ${isOwner ? `<button class="win98-btn feed-item-delete" onclick="deleteVibe('${v.id}', event)">🗑</button>` : ''}
        `;
        item.addEventListener('click', e => {
            if (e.target.classList.contains('feed-item-delete')) return;
            if (v.lat && v.lng) map.flyTo({ center: [v.lng, v.lat], zoom: 10, duration: 1400 });
        });
        list.appendChild(item);
    });
}

window.deleteVibe = function(id, e) {
    if (e) e.stopPropagation();
    if (!confirm('Delete this post?')) return;
    db.collection('vibes').doc(id).delete()
        .then(() => showToast('Deleted'))
        .catch(err => showToast('Error: ' + err.message));
};

// ── Tabs ──
document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        renderFeed();
    });
});

// ── Clock ──
function updateClock() {
    const s = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    ['clock-time','app-clock'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = s;
    });
}
setInterval(updateClock, 1000);
updateClock();