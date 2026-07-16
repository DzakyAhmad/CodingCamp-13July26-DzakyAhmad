/* =========================================================
   Life Dashboard – Main Script
   Features:
     • Real-time clock & dynamic greeting  (setInterval 1 s)
     • Pomodoro timer with custom durations
     • To-Do List  (LocalStorage + duplicate prevention)
     • Quick Links (LocalStorage)
   ========================================================= */

"use strict";

/* ── LocalStorage keys ───────────────────────────────────── */
var KEYS = {
  name:  "dashboard_name",
  tasks: "dashboard_tasks",
  links: "dashboard_links"
};

/* =========================================================
   1. CLOCK & GREETING
   ========================================================= */

var DAYS = [
  "Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"
];
var MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"
];

function updateClock() {
  var now = new Date();

  /* ── Jam ── */
  var hh = String(now.getHours()).padStart(2, "0");
  var mm = String(now.getMinutes()).padStart(2, "0");
  var ss = String(now.getSeconds()).padStart(2, "0");
  document.getElementById("clock").textContent = hh + ":" + mm + ":" + ss;

  /* ── Tanggal ── */
  var dayName   = DAYS[now.getDay()];
  var dayNum    = now.getDate();
  var monthName = MONTHS[now.getMonth()];
  var year      = now.getFullYear();
  document.getElementById("date").textContent =
    dayName + ", " + dayNum + " " + monthName + " " + year;

  /* ── Greeting berdasarkan jam ── */
  var hour = now.getHours();
  var name = localStorage.getItem(KEYS.name) || "";
  var salutation;
  if      (hour >= 5  && hour < 12) salutation = "Selamat Pagi";
  else if (hour >= 12 && hour < 15) salutation = "Selamat Siang";
  else if (hour >= 15 && hour < 18) salutation = "Selamat Sore";
  else                              salutation = "Selamat Malam";

  document.getElementById("greeting").textContent =
    name ? salutation + ", " + name + "! 👋" : salutation + "! 👋";
}

function saveName() {
  var input = document.getElementById("nameInput");
  var name  = input.value.trim();
  if (!name) { showToast("Nama tidak boleh kosong."); return; }
  localStorage.setItem(KEYS.name, name);
  input.value = "";
  updateClock();
  showToast("Halo, " + name + "! Nama disimpan. 🎉");
}

function initName() {
  var saved = localStorage.getItem(KEYS.name);
  if (saved) {
    document.getElementById("nameInput").placeholder = saved;
  }
}

/* =========================================================
   2. POMODORO TIMER
   ========================================================= */

var timerInterval = null;
var isRunning     = false;
var isFocusMode   = true;
var secondsLeft   = 0;
var sessionsCount = 0;

function getMinutes(id) {
  var val = parseInt(document.getElementById(id).value, 10);
  return (isNaN(val) || val < 1)
    ? (id === "focusDuration" ? 25 : 5)
    : val;
}

function formatTime(secs) {
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function renderTimerDisplay() {
  document.getElementById("timerDisplay").textContent = formatTime(secondsLeft);
}

function setTimerMode(focusMode) {
  isFocusMode = focusMode;
  secondsLeft = (focusMode
    ? getMinutes("focusDuration")
    : getMinutes("breakDuration")) * 60;
  renderTimerDisplay();
  document.getElementById("badgeFocus").classList.toggle("badge-active",  focusMode);
  document.getElementById("badgeBreak").classList.toggle("badge-active", !focusMode);
}

function startTimer() {
  if (isRunning) return;
  if (secondsLeft === 0) setTimerMode(true);

  isRunning = true;
  document.getElementById("timerDisplay").classList.add("running");
  document.getElementById("btnStart").disabled = true;
  document.getElementById("btnPause").disabled = false;

  timerInterval = setInterval(function () {
    if (secondsLeft > 0) {
      secondsLeft--;
      renderTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      isRunning     = false;
      document.getElementById("timerDisplay").classList.remove("running");
      document.getElementById("btnStart").disabled = false;
      document.getElementById("btnPause").disabled = true;

      if (isFocusMode) {
        sessionsCount++;
        document.getElementById("sessionCount").textContent = sessionsCount;
        showToast("Sesi fokus selesai! Waktunya istirahat. ☕");
        setTimerMode(false);
      } else {
        showToast("Istirahat selesai! Siap fokus lagi. 💪");
        setTimerMode(true);
      }
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  clearInterval(timerInterval);
  timerInterval = null;
  isRunning     = false;
  document.getElementById("timerDisplay").classList.remove("running");
  document.getElementById("btnStart").disabled = false;
  document.getElementById("btnPause").disabled = true;
}

function resetTimer() {
  pauseTimer();
  isFocusMode = true;
  secondsLeft = getMinutes("focusDuration") * 60;
  renderTimerDisplay();
  document.getElementById("badgeFocus").classList.add("badge-active");
  document.getElementById("badgeBreak").classList.remove("badge-active");
}

function initTimer() {
  secondsLeft = getMinutes("focusDuration") * 60;
  renderTimerDisplay();

  document.getElementById("focusDuration").addEventListener("change", function () {
    if (!isRunning && isFocusMode) {
      secondsLeft = getMinutes("focusDuration") * 60;
      renderTimerDisplay();
    }
  });
  document.getElementById("breakDuration").addEventListener("change", function () {
    if (!isRunning && !isFocusMode) {
      secondsLeft = getMinutes("breakDuration") * 60;
      renderTimerDisplay();
    }
  });
}

/* =========================================================
   3. TO-DO LIST
   ========================================================= */

var tasks        = [];
var activeFilter = "all";   /* "all" | "active" | "completed" */

function loadTasks() {
  try {
    tasks = JSON.parse(localStorage.getItem(KEYS.tasks)) || [];
  } catch (e) {
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(KEYS.tasks, JSON.stringify(tasks));
}

function addTask(event) {
  event.preventDefault();
  var input = document.getElementById("taskInput");
  var text  = input.value.trim();

  if (!text) { showToast("Tugas tidak boleh kosong."); return; }

  /* ── Pencegahan duplikasi (case-insensitive) ── */
  var isDuplicate = tasks.some(function (t) {
    return t.text.toLowerCase() === text.toLowerCase();
  });
  if (isDuplicate) {
    showToast('"' + text + '" sudah ada di daftar!');
    return;
  }

  tasks.push({ id: Date.now(), text: text, done: false });
  saveTasks();
  input.value = "";
  renderTasks();
  showToast("Tugas ditambahkan! ✅");
}

function toggleTask(id) {
  var task = tasks.find(function (t) { return t.id === id; });
  if (task) {
    task.done = !task.done;
    saveTasks();
    renderTasks();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(function (t) { return t.id !== id; });
  saveTasks();
  renderTasks();
  showToast("Tugas dihapus.");
}

function clearCompleted() {
  var before = tasks.length;
  tasks = tasks.filter(function (t) { return !t.done; });
  if (tasks.length === before) {
    showToast("Tidak ada tugas selesai untuk dihapus.");
    return;
  }
  saveTasks();
  renderTasks();
  showToast("Semua tugas selesai dihapus.");
}

function filterTasks(mode) {
  activeFilter = mode;
  ["all", "active", "completed"].forEach(function (m) {
    document.getElementById("filter-" + m)
      .classList.toggle("filter-active", m === mode);
  });
  renderTasks();
}

function getFilteredTasks() {
  if (activeFilter === "active")    return tasks.filter(function (t) { return !t.done; });
  if (activeFilter === "completed") return tasks.filter(function (t) {  return t.done; });
  return tasks;
}

function renderTasks() {
  var list     = document.getElementById("taskList");
  var filtered = getFilteredTasks();
  list.innerHTML = "";

  if (filtered.length === 0) {
    var emptyMsg =
      activeFilter === "completed" ? "Belum ada tugas selesai." :
      activeFilter === "active"    ? "Semua tugas sudah selesai! 🎉" :
      "Belum ada tugas. Tambahkan satu!";
    list.innerHTML =
      '<li class="text-center text-brand-400 text-sm py-4 italic">' +
      emptyMsg + "</li>";
  } else {
    filtered.forEach(function (task) {
      var li = document.createElement("li");
      li.className = "task-item";
      li.innerHTML =
        '<input type="checkbox" class="task-checkbox" ' +
          (task.done ? "checked" : "") +
          ' onchange="toggleTask(' + task.id + ')"' +
          ' aria-label="Tandai selesai: ' + escHtml(task.text) + '" />' +
        '<span class="task-text ' + (task.done ? "line-through-decor" : "") + '">' +
          escHtml(task.text) +
        "</span>" +
        '<button class="task-delete" onclick="deleteTask(' + task.id + ')"' +
          ' aria-label="Hapus tugas: ' + escHtml(task.text) + '"' +
          ' title="Hapus">✕</button>';
      list.appendChild(li);
    });
  }

  var activeCount = tasks.filter(function (t) { return !t.done; }).length;
  document.getElementById("taskStats").textContent =
    activeCount + " tugas aktif · " + tasks.length + " total";
}

/* =========================================================
   4. QUICK LINKS
   ========================================================= */

var links = [];

function loadLinks() {
  try {
    links = JSON.parse(localStorage.getItem(KEYS.links)) || [];
  } catch (e) {
    links = [];
  }
  /* Seed default links bila kosong */
  if (links.length === 0) {
    links = [
      { id: 1, label: "GitHub",  url: "https://github.com" },
      { id: 2, label: "YouTube", url: "https://youtube.com" },
      { id: 3, label: "Google",  url: "https://google.com" }
    ];
    saveLinks();
  }
}

function saveLinks() {
  localStorage.setItem(KEYS.links, JSON.stringify(links));
}

function addLink(event) {
  event.preventDefault();
  var labelEl = document.getElementById("linkLabel");
  var urlEl   = document.getElementById("linkUrl");
  var label   = labelEl.value.trim();
  var url     = urlEl.value.trim();

  if (!label) { showToast("Label link tidak boleh kosong.");  return; }
  if (!url)   { showToast("URL link tidak boleh kosong.");    return; }

  try { new URL(url); } catch (e) {
    showToast("URL tidak valid. Pastikan diawali https://");
    return;
  }

  links.push({ id: Date.now(), label: label, url: url });
  saveLinks();
  labelEl.value = "";
  urlEl.value   = "";
  renderLinks();
  showToast('Link "' + label + '" ditambahkan! 🔗');
}

function deleteLink(id) {
  links = links.filter(function (l) { return l.id !== id; });
  saveLinks();
  renderLinks();
  showToast("Link dihapus.");
}

function renderLinks() {
  var container = document.getElementById("linkList");
  container.innerHTML = "";

  if (links.length === 0) {
    container.innerHTML =
      '<p class="text-brand-400 text-sm italic col-span-full">' +
      "Belum ada quick link. Tambahkan satu!</p>";
    return;
  }

  links.forEach(function (link) {
    var hostname = "";
    try { hostname = new URL(link.url).hostname; } catch (e) {}

    var faviconSrc = hostname
      ? "https://www.google.com/s2/favicons?domain=" + hostname + "&sz=32"
      : "";

    var wrapper = document.createElement("div");
    wrapper.className = "relative";
    wrapper.innerHTML =
      '<a href="' + escHtml(link.url) + '" target="_blank" rel="noopener noreferrer"' +
        ' class="link-card" title="' + escHtml(link.url) + '">' +
        (faviconSrc
          ? '<img src="' + faviconSrc + '" alt="" class="link-favicon" loading="lazy" />'
          : '<span class="text-2xl">🔗</span>') +
        '<span>' + escHtml(link.label) + "</span>" +
      "</a>" +
      '<button class="link-delete-btn absolute top-1 right-1 z-10 bg-brand-900 rounded px-1"' +
        ' onclick="deleteLink(' + link.id + ')"' +
        ' aria-label="Hapus link: ' + escHtml(link.label) + '"' +
        ' title="Hapus">✕</button>';
    container.appendChild(wrapper);
  });
}

/* =========================================================
   5. UTILITY
   ========================================================= */

function escHtml(str) {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

var toastTimeout = null;
function showToast(message) {
  var toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function () {
    toast.classList.remove("show");
  }, 3000);
}

/* =========================================================
   6. INIT  — DOMContentLoaded
   =========================================================
   Semua fungsi dipanggil setelah DOM siap sehingga semua
   elemen (clock, date, timerDisplay, dll.) sudah tersedia.
   setInterval dipasang di sini untuk memastikan clock
   berjalan setiap 1 detik tepat setelah halaman dimuat.
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  /* 1. Nama tersimpan */
  initName();

  /* 2. Jam – jalankan sekali langsung, lalu setiap 1 detik */
  updateClock();
  setInterval(updateClock, 1000);

  /* 3. Timer – render nilai awal */
  initTimer();

  /* 4. Tasks – muat dari storage & render */
  loadTasks();
  renderTasks();

  /* 5. Quick Links – muat dari storage & render */
  loadLinks();
  renderLinks();
});
