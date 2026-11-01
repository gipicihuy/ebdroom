const S="https://cdn.zass.in/upload",U=52428800,b={zass:"https://cdn.zass.in"},A="https://athars.space";

async function _(a){
  if(a.method!=="POST")return new Response("Method not allowed",{status:405});
  const n=a.headers.get("content-type")||"";
  if(!n.includes("multipart/form-data"))return new Response("Invalid content type",{status:400});
  if(Number(a.headers.get("content-length")||0)>52428800)return new Response("File too large",{status:413});
  try{
    const t=await a.arrayBuffer();
    if(t.byteLength>52428800)return new Response("File too large",{status:413});
    const r=await fetch(S,{method:"POST",headers:{"content-type":n,accept:"application/json"},body:t}),o=await r.text();
    let e;
    try{e=JSON.parse(o)}catch{}
    return r.ok&&e?.success&&typeof e.url=="string"&&e.url.startsWith("https://")
      ?new Response(e.url,{status:200,headers:{"content-type":"text/plain; charset=utf-8"}})
      :new Response(e?.message||"Upload gagal di CDN",{status:r.ok?502:r.status,headers:{"content-type":"text/plain; charset=utf-8"}});
  }catch{
    return new Response("Upload proxy error",{status:502});
  }
}

async function k(a,n){
  const t=n.replace(/^\/media/,""),r=t.split("/")[1],o=b[r]?b[r]+t.slice(r.length+1):A+t;
  try{
    const e=await fetch(o,{cf:{cacheEverything:!0,cacheTtl:31536e3}}),p=new Headers;
    for(const l of["content-type","content-length"]){
      const u=e.headers.get(l);
      u&&p.set(l,u);
    }
    return p.set("cache-control",e.ok?"public, max-age=31536000, immutable":"no-store"),new Response(e.body,{status:e.status,headers:p});
  }catch{
    return new Response("Media proxy error",{status:502});
  }
}

const E=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const v={
  "content-type":"text/html; charset=utf-8",
  "cache-control":"no-store",
  "x-robots-tag":"noindex, nofollow",
  "referrer-policy":"no-referrer",
  "content-security-policy":"default-src 'none'; style-src 'unsafe-inline' https://cdnjs.cloudflare.com; script-src 'unsafe-inline'; font-src https://cdnjs.cloudflare.com; img-src https: data:; form-action 'self'; frame-ancestors 'none'"
};

function d(a){
  return String(a??"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n]);
}

async function P(a,n){
  if(n.SUPABASE_URL&&n.SUPABASE_ANON_KEY)return{url:n.SUPABASE_URL,key:n.SUPABASE_ANON_KEY};
  const t=await n.ASSETS.fetch(new Request(new URL("/env-config.js",a.url)));
  const r=(await t.text()).match(/__ENV__\s*=\s*(\{[\s\S]*?\})\s*;/);
  const o=r?JSON.parse(r[1]):{};
  return{url:o.SUPABASE_URL,key:o.SUPABASE_ANON_KEY};
}

function parseStyleConfig(raw) {
  if (!raw) return { badgeStyle: "", cardStyle: "", avatarStyle: "", nameStyle: "", icon: "fa-shield-halved" };
  try {
    const j = JSON.parse(raw);
    return {
      badgeStyle: j.badgeStyle || "",
      cardStyle: j.cardStyle || "",
      avatarStyle: j.avatarStyle || "",
      nameStyle: j.nameStyle || "",
      icon: j.icon || "fa-shield-halved"
    };
  } catch {
    return { badgeStyle: raw, cardStyle: "", avatarStyle: "", nameStyle: "", icon: "fa-shield-halved" };
  }
}

function h(key, list, msg, isError) {
  const strictAiPrompt = `Instruksi Mutlak: Anda adalah Game UI & CSS Designer profesional.
Tugas: Buatkan styling bentukan kartu profil (card shape), bingkai avatar kustom, dan lencana VIP khusus untuk chat room.

ATURAN OUTPUT (WAJIB PATUH):
1. DILARANG memberi basa-basi ("Tentu", "Berikut adalah JSON", dsb).
2. DILARANG memberi penjelasan atau markdown codeblock di luar JSON.
3. Output HANYA boleh string JSON murni valid yang diawali '{' dan diakhiri '}'.

Struktur JSON:
{
  "title": "NAMA_TITLE",
  "icon": "fa-bolt",
  "cardStyle": "clip-path: polygon(...); background: ...; border: ...; box-shadow: ...;",
  "avatarStyle": "clip-path: polygon(...) atau border-radius: ...; border: ...; filter: ...;",
  "nameStyle": "color: ...; text-shadow: ...; font-weight: 800;",
  "badgeStyle": "background: ...; color: ...; border-radius: ...; box-shadow: ...;"
}

Panduan Bentukan Fisik:
- cardStyle: Jangan cuma warna! Buat bentukan unik dengan 'clip-path' (misal: chamfered polygon sudut potong mecha 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)', rounded arch, asymmetrical borders, gradient outline, atau glassmorphism).
- avatarStyle: Berikan bentukan avatar unik (misal: hexagon 'clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', diamond squircle, glowing outline filter, atau ring halo).
- nameStyle: Warna teks nama mencolok, bisa gradient text (-webkit-background-clip: text), text-shadow neon aura.
- badgeStyle: Pill title badge dengan gradient kontras dan glow.
- icon: Pilih 1 nama icon FontAwesome 6 (fa-crown, fa-bolt, fa-fire, fa-gem, fa-star, fa-skull, fa-shield-halved, fa-wand-magic-sparkles, fa-dragon, fa-ghost, fa-biohazard, fa-crosshairs, fa-meteor).

Tema yang diinginkan: [GANTI_DENGAN_TEMA_ANDA, contoh: Cyberpunk Neon Mecha / Royal Golden Emperor / Void Dark Matter / Blood Moon Vampire / Glitch Cyber Hacker / Cosmic Astral Prism]`;

  const items = (list || []).map((e) => {
    const s = parseStyleConfig(e.style);
    const badgeAttr = s.badgeStyle ? `style="${d(s.badgeStyle)}"` : "";
    const cardAttr = s.cardStyle ? `style="${d(s.cardStyle)}"` : "";
    const avatarAttr = s.avatarStyle ? `style="${d(s.avatarStyle)}"` : "";
    const nameAttr = s.nameStyle ? `style="${d(s.nameStyle)}"` : "";
    const iconClass = d(s.icon || "fa-shield-halved");
    const safeStyleJson = d(e.style || "");

    return `<li class="vip-item" ${cardAttr}>
      <div class="vip-avatar-mini" ${avatarAttr}><i class="fas fa-user"></i></div>
      <div class="vip-info">
        <div class="vip-name-row">
          <strong class="vip-name" ${nameAttr}>${d(e.name || "(Tanpa profil)")}</strong>
          <span class="vip-badge" ${badgeAttr}><i class="fas ${iconClass}"></i> ${d(e.title || "ADMIN")}</span>
        </div>
        <div class="vip-sub">
          <code class="vip-id">${d(e.id)}</code>
          <button type="button" class="btn-copy-id" title="Salin ID" onclick="copyText('${d(e.id)}')"><i class="fas fa-copy"></i></button>
        </div>
      </div>
      <div class="vip-actions">
        <button type="button" class="btn-edit" onclick="editVip('${d(e.id)}', '${d(e.title || "ADMIN")}', '${safeStyleJson}')"><i class="fas fa-pen"></i> Edit</button>
        <form method="get" onsubmit="return confirm('Hapus VIP user ini?')">
          <input type="hidden" name="key" value="${d(key)}">
          <input type="hidden" name="remove" value="${d(e.id)}">
          <button class="btn-del" type="submit" title="Hapus"><i class="fas fa-trash"></i></button>
        </form>
      </div>
    </li>`;
  }).join("");

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex">
  <title>VIP & Custom Card Architect — Eberardos</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --bg: #151312;
      --surface: #1e1b19;
      --surface-2: #27221f;
      --border: #38302c;
      --accent: #db7354;
      --accent-hover: #ea8163;
      --accent-dim: rgba(219, 115, 84, 0.16);
      --text: #f0ebe5;
      --text-muted: #ada59d;
      --gold: #f3c887;
      --radius: 16px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    main { max-width: 900px; margin: 0 auto; }
    
    header.hero {
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      font-size: 1.55rem;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
      font-weight: 800;
    }
    h1 i { color: var(--accent); }
    header p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }
    
    .msg {
      padding: 12px 18px;
      border-radius: var(--radius);
      margin-bottom: 22px;
      font-weight: 600;
    }
    .ok { background: rgba(80, 200, 120, 0.15); border: 1px solid rgba(80, 200, 120, 0.3); color: #8fe0a9; }
    .err { background: rgba(255, 90, 90, 0.15); border: 1px solid rgba(255, 90, 90, 0.3); color: #ff9a9a; }

    /* AI Prompt Architect Section */
    .ai-guide-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 22px;
      margin-bottom: 24px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
      position: relative;
    }
    .ai-guide-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .ai-guide-title {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--gold);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-copy-ai {
      background: var(--accent);
      color: #240e06;
      border: 0;
      border-radius: 10px;
      padding: 9px 16px;
      font-size: 0.85rem;
      font-weight: 800;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
      box-shadow: 0 4px 14px rgba(219, 115, 84, 0.3);
    }
    .btn-copy-ai:hover {
      background: var(--accent-hover);
      transform: translateY(-1px);
    }
    .ai-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .step-card {
      background: #151211;
      border: 1px solid #2f2723;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      gap: 10px;
      font-size: 0.83rem;
      color: #ddd4cb;
    }
    .step-badge {
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid var(--accent);
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 800;
      flex-shrink: 0;
    }
    .prompt-preview-wrap {
      background: #110e0d;
      border: 1px solid #2d2420;
      border-radius: 10px;
      padding: 12px 14px;
      max-height: 140px;
      overflow-y: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem;
      color: #c9bfb6;
      white-space: pre-wrap;
    }

    /* Quick Presets Grid */
    .presets-section {
      margin-bottom: 24px;
    }
    .presets-title {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--text-muted);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .presets-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .preset-card-btn {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 8px 14px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .preset-card-btn:hover {
      border-color: var(--accent);
      background: var(--surface-2);
      transform: translateY(-2px);
    }

    /* Workspace 2 Kolom */
    .workspace {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    @media (max-width: 800px) {
      .workspace { grid-template-columns: 1fr; }
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
    }
    .panel h2 {
      font-size: 1.15rem;
      margin: 0 0 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fff;
    }

    .form-group { margin-bottom: 14px; }
    .form-group label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    input, textarea {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #141110;
      color: inherit;
      font: inherit;
      transition: border-color 0.15s;
    }
    input:focus, textarea:focus {
      outline: 0;
      border-color: var(--accent);
    }
    textarea {
      resize: vertical;
      min-height: 140px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 0.8rem;
      line-height: 1.45;
    }
    .btn-submit {
      width: 100%;
      padding: 12px;
      border: 0;
      border-radius: 10px;
      background: var(--accent);
      color: #240e06;
      font-size: 0.95rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s;
    }
    .btn-submit:hover { background: var(--accent-hover); }

    /* Live Card Shape Preview Box */
    .preview-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 250px;
      background: #141110;
      border: 1px dashed #38302c;
      border-radius: 14px;
      padding: 24px 16px;
      position: relative;
      overflow: hidden;
      transition: all 0.25s ease;
    }
    .preview-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #2b221d;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 800;
      color: var(--accent);
      margin-bottom: 12px;
      border: 2px solid var(--accent);
      transition: all 0.25s ease;
      position: relative;
    }
    .preview-name {
      font-size: 1.2rem;
      font-weight: 800;
      margin: 0 0 6px;
      color: #fff;
      transition: all 0.25s ease;
    }
    .vip-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 999px;
      background: linear-gradient(135deg, #f3c887, #e98f72);
      color: #2b1a05;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      box-shadow: 0 1px 6px rgba(0,0,0,0.3);
      transition: all 0.25s ease;
    }

    /* VIP List */
    ul.vip-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 12px;
    }
    .vip-item {
      display: flex;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }
    .vip-avatar-mini {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #29221d;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      color: var(--accent);
      flex-shrink: 0;
      border: 1px solid var(--border);
      transition: all 0.25s;
    }
    .vip-info { min-width: 0; flex: 1; display: grid; gap: 4px; }
    .vip-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .vip-name { font-size: 1rem; color: #fff; }
    .vip-sub { display: flex; align-items: center; gap: 6px; }
    code.vip-id { font-size: 0.75rem; color: var(--text-muted); overflow-wrap: anywhere; }
    .btn-copy-id {
      background: transparent;
      border: 0;
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px 4px;
    }
    .btn-copy-id:hover { color: var(--accent); }
    .vip-actions { display: flex; gap: 8px; align-items: center; }
    .btn-edit {
      background: var(--surface-2);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-edit:hover { border-color: var(--accent); color: var(--accent); }
    .btn-del {
      background: #311518;
      color: #ff9a9a;
      border: 1px solid #4a1f24;
      border-radius: 8px;
      padding: 7px 12px;
      cursor: pointer;
    }
    .btn-del:hover { background: #4a1f24; }
  </style>
</head>
<body>
  <main>
    <header class="hero">
      <h1><i class="fas fa-gem"></i> VIP & Custom Card Architect</h1>
      <p>Kreasikan bentuk kartu profil, avatar kustom, title spesial, dan efek visual eksklusif member VIP.</p>
    </header>

    ${msg ? `<div class="msg ${isError ? "err" : "ok"}">${d(msg)}</div>` : ""}

    <!-- Step-by-Step AI Prompt Generator -->
    <section class="ai-guide-box">
      <div class="ai-guide-head">
        <div class="ai-guide-title"><i class="fas fa-wand-magic-sparkles"></i> Generator Prompt AI Struktur Baku</div>
        <button type="button" class="btn-copy-ai" id="btnCopyPrompt" onclick="copyPrompt()">
          <i class="fas fa-copy"></i> Salin Prompt AI (Siap Kirim)
        </button>
      </div>

      <div class="ai-steps">
        <div class="step-card">
          <span class="step-badge">1</span>
          <div><strong>Salin Prompt</strong><br>Klik tombol di atas untuk copy format prompt baku.</div>
        </div>
        <div class="step-card">
          <span class="step-badge">2</span>
          <div><strong>Kirim ke AI Chatbot</strong><br>Paste ke ChatGPT/Claude/Gemini & tentukan temamu.</div>
        </div>
        <div class="step-card">
          <span class="step-badge">3</span>
          <div><strong>Dapatkan Pure JSON</strong><br>AI akan langsung output JSON teratur tanpa chit-chat.</div>
        </div>
        <div class="step-card">
          <span class="step-badge">4</span>
          <div><strong>Paste & Simpan</strong><br>Paste ke form, amati live shape card, lalu simpan!</div>
        </div>
      </div>

      <div class="prompt-preview-wrap" id="promptText">${d(strictAiPrompt)}</div>
    </section>

    <!-- Quick Presets -->
    <section class="presets-section">
      <div class="presets-title"><i class="fas fa-bolt"></i> Preset Bentuk Kartu Fisik & Tema Eksotis</div>
      <div class="presets-list">
        <button type="button" class="preset-card-btn" onclick="applyPreset('mecha')">⚡ Cyber Mecha (Chamfer Card + Hexagon Avatar)</button>
        <button type="button" class="preset-card-btn" onclick="applyPreset('sovereign')">👑 Royal Sovereign (Arch Crest + Gold Halo)</button>
        <button type="button" class="preset-card-btn" onclick="applyPreset('crimson')">🩸 Blood Void (Slice Edge + Crimson Aura)</button>
        <button type="button" class="preset-card-btn" onclick="applyPreset('hologram')">🔮 Void Hologram (Glass Prism + Violet Pulse)</button>
        <button type="button" class="preset-card-btn" onclick="applyPreset('terminal')">💎 Matrix Terminal (HUD Cutout + Monospace)</button>
        <button type="button" class="preset-card-btn" onclick="applyPreset('stealth')">💀 Obsidian Armor (Asymmetric Carbon Shield)</button>
      </div>
    </section>

    <!-- Workspace: Form + Live Preview -->
    <div class="workspace">
      <section class="panel">
        <h2><i class="fas fa-sliders"></i> Atur Member VIP</h2>
        <form id="vipForm" method="get">
          <input type="hidden" name="key" value="${d(key)}">
          
          <div class="form-group">
            <label for="inputAdd">User ID (UUID)</label>
            <input id="inputAdd" name="add" placeholder="e3fe4a8e-e4d4-422f-bae3-8d5ac822270c" required pattern="[0-9a-fA-F-]{36}" autocomplete="off">
          </div>
          
          <div class="form-group">
            <label for="inputTitle">Custom Title</label>
            <input id="inputTitle" name="title" placeholder="CYBER LORD / ROYAL GOLD / VOID EMPEROR" maxlength="32" oninput="updateLivePreview()">
          </div>
          
          <div class="form-group">
            <label for="inputStyle">Struktur Styling Card (JSON AI atau CSS)</label>
            <textarea id="inputStyle" name="style" placeholder='{"title":"CYBER LORD","icon":"fa-bolt","cardStyle":"clip-path: polygon(...); background: ...;","avatarStyle":"clip-path: polygon(...); border: ...;","nameStyle":"color: ...;","badgeStyle":"background: ...;"}' oninput="updateLivePreview()"></textarea>
          </div>

          <button type="submit" class="btn-submit"><i class="fas fa-save"></i> Simpan VIP</button>
        </form>
      </section>

      <section class="panel">
        <h2><i class="fas fa-eye"></i> Live Shape & Card Preview</h2>
        <div class="preview-box" id="previewCardWrap">
          <div class="preview-avatar" id="previewAvatar">E</div>
          <div class="preview-name" id="previewName">Nama Member</div>
          <div class="preview-badge-row">
            <span class="vip-badge" id="previewBadge"><i class="fas fa-shield-halved" id="previewIcon"></i> <span id="previewTitleText">ADMIN</span></span>
          </div>
        </div>
      </section>
    </div>

    <!-- Active VIP Member Cards -->
    <section class="panel" style="margin-top:20px;">
      <h2><i class="fas fa-users"></i> Daftar Member VIP Terdaftar (${(list || []).length})</h2>
      <ul class="vip-list">
        ${items || '<p style="color:var(--text-muted);padding:12px;background:#141110;border-radius:10px;">Belum ada member VIP terdaftar.</p>'}
      </ul>
    </section>
  </main>

  <script>
    const PRESETS = {
      mecha: {
        title: "CYBER MECHA",
        icon: "fa-bolt",
        cardStyle: "background: linear-gradient(135deg, #09131f 0%, #03080e 100%); border: 1px solid #00f2fe; clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%); box-shadow: 0 0 25px rgba(0, 242, 254, 0.35), inset 0 0 15px rgba(0, 242, 254, 0.1);",
        avatarStyle: "clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); border: 2px solid #00f2fe; filter: drop-shadow(0 0 10px #00f2fe); border-radius: 0;",
        nameStyle: "background: linear-gradient(90deg, #00f2fe, #4facfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; letter-spacing: 0.05em;",
        badgeStyle: "background: #00f2fe; color: #02111a; font-weight: 900; letter-spacing: 0.08em; clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px)); box-shadow: 0 0 14px rgba(0, 242, 254, 0.6);"
      },
      sovereign: {
        title: "ROYAL SOVEREIGN",
        icon: "fa-crown",
        cardStyle: "background: radial-gradient(circle at 50% 0%, #2e2311 0%, #151008 100%); border: 2px solid #dfb15b; border-radius: 28px 28px 12px 12px; box-shadow: 0 12px 35px rgba(223, 177, 91, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);",
        avatarStyle: "border-radius: 50%; border: 3px solid #dfb15b; box-shadow: 0 0 20px rgba(223, 177, 91, 0.6); padding: 3px; background: #1a140a;",
        nameStyle: "color: #ffd700; text-shadow: 0 2px 10px rgba(255, 215, 0, 0.5); font-weight: 800; letter-spacing: 0.04em;",
        badgeStyle: "background: linear-gradient(135deg, #ffd700, #b8860b); color: #211500; font-weight: 800; border: 1px solid #fff; box-shadow: 0 2px 12px rgba(255, 215, 0, 0.5);"
      },
      crimson: {
        title: "BLOOD VOID",
        icon: "fa-fire",
        cardStyle: "background: linear-gradient(145deg, #22080a, #100204); border-left: 4px solid #ff1a35; border-right: 1px solid #520e14; border-top: 1px solid #520e14; border-bottom: 1px solid #520e14; border-radius: 8px 24px 8px 24px; box-shadow: 0 8px 30px rgba(255, 26, 53, 0.3);",
        avatarStyle: "border-radius: 18px; border: 2px solid #ff1a35; box-shadow: 0 0 18px rgba(255, 26, 53, 0.5);",
        nameStyle: "color: #ff4d63; text-shadow: 0 0 12px rgba(255, 26, 53, 0.6); font-weight: 800;",
        badgeStyle: "background: linear-gradient(135deg, #ff1a35, #80000e); color: #fff; font-weight: 800; box-shadow: 0 0 12px rgba(255, 26, 53, 0.6);"
      },
      hologram: {
        title: "VOID HOLOGRAM",
        icon: "fa-wand-magic-sparkles",
        cardStyle: "background: rgba(28, 18, 43, 0.8); backdrop-filter: blur(16px); border: 1px solid rgba(186, 104, 255, 0.4); border-radius: 24px; box-shadow: 0 8px 32px rgba(138, 43, 226, 0.35), inset 0 0 20px rgba(186, 104, 255, 0.15);",
        avatarStyle: "border-radius: 50%; border: 2px dashed #ba68ff; box-shadow: 0 0 20px rgba(186, 104, 255, 0.5);",
        nameStyle: "background: linear-gradient(90deg, #e0aaff, #ba68ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;",
        badgeStyle: "background: linear-gradient(135deg, #ba68ff, #7928ca); color: #fff; font-weight: 800; box-shadow: 0 0 15px rgba(186, 104, 255, 0.5);"
      },
      terminal: {
        title: "MATRIX HUD",
        icon: "fa-crosshairs",
        cardStyle: "background: #021208; border: 1px solid #00ff66; clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px); box-shadow: 0 0 20px rgba(0, 255, 102, 0.25), inset 0 0 12px rgba(0, 255, 102, 0.1);",
        avatarStyle: "clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px); border: 2px solid #00ff66; filter: drop-shadow(0 0 8px #00ff66); border-radius: 0;",
        nameStyle: "color: #00ff66; font-family: monospace; text-shadow: 0 0 8px #00ff66; font-weight: 700; letter-spacing: 0.1em;",
        badgeStyle: "background: #00ff66; color: #011408; font-family: monospace; font-weight: 900; letter-spacing: 0.1em; box-shadow: 0 0 10px #00ff66;"
      },
      stealth: {
        title: "OBSIDIAN ARMOR",
        icon: "fa-skull",
        cardStyle: "background: linear-gradient(160deg, #18181b 0%, #09090b 100%); border: 1px solid #3f3f46; border-radius: 4px 28px 4px 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.05);",
        avatarStyle: "border-radius: 4px 18px 4px 18px; border: 2px solid #71717a; box-shadow: 0 0 15px rgba(255,255,255,0.15);",
        nameStyle: "color: #fafafa; font-weight: 800; letter-spacing: 0.06em;",
        badgeStyle: "background: #27272a; color: #f4f4f5; border: 1px solid #52525b; font-weight: 800; box-shadow: 0 0 8px rgba(0,0,0,0.5);"
      }
    };

    function updateLivePreview() {
      const titleInput = document.getElementById("inputTitle");
      const styleInput = document.getElementById("inputStyle");
      const titleText = (titleInput.value || "ADMIN").trim().toUpperCase();
      const styleVal = styleInput.value.trim();

      const card = document.getElementById("previewCardWrap");
      const badge = document.getElementById("previewBadge");
      const icon = document.getElementById("previewIcon");
      const name = document.getElementById("previewName");
      const titleEl = document.getElementById("previewTitleText");
      const avatar = document.getElementById("previewAvatar");

      titleEl.textContent = titleText;

      // Reset
      card.removeAttribute("style");
      badge.removeAttribute("style");
      name.removeAttribute("style");
      avatar.removeAttribute("style");
      icon.className = "fas fa-shield-halved";

      if (!styleVal) return;

      try {
        const j = JSON.parse(styleVal);
        if (j.cardStyle) card.setAttribute("style", j.cardStyle);
        if (j.avatarStyle) avatar.setAttribute("style", j.avatarStyle);
        if (j.nameStyle) name.setAttribute("style", j.nameStyle);
        if (j.badgeStyle) badge.setAttribute("style", j.badgeStyle);
        if (j.icon) {
          const rawIcon = j.icon.replace(/^fa[srb]?\s+/, "");
          icon.className = "fas " + rawIcon;
        }
      } catch {
        badge.setAttribute("style", styleVal);
      }
    }

    function applyPreset(key) {
      const p = PRESETS[key];
      if (!p) return;
      document.getElementById("inputTitle").value = p.title;
      document.getElementById("inputStyle").value = JSON.stringify({
        title: p.title,
        icon: p.icon,
        cardStyle: p.cardStyle,
        avatarStyle: p.avatarStyle,
        nameStyle: p.nameStyle,
        badgeStyle: p.badgeStyle
      }, null, 2);
      updateLivePreview();
    }

    function editVip(id, title, rawStyle) {
      document.getElementById("inputAdd").value = id;
      document.getElementById("inputTitle").value = title;
      document.getElementById("inputStyle").value = rawStyle;
      updateLivePreview();
      document.getElementById("inputTitle").focus();
    }

    function copyText(str) {
      navigator.clipboard.writeText(str).then(() => {
        alert("ID tersalin: " + str);
      });
    }

    function copyPrompt() {
      const txt = document.getElementById("promptText").textContent;
      navigator.clipboard.writeText(txt).then(() => {
        const btn = document.getElementById("btnCopyPrompt");
        const prev = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Tersalin! Kirim ke AI';
        setTimeout(() => { btn.innerHTML = prev; }, 2500);
      });
    }

    updateLivePreview();
  </script>
</body>
</html>`;
}

async function R(a, n, t) {
  const r = (s, m = 200) => new Response(s, { status: m, headers: v });
  const o = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

  if (a.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const e = t.searchParams.get("key") || "";
  if (e.length < 16) return o();

  const p = (t.searchParams.get("add") || "").trim();
  const l = (t.searchParams.get("remove") || "").trim();
  const u = (t.searchParams.get("title") || "").trim().slice(0, 32) || "ADMIN";
  const style = (t.searchParams.get("style") || "").trim().slice(0, 4000);
  const g = p ? "add" : l ? "remove" : "list";
  const c = p || l || null;

  if (c && !E.test(c)) {
    return r(h(e, [], "Format user ID salah. Contoh: e3fe4a8e-e4d4-422f-bae3-8d5ac822270c", true), 400);
  }

  let f, i;
  try {
    const { url: s, key: m } = await P(a, n);
    if (!s || !m) return r(h(e, [], "Konfigurasi Supabase gak ketemu.", true), 500);

    const payload = { p_key: e, p_action: g, p_user: c, p_title: u, p_style: style || null };
    f = await fetch(s.replace(/\/$/, "") + "/rest/v1/rpc/vip_manage", {
      method: "POST",
      headers: { apikey: m, authorization: "Bearer " + m, "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    i = await f.json().catch(() => null);

    if (!f.ok && (i?.code === "PGRST202" || i?.code === "42883")) {
      f = await fetch(s.replace(/\/$/, "") + "/rest/v1/rpc/vip_manage", {
        method: "POST",
        headers: { apikey: m, authorization: "Bearer " + m, "content-type": "application/json" },
        body: JSON.stringify({ p_key: e, p_action: g, p_user: c, p_title: u })
      });
      i = await f.json().catch(() => null);
    }
  } catch {
    return r(h(e, [], "Gagal nyambung ke Supabase.", true), 502);
  }

  if (!f.ok) {
    if (i?.code === "42501") return o();
    const s = i?.code === "PGRST202" || i?.code === "42P01"
      ? "Fungsi vip_manage belum ada. Jalanin SQL-nya dulu di Supabase."
      : "Error: " + (i?.message || f.status);
    return r(h(e, [], s, true), 500);
  }

  const y = Array.isArray(i) ? i : [];
  const x = y.find((s) => s.id === c);
  const w = g === "add"
    ? `${x?.name || c} sekarang punya title ${u.toUpperCase()}${style ? " & Custom Card Shape" : ""}.`
    : g === "remove"
      ? `VIP ${c} udah dihapus.`
      : "";

  return r(h(e, y, w, false));
}

export default {
  async fetch(a, n) {
    const t = new URL(a.url);
    return t.pathname === "/api/upload"
      ? _(a)
      : t.pathname === "/api/vip"
        ? R(a, n, t)
        : t.pathname.startsWith("/media/")
          ? k(a, t.pathname)
          : n.ASSETS.fetch(a);
  }
};
