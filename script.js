<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
  import {
    getDatabase,
    ref,
    push,
    set,
    onChildAdded,
    onChildChanged
  } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

  const firebaseConfig = {
    apiKey: "AIzaSyBynK1eoPMjOQZAZsUxSiG7J348ENYHkNU",
    authDomain: "chatroomebd.firebaseapp.com",
    databaseURL: "https://chatroomebd-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "chatroomebd",
    storageBucket: "chatroomebd.appspot.com",
    messagingSenderId: "686847521502",
    appId: "1:686847521502:web:89ea20aa523da58e85484f"
  };

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const messagesRef = ref(db, "chat");

  function sanitize(text) {
    const div = document.createElement("div");
    div.innerHTML = text;
    div.querySelectorAll("iframe").forEach(i => i.remove());
    return div.innerHTML;
  }

  function stringToColor(str) {
    if (!str) return "#000";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 50%)`;
  }

  let userName = localStorage.getItem("chatUserName");
  while (!userName || userName.trim() === "" || userName === "Anonymous") {
    const input = prompt("Masukkan nama kamu (wajib):");
    if (input === null) {
      alert("Nama diperlukan untuk lanjut.");
      continue;
    }
    userName = input.trim();
  }
  localStorage.setItem("chatUserName", userName);

  const messagesDiv = document.getElementById("messages");
  const messageInput = document.getElementById("messageInput");
  const scrollBtn = document.getElementById("scrollBtn");
  const typingDiv = document.getElementById("typingStatus");

  let replyTo = null;
  let sending = false;
  let isUserAtBottom = true;
  let typingTimeout;

  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = messageInput.scrollHeight + "px";

    set(ref(db, "typing/" + userName), {
      user: userName,
      typing: true,
      timestamp: Date.now()
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      set(ref(db, "typing/" + userName), {
        user: userName,
        typing: false,
        timestamp: Date.now()
      });
    }, 3000);
  });

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  messagesDiv.addEventListener("scroll", () => {
    const nearBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight < 150;
    isUserAtBottom = nearBottom;
    scrollBtn.classList.toggle("visible", !nearBottom);
  });

  onChildAdded(messagesRef, (data) => {
    const msg = data.val();
    if (!msg || !msg.text || !msg.user) return;

    const safeText = sanitize(msg.text);
    const msgDiv = document.createElement("div");
    msgDiv.className = "message";
    if (msg.user === userName) msgDiv.classList.add("mine");

    const time = new Date(msg.timestamp || Date.now()).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit"
    });

    const userColor = stringToColor(msg.user);

    msgDiv.innerHTML = `
      <div class="user" style="color: ${userColor};"><i class="fas fa-user-circle"></i> ${sanitize(msg.user)}</div>
      ${msg.replyTo ? `<div style="font-size: 0.85rem; color: gray; background: #f0f0f0; padding: 5px; border-left: 3px solid #888; margin-bottom: 4px;">${sanitize(msg.replyTo)}</div>` : ""}
      <div>${safeText}</div>
      <div class="timestamp">${time}</div>
    `;

    msgDiv.addEventListener("click", () => {
      replyTo = `${msg.user}: ${msg.text}`;
      messageInput.placeholder = `Balas ke: ${msg.user}`;
      document.getElementById("replyUser").textContent = msg.user;
      document.getElementById("replyText").textContent = msg.text;
      document.getElementById("replyPreview").style.display = "block";
      messageInput.focus();
    });

    messagesDiv.appendChild(msgDiv);

    if (isUserAtBottom) scrollToBottom();
    if (messagesDiv.children.length > 100) messagesDiv.removeChild(messagesDiv.firstChild);
  });

  // Tampilkan siapa yang sedang mengetik
  const typingStatusRef = ref(db, "typing");

  onChildAdded(typingStatusRef, handleTypingUpdate);
  onChildChanged(typingStatusRef, handleTypingUpdate);

  function handleTypingUpdate(snapshot) {
    const data = snapshot.val();
    if (!data || data.user === userName) return;

    if (data.typing) {
      typingDiv.textContent = `${data.user} sedang mengetik...`;
    } else {
      typingDiv.textContent = "";
    }
  }

  window.scrollToBottom = function () {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  window.sendMessage = function () {
    if (sending) return;
    const text = messageInput.value.trim();
    if (text === "") return;

    sending = true;
    setTimeout(() => sending = false, 500);

    push(messagesRef, {
      user: userName,
      text,
      timestamp: Date.now(),
      replyTo: replyTo
    });

    messageInput.value = "";
    messageInput.style.height = "40px";
    messageInput.placeholder = "Ketik pesan...";
    replyTo = null;
    document.getElementById("replyPreview").style.display = "none";
    setTimeout(scrollToBottom, 100);

    // Reset typing status saat kirim pesan
    set(ref(db, "typing/" + userName), {
      user: userName,
      typing: false,
      timestamp: Date.now()
    });
  };

  window.cancelReply = function () {
    replyTo = null;
    messageInput.placeholder = "Ketik pesan...";
    document.getElementById("replyPreview").style.display = "none";
  };
</script>