// ============================================================
// Supabase config — ganti apiKey/URL Firebase lama dengan ini.
// SEBAIKNYA nilai di bawah diambil dari env var saat build (Vercel),
// bukan hardcode. Kalau lo pake plain static hosting tanpa build step,
// anon key Supabase memang didesain aman untuk dipublish di frontend
// (dibatasi oleh Row Level Security di database).
// ============================================================
const SUPABASE_URL = window.__ENV__?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  document.body.innerHTML = "<p style='color:#f55;padding:2rem;font-family:sans-serif'>Konfigurasi Supabase belum ke-load. Cek env-config.js dan environment variables di Vercel.</p>";
  throw new Error("SUPABASE_URL atau SUPABASE_ANON_KEY kosong");
}

const {
    createClient
} = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginScreen = document.getElementById("loginScreen");
const userInfo = document.getElementById("userInfo");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const messageInput = document.getElementById("messageInput");
const sendButton = document.querySelector(".input-area button");
const avatarModal = document.getElementById("avatarModal");
const avatarPreview = document.getElementById("avatarPreview");
const avatarInput = document.getElementById("avatarInput");
const nameModal = document.getElementById("nameModal");
const nameInput = document.getElementById("nameInput");
const nameCharCount = document.getElementById("nameCharCount");

const adminUsers = {
    "jembud@gmail.com": true,
    "rafiqmarwan80@gmail.com": true,
    "undefined@undefined.mail": true,
    "rileka8171@lanipe.com": true,
    "rahasia@gmail.com": true,
    "zenn1tstrid@gmail.com": true,
    "apalahdawg@gmail.com": true,
};
// NOTE: key di sini dulu adalah Firebase UID. Setelah migrasi ke Supabase,
// user ID berubah format (uuid baru), jadi mapping lama otomatis kosong.
// Isi ulang pake Supabase user id (auth.users.id) kalau mau dipakai lagi.
const specialUsers = {};

let messageElements = {};
let selectedFile = null;
let replyTo = null;
let sending = false;
let isUserAtBottom = true;
let typingTimeout;
let currentUser = null; // { id, email }
let currentProfile = null; // { display_name, avatar_url }
let selectedAvatar = null;
const objectUrls = new Set();
let lastMessageDate = null;
let lastRenderedUserId = null;
let lastRenderedTimestamp = null;
const GROUP_TIME_THRESHOLD = 5 * 60 * 1000;
let messagesChannel = null;
let typingChannel = null;
let typingIndicatorEl = null;
let typingIndicatorHideTimeout = null;

function escapeHtml(text) {
    const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, function(m) {
        return map[m];
    });
}

function stringToColor(str) {
    if (!str) return "#000";
    const safeStr = escapeHtml(str);
    let hash = 0;
    for (let i = 0; i < safeStr.length; i++) {
        hash = safeStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue},65%,50%)`;
}

function isAdmin(email) {
    return email && adminUsers[email] === true;
}

function getSpecialTitle(userId) {
    return specialUsers[userId] || "";
}

function getDisplayName() {
    return currentProfile ? currentProfile.display_name || "" : "";
}

function getAvatarUrl() {
    return currentProfile ? currentProfile.avatar_url || "" : "";
}

function clearUserSpecificCache() {
    // Tidak dipakai (tidak pake localStorage).
}

function cleanupObjectUrls() {
    objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
    });
    objectUrls.clear();
}

function previewFile(file) {
    const previewArea = document.getElementById("filePreviewArea");
    previewArea.innerHTML = "";
    if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        const objectUrl = URL.createObjectURL(file);
        objectUrls.add(objectUrl);
        img.src = objectUrl;
        img.style.maxWidth = "100%";
        img.style.maxHeight = "150px";
        previewArea.appendChild(img);
    } else if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        const objectUrl = URL.createObjectURL(file);
        objectUrls.add(objectUrl);
        video.src = objectUrl;
        video.controls = true;
        video.muted = true;
        video.style.maxWidth = "100%";
        video.style.maxHeight = "150px";
        previewArea.appendChild(video);
    } else if (file.type === "application/pdf") {
        const link = document.createElement("a");
        const objectUrl = URL.createObjectURL(file);
        objectUrls.add(objectUrl);
        link.href = objectUrl;
        link.textContent = "Pratinjau PDF";
        link.target = "_blank";
        previewArea.appendChild(link);
    }
}

function formatDateHeader(timestamp) {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (messageDate >= today) {
        return "Hari ini";
    } else if (messageDate >= yesterday) {
        return "Kemarin";
    } else {
        return messageDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }
}

// ── AUTH ──────────────────────────────────────────────────────
window.loginWithGoogle = function() {
    supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    }).then(({
        error
    }) => {
        if (error) {
            console.error("Error during sign in:", error);
            alert("Terjadi error saat login. Silakan coba lagi.");
        }
    });
};

window.signInWithEmail = function() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    if (!email || !password) {
        alert("Email dan password harus diisi!");
        return;
    }
    supabaseClient.auth.signInWithPassword({
        email,
        password
    }).then(({
        data,
        error
    }) => {
        if (error) {
            console.error("Error during email sign in:", error);
            alert("An error occurred while logging in: " + error.message);
            return;
        }
        console.log("User signed in:", data.user);
    });
};

window.signUpWithEmail = function() {
    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    if (!name || !email || !password) {
        alert("Semua field harus diisi!");
        return;
    }
    if (name.length > 20) {
        alert("Nama tampilan maksimal 20 karakter!");
        return;
    }
    if (password.length < 6) {
        alert("Password minimal 6 karakter!");
        return;
    }
    supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name
            }
        }
    }).then(({
        data,
        error
    }) => {
        if (error) {
            console.error("Error during registration:", error);
            alert("Terjadi error saat pendaftaran: " + error.message);
            return;
        }
        console.log("User registered:", data.user);
    });
};

window.signOut = function() {
    if (!currentUser) {
        return;
    }
    document.getElementById("confirmModal").style.display = "flex";
};

window.showNameModal = function() {
    nameInput.value = getDisplayName() || "";
    nameModal.style.display = "flex";
    nameInput.focus();
    updateNameCharCount();
};
window.hideNameModal = function() {
    nameModal.style.display = "none";
};

window.saveDisplayName = async function() {
    const newName = nameInput.value.trim();
    if (!newName || !currentUser) return;
    try {
        const {
            error
        } = await supabaseClient.from("profiles").update({
            display_name: newName
        }).eq("id", currentUser.id);
        if (error) throw error;
        currentProfile.display_name = newName;
        userName.textContent = newName;
        // Perbarui nama di semua pesan yang sudah ada dari user ini
        await supabaseClient.from("messages").update({
            user_name: newName
        }).eq("user_id", currentUser.id);
        nameModal.style.display = "none";
    } catch (error) {
        console.error("Error updating display name:", error);
        alert("Gagal menyimpan nama: " + error.message);
    }
};

window.showAvatarModal = function() {
    avatarPreview.src = getAvatarUrl() || "default-avatar.jpg";
    avatarModal.style.display = "flex";
    avatarInput.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("Hanya file gambar yang diizinkan!");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("Ukuran file terlalu besar! Maksimal 5MB.");
            return;
        }
        selectedAvatar = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            avatarPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };
};
window.hideAvatarModal = function() {
    avatarModal.style.display = "none";
    selectedAvatar = null;
    avatarInput.value = "";
};

window.saveAvatar = async function() {
    if (!selectedAvatar || !currentUser) {
        alert("Pilih gambar terlebih dahulu!");
        return;
    }
    try {
        const formData = new FormData();
        formData.append("file", selectedAvatar);
        const uploadResponse = await fetch("https://athars.space/upload.php", {
            method: "POST",
            body: formData,
        });
        if (!uploadResponse.ok) throw new Error("Upload gagal, status " + uploadResponse.status);
        const avatarUrl = (await uploadResponse.text()).trim();
        if (!avatarUrl.startsWith("http")) throw new Error("Response uploader tidak valid: " + avatarUrl);
        const {
            error: updateError
        } = await supabaseClient.from("profiles").update({
            avatar_url: avatarUrl
        }).eq("id", currentUser.id);
        if (updateError) throw updateError;
        currentProfile.avatar_url = avatarUrl;
        userAvatar.src = avatarUrl;
        await supabaseClient.from("messages").update({
            photo_url: avatarUrl
        }).eq("user_id", currentUser.id);
        hideAvatarModal();
    } catch (error) {
        console.error("Error uploading avatar:", error);
        alert("Gagal mengupload avatar: " + error.message);
    }
};

window.handleFileSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
        alert("File terlalu besar! Maksimal 50MB");
        return;
    }
    selectedFile = file;
    document.getElementById("fileName").textContent = file.name;
    document.getElementById("filePreview").style.display = "flex";
    previewFile(file);
};
window.cancelUpload = function() {
    cleanupObjectUrls();
    selectedFile = null;
    document.getElementById("fileInput").value = "";
    document.getElementById("filePreview").style.display = "none";
};

window.uploadToSupabase = async function(file) {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch("https://athars.space/upload.php", {
            method: "POST",
            body: formData,
        });
        if (!uploadResponse.ok) throw new Error("Upload gagal, status " + uploadResponse.status);
        const fileUrl = (await uploadResponse.text()).trim();
        if (!fileUrl.startsWith("http")) throw new Error("Response uploader tidak valid: " + fileUrl);
        return fileUrl;
    } catch (error) {
        console.error("Error uploading file:", error);
        alert("Gagal mengupload file: " + error.message);
        return null;
    }
};

window.deleteMessage = async function(messageId) {
    if (!confirm("Hapus pesan ini?")) return;
    if (!currentUser) {
        alert("Silakan login terlebih dahulu!");
        return;
    }
    try {
        const {
            data: messageData,
            error: fetchError
        } = await supabaseClient.from("messages").select("*").eq("id", messageId).single();
        if (fetchError) throw fetchError;
        if (messageData && (messageData.user_id === currentUser.id || isAdmin(currentUser.email))) {
            const {
                error
            } = await supabaseClient.from("messages").update({
                deleted: true,
                text: "",
                file_url: "",
                file_name: "",
                file_type: ""
            }).eq("id", messageId);
            if (error) throw error;
        } else {
            alert("Anda hanya dapat menghapus pesan sendiri!");
        }
    } catch (error) {
        console.error("Error deleting message:", error);
        alert("Gagal menghapus pesan!");
    }
};

window.replyToMessage = async function(messageId, event) {
    if (event) {
        event.stopPropagation();
    }
    const {
        data: messageData,
        error
    } = await supabaseClient.from("messages").select("*").eq("id", messageId).single();
    if (error || !messageData) return;
    replyTo = {
        messageId: messageId,
        user: messageData.user_name,
        text: messageData.text
    };
    document.getElementById("replyPreview").style.display = "flex";
    document.getElementById("replyUser").textContent = messageData.user_name;
    document.getElementById("replyText").textContent = messageData.text.length > 30 ? messageData.text.substring(0, 30) + "..." : messageData.text;
    messageInput.focus();
};

window.sendMessage = async function() {
    if (sending) return;
    sending = true;
    if (!currentUser) {
        alert("Silakan login terlebih dahulu!");
        sending = false;
        return;
    }
    const text = messageInput.value.trim();
    if (!text && !selectedFile) {
        alert("Pesan atau file harus diisi!");
        sending = false;
        return;
    }
    let fileUrl = "";
    let fileName = "";
    let fileType = "";
    if (selectedFile) {
        fileUrl = await uploadToSupabase(selectedFile);
        if (!fileUrl) {
            sending = false;
            alert("Gagal mengupload file!");
            return;
        }
        fileName = selectedFile.name;
        fileType = selectedFile.type;
    }
    const messageData = {
        user_id: currentUser.id,
        user_name: currentProfile?.display_name || "",
        email: currentUser.email,
        photo_url: currentProfile?.avatar_url || "",
        text: text
    };
    if (fileUrl) {
        messageData.file_url = fileUrl;
        messageData.file_name = fileName;
        messageData.file_type = fileType;
    }
    if (replyTo) {
        messageData.reply_to = replyTo;
    }
    try {
        const {
            error
        } = await supabaseClient.from("messages").insert(messageData);
        if (error) throw error;
        messageInput.value = "";
        messageInput.style.height = "auto";
        selectedFile = null;
        document.getElementById("filePreview").style.display = "none";
        document.getElementById("fileInput").value = "";
        replyTo = null;
        document.getElementById("replyPreview").style.display = "none";
        await setTypingStatus(false);
        setTimeout(() => {
            scrollToBottom();
        }, 100);
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Gagal mengirim pesan!");
    } finally {
        sending = false;
    }
};

window.cancelReply = function() {
    replyTo = null;
    document.getElementById("replyPreview").style.display = "none";
};
window.scrollToBottom = function() {
    const messagesContainer = document.getElementById("messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};
window.showImageModal = function(imageUrl) {
    const modal = document.getElementById("imageModal");
    const modalImage = document.getElementById("modalImage");
    const downloadBtn = document.getElementById("modalDownload");
    modalImage.src = imageUrl;
    downloadBtn.onclick = function() {
        window.open(imageUrl, "_blank");
    };
    modal.style.display = "flex";
};
window.showVideoModal = function(videoUrl) {
    const modal = document.getElementById("videoModal");
    const modalVideo = document.getElementById("modalVideo");
    const downloadBtn = document.getElementById("modalVideoDownload");
    modalVideo.src = videoUrl;
    downloadBtn.onclick = function() {
        window.open(videoUrl, "_blank");
    };
    modal.style.display = "flex";
};
window.hideVideoModal = function() {
    const modal = document.getElementById("videoModal");
    const modalVideo = document.getElementById("modalVideo");
    modalVideo.pause();
    modal.style.display = "none";
};
window.downloadVideo = function() {
    const videoUrl = document.getElementById("modalVideo").src;
    window.open(videoUrl, "_blank");
};
window.hideImageModal = function() {
    document.getElementById("imageModal").style.display = "none";
};
window.downloadImage = function() {
    const imageUrl = document.getElementById("modalImage").src;
    window.open(imageUrl, "_blank");
};

async function setTypingStatus(typing) {
    if (!currentUser) return;
    await supabaseClient.from("typing_status").upsert({
        user_id: currentUser.id,
        user_name: currentProfile?.display_name || "",
        typing: typing,
        updated_at: new Date().toISOString()
    });
}

// ── TYPING INDICATOR ─────────────────────────────────────────
// Elemen "nama • • •" ini BUKAN message — tidak pernah disimpan/dibaca
// dari tabel messages, cuma DOM node yang selalu didorong ke posisi
// paling bawah #messages tiap kali ada pesan baru masuk.
function ensureTypingIndicatorElement() {
    if (typingIndicatorEl) return typingIndicatorEl;
    const row = document.createElement("div");
    row.className = "typing-indicator-row";
    row.id = "typingIndicatorRow";
    row.setAttribute("aria-live", "polite");
    row.style.display = "none";

    const nameEl = document.createElement("span");
    nameEl.className = "typing-indicator-name";

    const dotsEl = document.createElement("span");
    dotsEl.className = "typing-dots";
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement("span");
        dot.textContent = "•";
        dotsEl.appendChild(dot);
    }

    row.appendChild(nameEl);
    row.appendChild(dotsEl);
    typingIndicatorEl = row;
    return row;
}

function buildTypingNameParts(typingUsers) {
    if (typingUsers.length === 1) {
        return [{
            text: typingUsers[0].user_name || "Seseorang",
            colored: true
        }];
    }
    if (typingUsers.length === 2) {
        return [{
            text: typingUsers[0].user_name || "Seseorang",
            colored: true
        }, {
            text: ", ",
            colored: false
        }, {
            text: typingUsers[1].user_name || "Seseorang",
            colored: true
        }];
    }
    const rest = typingUsers.length - 1;
    return [{
        text: typingUsers[0].user_name || "Seseorang",
        colored: true
    }, {
        text: ` dan ${rest} lainnya`,
        colored: false
    }];
}

function renderTypingIndicator(typingUsers) {
    const messagesContainer = document.getElementById("messages");
    if (!messagesContainer) return;
    const row = ensureTypingIndicatorElement();
    // Selalu jadi child paling akhir, biar posisinya di bawah message terakhir.
    messagesContainer.appendChild(row);

    if (!typingUsers || typingUsers.length === 0) {
        clearTimeout(typingIndicatorHideTimeout);
        row.classList.remove("visible");
        // Tunggu transisi fade-out kelar dulu baru dilepas dari layout,
        // biar ga ninggalin area kosong yang aneh.
        typingIndicatorHideTimeout = setTimeout(() => {
            row.style.display = "none";
        }, 220);
        return;
    }

    const nameEl = row.querySelector(".typing-indicator-name");
    nameEl.innerHTML = "";
    buildTypingNameParts(typingUsers).forEach((part) => {
        const span = document.createElement("span");
        span.textContent = part.text;
        if (part.colored) {
            span.style.color = stringToColor(part.text);
        }
        nameEl.appendChild(span);
    });

    clearTimeout(typingIndicatorHideTimeout);
    row.style.display = "flex";
    // Reflow dulu sebelum nambah class biar transisi fade-in kepicu.
    requestAnimationFrame(() => row.classList.add("visible"));

    // Cuma auto-scroll kalau user memang lagi di posisi paling bawah;
    // kalau lagi scroll baca chat lama, posisi dibiarkan apa adanya.
    if (isUserAtBottom) {
        setTimeout(() => {
            scrollToBottom();
        }, 100);
    }
}

function renderMessage(messageData) {
    const messageId = messageData.id;
    if (messageElements[messageId]) {
        return;
    }
    const timestampMs = new Date(messageData.created_at).getTime();
    const escapedText = escapeHtml(messageData.text || "");
    const messageElement = document.createElement("div");
    messageElement.className = "message";
    messageElement.id = `message-${messageId}`;
    if (messageData.user_id === currentUser.id) {
        messageElement.classList.add("mine");
    }
    if (messageData.deleted) {
        messageElement.classList.add("deleted-message");
    }
    if (messageData.file_url) {
        messageElement.classList.add("file-message");
    }
    const messageDate = new Date(timestampMs).toDateString();
    if (messageDate !== lastMessageDate) {
        const dateHeader = document.createElement("div");
        dateHeader.className = "date-header";
        dateHeader.innerHTML = `<span>${formatDateHeader(timestampMs)}</span>`;
        document.getElementById("messages").appendChild(dateHeader);
        lastMessageDate = messageDate;
        lastRenderedUserId = null;
        lastRenderedTimestamp = null;
    }
    const isGrouped =
        !messageData.reply_to &&
        lastRenderedUserId === messageData.user_id &&
        lastRenderedTimestamp !== null &&
        timestampMs - lastRenderedTimestamp < GROUP_TIME_THRESHOLD;
    if (isGrouped) {
        messageElement.classList.add("grouped");
    }
    lastRenderedUserId = messageData.user_id;
    lastRenderedTimestamp = timestampMs;
    const time = new Date(timestampMs).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
    });
    const userColor = stringToColor(messageData.user_name);
    const isAdminUser = isAdmin(messageData.email);
    const specialTitle = getSpecialTitle(messageData.user_id);
    const isKoruptor = ["lwklowkwkwk@gmail.com", "commentfotocik@gmail.com", "commentcik@gmail.com"].includes(messageData.email);
    let fileContent = "";
    if (messageData.file_url) {
        if (messageData.file_type && messageData.file_type.startsWith("image")) {
            fileContent = `<img src="${escapeHtml(messageData.file_url)}" alt="File upload" onerror="this.style.display='none'" style="cursor:pointer">`;
        } else if (messageData.file_type && messageData.file_type.startsWith("video")) {
            fileContent = `<video src="${escapeHtml(messageData.file_url)}" controls style="max-width:100%;max-height:200px;border-radius:var(--border-radius-sm);margin-top:8px"></video>`;
        } else {
            fileContent = `<a href="${escapeHtml(messageData.file_url)}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Download File: ${escapeHtml(messageData.file_name || "File")}</a>`;
        }
    }
    let replyContent = "";
    if (messageData.reply_to && !messageData.deleted) {
        replyContent = `<div class="message-reply-container"><span class="reply-sender">${escapeHtml(messageData.reply_to.user)}</span>: ${escapeHtml(messageData.reply_to.text)}</div>`;
    }
    let messageBody = "";
    if (messageData.deleted) {
        messageBody = "<em>Pesan dihapus</em>";
    } else {
        messageBody = `${replyContent}${escapedText ? `<p>${escapedText}</p>` : ""}${fileContent ? `<div>${fileContent}</div>` : ""}`;
    }
    messageElement.innerHTML = `<img class="message-avatar" src="${escapeHtml(messageData.photo_url || "default-avatar.jpg")}" alt="${escapeHtml(
        messageData.user_name
    )}" onerror="this.src='default-avatar.jpg'"><div class="message-content"><div class="user" style="color:${userColor}">${escapeHtml(messageData.user_name)}${isAdminUser ? '<span class="admin-badge">ADMIN</span>' : ""}${
        isKoruptor ? '<span class="korupsi-badge">DPR</span>' : ""
    }${specialTitle ? '<span class="medan-badge">' + escapeHtml(specialTitle) + "</span>" : ""}</div>${messageBody}<div class="timestamp-container"><span class="timestamp">${time}</span>${
        !messageData.deleted ? `<button class="reply-btn" onclick="replyToMessage('${messageId}', event)" title="Balas Pesan"><i class="fas fa-reply"></i></button>` : ""
    }${
        (messageData.user_id === currentUser.id || isAdmin(currentUser.email)) && !messageData.deleted ? `<button class="delete-btn" onclick="deleteMessage('${messageId}')" title="Hapus Pesan"><i class="fas fa-trash"></i></button>` : ""
    }</div></div>`;
    document.getElementById("messages").appendChild(messageElement);
    messageElements[messageId] = messageElement;
    if (typingIndicatorEl) {
        // appendChild pada node yang udah ada di DOM = pindahin ke posisi akhir.
        document.getElementById("messages").appendChild(typingIndicatorEl);
    }
    if (isUserAtBottom) {
        setTimeout(() => {
            scrollToBottom();
        }, 100);
    }
}

function updateMessage(messageData) {
    const messageId = messageData.id;
    const messageElement = document.getElementById(`message-${messageId}`);
    if (!messageElement) return;
    if (messageData.deleted) {
        messageElement.classList.add("deleted-message");
        const messageContent = messageElement.querySelector(".message-content");
        const userDiv = messageContent.querySelector(".user");
        messageContent.innerHTML = "";
        if (userDiv) messageContent.appendChild(userDiv);
        const em = document.createElement("em");
        em.textContent = "Pesan dihapus";
        messageContent.appendChild(em);
    }
}

async function loadProfile(userId) {
    const {
        data,
        error
    } = await supabaseClient.from("profiles").select("*").eq("id", userId).single();
    if (error) {
        console.error("Error loading profile:", error);
        return {
            display_name: "",
            avatar_url: ""
        };
    }
    return data;
}

async function initChatSession(user) {
    lastMessageDate = null;
    lastRenderedUserId = null;
    lastRenderedTimestamp = null;
    loginScreen.style.display = "none";
    userInfo.style.display = "flex";

    currentProfile = await loadProfile(user.id);
    // Kalau login pertama kali via Google, display_name/avatar dari OAuth belum ke-copy ke profiles.
    if (!currentProfile.display_name && user.user_metadata?.full_name) {
        currentProfile.display_name = user.user_metadata.full_name;
        currentProfile.avatar_url = user.user_metadata.avatar_url || "";
        await supabaseClient.from("profiles").update({
            display_name: currentProfile.display_name,
            avatar_url: currentProfile.avatar_url
        }).eq("id", user.id);
    }

    userAvatar.src = currentProfile.avatar_url || "default-avatar.jpg";
    userName.textContent = currentProfile.display_name || user.email;
    messageInput.disabled = false;
    messageInput.placeholder = "Ketik pesan...";
    sendButton.disabled = false;

    // Typing indicator
    if (typingChannel) supabaseClient.removeChannel(typingChannel);
    typingChannel = supabaseClient
        .channel("typing_status_changes")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "typing_status"
        }, async () => {
            const {
                data
            } = await supabaseClient.from("typing_status").select("*").eq("typing", true);
            const typingUsers = (data || [])
                .filter((t) => t.user_id !== currentUser.id)
                .map((t) => ({
                    user_id: t.user_id,
                    user_name: t.user_name
                }));
            renderTypingIndicator(typingUsers);
        })
        .subscribe();

    // Load pesan yang sudah ada
    const {
        data: existingMessages
    } = await supabaseClient.from("messages").select("*").order("created_at", {
        ascending: true
    });
    (existingMessages || []).forEach((m) => renderMessage(m));
    renderTypingIndicator([]); // siapin elemen indikator (tersembunyi) di bawah list
    setTimeout(() => {
        scrollToBottom();
    }, 1500);

    // Subscribe realtime buat pesan baru & perubahan (soft-delete)
    if (messagesChannel) supabaseClient.removeChannel(messagesChannel);
    messagesChannel = supabaseClient
        .channel("messages_changes")
        .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "messages"
        }, (payload) => renderMessage(payload.new))
        .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "messages"
        }, (payload) => updateMessage(payload.new))
        .subscribe();
}

function endChatSession() {
    loginScreen.style.display = "flex";
    userInfo.style.display = "none";
    messageInput.disabled = true;
    messageInput.placeholder = "Silakan login untuk mengirim pesan";
    sendButton.disabled = true;
    document.getElementById("messages").innerHTML = "";
    messageElements = {};
    lastMessageDate = null;
    lastRenderedUserId = null;
    lastRenderedTimestamp = null;
    clearTimeout(typingIndicatorHideTimeout);
    typingIndicatorEl = null; // innerHTML="" di atas udah lepas node lama dari DOM
    cleanupObjectUrls();
    if (messagesChannel) {
        supabaseClient.removeChannel(messagesChannel);
        messagesChannel = null;
    }
    if (typingChannel) {
        supabaseClient.removeChannel(typingChannel);
        typingChannel = null;
    }
}

window.addEventListener("beforeunload", cleanupObjectUrls);

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("showRegister").addEventListener("click", function(e) {
        e.preventDefault();
        document.getElementById("emailLoginForm").style.display = "none";
        document.getElementById("emailRegisterForm").style.display = "block";
    });
    document.getElementById("showLogin").addEventListener("click", function(e) {
        e.preventDefault();
        document.getElementById("emailRegisterForm").style.display = "none";
        document.getElementById("emailLoginForm").style.display = "block";
    });
    document.getElementById("confirmLogoutBtn").addEventListener("click", async () => {
        clearTimeout(typingTimeout);
        await setTypingStatus(false);
        const {
            error
        } = await supabaseClient.auth.signOut();
        if (error) {
            console.error("Error during sign out:", error);
        } else {
            console.log("User signed out");
        }
        document.getElementById("confirmModal").style.display = "none";
    });
    document.getElementById("cancelLogoutBtn").addEventListener("click", () => {
        document.getElementById("confirmModal").style.display = "none";
    });
    document.querySelector(".file-upload-btn").addEventListener("click", () => {
        document.getElementById("fileInput").click();
    });
    messageInput.addEventListener("input", () => {
        if (!currentUser) return;
        messageInput.style.height = "auto";
        messageInput.style.height = messageInput.scrollHeight + "px";
        setTypingStatus(true);
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            setTypingStatus(false);
        }, 1500);
    });
    messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    document.getElementById("messages").addEventListener("scroll", () => {
        const messagesContainer = document.getElementById("messages");
        const isAtBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 150;
        isUserAtBottom = isAtBottom;
        document.getElementById("scrollBtn").classList.toggle("visible", !isAtBottom);
    });
    document.addEventListener("click", function(event) {
        if (event.target.tagName === "IMG" && event.target.closest(".file-message")) {
            showImageModal(event.target.src);
        }
        if (event.target.tagName === "VIDEO" && event.target.closest(".file-message")) {
            showVideoModal(event.target.src);
        }
    });

    function updateNameCharCount() {
        nameCharCount.textContent = `${nameInput.value.length}/20`;
    }
    nameInput.addEventListener("input", updateNameCharCount);

    // ── Auth state ──
    let initializedUserId = null;
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        clearTimeout(typingTimeout);
        const user = session?.user || null;
        if (user) {
            currentUser = user;
            if (initializedUserId !== user.id) {
                initializedUserId = user.id;
                initChatSession(user);
            }
            if (window.location.hash) {
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
            }
        } else {
            initializedUserId = null;
            currentUser = null;
            currentProfile = null;
            endChatSession();
        }
    });
    supabaseClient.auth.getSession().then(({
        data: {
            session
        }
    }) => {
        const user = session?.user || null;
        if (user && initializedUserId !== user.id) {
            currentUser = user;
            initializedUserId = user.id;
            initChatSession(user);
        }
    });
});

// ── Mobile keyboard fix (biar input area & bubble chat ngepas sama keyboard) ──
(function() {
    const inputAreaBottom = document.getElementById("inputAreaBottom");
    const messagesContainer = document.getElementById("messages");
    if (!window.visualViewport || !inputAreaBottom || !messagesContainer) return;

    let fixRaf = null;
    let lastKb = 0;

    const fix = () => {
        if (fixRaf) cancelAnimationFrame(fixRaf);
        fixRaf = requestAnimationFrame(() => {
            const isZoomed = window.visualViewport.scale > 1.05;
            if (isZoomed) return;

            const vvHeight = window.visualViewport.height;
            const kb = Math.max(0, window.innerHeight - vvHeight);
            if (kb === lastKb) return;
            lastKb = kb;

            inputAreaBottom.style.transition = "none";
            inputAreaBottom.style.bottom = kb > 0 ? kb + "px" : "0px";
            messagesContainer.style.paddingBottom = kb > 0 ? kb + 78 + "px" : "";

            const isAtBottom =
                messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 150;
            if (kb > 0 && isAtBottom) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });
    };

    const reset = () => {
        if (fixRaf) cancelAnimationFrame(fixRaf);
        fixRaf = requestAnimationFrame(() => {
            lastKb = 0;
            inputAreaBottom.style.bottom = "0px";
            messagesContainer.style.paddingBottom = "";
        });
    };

    window.visualViewport.addEventListener("resize", fix);
    window.visualViewport.addEventListener("scroll", fix);
    messageInput.addEventListener("blur", () => setTimeout(reset, 100));
})();
