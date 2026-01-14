/* ==============================
   Ashyq Qala — Demo Map (NO API)
   Markers + Issues stored in localStorage
================================= */

const LS_KEY = "ashyq_qala_issues_v1";

const mapCanvas = document.getElementById("mapCanvas");
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

let issues = loadIssues();
let addMode = false;
let pickedPoint = null; // {xPct, yPct}
let activeId = null;

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
  pickedPoint = null;
  coordsView.textContent = "не выбрана";
  btnSave.disabled = true;
  issueDesc.value = "";
  issueCategory.value = "roads";
  issueStatus.value = "new";
}

function setAddMode(on) {
  addMode = on;
  if (addMode) {
    openModal();
  } else {
    closeModal();
  }
}

function setPickedPoint(xPct, yPct) {
  pickedPoint = { xPct, yPct };
  coordsView.textContent = `${(xPct * 100).toFixed(1)}% / ${(yPct * 100).toFixed(1)}%`;
  btnSave.disabled = false;
}

function getFilters() {
  return {
    category: filterCategory.value,
    status: filterStatus.value
  };
}

function passFilters(issue, filters) {
  const okCategory = filters.category === "all" || issue.category === filters.category;
  const okStatus = filters.status === "all" || issue.status === filters.status;
  return okCategory && okStatus;
}

function categoryLabel(code) {
  const map = {
    roads: "Дороги",
    light: "Освещение",
    trash: "Мусор",
    eco: "Экология",
    safety: "Безопасность",
    other: "Другое"
  };
  return map[code] || "Другое";
}

function statusLabel(code) {
  const map = { new: "Новая", work: "В работе", done: "Решена" };
  return map[code] || "Новая";
}

function render() {
  // clear markers
  mapCanvas.querySelectorAll(".marker").forEach((m) => m.remove());
  issueList.innerHTML = "";

  const filters = getFilters();
  const visible = issues.filter((it) => passFilters(it, filters));

  // markers
  for (const it of visible) {
    const marker = document.createElement("button");
    marker.className = "marker";
    marker.type = "button";
    marker.title = `${categoryLabel(it.category)} · ${statusLabel(it.status)}\n${it.desc}`;
    marker.dataset.id = it.id;
    marker.dataset.status = it.status;

    marker.style.left = `${it.xPct * 100}%`;
    marker.style.top = `${it.yPct * 100}%`;

    if (activeId === it.id) marker.classList.add("active");

    marker.addEventListener("click", (e) => {
      e.stopPropagation();
      setActive(it.id);
    });

    mapCanvas.appendChild(marker);
  }

  // list
  for (const it of visible) {
    const item = document.createElement("div");
    item.className = "issue";
    item.dataset.id = it.id;

    const top = document.createElement("div");
    top.className = "issue-top";

    const title = document.createElement("div");
    title.className = "issue-title";
    title.textContent = categoryLabel(it.category);

    const meta = document.createElement("div");
    meta.className = "issue-meta";
    meta.textContent = statusLabel(it.status);

    top.appendChild(title);
    top.appendChild(meta);

    const desc = document.createElement("div");
    desc.className = "issue-meta";
    desc.textContent = it.desc;

    const pills = document.createElement("div");
    pills.className = `pill ${it.status}`;
    pills.textContent = `#${it.id.slice(0, 6)} · ${statusLabel(it.status)}`;

    const actions = document.createElement("div");
    actions.className = "issue-actions";

    const btnFocus = document.createElement("button");
    btnFocus.className = "btn btn-ghost";
    btnFocus.textContent = "Показать";
    btnFocus.addEventListener("click", () => setActive(it.id));

    const btnNext = document.createElement("button");
    btnNext.className = "btn btn-ghost";
    btnNext.textContent = "Сменить статус";
    btnNext.addEventListener("click", () => {
      cycleStatus(it.id);
    });

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-ghost";
    btnDel.textContent = "Удалить";
    btnDel.addEventListener("click", () => removeIssue(it.id));

    actions.append(btnFocus, btnNext, btnDel);

    item.append(top, pills, desc, actions);

    item.addEventListener("click", () => setActive(it.id));
    issueList.appendChild(item);
  }

  // stats
  statsLine.textContent = `Показано: ${visible.length} из ${issues.length}`;
}

function setActive(id) {
  activeId = id;
  render();

  // "подсветка" списка: пролистнуть к элементу
  const el = issueList.querySelector(`.issue[data-id="${id}"]`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

/* ================== Events ================== */
btnAddIssue.addEventListener("click", () => setAddMode(true));

btnClearAll.addEventListener("click", () => {
  if (!confirm("Удалить все метки?")) return;
  issues = [];
  activeId = null;
  saveIssues();
  render();
});

filterCategory.addEventListener("change", render);
filterStatus.addEventListener("change", render);

// click on map to pick point (only if add mode)
mapCanvas.addEventListener("click", (e) => {
  if (!addMode) return;

  const rect = mapCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  // clamp
  const xPct = Math.min(0.99, Math.max(0.01, x));
  const yPct = Math.min(0.99, Math.max(0.01, y));

  setPickedPoint(xPct, yPct);
});

modal.addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.dataset && t.dataset.close) closeModal();
});

btnSave.addEventListener("click", () => {
  if (!pickedPoint) return;

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
    xPct: pickedPoint.xPct,
    yPct: pickedPoint.yPct,
    createdAt: Date.now()
  });

  saveIssues();
  closeModal();
  render();
});

// ESC close modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("show")) closeModal();
});

/* init */
render();
