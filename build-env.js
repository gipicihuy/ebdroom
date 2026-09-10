const fs = require("fs");

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("SUPABASE_URL atau SUPABASE_ANON_KEY belum di-set di environment variables.");
}

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const [major, minor] = pkg.version.split(".");

async function getPatchNumber() {
  try {
    const token = process.env.GH_API_TOKEN;
    const headers = { "User-Agent": "ebdroom-build" };
    if (token) headers["Authorization"] = `token ${token}`;
    const res = await fetch("https://api.github.com/repos/gipicihuy/ebdroom/commits?per_page=1&sha=main", { headers });
    if (!res.ok) {
      console.warn("GitHub API respon non-OK:", res.status);
      return null;
    }
    const link = res.headers.get("link") || "";
    const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
    if (match) return match[1];
  } catch (err) {
    console.warn("Gagal ambil commit count dari GitHub API:", err.message);
  }
  return null;
}

async function build() {
  const patch = await getPatchNumber();
  const version = patch ? `${major}.${minor}.${patch}` : pkg.version;

  const content = `window.__ENV__ = ${JSON.stringify({
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    APP_VERSION: version,
  })};\n`;

  fs.writeFileSync("env-config.js", content);
  console.log("env-config.js berhasil dibuat. Versi:", version);
}

build();
