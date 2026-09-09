const fs = require("fs");

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("SUPABASE_URL atau SUPABASE_ANON_KEY belum di-set di environment variables.");
}

const content = `window.__ENV__ = ${JSON.stringify({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: supabaseAnonKey,
})};\n`;

fs.writeFileSync("env-config.js", content);
console.log("env-config.js berhasil dibuat.");
