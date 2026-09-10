const SUPABASE_URL = window.__ENV__?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    document.body.innerHTML = "<p style='color:#f55;padding:2rem;font-family:sans-serif'>Konfigurasi Supabase belum ke-load.</p>";
    throw new Error("SUPABASE_URL atau SUPABASE_ANON_KEY kosong");
}
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const avatarWrap = document.getElementById("profileAvatarWrap");
const avatarPreview = document.getElementById("profileAvatarPreview");
const avatarInput = document.getElementById("profileAvatarInput");
const avatarChangeBtn = document.getElementById("profileAvatarChangeBtn");
const nameInput = document.getElementById("profileNameInput");
const nameCharCount = document.getElementById("profileNameCharCount");
const emailField = document.getElementById("profileEmailField");
const saveBtn = document.getElementById("profileSaveBtn");
const statusEl = document.getElementById("profileStatus");
const guestOverlay = document.getElementById("profileGuestOverlay");

let currentUser = null;
let currentProfile = null;
let selectedAvatarFile = null;

function setStatus(message, type) {
    statusEl.textContent = message || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
}

function updateNameCharCount() {
    nameCharCount.textContent = `${nameInput.value.length}/20`;
}
nameInput.addEventListener("input", updateNameCharCount);

avatarWrap.addEventListener("click", () => avatarInput.click());
avatarChangeBtn.addEventListener("click", () => avatarInput.click());

avatarInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        setStatus("Hanya file gambar yang diizinkan!", "error");
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        setStatus("Ukuran file terlalu besar! Maksimal 5MB.", "error");
        return;
    }
    selectedAvatarFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        avatarPreview.src = e.target.result;
    };
    reader.readAsDataURL(file);
    setStatus("", null);
});

async function loadProfile(userId) {
    const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", userId).single();
    if (error) {
        console.error("Error loading profile:", error);
        return { display_name: "", avatar_url: "" };
    }
    return data;
}

async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append("file", file);
    const uploadResponse = await fetch("https://athars.space/upload.php", {
        method: "POST",
        body: formData
    });
    if (!uploadResponse.ok) throw new Error("Upload gagal, status " + uploadResponse.status);
    const avatarUrl = (await uploadResponse.text()).trim();
    if (!avatarUrl.startsWith("http")) throw new Error("Response uploader tidak valid: " + avatarUrl);
    return avatarUrl;
}

saveBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    const newName = nameInput.value.trim();
    if (!newName) {
        setStatus("Nama tidak boleh kosong.", "error");
        return;
    }
    saveBtn.disabled = true;
    setStatus("Menyimpan...", null);
    try {
        let avatarUrl = currentProfile?.avatar_url || "";
        if (selectedAvatarFile) {
            avatarUrl = await uploadAvatar(selectedAvatarFile);
        }
        const { error } = await supabaseClient.from("profiles").update({
            display_name: newName,
            avatar_url: avatarUrl
        }).eq("id", currentUser.id);
        if (error) throw error;
        await supabaseClient.from("messages").update({
            user_name: newName,
            photo_url: avatarUrl
        }).eq("user_id", currentUser.id);
        currentProfile.display_name = newName;
        currentProfile.avatar_url = avatarUrl;
        selectedAvatarFile = null;
        setStatus("Profil berhasil diperbarui.", "success");
    } catch (error) {
        console.error("Error updating profile:", error);
        setStatus("Gagal menyimpan: " + error.message, "error");
    } finally {
        saveBtn.disabled = false;
    }
});

async function initProfilePage(user) {
    currentUser = user;
    currentProfile = await loadProfile(user.id);
    nameInput.value = currentProfile.display_name || "";
    avatarPreview.src = currentProfile.avatar_url || "default-avatar.jpg";
    emailField.value = user.email || "";
    updateNameCharCount();
    guestOverlay.style.display = "none";
}

function showGuestOverlay() {
    guestOverlay.style.display = "flex";
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    if (user) {
        initProfilePage(user);
    } else {
        currentUser = null;
        currentProfile = null;
        showGuestOverlay();
    }
});

supabaseClient.auth.getSession().then(({ data: { session } }) => {
    const user = session?.user || null;
    if (user) {
        initProfilePage(user);
    } else {
        showGuestOverlay();
    }
});
