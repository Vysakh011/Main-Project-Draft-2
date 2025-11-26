// ================= MQTT CONNECTION =================
const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt");
let currentPlugId = 1;
let webSwitchWasOnAtTimerStart = false;   // ✅ Track state at timer start

client.on("connect", () => {
  console.log("✅ MQTT Connected");
  client.subscribe("smart/plug/data");
});

// ================= HANDLE INCOMING DATA =================
client.on("message", (topic, message) => {
  const msg = message.toString();
  const parts = msg.split(" ");
  const plugId = parseInt(parts[0].split(":")[1]);
  if (plugId !== currentPlugId) return;
  const voltage = parseFloat(parts[1].split(":")[1]);
  const current = parseFloat(parts[2].split(":")[1]);
  const relay = parseInt(parts[3].split(":")[1]);   // 0 or 1
  const timer = parseInt(parts[4].split(":")[1]);
  updateUI(voltage, current, relay, timer);
});

// ================= UPDATE UI =================
function updateUI(voltage, current, relayState, timerSec) {
  const container = document.getElementById("plugData");
  const power = (voltage * current).toFixed(1);
  container.innerHTML = `
    <div class="plug-card">
      <h2>Plug ${currentPlugId}</h2>
      <p class="value"><i class="bi bi-lightning"></i> Voltage: ${voltage.toFixed(1)} V</p>
      <p class="value"><i class="bi bi-activity"></i> Current: ${current.toFixed(3)} A</p>
      <p class="value"><i class="bi bi-plug"></i> Power: ${power} W</p>
      <p class="value"><i class="bi bi-hourglass-split"></i> Timer: ${timerSec} s</p>
    </div>
  `;

  const webSwitch = document.getElementById("relayToggle");

  // ✅ INVERSION LOGIC (ALWAYS)
  // relay OFF → switch ON
  // relay ON  → switch OFF
  webSwitch.checked = (relayState === 0);

  // ✅ TIMER END LOGIC
  if (timerSec === 0) {
    // Both cases end with OFF
    webSwitch.checked = false;
  }
}

// ================= SEND COMMANDS =================
function toggleRelay() {
  const isChecked = document.getElementById("relayToggle").checked;
  // ✅ INVERSION:
  // Web ON  → relay OFF
  // Web OFF → relay ON
  const cmd = isChecked ? "off" : "on";
  const payload = JSON.stringify({
    plug: currentPlugId,
    cmd: cmd
  });
  client.publish("smart/plug/cmd", payload);
  console.log("Sent:", payload);
}

function sendTimer() {
  const h = parseInt(document.getElementById("hours").value);
  const m = parseInt(document.getElementById("minutes").value);
  const s = parseInt(document.getElementById("seconds").value);
  const totalSec = h * 3600 + m * 60 + s;
  if (totalSec <= 0) return;

  const webSwitch = document.getElementById("relayToggle");

  // ✅ Save current state before timer starts
  webSwitchWasOnAtTimerStart = webSwitch.checked;

  // ✅ CASE 1: Web switch ON → keep ON
  // ✅ CASE 2: Web switch OFF → turn ON for timer
  webSwitch.checked = true;

  const payload = JSON.stringify({
    plug: currentPlugId,
    cmd: "timer",
    seconds: totalSec
  });
  client.publish("smart/plug/cmd", payload);
  console.log("Sent:", payload);
}
