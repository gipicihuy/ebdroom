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
  if (!raw) return { badgeStyle: "", cardStyle: "", nameColor: "", icon: "fa-shield-halved" };
  try {
    const j = JSON.parse(raw);
    return {
      badgeStyle: j.badgeStyle || "",
      cardStyle: j.cardStyle || "",
      nameColor: j.nameColor || "",
      icon: j.icon || "fa-shield-halved"
    };
  } catch {
    return { badgeStyle: raw, cardStyle: "", nameColor: "", icon: "fa-shield-halved" };
  }
}

function h(key, list, msg, isError) {
  const defaultPrompt = `Buatkan custom card styling dan badge title untuk profil VIP Eberardos Room Chat.
Format output WAJIB HANYA JSON murni valid (tanpa markdown, tanpa penjelasan tambahan) dengan struktur:
{
  "title": "NAMA_TITLE",
  "badgeStyle": "css inline untuk badge",
  "cardStyle": "css inline untuk kartu profil",
  "nameColor": "#hex_warna_nama",
  "icon": "fa-crown"
}

Panduan CSS:
- badgeStyle: styling pill kecil (contoh: "background: linear-gradient(135deg, #f3c887, #e98f72); color: #2b1a05; font-weight: 800; box-shadow: 0 0 10px rgba(243,200,135,0.4);")
- cardStyle: styling container kartu profil (contoh: "background: linear-gradient(145deg, #241c19, #1a1614); border: 1px solid #db7354; box-shadow: 0 10px 30px rgba(219,115,84,0.25);")
- nameColor: hex warna teks nama (contoh: "#f0ebe5" atau "#ffb088")
- icon FontAwesome 6 pilihan: fa-crown, fa-shield-halved, fa-fire, fa-bolt, fa-gem, fa-star, fa-skull, fa-wand-magic-sparkles

Tema yang diinginkan: [SEBUTKAN TEMA DISINI, contoh: Cyberpunk Neon / Royal Luxury Gold / Crimson Blood / Cosmic Nebula]`;

  const items = (list || []).map((e) => {
    const styleData = parseStyleConfig(e.style);
    const badgeAttr = styleData.badgeStyle ? `style="${d(styleData.badgeStyle)}"` : "";
    const cardAttr = styleData.cardStyle ? `style="${d(styleData.cardStyle)}"` : "";
    const iconClass = d(styleData.icon || "fa-shield-halved");
    const safeStyleJson = d(e.style || "");

    return `<li class="vip-item" ${cardAttr}>
      <div class="vip-info">
        <div class="vip-name-row">
          <strong class="vip-name">${d(e.name || "(Tanpa profil)")}</strong>
          <span class="vip-badge" ${badgeAttr}><i class="fas ${iconClass}"></i> ${d(e.title || "ADMIN")}</span>
        </div>
        <div class="vip-sub">
          <code class="vip-id">${d(e.id)}</code>
          <button type="button" class="btn-copy-id" onclick="copyText('${d(e.id)}')"><i class="fas fa-copy"></i></button>
        </div>
        ${e.style ? `<div class="vip-style-preview"><code>${d(e.style.slice(0, 100))}${e.style.length > 100 ? "..." : ""}</code></div>` : ""}
      </div>
      <div class="vip-actions">
        <button type="button" class="btn-edit" onclick="editVip('${d(e.id)}', '${d(e.title || "ADMIN")}', '${safeStyleJson}')">Edit</button>
        <form method="get" onsubmit="return confirm('Hapus VIP user ini?')">
          <input type="hidden" name="key" value="${d(key)}">
          <input type="hidden" name="remove" value="${d(e.id)}">
          <button class="btn-del" type="submit"><i class="fas fa-trash"></i></button>
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
  <title>VIP & Custom Card Manager — Eberardos</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --bg: #181514;
      --surface: #221d1b;
      --surface-2: #2a2421;
      --border: #38302c;
      --accent: #db7354;
      --accent-hover: #e58264;
      --accent-dim: rgba(219, 115, 84, 0.15);
      --text: #f0ebe5;
      --text-muted: #ada59d;
      --code-color: #f3c887;
      --radius: 14px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    main { max-width: 860px; margin: 0 auto; }
    header.hero {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      font-size: 1.45rem;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;
    }
    h1 i { color: var(--accent); }
    header p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }
    
    .msg {
      padding: 12px 16px;
      border-radius: var(--radius);
      margin-bottom: 20px;
      font-weight: 500;
    }
    .ok { background: rgba(80, 200, 120, 0.15); border: 1px solid rgba(80, 200, 120, 0.3); color: #8fe0a9; }
    .err { background: rgba(255, 90, 90, 0.15); border: 1px solid rgba(255, 90, 90, 0.3); color: #ff9a9a; }

    /* Guide & AI Prompt Box */
    .guide-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 20px;
      margin-bottom: 24px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    }
    .guide-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .guide-title {
      font-size: 1.05rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--code-color);
    }
    .steps-list {
      display: grid;
      gap: 8px;
      margin-bottom: 14px;
    }
    .step-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      font-size: 0.88rem;
      color: #dfd8d1;
    }
    .step-num {
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
    .prompt-box {
      position: relative;
      background: #141110;
      border: 1px solid #332b27;
      border-radius: 10px;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.8rem;
      color: #cfc6be;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 160px;
      overflow-y: auto;
    }
    .btn-copy-prompt {
      background: var(--accent);
      color: #2b1209;
      border: 0;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-copy-prompt:hover { background: var(--accent-hover); }

    /* Presets Quick Pick */
    .presets-wrap {
      margin-bottom: 24px;
    }
    .presets-label {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .presets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .preset-pill {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 6px 12px;
      font-size: 0.82rem;
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .preset-pill:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
    }

    /* Main Grid: Form + Live Preview */
    .workspace-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    @media (max-width: 768px) {
      .workspace-grid { grid-template-columns: 1fr; }
    }

    .form-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 20px;
    }
    .form-panel h2 {
      font-size: 1.1rem;
      margin: 0 0 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .field {
      margin-bottom: 14px;
    }
    .field label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 6px;
      letter-spacing: 0.03em;
    }
    input, textarea {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #141110;
      color: inherit;
      font: inherit;
      transition: border 0.15s;
    }
    input:focus, textarea:focus {
      outline: 0;
      border-color: var(--accent);
    }
    textarea {
      resize: vertical;
      min-height: 90px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 0.8rem;
    }
    .submit-btn {
      width: 100%;
      padding: 12px;
      border: 0;
      border-radius: 10px;
      background: var(--accent);
      color: #2b1209;
      font-size: 0.95rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.15s;
    }
    .submit-btn:hover { background: var(--accent-hover); }

    /* Live Preview */
    .preview-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
    }
    .preview-panel h2 {
      font-size: 1.1rem;
      margin: 0 0 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f3c887;
    }
    .preview-card-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #151211;
      border: 1px dashed var(--border);
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      min-height: 200px;
      position: relative;
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .preview-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #2b2420;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 12px;
      border: 2px solid var(--accent);
      box-shadow: 0 0 16px rgba(219, 115, 84, 0.3);
      transition: all 0.2s;
    }
    .preview-name {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0 0 6px;
      color: #fff;
      transition: color 0.2s;
    }
    .preview-badge-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    /* VIP Badge element */
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
      transition: all 0.2s;
    }

    /* List of VIPs */
    .list-section h2 {
      font-size: 1.15rem;
      margin: 0 0 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    ul.vip-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
    }
    .vip-item {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      transition: all 0.2s;
    }
    .vip-info { min-width: 0; display: grid; gap: 4px; }
    .vip-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .vip-name { font-size: 0.98rem; color: #fff; }
    .vip-sub {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    code.vip-id {
      font-size: 0.75rem;
      color: var(--text-muted);
      overflow-wrap: anywhere;
    }
    .btn-copy-id {
      background: transparent;
      border: 0;
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px 4px;
      font-size: 0.75rem;
    }
    .btn-copy-id:hover { color: var(--accent); }
    .vip-style-preview {
      margin-top: 2px;
    }
    .vip-style-preview code {
      font-size: 0.72rem;
      color: #8c827a;
    }
    .vip-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .btn-edit {
      background: var(--surface-2);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-edit:hover { border-color: var(--accent); color: var(--accent); }
    .btn-del {
      background: #33171a;
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
      <h1><i class="fas fa-crown"></i> VIP & Custom Card Manager</h1>
      <p>Atur title spesial, icon badge, dan custom card styling untuk member VIP Eberardos.</p>
    </header>

    ${msg ? `<div class="msg ${isError ? "err" : "ok"}">${d(msg)}</div>` : ""}

    <!-- Guide & AI Prompt Generator -->
    <section class="guide-card">
      <div class="guide-head">
        <div class="guide-title"><i class="fas fa-wand-magic-sparkles"></i> Langkah Bikin Custom Card dengan AI</div>
        <button type="button" class="btn-copy-prompt" id="btnCopyPrompt" onclick="copyPrompt()">
          <i class="fas fa-copy"></i> Salin Prompt AI
        </button>
      </div>
      <div class="steps-list">
        <div class="step-item">
          <span class="step-num">1</span>
          <span>Klik tombol <strong>"Salin Prompt AI"</strong> di atas.</span>
        </div>
        <div class="step-item">
          <span class="step-num">2</span>
          <span>Buka chatbot AI (ChatGPT / Claude / Gemini / DeepSeek), paste prompt tersebut & tentukan tema yang kamu inginkan (misal: <em>Cyberpunk Neon</em> atau <em>Royal Gold</em>).</span>
        </div>
        <div class="step-item">
          <span class="step-num">3</span>
          <span>Salin output JSON teratur dari chatbot AI tersebut.</span>
        </div>
        <div class="step-item">
          <span class="step-num">4</span>
          <span>Tempel di kolom <strong>"Custom Card & Badge Style"</strong> di bawah, cek Live Preview, lalu klik <strong>"Simpan VIP"</strong>!</span>
        </div>
      </div>
      <div class="prompt-box" id="promptText">${d(defaultPrompt)}</div>
    </section>

    <!-- Quick Presets -->
    <section class="presets-wrap">
      <div class="presets-label"><i class="fas fa-bolt"></i> Pilihan Preset Cepat (Klik untuk Pasang)</div>
      <div class="presets-grid">
        <button type="button" class="preset-pill" onclick="applyPreset('gold')">👑 Royal Gold</button>
        <button type="button" class="preset-pill" onclick="applyPreset('cyber')">⚡ Cyber Neon</button>
        <button type="button" class="preset-pill" onclick="applyPreset('crimson')">🩸 Dark Crimson</button>
        <button type="button" class="preset-pill" onclick="applyPreset('aurora')">🔮 Cosmic Aurora</button>
        <button type="button" class="preset-pill" onclick="applyPreset('matrix')">💎 Emerald Matrix</button>
        <button type="button" class="preset-pill" onclick="applyPreset('shadow')">💀 Shadow Obsidian</button>
      </div>
    </section>

    <!-- Workspace: Form + Live Preview -->
    <div class="workspace-grid">
      <section class="form-panel">
        <h2><i class="fas fa-sliders"></i> Atur Member VIP</h2>
        <form id="vipForm" method="get">
          <input type="hidden" name="key" value="${d(key)}">
          <div class="field">
            <label for="inputAdd">User ID (UUID)</label>
            <input id="inputAdd" name="add" placeholder="e3fe4a8e-e4d4-422f-bae3-8d5ac822270c" required pattern="[0-9a-fA-F-]{36}" autocomplete="off">
          </div>
          <div class="field">
            <label for="inputTitle">Custom Title</label>
            <input id="inputTitle" name="title" placeholder="ADMIN / VIP OWNER / CYBER LORD" maxlength="32" oninput="updatePreview()">
          </div>
          <div class="field">
            <label for="inputStyle">Custom Card & Badge Style (JSON dari AI atau CSS inline)</label>
            <textarea id="inputStyle" name="style" placeholder='{"badgeStyle":"background: linear-gradient(135deg, #00f2fe, #4facfe); color:#000;","cardStyle":"background: #1a1625; border: 1px solid #7928ca;","icon":"fa-crown"}' oninput="updatePreview()"></textarea>
          </div>
          <button type="submit" class="submit-btn"><i class="fas fa-check"></i> Simpan VIP</button>
        </form>
      </section>

      <section class="preview-panel">
        <h2><i class="fas fa-eye"></i> Live Card Preview</h2>
        <div class="preview-card-wrap" id="previewCardWrap">
          <div class="preview-avatar" id="previewAvatar">E</div>
          <div class="preview-name" id="previewName">Nama Member</div>
          <div class="preview-badge-row">
            <span class="vip-badge" id="previewBadge"><i class="fas fa-shield-halved" id="previewIcon"></i> <span id="previewTitleText">ADMIN</span></span>
          </div>
        </div>
      </section>
    </div>

    <!-- Active VIP List -->
    <section class="list-section">
      <h2><i class="fas fa-users"></i> Daftar Member VIP Aktif (${(list || []).length})</h2>
      <ul class="vip-list">
        ${items || '<p style="color:var(--text-muted);padding:14px;background:var(--surface);border-radius:var(--radius);">Belum ada member VIP terdaftar.</p>'}
      </ul>
    </section>
  </main>

  <script>
    const PRESETS = {
      gold: {
        title: "ROYAL GOLD",
        icon: "fa-crown",
        nameColor: "#fadc8c",
        badgeStyle: "background: linear-gradient(135deg, #ffd700, #ff9900); color: #1a0f00; font-weight: 800; box-shadow: 0 0 12px rgba(255, 215, 0, 0.45);",
        cardStyle: "background: linear-gradient(145deg, #241d13, #16120b); border: 1px solid #d4af37; box-shadow: 0 8px 26px rgba(212, 175, 55, 0.2);"
      },
      cyber: {
        title: "CYBER LORD",
        icon: "fa-bolt",
        nameColor: "#00f2fe",
        badgeStyle: "background: linear-gradient(135deg, #00f2fe, #4facfe); color: #02131e; font-weight: 800; box-shadow: 0 0 12px rgba(0, 242, 254, 0.5);",
        cardStyle: "background: linear-gradient(145deg, #0c1824, #060e17); border: 1px solid #00f2fe; box-shadow: 0 8px 26px rgba(0, 242, 254, 0.25);"
      },
      crimson: {
        title: "DARK CRIMSON",
        icon: "fa-fire",
        nameColor: "#ff7b89",
        badgeStyle: "background: linear-gradient(135deg, #ff416c, #ff4b2b); color: #1f0408; font-weight: 800; box-shadow: 0 0 12px rgba(255, 65, 108, 0.5);",
        cardStyle: "background: linear-gradient(145deg, #240e12, #14070a); border: 1px solid #ff416c; box-shadow: 0 8px 26px rgba(255, 65, 108, 0.25);"
      },
      aurora: {
        title: "COSMIC VIP",
        icon: "fa-wand-magic-sparkles",
        nameColor: "#d394ff",
        badgeStyle: "background: linear-gradient(135deg, #b224ef, #7579ff); color: #160424; font-weight: 800; box-shadow: 0 0 12px rgba(178, 36, 239, 0.45);",
        cardStyle: "background: linear-gradient(145deg, #1b1226, #100a18); border: 1px solid #b224ef; box-shadow: 0 8px 26px rgba(178, 36, 239, 0.25);"
      },
      matrix: {
        title: "EMERALD ELITE",
        icon: "fa-gem",
        nameColor: "#68f0aa",
        badgeStyle: "background: linear-gradient(135deg, #0ba360, #3cba92); color: #021c10; font-weight: 800; box-shadow: 0 0 12px rgba(11, 163, 96, 0.45);",
        cardStyle: "background: linear-gradient(145deg, #0d1e15, #08140e); border: 1px solid #3cba92; box-shadow: 0 8px 26px rgba(60, 186, 146, 0.25);"
      },
      shadow: {
        title: "OBSIDIAN",
        icon: "fa-skull",
        nameColor: "#d0c9c0",
        badgeStyle: "background: linear-gradient(135deg, #484848, #202020); color: #fff; border: 1px solid #666; font-weight: 800; box-shadow: 0 0 8px rgba(255,255,255,0.15);",
        cardStyle: "background: linear-gradient(145deg, #1f1b19, #110f0e); border: 1px solid #4a423e; box-shadow: 0 8px 26px rgba(0,0,0,0.5);"
      }
    };

    function updatePreview() {
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

      // Reset style bawaan
      card.removeAttribute("style");
      badge.removeAttribute("style");
      name.removeAttribute("style");
      avatar.removeAttribute("style");
      icon.className = "fas fa-shield-halved";

      if (!styleVal) return;

      try {
        const j = JSON.parse(styleVal);
        if (j.cardStyle) card.setAttribute("style", j.cardStyle);
        if (j.badgeStyle) badge.setAttribute("style", j.badgeStyle);
        if (j.nameColor) name.style.color = j.nameColor;
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
        nameColor: p.nameColor,
        badgeStyle: p.badgeStyle,
        cardStyle: p.cardStyle
      }, null, 2);
      updatePreview();
    }

    function editVip(id, title, rawStyle) {
      document.getElementById("inputAdd").value = id;
      document.getElementById("inputTitle").value = title;
      document.getElementById("inputStyle").value = rawStyle;
      updatePreview();
      document.getElementById("inputTitle").focus();
    }

    function copyText(str) {
      navigator.clipboard.writeText(str).then(() => {
        alert("User ID berhasil disalin: " + str);
      });
    }

    function copyPrompt() {
      const txt = document.getElementById("promptText").textContent;
      navigator.clipboard.writeText(txt).then(() => {
        const btn = document.getElementById("btnCopyPrompt");
        const prev = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
        setTimeout(() => { btn.innerHTML = prev; }, 2000);
      });
    }

    // Inisialisasi awal
    updatePreview();
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
  const style = (t.searchParams.get("style") || "").trim().slice(0, 2000);
  const g = p ? "add" : l ? "remove" : "list";
  const c = p || l || null;

  if (c && !E.test(c)) {
    return r(h(e, [], "Format user ID salah. Contoh: e3fe4a8e-e4d4-422f-bae3-8d5ac822270c", true), 400);
  }

  let f, i;
  try {
    const { url: s, key: m } = await P(a, n);
    if (!s || !m) return r(h(e, [], "Konfigurasi Supabase gak ketemu.", true), 500);

    // Coba kirim dengan parameter p_style terlebih dahulu
    const payload = { p_key: e, p_action: g, p_user: c, p_title: u, p_style: style || null };
    f = await fetch(s.replace(/\/$/, "") + "/rest/v1/rpc/vip_manage", {
      method: "POST",
      headers: { apikey: m, authorization: "Bearer " + m, "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    i = await f.json().catch(() => null);

    // Jika Supabase masih memakai fungsi lama yang belum punya p_style (PGRST202 / 42883)
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
    ? `${x?.name || c} sekarang punya title ${u.toUpperCase()}${style ? " & Custom Card Style" : ""}.`
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
