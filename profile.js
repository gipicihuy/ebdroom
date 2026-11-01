const SUPABASE_URL=window.__ENV__?.SUPABASE_URL,SUPABASE_ANON_KEY=window.__ENV__?.SUPABASE_ANON_KEY;
if(!SUPABASE_URL||!SUPABASE_ANON_KEY)throw document.body.innerHTML="<p style='color:#f55;padding:2rem;font-family:sans-serif'>Konfigurasi Supabase belum ke-load.</p>",new Error("SUPABASE_URL atau SUPABASE_ANON_KEY kosong");

const{createClient}=supabase,supabaseClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const PROXIED_MEDIA_HOSTS={"cdn.zass.in":"/media/zass","athars.space":"/media"};

function toMediaUrl(e){
  if(!e||typeof e!="string"||e.startsWith("/media/"))return e;
  try{
    const t=new URL(e,window.location.origin),a=Object.hasOwn(PROXIED_MEDIA_HOSTS,t.hostname)&&PROXIED_MEDIA_HOSTS[t.hostname];
    if(a)return a+t.pathname+t.search;
  }catch{}
  return e;
}

// Elements
const bannerWrap=document.getElementById("profileBannerWrap");
const bannerPreview=document.getElementById("profileBannerPreview");
const bannerFallback=document.getElementById("profileBannerFallback");
const bannerInput=document.getElementById("profileBannerInput");
const bannerDel=document.getElementById("profileBannerDel");
const bannerDimRow=document.getElementById("profileBannerDimRow");
const bannerDimInput=document.getElementById("profileBannerDim");
const bannerDimVal=document.getElementById("profileBannerDimVal");
const dimChips=document.querySelectorAll(".dim-chip");

const avatarWrap=document.getElementById("profileAvatarWrap");
const avatarPreview=document.getElementById("profileAvatarPreview");
const avatarLetter=document.getElementById("profileAvatarLetter");
const avatarInput=document.getElementById("profileAvatarInput");

const nameInput=document.getElementById("profileNameInput");
const bioRow=document.getElementById("profileBioRow");
const bioInput=document.getElementById("profileBioInput");
const bioCount=document.getElementById("profileBioCount");
const emailField=document.getElementById("profileEmailField");
const joinedField=document.getElementById("profileJoinedField");
const saveBtn=document.getElementById("profileSaveBtn");
const statusEl=document.getElementById("profileStatus");
const guestOverlay=document.getElementById("profileGuestOverlay");
const nameFeedback=document.getElementById("profileNameFeedback");

let currentUser=null;
let currentProfile=null;
let selectedAvatarFile=null;
let selectedBannerFile=null;
let currentBannerUrl="";
let originalBannerUrl="";
let originalBannerDim=60;
let originalName="";
let originalBio="";
let bioSupported=!1;
let bannerSupported=!0;
let nameCheckTimer=null;
let nameIsAvailable=!0;

function stringToColor(e){
  if(!e)return"#4f8fb0";
  let t=0;
  for(let a=0;a<e.length;a++)t=e.charCodeAt(a)+((t<<5)-t);
  return`hsl(${Math.abs(t)%360},60%,42%)`;
}

function renderAvatar(e){
  if(e){
    avatarPreview.src=toMediaUrl(e);
    avatarPreview.style.display="block";
    avatarLetter.style.display="none";
  }else{
    const t=(nameInput.value.trim()||emailField.value||"?").trim();
    avatarLetter.textContent=t.charAt(0).toUpperCase();
    avatarLetter.style.background=stringToColor(t.toLowerCase());
    avatarPreview.style.display="none";
    avatarLetter.style.display="flex";
  }
}

function renderBanner(url, dim){
  const brightnessVal = dim || 60;
  bannerDimInput.value = brightnessVal;
  bannerDimVal.textContent = brightnessVal + "%";
  
  // Highlight chip yang cocok
  dimChips.forEach(chip => {
    chip.classList.toggle("active", Number(chip.dataset.val) === Number(brightnessVal));
  });

  if(url){
    bannerPreview.src = toMediaUrl(url);
    bannerPreview.style.filter = `brightness(${brightnessVal}%)`;
    bannerPreview.style.display = "block";
    bannerFallback.style.display = "none";
    bannerDel.style.display = "flex";
    bannerDimRow.style.display = "flex";
  }else{
    bannerPreview.src = "";
    bannerPreview.style.display = "none";
    bannerFallback.style.display = "block";
    bannerDel.style.display = "none";
    bannerDimRow.style.display = "none";
  }
}

async function checkNameAvailability(val){
  const trimmed=(val||"").trim();
  if(!trimmed||trimmed.toLowerCase()===originalName.toLowerCase()){
    nameIsAvailable=!0;
    if(nameFeedback)nameFeedback.style.display="none";
    refreshSaveState();
    return!0;
  }
  if(/[/@?#\\]/.test(trimmed)){
    nameIsAvailable=!1;
    if(nameFeedback){
      nameFeedback.textContent="Nama tidak boleh memakai karakter @, /, ?, #";
      nameFeedback.className="profile-name-feedback error";
      nameFeedback.style.display="block";
    }
    refreshSaveState();
    return!1;
  }
  try{
    const{data:res,error:err}=await supabaseClient
      .from("profiles")
      .select("id")
      .ilike("display_name",trimmed)
      .neq("id",currentUser.id)
      .limit(1);
    if(err){nameIsAvailable=!0;return!0}
    if(res&&res.length>0){
      nameIsAvailable=!1;
      if(nameFeedback){
        nameFeedback.textContent=`Nama @${trimmed} sudah terpakai! Pilih nama lain.`;
        nameFeedback.className="profile-name-feedback error";
        nameFeedback.style.display="block";
      }
      refreshSaveState();
      return!1;
    }else{
      nameIsAvailable=!0;
      if(nameFeedback){
        nameFeedback.textContent=`Nama @${trimmed} tersedia!`;
        nameFeedback.className="profile-name-feedback success";
        nameFeedback.style.display="block";
      }
      refreshSaveState();
      return!0;
    }
  }catch{
    nameIsAvailable=!0;
    return!0;
  }
}

function refreshSaveState(){
  const nameChanged = nameInput.value.trim() !== originalName;
  const bioChanged = bioSupported && bioInput.value.trim() !== originalBio;
  const bannerChanged = currentBannerUrl !== originalBannerUrl || selectedBannerFile !== null;
  const dimChanged = currentBannerUrl && Number(bannerDimInput.value) !== Number(originalBannerDim);
  const avatarChanged = selectedAvatarFile !== null;

  bioCount.textContent = bioInput.value.length + "/150";

  const isDirty = nameChanged || bioChanged || bannerChanged || dimChanged || avatarChanged;
  saveBtn.disabled = !currentUser || !isDirty || nameInput.value.trim().length === 0 || !nameIsAvailable;
}

function setStatus(e,t){
  statusEl.textContent=e||"";
  statusEl.classList.remove("error","success");
  t&&statusEl.classList.add(t);
}

async function loadProfile(e){
  const{data:t,error:a}=await supabaseClient.from("profiles").select("*").eq("id",e).single();
  return a?(console.error("Error loading profile:",a),{display_name:"",avatar_url:""}):t;
}

async function uploadFile(file){
  const t=new FormData;
  t.append("file",file);
  const a=await fetch("/api/upload",{method:"POST",body:t});
  if(!a.ok)throw new Error("Upload gagal, status "+a.status);
  const n=(await a.text()).trim();
  if(!n.startsWith("http"))throw new Error("Response uploader tidak valid: "+n);
  return toMediaUrl(n);
}

function formatJoinedDate(e){
  return e?new Date(e).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"-";
}

async function initProfilePage(e){
  currentUser=e;
  currentProfile=await loadProfile(e.id);
  
  originalName=currentProfile.display_name||"";
  nameInput.value=originalName;

  bioSupported="bio" in currentProfile;
  originalBio=(currentProfile.bio||"").trim();
  bioInput.value=originalBio;
  bioRow.hidden=!bioSupported;

  originalBannerUrl = currentProfile.banner_url || "";
  currentBannerUrl = originalBannerUrl;
  originalBannerDim = Number(currentProfile.banner_dim) || 60;
  selectedBannerFile = null;
  selectedAvatarFile = null;

  emailField.value=e.email||"";
  joinedField.value=formatJoinedDate(e.created_at);

  renderAvatar(currentProfile.avatar_url||"");
  renderBanner(originalBannerUrl, originalBannerDim);

  refreshSaveState();
  guestOverlay.style.display="none";
}

function showGuestOverlay(){
  guestOverlay.style.display="flex";
}

// Banner interactions
bannerWrap.addEventListener("click", (e) => {
  if (e.target.closest("#profileBannerDel")) return;
  bannerInput.click();
});

bannerDel.addEventListener("click", (e) => {
  e.stopPropagation();
  selectedBannerFile = null;
  currentBannerUrl = "";
  renderBanner("", 60);
  refreshSaveState();
});

bannerInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith("image/")) return void setStatus("Hanya file gambar yang diizinkan untuk banner!","error");
  if(file.size > 8388608) return void setStatus("Ukuran banner terlalu besar! Maksimal 8MB.","error");
  
  selectedBannerFile = file;
  currentBannerUrl = "blob:" + file.name;
  const reader = new FileReader;
  reader.onload = ev => {
    bannerPreview.src = ev.target.result;
    bannerPreview.style.display = "block";
    bannerFallback.style.display = "none";
    bannerDel.style.display = "flex";
    bannerDimRow.style.display = "flex";
  };
  reader.readAsDataURL(file);
  setStatus("", null);
  refreshSaveState();
});

// Dimmer / Brightness slider
bannerDimInput.addEventListener("input", () => {
  const val = bannerDimInput.value;
  bannerDimVal.textContent = val + "%";
  bannerPreview.style.filter = `brightness(${val}%)`;
  dimChips.forEach(chip => {
    chip.classList.toggle("active", Number(chip.dataset.val) === Number(val));
  });
  refreshSaveState();
});

dimChips.forEach(chip => {
  chip.addEventListener("click", () => {
    const val = chip.dataset.val;
    bannerDimInput.value = val;
    bannerDimVal.textContent = val + "%";
    bannerPreview.style.filter = `brightness(${val}%)`;
    dimChips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    refreshSaveState();
  });
});

// Avatar & text interactions
nameInput.addEventListener("input",()=>{
  selectedAvatarFile||currentProfile?.avatar_url||renderAvatar("");
  clearTimeout(nameCheckTimer);
  nameCheckTimer=setTimeout(()=>{
    checkNameAvailability(nameInput.value);
  },350);
  refreshSaveState();
});
bioInput.addEventListener("input",refreshSaveState);

avatarWrap.addEventListener("click",()=>avatarInput.click());
avatarInput.addEventListener("change",e=>{
  const t=e.target.files[0];
  if(!t)return;
  if(!t.type.startsWith("image/"))return void setStatus("Hanya file gambar yang diizinkan!","error");
  if(t.size>5242880)return void setStatus("Ukuran file terlalu besar! Maksimal 5MB.","error");
  selectedAvatarFile=t;
  const a=new FileReader;
  a.onload=n=>renderAvatar(n.target.result),a.readAsDataURL(t);
  setStatus("",null);
  refreshSaveState();
});

// Save button handler
saveBtn.addEventListener("click",async()=>{
  if(!currentUser)return;
  const e=nameInput.value.trim();
  if(!e)return void setStatus("Nama tidak boleh kosong.","error");
  if(!nameIsAvailable)return void setStatus("Nama tersebut sudah terpakai oleh pengguna lain.","error");
  
  saveBtn.disabled=!0;
  const t=saveBtn.textContent;
  saveBtn.textContent="...";
  setStatus("Menyimpan...",null);

  try{
    let avatarUrl=currentProfile?.avatar_url||"";
    if(selectedAvatarFile){
      avatarUrl=await uploadFile(selectedAvatarFile);
    }

    let bannerUrl = currentBannerUrl;
    if(selectedBannerFile){
      bannerUrl = await uploadFile(selectedBannerFile);
    }

    const bannerDim = Number(bannerDimInput.value) || 60;
    const r=bioInput.value.trim();

    const updateData = {
      display_name: e,
      avatar_url: avatarUrl,
      banner_url: bannerUrl || null,
      banner_dim: bannerDim
    };
    if(bioSupported) updateData.bio = r || null;

    let { error: i } = await supabaseClient.from("profiles").update(updateData).eq("id",currentUser.id);

    // Fallback jika column banner belum ditambahkan di database
    if(i && (i.message?.includes("banner") || i.code === "PGRST204" || i.code === "42703")){
      delete updateData.banner_url;
      delete updateData.banner_dim;
      const res = await supabaseClient.from("profiles").update(updateData).eq("id",currentUser.id);
      i = res.error;
    }
    if(i) throw i;

    // Update profil di local state
    currentProfile.display_name = e;
    currentProfile.avatar_url = avatarUrl;
    currentProfile.banner_url = bannerUrl;
    currentProfile.banner_dim = bannerDim;
    currentProfile.bio = r;

    originalName = e;
    originalBio = r;
    originalBannerUrl = bannerUrl;
    currentBannerUrl = bannerUrl;
    originalBannerDim = bannerDim;
    selectedAvatarFile = null;
    selectedBannerFile = null;

    renderAvatar(avatarUrl);
    renderBanner(bannerUrl, bannerDim);

    await supabaseClient.from("messages").update({user_name:e,photo_url:avatarUrl}).eq("user_id",currentUser.id);
    setStatus("Profil berhasil diperbarui.","success");
  }catch(a){
    console.error("Error updating profile:",a);
    setStatus("Gagal menyimpan: "+a.message,"error");
  }finally{
    saveBtn.textContent=t;
    refreshSaveState();
  }
});

supabaseClient.auth.onAuthStateChange((e,t)=>{
  const a=t?.user||null;
  a?initProfilePage(a):(currentUser=null,currentProfile=null,showGuestOverlay());
});
supabaseClient.auth.getSession().then(({data:{session:e}})=>{
  const t=e?.user||null;
  t?initProfilePage(t):showGuestOverlay();
});
