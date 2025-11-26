// plug.js
const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt");
const state = {};  // plugId -> latest data
let currentPlugId = null;

client.on("connect", () => {
  console.log("MQTT connected");
  client.subscribe("smart/plug/data");
});

// Populate selector if new plug appears
function ensurePlugInSelect(id) {
  const sel = document.getElementById("plugSelect");
  if ([...sel.options].some(o => Number(o.value) === id)) return;
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = `Plug ${id}`;
  sel.add(opt);

  // Default to first received plug
  if (currentPlugId === null) {
    currentPlugId = id;
    sel.value = id;
  }
}

// Handle selection change
document.addEventListener("DOMContentLoaded", () => {
  const sel = document.getElementById("plugSelect");
  sel.addEventListener("change", () => {
    currentPlugId = Number(sel.value);
    // Update UI immediately for selected plug if we have data
    if (state[currentPlugId]) {
      renderSelected();
    }
  });
});

client.on("message", (topic, message) => {
  let data;
  try { data = JSON.parse(message.toString()); } catch (e) { return; }

  const id = data.plug;
  state[id] = {
    voltage: data.voltage || 0,
    current: data.current || 0,
    relay: data.relay || 0,
    timer: data.timer || 0
  };

  ensurePlugInSelect(id);

  // If this is the selected plug, render its card + toggle
  if (currentPlugId === id) {
    renderSelected();
  }
});

function renderSelected() {
  const d = state[currentPlugId];
  if (!d) return;

  const container = document.getElementById("plugData");
  const power = d.voltage * d.current;

  container.innerHTML = `
    <div class="plug-card">
      <h2>Plug ${currentPlugId}</h2>
      <p class="value"><i class="bi bi-battery"></i> Voltage: ${d.voltage.toFixed(1)} V</p>
      <p class="value"><i class="bi bi-lightning"></i> Current: ${d.current.toFixed(3)} A</p>
      <p class="value"><i class="bi bi-graph-up"></i> Power: ${power.toFixed(1)} W</p>
      <p class="value"><i class="bi bi-power"></i> Relay: ${d.relay === 1 ? "ON" : "OFF"}</p>
      <p class="value"><i class="bi bi-clock"></i> Timer: ${d.timer} sec</p>
    </div>
  `;

  // Sync toggle and status with relay
  const toggle = document.getElementById("relayToggle");
  const status = document.getElementById("relayStatus");
  toggle.checked = (d.relay === 1);
  status.textContent = `Status: ${d.relay === 1 ? "ON" : "OFF"}`;

  // Timer display
  const timerDisplay = document.getElementById("timerDisplay");
  timerDisplay.textContent = d.timer > 0 ? `Timer Running: ${d.timer} sec left` : "";
}

// ================= CONTROL FUNCTIONS =================
function toggleRelay() {
  if (currentPlugId === null) return;
  const toggle = document.getElementById("relayToggle");
  const status = document.getElementById("relayStatus");

  if (toggle.checked) {
    client.publish("smart/plug/cmd", JSON.stringify({ plug: currentPlugId, cmd: "on" }));
    status.textContent = "Status: ON";
  } else {
    client.publish("smart/plug/cmd", JSON.stringify({ plug: currentPlugId, cmd: "off" }));
    status.textContent = "Status: OFF";
  }
}

function sendTimer() {
  if (currentPlugId === null) return;
  const h = parseInt(document.getElementById("hours").value);
  const m = parseInt(document.getElementById("minutes").value);
  const s = parseInt(document.getElementById("seconds").value);
  const totalSec = h * 3600 + m * 60 + s;

  if (totalSec > 0) {
    client.publish("smart/plug/cmd", JSON.stringify({
      plug: currentPlugId,
      cmd: "timer",
      seconds: totalSec
    }));
    document.getElementById("timerDisplay").textContent = `Timer Started: ${totalSec} sec`;

    // Force toggle ON when timer starts (UI mirrors plug behavior)
    const toggle = document.getElementById("relayToggle");
    toggle.checked = true;
    document.getElementById("relayStatus").textContent = "Status: ON";
  }
}
