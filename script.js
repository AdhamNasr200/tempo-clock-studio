/*
  TEMPO CLOCK STUDIO — Vanilla JavaScript
  Concepts to explore: DOM, events, objects, Date, Intl, functions,
  setInterval, localStorage, CSS custom properties, and conditionals.
*/

const STORAGE_KEY = "tempo-clock-studio-v1";

const COLORS = {
  violet: { hex: "#ad8bff", name: "Iris violet" },
  aqua: { hex: "#57e4d4", name: "Aqua mint" },
  blue: { hex: "#76abff", name: "Ocean blue" },
  coral: { hex: "#ff8b88", name: "Coral pink" },
  gold: { hex: "#ffd18b", name: "Warm gold" },
};

const DEFAULT_SETTINGS = {
  display: "analog",    // "analog" or "digital"
  face: "classic",       // "classic", "minimal", "chrono"
  color: "violet",       // key in COLORS, or "custom"
  customHex: "#ad8bff",
  shape: "round",        // "round", "squircle", "square"
  showSeconds: true,
  smoothMotion: true,
  format24: false,
  lightTheme: false,
  timezone: "local",
};

// Grab the elements we will update often.
const $ = (selector) => document.querySelector(selector);
const shell = $("#watchShell");
const stage = $("#clockStage");
const appShell = $("#appShell");
const hourHand = $("#hourHand");
const minuteHand = $("#minuteHand");
const secondHand = $("#secondHand");
const digitalMain = $("#digitalMain");
const digitalSub = $("#digitalSub");
const digitalDay = $("#digitalDay");
const digitalCity = $("#digitalCity");
const footerTime = $("#footerTime");
const footerZone = $("#footerZone");
const topbarDate = $("#topbarDate");
const toast = $("#toast");

// Cache Intl formatters to avoid constructing them every time the clock ticks.
const timeFormatters = new Map();
const dateFormatters = new Map();
let toastTimer;
let clockInterval;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return { ...DEFAULT_SETTINGS };

    const merged = { ...DEFAULT_SETTINGS, ...saved };
    if (!["analog", "digital"].includes(merged.display)) merged.display = "analog";
    if (!["classic", "minimal", "chrono"].includes(merged.face)) merged.face = "classic";
    if (!["round", "squircle", "square"].includes(merged.shape)) merged.shape = "round";
    if (!(merged.color in COLORS) && merged.color !== "custom") merged.color = "violet";
    if (!/^#[0-9a-fA-F]{6}$/.test(merged.customHex)) merged.customHex = DEFAULT_SETTINGS.customHex;
    for (const key of ["showSeconds", "smoothMotion", "format24", "lightTheme"]) {
      if (typeof merged[key] !== "boolean") merged[key] = DEFAULT_SETTINGS[key];
    }
    const allowedZones = Array.from($("#timezoneSelect").options, (option) => option.value);
    if (!allowedZones.includes(merged.timezone)) merged.timezone = "local";
    return merged;
  } catch (error) {
    // Private browsing or blocked storage should not prevent the clock from working.
    console.warn("Saved preferences could not be loaded:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

let settings = loadSettings();

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Preferences could not be saved:", error);
  }
}

function hexToRGB(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((position) => parseInt(value.slice(position, position + 2), 16)).join(",");
}

function selectedAccent() {
  return settings.color === "custom" ? settings.customHex : COLORS[settings.color].hex;
}

function updatePressedButtons(selector, dataAttribute, activeValue) {
  document.querySelectorAll(selector).forEach((button) => {
    const isActive = button.dataset[dataAttribute] === activeValue;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

// Apply the JavaScript state to the whole user interface in one place.
function renderSettings() {
  const accent = selectedAccent();
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-rgb", hexToRGB(accent));
  document.body.classList.toggle("daylight", settings.lightTheme);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", settings.lightTheme ? "#f1f3fa" : "#0a0c12");

  shell.className = `watch-shell shape-${settings.shape} face-${settings.face}`;
  shell.classList.toggle("display-digital", settings.display === "digital");
  shell.classList.toggle("hide-seconds", !settings.showSeconds);
  shell.setAttribute("aria-label", `${settings.display === "digital" ? "Digital" : "Analog"} clock, ${settings.timezone === "local" ? "local time" : settings.timezone}`);

  updatePressedButtons("[data-display]", "display", settings.display);
  updatePressedButtons("[data-face]", "face", settings.face);
  updatePressedButtons("[data-shape]", "shape", settings.shape);
  updatePressedButtons("[data-color]", "color", settings.color);

  const name = settings.color === "custom" ? "Custom color" : COLORS[settings.color].name;
  $("#colorName").textContent = name;
  $("#colorHex").textContent = accent.toUpperCase();
  $("#customColor").value = settings.customHex;

  $("#showSeconds").checked = settings.showSeconds;
  $("#smoothMotion").checked = settings.smoothMotion;
  $("#format24").checked = settings.format24;
  $("#lightTheme").checked = settings.lightTheme;
  $("#timezoneSelect").value = settings.timezone;

  // Smooth motion matters only for analog clock hands.
  $("#showSeconds").disabled = false;
  $("#smoothMotion").disabled = settings.display === "digital";
  $("#smoothMotion").closest(".preference-row").style.opacity = settings.display === "digital" ? ".56" : "1";
  saveSettings();
  tick();
}

// Generate 60 little ticks around the clock face. Each fifth tick is larger.
function createHourMarkers() {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 60; index += 1) {
    const marker = document.createElement("span");
    marker.className = `hour-marker${index % 5 === 0 ? " major" : ""}`;
    marker.style.setProperty("--rotation", `${index * 6}deg`);
    fragment.append(marker);
  }
  $("#hourMarkers").append(fragment);
}

function getTimezoneOptions() {
  return settings.timezone === "local" ? {} : { timeZone: settings.timezone };
}

function getTimeParts(now) {
  const key = settings.timezone;
  if (!timeFormatters.has(key)) {
    timeFormatters.set(key, new Intl.DateTimeFormat("en-GB", {
      ...getTimezoneOptions(),
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23",
    }));
  }

  const values = {};
  for (const part of timeFormatters.get(key).formatToParts(now)) {
    if (["hour", "minute", "second"].includes(part.type)) {
      values[part.type] = Number(part.value);
    }
  }
  return { hours: values.hour, minutes: values.minute, seconds: values.second };
}

function getDateStrings(now) {
  const key = settings.timezone;
  if (!dateFormatters.has(key)) {
    dateFormatters.set(key, {
      day: new Intl.DateTimeFormat("en-US", { ...getTimezoneOptions(), weekday: "long", month: "short", day: "numeric" }),
      shortDay: new Intl.DateTimeFormat("en-US", { ...getTimezoneOptions(), weekday: "short" }),
      topDate: new Intl.DateTimeFormat("en-US", { ...getTimezoneOptions(), weekday: "short", month: "short", day: "numeric" }),
    });
  }
  const formatters = dateFormatters.get(key);
  return {
    full: formatters.day.format(now),
    short: formatters.shortDay.format(now),
    top: formatters.topDate.format(now),
  };
}

function getTimezoneLabel() {
  if (settings.timezone === "local") {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll("_", " "); }
    catch { return "Your local time"; }
  }
  if (settings.timezone === "UTC") return "UTC";
  return settings.timezone.split("/").at(-1).replaceAll("_", " ");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

// Derive everything from a fresh Date so the clock won't drift over time.
function tick() {
  const now = new Date();
  const { hours, minutes, seconds } = getTimeParts(now);
  const millisecondFraction = settings.smoothMotion ? now.getMilliseconds() / 1000 : 0;
  const accurateSeconds = seconds + millisecondFraction;
  const accurateMinutes = minutes + accurateSeconds / 60;
  const accurateHours = (hours % 12) + accurateMinutes / 60;

  // 360° / 60 seconds = 6° per second; 360° / 12 hours = 30° per hour.
  const secondDegrees = accurateSeconds * 6;
  const minuteDegrees = accurateMinutes * 6;
  const hourDegrees = accurateHours * 30;

  // The CSS transform-origin is at the bottom of each hand.
  hourHand.style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`;
  minuteHand.style.transform = `translateX(-50%) rotate(${minuteDegrees}deg)`;
  secondHand.style.transform = `translateX(-50%) rotate(${secondDegrees}deg)`;

  const hourText = settings.format24 ? pad(hours) : pad(hours % 12 || 12);
  const period = hours >= 12 ? "PM" : "AM";
  const suffix = settings.format24 ? "" : ` ${period}`;
  const secondsText = settings.showSeconds ? `:${pad(seconds)}` : "";
  const timeText = `${hourText}:${pad(minutes)}${secondsText}${suffix}`;
  const date = getDateStrings(now);

  footerTime.textContent = timeText;
  footerZone.textContent = getTimezoneLabel();
  topbarDate.textContent = date.top;
  digitalMain.textContent = `${hourText}:${pad(minutes)}`;
  digitalSub.textContent = `${secondsText}${suffix}`.trim() || "\u00a0";
  digitalSub.style.visibility = secondsText || suffix ? "visible" : "hidden";
  digitalDay.textContent = date.full.toUpperCase();
  digitalCity.textContent = getTimezoneLabel().toUpperCase();
  $("#subdialSeconds").textContent = pad(seconds);
  $("#subdialDay").textContent = date.short.toUpperCase();
  shell.setAttribute("aria-label", `${settings.display} clock showing ${timeText} in ${getTimezoneLabel()}`);
}

function updateSettings(partial) {
  Object.assign(settings, partial);
  renderSettings();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

const PRESETS = {
  midnight: { display: "analog", face: "classic", color: "violet", shape: "round", lightTheme: false, showSeconds: true, smoothMotion: true },
  sunrise: { display: "analog", face: "minimal", color: "gold", shape: "squircle", lightTheme: true, showSeconds: false, smoothMotion: true },
  future: { display: "digital", face: "minimal", color: "aqua", shape: "square", lightTheme: false, showSeconds: true, format24: true },
};

function attachListeners() {
  document.querySelectorAll("[data-display]").forEach((button) => button.addEventListener("click", () => {
    updateSettings({ display: button.dataset.display });
  }));
  document.querySelectorAll("[data-face]").forEach((button) => button.addEventListener("click", () => {
    updateSettings({ face: button.dataset.face, display: "analog" });
  }));
  document.querySelectorAll("[data-color]").forEach((button) => button.addEventListener("click", () => {
    updateSettings({ color: button.dataset.color });
  }));
  document.querySelectorAll("[data-shape]").forEach((button) => button.addEventListener("click", () => {
    updateSettings({ shape: button.dataset.shape });
  }));
  $("#customColor").addEventListener("input", (event) => updateSettings({ color: "custom", customHex: event.target.value }));
  $("#showSeconds").addEventListener("change", (event) => updateSettings({ showSeconds: event.target.checked }));
  $("#smoothMotion").addEventListener("change", (event) => updateSettings({ smoothMotion: event.target.checked }));
  $("#format24").addEventListener("change", (event) => updateSettings({ format24: event.target.checked }));
  $("#lightTheme").addEventListener("change", (event) => updateSettings({ lightTheme: event.target.checked }));
  $("#timezoneSelect").addEventListener("change", (event) => updateSettings({ timezone: event.target.value }));

  $("#resetButton").addEventListener("click", () => {
    settings = { ...DEFAULT_SETTINGS };
    renderSettings();
    showToast("Default clock settings restored");
  });

  document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => {
    const presetName = button.dataset.preset;
    updateSettings(PRESETS[presetName]);
    showToast(`Preset applied: ${button.querySelector("strong").textContent}`);
    document.querySelector("#studio").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }));

  $("#surpriseButton").addEventListener("click", () => {
    const colors = Object.keys(COLORS);
    const faces = ["classic", "minimal", "chrono"];
    const shapes = ["round", "squircle", "square"];
    const randomOf = (items) => items[Math.floor(Math.random() * items.length)];
    updateSettings({ display: Math.random() > .8 ? "digital" : "analog", face: randomOf(faces), shape: randomOf(shapes), color: randomOf(colors), lightTheme: Math.random() > .65 });
    showToast("A fresh clock look, just for you!");
    document.querySelector("#studio").scrollIntoView({ behavior: "smooth" });
  });

  $("#fullscreenButton").addEventListener("click", async () => {
    const previewPanel = $(".preview-panel");
    try {
      if (!document.fullscreenElement) {
        if (!previewPanel.requestFullscreen) return showToast("Fullscreen isn't supported in this browser");
        await previewPanel.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showToast("Fullscreen couldn't be enabled here");
    }
  });

  document.addEventListener("fullscreenchange", () => {
    $("#fullscreenButton").setAttribute("aria-label", document.fullscreenElement ? "Exit fullscreen preview" : "Show clock fullscreen");
    $("#fullscreenButton").title = document.fullscreenElement ? "Exit fullscreen" : "Fullscreen preview";
  });

  document.querySelectorAll("[data-nav]").forEach((link) => link.addEventListener("click", () => {
    document.querySelectorAll("[data-nav]").forEach((item) => item.classList.toggle("active", item === link));
  }));
}

function init() {
  createHourMarkers();
  attachListeners();
  $("#copyrightYear").textContent = String(new Date().getFullYear());
  renderSettings();
  clearInterval(clockInterval);
  clockInterval = setInterval(tick, 80);
  // Refresh after returning to the tab, even if the browser throttled timers.
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
}

init();
