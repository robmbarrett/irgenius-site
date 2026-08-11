const STORAGE_KEY = "juicy-play-counts-v1";

const els = {
  pad: document.querySelector("#pad"),
  title: document.querySelector("#video-title"),
  count: document.querySelector("#play-count"),
  frame: document.querySelector("#player-frame"),
  video: document.querySelector("#player-video"),
  placeholder: document.querySelector("#placeholder"),
  toast: document.querySelector("#toast"),
};

let catalog = null;
let active = null;
let countedForSession = new Set();
let ytApiReady = null;

function loadCounts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCounts(counts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
}

function getCount(id) {
  const counts = loadCounts();
  return Number(counts[id] || 0);
}

async function bumpCount(id) {
  if (countedForSession.has(id)) return getCount(id);
  countedForSession.add(id);

  const counts = loadCounts();
  counts[id] = Number(counts[id] || 0) + 1;
  saveCounts(counts);
  updateCountLabel(id);
  refreshPadCounts();

  const api = catalog?.counterApi;
  if (api) {
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "increment" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.count === "number") {
          counts[id] = data.count;
          saveCounts(counts);
          updateCountLabel(id);
        }
      }
    } catch {
      // Local count still works if the API is not deployed yet.
    }
  }

  return counts[id];
}

function updateCountLabel(id) {
  if (!active || active.id !== id) return;
  els.count.textContent = String(getCount(id));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function hasSource(video) {
  return Boolean((video.youtube && video.youtube.trim()) || (video.mp4 && video.mp4.trim()));
}

function stopPlayers() {
  els.frame.hidden = true;
  els.video.hidden = true;
  els.frame.src = "";
  els.video.pause();
  els.video.removeAttribute("src");
  els.video.load();
  els.placeholder.hidden = false;
}

function loadYoutubeApi() {
  if (ytApiReady) return ytApiReady;
  ytApiReady = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return ytApiReady;
}

async function playYoutube(video) {
  els.placeholder.hidden = true;
  els.video.hidden = true;
  els.frame.hidden = false;

  await loadYoutubeApi();
  els.frame.src = `https://www.youtube.com/embed/${encodeURIComponent(
    video.youtube.trim()
  )}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;

  // Count when playback is requested (kid pressed a number / Play).
  await bumpCount(video.id);
}

async function playMp4(video) {
  els.placeholder.hidden = true;
  els.frame.hidden = true;
  els.frame.src = "";
  els.video.hidden = false;
  els.video.src = video.mp4.trim();
  els.video.play().catch(() => {});

  const onPlay = async () => {
    els.video.removeEventListener("play", onPlay);
    await bumpCount(video.id);
  };
  els.video.addEventListener("play", onPlay);
}

async function selectVideo(number) {
  const video = catalog.videos.find((v) => v.number === number);
  if (!video) return;

  active = video;
  countedForSession.delete(video.id);

  document.querySelectorAll(".vid-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.number) === number);
  });

  els.title.textContent = video.title;
  updateCountLabel(video.id);
  stopPlayers();

  if (!hasSource(video)) {
    els.placeholder.hidden = false;
    els.placeholder.innerHTML = `<strong>${video.title}</strong><span>Video file not added yet</span>`;
    showToast(`Number ${number}: add a YouTube id or mp4 path`);
    return;
  }

  if (video.mp4 && video.mp4.trim()) {
    await playMp4(video);
    return;
  }

  await playYoutube(video);
}

function renderPad() {
  els.pad.innerHTML = "";
  for (const video of catalog.videos) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vid-btn" + (hasSource(video) ? "" : " missing");
    btn.dataset.number = String(video.number);
    btn.innerHTML = `
      <span class="num">${video.number}</span>
      <span class="label">${video.title}</span>
      <span class="meta">Watched ${getCount(video.id)} times</span>
    `;
    btn.addEventListener("click", () => selectVideo(video.number));
    els.pad.appendChild(btn);
  }
}

function refreshPadCounts() {
  document.querySelectorAll(".vid-btn").forEach((btn) => {
    const number = Number(btn.dataset.number);
    const video = catalog.videos.find((v) => v.number === number);
    if (!video) return;
    const meta = btn.querySelector(".meta");
    if (meta) meta.textContent = `Watched ${getCount(video.id)} times`;
  });
}

async function syncFromApi() {
  const api = catalog?.counterApi;
  if (!api) return;
  try {
    const res = await fetch(api, { method: "GET" });
    if (!res.ok) return;
    const data = await res.json();
    if (!data || typeof data.counts !== "object") return;
    const local = loadCounts();
    const merged = { ...local, ...data.counts };
    saveCounts(merged);
    refreshPadCounts();
    if (active) updateCountLabel(active.id);
  } catch {
    // offline / API not deployed
  }
}

function bindKeys() {
  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const match = event.key.match(/^[1-9]$/);
    if (!match) return;
    event.preventDefault();
    selectVideo(Number(event.key));
  });
}

async function init() {
  const res = await fetch("./videos.json", { cache: "no-store" });
  catalog = await res.json();
  document.querySelector("#juicy-title").textContent = catalog.title || "Juicy";
  document.querySelector("#juicy-subtitle").textContent =
    catalog.subtitle || "Press a number to pick a video";
  renderPad();
  bindKeys();
  await syncFromApi();
}

init().catch((err) => {
  console.error(err);
  showToast("Could not load Juicy videos.json");
});
