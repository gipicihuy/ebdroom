const fs = require("fs");
const { execSync } = require("child_process");

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("SUPABASE_URL atau SUPABASE_ANON_KEY belum di-set di environment variables.");
}

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));

function getBuildLabel() {
  try {
    const count = execSync("git rev-list --count HEAD").toString().trim();
    if (count && count !== "1") return `build ${count}`;
  } catch (err) {
    console.warn("Gagal ambil git commit count:", err.message);
  }
  try {
    const sha = (process.env.VERCEL_GIT_COMMIT_SHA || execSync("git rev-parse HEAD").toString().trim()).slice(0, 7);
    if (sha) return sha;
  } catch (err) {
    console.warn("Gagal ambil git commit sha:", err.message);
  }
  return "";
}

const content = `window.__ENV__ = ${JSON.stringify({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
  APP_VERSION: pkg.version,
  BUILD_LABEL: getBuildLabel(),
})};\n`;

fs.writeFileSync("env-config.js", content);
console.log("env-config.js berhasil dibuat.");
