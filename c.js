const firebaseConfig = {
    apiKey: "AIzaSyC7daiyJM_hu_vD6sVsJkv0bdjiTPBlx-s",
    authDomain: "roomchat-ebd.firebaseapp.com",
    databaseURL: "https://roomchat-ebd-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "roomchat-ebd",
    storageBucket: "roomchat-ebd.firebasestorage.app",
    messagingSenderId: "557680290447",
    appId: "1:557680290447:web:20a786f9a82195571a5efa",
    measurementId: "G-ZP7NYS7EHM",
};
const SUPABASE_URL = "https://sgaanvkwiiaxexqvillg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnYWFudmt3aWlheGV4cXZpbGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MTI2ODUsImV4cCI6MjA3MjE4ODY4NX0.KkCP5QP8OwyzvCFpzCPKhoa10W49cNqLYoluClKlofM";
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
const {
    createClient
} = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const messagesRef = db.ref("chat");
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
const specialUsers = {
    "4AMUSgR0pLSndwsrTUzazaXXybl2": "Raja Iblis",
    "UYxmj0pZPhh6bvbUTa89SH8UeW42": "Official"
};
let messageElements = {};
let selectedFile = null;
let replyTo = null;
let sending = false;
let isUserAtBottom = true;
let typingTimeout;
let currentUser = null;
let selectedAvatar = null;
const objectUrls = new Set();
let lastMessageDate = null;
let lastRenderedUserId = null;
let lastRenderedTimestamp = null;
const GROUP_TIME_THRESHOLD = 5 * 60 * 1000;

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

// Fungsi getDisplayName dan getAvatarUrl diperbarui untuk mengambil data langsung dari currentUser
function getDisplayName() {
    return currentUser ? currentUser.displayName || "" : "";
}

function getAvatarUrl() {
    return currentUser ? currentUser.photoURL || "" : "";
}

function clearUserSpecificCache() {
    // Karena kita tidak lagi menggunakan localStorage, fungsi ini tidak diperlukan.
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
        link.textContent = "ÃƒÂ°Ã…Â¸Ã¢â‚¬Â Ã¢â‚¬â€  Pratinjau PDF";
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
window.loginWithGoogle = function() {
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("User signed in:", result.user);
        })
        .catch((error) => {
            console.error("Error during sign in:", error);
            alert("Terjadi error saat login. Silakan coba lagi.");
        });
};
window.signInWithEmail = function() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    if (!email || !password) {
        alert("Email dan password harus diisi!");
        return;
    }
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log("User signed in:", userCredential.user);
        })
        .catch((error) => {
            console.error("Error during email sign in:", error);
            alert("An error occurred while logging in: " + error.message);
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
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return userCredential.user.updateProfile({
                displayName: name
            });
        })
        .then(() => {
            console.log("User registered:", auth.currentUser);
        })
        .catch((error) => {
            console.error("Error during registration:", error);
            alert("Terjadi error saat pendaftaran: " + error.message);
        });
};
window.signOut = function() {
    const user = auth.currentUser;
    if (!user) {
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

// Perbaikan: Fungsi saveDisplayName sekarang memperbarui profil Firebase
window.saveDisplayName = function() {
    const newName = nameInput.value.trim();
    if (newName && currentUser) {
        currentUser.updateProfile({
            displayName: newName
        }).then(() => {
            console.log("Display name updated successfully.");
            // Perbarui UI secara langsung
            userName.textContent = newName;
            // Perbarui nama di semua pesan yang sudah ada
            const userId = currentUser.uid;
            messagesRef
                .orderByChild("userId")
                .equalTo(userId)
                .once("value", (snapshot) => {
                    const updates = {};
                    snapshot.forEach((childSnapshot) => {
                        updates[`chat/${childSnapshot.key}/user`] = newName;
                    });
                    db.ref()
                        .update(updates)
                        .catch((error) => {
                            console.error("Error updating messages:", error);
                        });
                });
            nameModal.style.display = "none";
        }).catch((error) => {
            console.error("Error updating display name:", error);
            alert("Gagal menyimpan nama: " + error.message);
        });
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

// Perbaikan: Fungsi saveAvatar sekarang memperbarui profil Firebase
window.saveAvatar = async function() {
    if (!selectedAvatar || !currentUser) {
        alert("Pilih gambar terlebih dahulu!");
        return;
    }
    try {
        const fileName = `${Date.now()}_${selectedAvatar.name.replace(/\s+/g, "_")}`;
        const {
            data,
            error
        } = await supabaseClient.storage.from("chat-avatars").upload(fileName, selectedAvatar);
        if (error) throw new Error(error.message);
        const {
            data: urlData
        } = supabaseClient.storage.from("chat-avatars").getPublicUrl(data.path);
        const avatarUrl = urlData.publicUrl;
        // Perbarui profil Firebase
        await currentUser.updateProfile({
            photoURL: avatarUrl
        });
        console.log("Avatar updated successfully.");
        // Perbarui UI dan pesan-pesan yang sudah ada
        userAvatar.src = avatarUrl;
        const userId = currentUser.uid;
        messagesRef
            .orderByChild("userId")
            .equalTo(userId)
            .once("value", (snapshot) => {
                const updates = {};
                snapshot.forEach((childSnapshot) => {
                    updates[`chat/${childSnapshot.key}/photoURL`] = avatarUrl;
                });
                db.ref()
                    .update(updates)
                    .catch((error) => {
                        console.error("Error updating message avatar:", error);
                    });
            });
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
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const {
            data,
            error
        } = await supabaseClient.storage.from("chat-files").upload(fileName, file);
        if (error) throw new Error(error.message);
        const {
            data: urlData
        } = supabaseClient.storage.from("chat-files").getPublicUrl(data.path);
        return urlData.publicUrl;
    } catch (error) {
        console.error("Error uploading to Supabase:", error);
        alert("Gagal mengupload file: " + error.message);
        return null;
    }
};
window.deleteMessage = function(messageId) {
    if (!confirm("Hapus pesan ini?")) return;
    const user = auth.currentUser;
    if (!user) {
        alert("Silakan login terlebih dahulu!");
        return;
    }
    const messageRef = db.ref("chat/" + messageId);
    messageRef.once("value", (snapshot) => {
        const messageData = snapshot.val();
        if (messageData && (messageData.userId === user.uid || isAdmin(user.email))) {
            messageRef.update({
                deleted: true,
                text: "",
                fileUrl: "",
                fileName: "",
                fileType: ""
            }).catch((error) => {
                console.error("Error deleting message:", error);
                alert("Gagal menghapus pesan!");
            });
        } else {
            alert("Anda hanya dapat menghapus pesan sendiri!");
        }
    });
};
window.replyToMessage = function(messageId, event) {
    if (event) {
        event.stopPropagation();
    }
    const messageRef = db.ref("chat/" + messageId);
    messageRef.once("value", (snapshot) => {
        const messageData = snapshot.val();
        if (messageData) {
            replyTo = {
                messageId: messageId,
                user: messageData.user,
                text: messageData.text
            };
            document.getElementById("replyPreview").style.display = "flex";
            document.getElementById("replyUser").textContent = messageData.user;
            document.getElementById("replyText").textContent = messageData.text.length > 30 ? messageData.text.substring(0, 30) + "..." : messageData.text;
            messageInput.focus();
        }
    });
};
window.sendMessage = async function() {
    if (sending) return;
    sending = true;
    const user = auth.currentUser;
    if (!user) {
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
    // Menggunakan user.displayName dan user.photoURL yang sudah disinkronkan oleh Firebase
    const messageData = {
        userId: user.uid,
        user: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        text: text,
        timestamp: Date.now()
    };
    if (fileUrl) {
        messageData.fileUrl = fileUrl;
        messageData.fileName = fileName;
        messageData.fileType = fileType;
    }
    if (replyTo) {
        messageData.replyTo = replyTo;
    }
    messagesRef
        .push(messageData)
        .then(() => {
            messageInput.value = "";
            messageInput.style.height = "auto";
            selectedFile = null;
            document.getElementById("filePreview").style.display = "none";
            document.getElementById("fileInput").value = "";
            replyTo = null;
            document.getElementById("replyPreview").style.display = "none";
            db.ref("typing/" + user.uid).set({
                user: user.displayName,
                typing: false,
                timestamp: Date.now()
            });
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        })
        .catch((error) => {
            console.error("Error sending message:", error);
            alert("Gagal mengirim pesan!");
        })
        .finally(() => {
            sending = false;
        });
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
    document.getElementById("confirmLogoutBtn").addEventListener("click", () => {
        clearTimeout(typingTimeout);
        auth.signOut()
            .then(() => {
                console.log("User signed out");
            })
            .catch((error) => {
                console.error("Error during sign out:", error);
            });
        document.getElementById("confirmModal").style.display = "none";
    });
    document.getElementById("cancelLogoutBtn").addEventListener("click", () => {
        document.getElementById("confirmModal").style.display = "none";
    });
    document.querySelector(".file-upload-btn").addEventListener("click", () => {
        document.getElementById("fileInput").click();
    });
    messageInput.addEventListener("input", () => {
        const user = auth.currentUser;
        if (!user) return;
        messageInput.style.height = "auto";
        messageInput.style.height = messageInput.scrollHeight + "px";
        db.ref("typing/" + user.uid).set({
            user: user.displayName,
            typing: true,
            timestamp: Date.now()
        });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            db.ref("typing/" + user.uid).set({
                user: user.displayName,
                typing: false,
                timestamp: Date.now()
            });
        }, 3000);
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
    // Perbaikan: auth.onAuthStateChanged sekarang menampilkan profil yang disinkronkan
    auth.onAuthStateChanged((user) => {
        clearTimeout(typingTimeout);
        if (user) {
            currentUser = user;
            lastMessageDate = null;
            lastRenderedUserId = null;
            lastRenderedTimestamp = null;
            loginScreen.style.display = "none";
            userInfo.style.display = "flex";
            // Ambil data langsung dari objek user yang disinkronkan oleh Firebase
            userAvatar.src = user.photoURL || "default-avatar.jpg";
            userName.textContent = user.displayName;
            messageInput.disabled = false;
            messageInput.placeholder = "Ketik pesan...";
            sendButton.disabled = false;
            db.ref("typing").on("value", (snapshot) => {
                const typingUsers = [];
                snapshot.forEach((childSnapshot) => {
                    const typingData = childSnapshot.val();
                    if (typingData.typing && typingData.user !== user.displayName) {
                        typingUsers.push(typingData.user);
                    }
                });
                const typingStatus = document.getElementById("typingStatus");
                typingStatus.innerHTML = typingUsers.length > 0 ? `<div style="padding:5px 15px;font-size:0.8rem;color:var(--text-muted)">${typingUsers.join(", ")} sedang mengetik...</div>` : "";
            });
            messagesRef.once("value", () => {
                setTimeout(() => {
                    scrollToBottom();
                }, 1500);
            });
            messagesRef.on("child_added", (snapshot) => {
                const messageData = snapshot.val();
                const messageId = snapshot.key;
                if (messageElements[messageId]) {
                    return;
                }
                const escapedText = escapeHtml(messageData.text || "");
                const messageElement = document.createElement("div");
                messageElement.className = "message";
                messageElement.id = `message-${messageId}`;
                if (messageData.userId === user.uid) {
                    messageElement.classList.add("mine");
                }
                if (messageData.deleted) {
                    messageElement.classList.add("deleted-message");
                }
                if (messageData.fileUrl) {
                    messageElement.classList.add("file-message");
                }
                const messageDate = new Date(messageData.timestamp).toDateString();
                if (messageDate !== lastMessageDate) {
                    const dateHeader = document.createElement("div");
                    dateHeader.className = "date-header";
                    dateHeader.innerHTML = `<span>${formatDateHeader(messageData.timestamp)}</span>`;
                    document.getElementById("messages").appendChild(dateHeader);
                    lastMessageDate = messageDate;
                    lastRenderedUserId = null;
                    lastRenderedTimestamp = null;
                }
                const messageTimestamp = messageData.timestamp || Date.now();
                const isGrouped =
                    !messageData.replyTo &&
                    lastRenderedUserId === messageData.userId &&
                    lastRenderedTimestamp !== null &&
                    messageTimestamp - lastRenderedTimestamp < GROUP_TIME_THRESHOLD;
                if (isGrouped) {
                    messageElement.classList.add("grouped");
                }
                lastRenderedUserId = messageData.userId;
                lastRenderedTimestamp = messageTimestamp;
                const time = new Date(messageData.timestamp || Date.now()).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit"
                });
                const userColor = stringToColor(messageData.user);
                const isAdminUser = isAdmin(messageData.email);
                const specialTitle = getSpecialTitle(messageData.userId);
                const isKoruptor = ["lwklowkwkwk@gmail.com", "commentfotocik@gmail.com", "commentcik@gmail.com"].includes(messageData.email);
                let fileContent = "";
                if (messageData.fileUrl) {
                    if (messageData.fileType && messageData.fileType.startsWith("image")) {
                        fileContent = `<img src="${escapeHtml(messageData.fileUrl)}" alt="File upload" onerror="this.style.display='none'" style="cursor:pointer">`;
                    } else if (messageData.fileType && messageData.fileType.startsWith("video")) {
                        fileContent = `<video src="${escapeHtml(messageData.fileUrl)}" controls style="max-width:100%;max-height:200px;border-radius:var(--border-radius-sm);margin-top:8px"></video>`;
                    } else {
                        fileContent = `<a href="${escapeHtml(messageData.fileUrl)}" target="_blank" rel="noopener"><i class="fas fa-download"></i> Download File: ${escapeHtml(messageData.fileName || "File")}</a>`;
                    }
                }
                let replyContent = "";
                if (messageData.replyTo && !messageData.deleted) {
                    replyContent = `<div class="message-reply-container"><span class="reply-sender">${escapeHtml(messageData.replyTo.user)}</span>: ${escapeHtml(messageData.replyTo.text)}</div>`;
                }
                let messageBody = "";
                if (messageData.deleted) {
                    messageBody = "<em>Pesan dihapus</em>";
                } else {
                    messageBody = `${replyContent}${escapedText ? `<p>${escapedText}</p>` : ""}${fileContent ? `<div>${fileContent}</div>` : ""}`;
                }
                messageElement.innerHTML = `<img class="message-avatar" src="${escapeHtml(messageData.photoURL || "default-avatar.jpg")}" alt="${escapeHtml(
                    messageData.user
                )}" onerror="this.src='default-avatar.jpg'"><div class="message-content"><div class="user" style="color:${userColor}">${escapeHtml(messageData.user)}${isAdminUser ? '<span class="admin-badge">ADMIN</span>' : ""}${
                    isKoruptor ? '<span class="korupsi-badge">DPR</span>' : ""
                }${specialTitle ? '<span class="medan-badge">' + escapeHtml(specialTitle) + "</span>" : ""}</div>${messageBody}<div class="timestamp-container"><span class="timestamp">${time}</span>${
                    !messageData.deleted ? `<button class="reply-btn" onclick="replyToMessage('${messageId}', event)" title="Balas Pesan"><i class="fas fa-reply"></i></button>` : ""
                }${
                    (messageData.userId === user.uid || isAdmin(user.email)) && !messageData.deleted ? `<button class="delete-btn" onclick="deleteMessage('${messageId}')" title="Hapus Pesan"><i class="fas fa-trash"></i></button>` : ""
                }</div></div>`;
                document.getElementById("messages").appendChild(messageElement);
                messageElements[messageId] = messageElement;
                if (isUserAtBottom) {
                    setTimeout(() => {
                        scrollToBottom();
                    }, 100);
                }
            });
            messagesRef.on("child_changed", (snapshot) => {
                const messageData = snapshot.val();
                if (!messageData) return;
                const messageId = snapshot.key;
                const messageElement = document.getElementById(`message-${messageId}`);
                if (!messageElement) return;
                if (messageData.deleted) {
                    messageElement.classList.add("deleted-message");
                    const messageContent = messageElement.querySelector(".message-content");
                    messageContent.innerHTML = "<em>Pesan dihapus</em>";
                }
            });
        } else {
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
            cleanupObjectUrls();
        }
    });
});
window.addEventListener("beforeunload", cleanupObjectUrls);

// ── Mobile keyboard fix (biar input area & bubble chat ngepas sama keyboard) ──
(function () {
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
