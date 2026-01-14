/* ==============================
   Ashyq Qala — Leaflet + OpenStreetMap (NO API KEY)
   Markers + Issues stored in localStorage
================================= */

const LS_KEY = "ashyq_qala_issues_leaflet_v1";

/* DOM */
const issueList = document.getElementById("issueList");
const statsLine = document.getElementById("statsLine");

const btnAddIssue = document.getElementById("btnAddIssue");
const btnClearAll = document.getElementById("btnClearAll");

const filterCategory = document.getElementById("filterCategory");
const filterStatus = document.getElementById("filterStatus");

/* modal */
const modal = document.getElementById("issueModal");
const btnSave = document.getElementById("btnSaveIssue");
const coordsView = document.getElementById("coordsView");

const issueCategory = document.getElementById("issueCategory");
const issueStatus = document.getElementById("issueStatus");
const issueDesc = document.getElementById("issueDesc");

/* state */
let issues = loadIssues();
let addMode = false;
let pickedLatLng = null; // Leaflet LatLng
let activeId = null;

/* Leaflet */
const astanaCenter = [51.1282, 71.4304];
const map = L.map("map", { center: astanaCenter, zoom: 12, zoomControl: true });

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const markersById = new Map();

/* helpers */
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function loadIssues() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIssues() {
  localStorage.setItem(LS_KEY, JSON.stringify(issues));
}

function openModal() {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  addMode = false;
  pickedLatLng = null;
  coordsView.textContent = "не выбрана";
  btnSave.disabled = true;
  issueDesc.value = "";
  issueCategory.value = "roads";
  issueStatus.value = "new";
}

function getFilters() {
  return { category: filterCategory.value, status: filterStatus.value };
}

function passFilters(issue, filters) {
  const okCategory = filters.category === "all" || issue.category === filters.category;
  const okStatus = filters.status === "all" || issue.status === filters.status;
  return okCategory && okStatus;
}

function categoryLabel(code) {
  const m = {
    roads: "Дороги",
    light: "Освещение",
    trash: "Мусор",
    eco: "Экология",
    safety: "Безопасность",
    other: "Другое"
  };
  return m[code] || "Другое";
}

function statusLabel(code) {
  const m = { new: "Новая", work: "В работе", done: "Решена" };
  return m[code] || "Новая";
}

/* нейтральные маркеры (серебристые), статус влияет на оттенок */
function statusShade(code) {
  if (code === "new") return "#f7f8fc";
  if (code === "work") return "#e7eaf2";
  return "#d8dce8";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Leaflet marker factory */
function makeMarker(issue) {
  const shade = statusShade(issue.status);

  const html = `
    <div style="
      width:22px;height:22px;border-radius:10px;
      background: linear-gradient(135deg,#ffffff,${shade});
      border:1px solid rgba(15,17,21,0.25);
      box-shadow: 0 10px 22px rgba(0,0,0,0.18);
    "></div>
  `;

  const icon = L.divIcon({
    html,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 22]
  });

  const marker = L.marker([issue.lat, issue.lng], { icon });

  marker.on("click", () => setActive(issue.id, true));

  marker.bindPopup(`
    <b>${categoryLabel(issue.category)}</b><br/>
    <span>${statusLabel(issue.status)}</span><br/>
    <div style="margin-top:6px">${escapeHtml(issue.desc)}</div>
  `);

  return marker;
}

function clearMarkers() {
  for (const [, marker] of markersById.entries()) {
    map.removeLayer(marker);
  }
  markersById.clear();
}

function setActive(id, panTo = false) {
  activeId = id;

  const it = issues.find((x) => x.id === id);
  if (it && panTo) {
    map.setView([it.lat, it.lng], Math.max(map.getZoom(), 15), { animate: true });
    const marker = markersById.get(id);
    if (marker) marker.openPopup();
  }

  render();
}

function cycleStatus(id) {
  const it = issues.find((x) => x.id === id);
  if (!it) return;

  const order = ["new", "work", "done"];
  const idx = order.indexOf(it.status);
  it.status = order[(idx + 1) % order.length];

  saveIssues();
  render();
}

function removeIssue(id) {
  issues = issues.filter((x) => x.id !== id);
  if (activeId === id) activeId = null;
  saveIssues();
  render();
}

function render() {
  issueList.innerHTML = "";
  clearMarkers();

  const filters = getFilters();
  const visible = issues.filter((it) => passFilters(it, filters));

  // markers
  for (const it of visible) {
    const marker = makeMarker(it).addTo(map);
    markersById.set(it.id, marker);
  }

  // list
  for (const it of visible) {
    const item = document.createElement("div");
    item.className = "issue";
    item.dataset.id = it.id;

    if (activeId === it.id) {
      item.style.borderColor = "rgba(120,140,190,0.55)";
      item.style.boxShadow = "0 0 0 6px rgba(120,140,190,0.12)";
    }

    const top = document.createElement("div");
    top.className = "issue-top";

    const title = document.createElement("div");
    title.className = "issue-title";
    title.textContent = categoryLabel(it.category);

    const meta = document.createElement("div");
    meta.className = "issue-meta";
    meta.textContent = statusLabel(it.status);

    top.append(title, meta);

    const desc = document.createElement("div");
    desc.className = "issue-meta";
    desc.textContent = it.desc;

    const pill = document.createElement("div");
    pill.className = `pill ${it.status}`;
    pill.textContent = `#${it.id.slice(0, 6)} · ${statusLabel(it.status)}`;

    const actions = document.createElement("div");
    actions.className = "issue-actions";

    const btnFocus = document.createElement("button");
    btnFocus.className = "btn btn-ghost";
    btnFocus.textContent = "Показать";
    btnFocus.addEventListener("click", () => setActive(it.id, true));

    const btnNext = document.createElement("button");
    btnNext.className = "btn btn-ghost";
    btnNext.textContent = "Сменить статус";
    btnNext.addEventListener("click", () => cycleStatus(it.id));

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-ghost";
    btnDel.textContent = "Удалить";
    btnDel.addEventListener("click", () => removeIssue(it.id));

    actions.append(btnFocus, btnNext, btnDel);

    item.append(top, pill, desc, actions);
    item.addEventListener("click", () => setActive(it.id, true));

    issueList.appendChild(item);
  }

  statsLine.textContent = `Показано: ${visible.length} из ${issues.length}`;
}

/* ================== Events ================== */
btnAddIssue.addEventListener("click", () => {
  addMode = true;
  openModal();
});

map.on("click", (e) => {
  if (!addMode) return;
  pickedLatLng = e.latlng;
  coordsView.textContent = `${pickedLatLng.lat.toFixed(6)}, ${pickedLatLng.lng.toFixed(6)}`;
  btnSave.disabled = false;
});

btnSave.addEventListener("click", () => {
  if (!pickedLatLng) return;

  const desc = (issueDesc.value || "").trim();
  if (desc.length < 5) {
    alert("Описание слишком короткое (минимум 5 символов).");
    return;
  }

  issues.unshift({
    id: uid(),
    category: issueCategory.value,
    status: issueStatus.value,
    desc,
    lat: pickedLatLng.lat,
    lng: pickedLatLng.lng,
    createdAt: Date.now()
  });

  saveIssues();
  closeModal();
  render();
});

btnClearAll.addEventListener("click", () => {
  if (!confirm("Удалить все метки?")) return;
  issues = [];
  activeId = null;
  saveIssues();
  render();
});

filterCategory.addEventListener("change", render);
filterStatus.addEventListener("change", render);

/* modal close */
modal.addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.dataset && t.dataset.close) closeModal();
});

// ESC close modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("show")) closeModal();
});

/* init */
render();
