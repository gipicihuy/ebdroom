// ============================================================
// Sidebar (drawer) + User Account Dropdown
// File terpisah dari c.js biar logic chat/realtime ga kesenggol.
// Baca currentUser/currentProfile langsung dari c.js (top-level
// let/const di classic <script> saling keliatan di global scope).
// ============================================================
(function () {
    const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
    const sidebarProfileCard = document.getElementById("sidebarProfileCard");
    const sidebarProfileAvatar = document.getElementById("sidebarProfileAvatar");
    const sidebarProfileName = document.getElementById("sidebarProfileName");

    const avatarBtn = document.getElementById("avatarBtn");
    const accountDropdown = document.getElementById("accountDropdown");
    const dropdownAvatar = document.getElementById("dropdownAvatar");
    const dropdownUserName = document.getElementById("dropdownUserName");
    const dropdownUserEmail = document.getElementById("dropdownUserEmail");

    const navChatBtn = document.getElementById("navChatBtn");
    const navUserBtn = document.getElementById("navUserBtn");
    const navSettingsBtn = document.getElementById("navSettingsBtn");
    const navAppearanceBtn = document.getElementById("navAppearanceBtn");

    const dropdownProfileBtn = document.getElementById("dropdownProfileBtn");
    const dropdownSettingsBtn = document.getElementById("dropdownSettingsBtn");
    const dropdownNotificationsBtn = document.getElementById("dropdownNotificationsBtn");
    const dropdownLogoutBtn = document.getElementById("dropdownLogoutBtn");

    const appToast = document.getElementById("appToast");

    let toastTimer = null;
    function showToast(message) {
        if (!appToast) return;
        appToast.textContent = message;
        appToast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => appToast.classList.remove("show"), 2200);
    }

    function currentDisplayName() {
        if (typeof currentProfile !== "undefined" && currentProfile && currentProfile.display_name) {
            return currentProfile.display_name;
        }
        if (typeof currentUser !== "undefined" && currentUser) return currentUser.email;
        return "Guest";
    }
    function currentAvatarSrc() {
        if (typeof currentProfile !== "undefined" && currentProfile && currentProfile.avatar_url) {
            return currentProfile.avatar_url;
        }
        return "default-avatar.jpg";
    }

    // ── Sidebar open/close ──
    function openSidebar() {
        closeDropdown();
        sidebarProfileAvatar.src = currentAvatarSrc();
        sidebarProfileName.textContent = currentDisplayName();
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("open");
    }
    function closeSidebar() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("open");
    }
    menuBtn && menuBtn.addEventListener("click", openSidebar);
    sidebarCloseBtn && sidebarCloseBtn.addEventListener("click", closeSidebar);
    sidebarOverlay && sidebarOverlay.addEventListener("click", closeSidebar);

    function requireLogin(action) {
        if (typeof currentUser === "undefined" || !currentUser) {
            showToast("Login dulu ya");
            return;
        }
        action();
    }

    navChatBtn && navChatBtn.addEventListener("click", () => {
        closeSidebar();
    });
    navUserBtn && navUserBtn.addEventListener("click", () => {
        closeSidebar();
        requireLogin(() => window.showAvatarModal && window.showAvatarModal());
    });
    navSettingsBtn && navSettingsBtn.addEventListener("click", () => {
        closeSidebar();
        requireLogin(() => window.showNameModal && window.showNameModal());
    });
    navAppearanceBtn && navAppearanceBtn.addEventListener("click", () => {
        closeSidebar();
        showToast("Tema gelap aktif otomatis");
    });
    sidebarProfileCard && sidebarProfileCard.addEventListener("click", () => {
        closeSidebar();
        requireLogin(() => window.showAvatarModal && window.showAvatarModal());
    });

    // ── Account dropdown open/close ──
    function openDropdown() {
        closeSidebar();
        dropdownAvatar.src = currentAvatarSrc();
        dropdownUserName.textContent = currentDisplayName();
        dropdownUserEmail.textContent = (typeof currentUser !== "undefined" && currentUser && currentUser.email) || "";
        accountDropdown.classList.add("open");
        avatarBtn.setAttribute("aria-expanded", "true");
    }
    function closeDropdown() {
        accountDropdown.classList.remove("open");
        avatarBtn && avatarBtn.setAttribute("aria-expanded", "false");
    }
    avatarBtn && avatarBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (accountDropdown.classList.contains("open")) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    dropdownProfileBtn && dropdownProfileBtn.addEventListener("click", () => {
        closeDropdown();
        window.showAvatarModal && window.showAvatarModal();
    });
    dropdownSettingsBtn && dropdownSettingsBtn.addEventListener("click", () => {
        closeDropdown();
        window.showNameModal && window.showNameModal();
    });
    dropdownNotificationsBtn && dropdownNotificationsBtn.addEventListener("click", () => {
        closeDropdown();
        showToast("Notifikasi belum tersedia");
    });
    dropdownLogoutBtn && dropdownLogoutBtn.addEventListener("click", () => {
        closeDropdown();
        window.signOut && window.signOut();
    });

    // ── Close on outside click / Escape ──
    document.addEventListener("click", (event) => {
        if (accountDropdown.classList.contains("open") && !accountDropdown.contains(event.target) && event.target !== avatarBtn) {
            closeDropdown();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDropdown();
            closeSidebar();
        }
    });

    // ── Icons ──
    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
})();
