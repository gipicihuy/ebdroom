const SUPABASE_URL = window.__ENV__?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    document.body.innerHTML = "<p style='color:#f55;padding:2rem;font-family:sans-serif'>Konfigurasi Supabase belum ke-load.</p>";
    throw new Error("SUPABASE_URL atau SUPABASE_ANON_KEY kosong");
}
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginProviderEl = document.getElementById("settingsLoginProvider");
const loginIconEl = document.getElementById("settingsLoginIcon");
const passwordSection = document.getElementById("passwordSection");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const savePasswordBtn = document.getElementById("savePasswordBtn");
const passwordStatus = document.getElementById("passwordStatus");
const guestOverlay = document.getElementById("settingsGuestOverlay");

let currentUser = null;

function setPasswordStatus(message, type) {
    passwordStatus.textContent = message || "";
    passwordStatus.classList.remove("error", "success");
    if (type) passwordStatus.classList.add(type);
}

savePasswordBtn.addEventListener("click", async () => {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (newPassword.length < 6) {
        setPasswordStatus("Password minimal 6 karakter.", "error");
        return;
    }
    if (newPassword !== confirmPassword) {
        setPasswordStatus("Konfirmasi password tidak cocok.", "error");
        return;
    }
    savePasswordBtn.disabled = true;
    setPasswordStatus("Menyimpan...", null);
    try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";
        setPasswordStatus("Password berhasil diubah.", "success");
    } catch (error) {
        console.error("Error updating password:", error);
        setPasswordStatus("Gagal mengubah password: " + error.message, "error");
    } finally {
        savePasswordBtn.disabled = false;
    }
});

function applyProviderInfo(user) {
    const provider = user.app_metadata?.provider || "email";
    const email = user.email || "";
    if (provider === "google") {
        loginProviderEl.textContent = email ? `Google · ${email}` : "Google";
        loginIconEl.innerHTML = '<i class="fa-brands fa-google"></i>';
        passwordSection.style.display = "none";
    } else {
        loginProviderEl.textContent = email ? `Email & Password · ${email}` : "Email & Password";
        loginIconEl.innerHTML = '<i class="fas fa-envelope"></i>';
        passwordSection.style.display = "block";
    }
}

function showGuestOverlay() {
    guestOverlay.style.display = "flex";
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    if (user) {
        currentUser = user;
        applyProviderInfo(user);
        guestOverlay.style.display = "none";
    } else {
        currentUser = null;
        showGuestOverlay();
    }
});

supabaseClient.auth.getSession().then(({ data: { session } }) => {
    const user = session?.user || null;
    if (user) {
        currentUser = user;
        applyProviderInfo(user);
    } else {
        showGuestOverlay();
    }
});
