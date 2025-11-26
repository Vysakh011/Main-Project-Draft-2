// ================= MQTT CONNECTION =================
const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt");
let currentPlugId = 1;
let timerWasStartedByUser = false;

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
  const webSwitch = document.getElementById("relayToggle");
  const statusText = document.getElementById("relayStatus");
  const timerDisplay = document.getElementById("timerDisplay");
  
  // Display sensor data
  container.innerHTML = `
    <div class="plug-card">
      <h2>Plug ${currentPlugId}</h2>
      <p class="value"><i class="bi bi-lightning"></i> Voltage: ${voltage.toFixed(1)} V</p>
      <p class="value"><i class="bi bi-activity"></i> Current: ${current.toFixed(3)} A</p>
      <p class="value"><i class="bi bi-plug"></i> Power: ${power} W</p>
      ${timerSec > 0 ? `<p class="value timer-active"><i class="bi bi-hourglass-split"></i> Timer: ${formatTime(timerSec)}</p>` : ''}
    </div>
  `;
  
  // ✅ INVERTED LOGIC: relay 0 = physically OFF → web switch ON
  //                    relay 1 = physically ON  → web switch OFF
  webSwitch.checked = (relayState === 0);
  
  // Update status text
  if (timerSec > 0) {
    statusText.textContent = `Status: ${webSwitch.checked ? 'ON' : 'OFF'} (Timer Active)`;
    statusText.style.color = webSwitch.checked ? "#27ae60" : "#e74c3c";
    timerDisplay.innerHTML = `⏱️ Timer: ${formatTime(timerSec)} remaining`;
  } else {
    // Timer finished
    if (timerWasStartedByUser) {
      // Turn web switch OFF when timer finishes
      webSwitch.checked = false;
      timerWasStartedByUser = false;
      
      // Send OFF command to ensure relay is OFF
      const payload = JSON.stringify({
        plug: currentPlugId,
        cmd: "on"  // Inverted: "on" = relay OFF
      });
      client.publish("smart/plug/cmd", payload);
      console.log("Timer finished - sent OFF command:", payload);
    }
    
    statusText.textContent = `Status: ${webSwitch.checked ? 'ON' : 'OFF'}`;
    statusText.style.color = webSwitch.checked ? "#27ae60" : "#e74c3c";
    timerDisplay.innerHTML = "";
  }
}

// ================= SEND COMMANDS =================
function toggleRelay() {
  const isChecked = document.getElementById("relayToggle").checked;
  const statusText = document.getElementById("relayStatus");
  
  // ✅ INVERTED LOGIC:
  // Web switch ON  → send "off" → relay physically OFF (relayState=0)
  // Web switch OFF → send "on"  → relay physically ON  (relayState=1)
  const cmd = isChecked ? "off" : "on";
  
  const payload = JSON.stringify({
    plug: currentPlugId,
    cmd: cmd
  });
  
  client.publish("smart/plug/cmd", payload);
  console.log("Toggle sent:", payload);
  
  // Update status immediately for responsiveness
  statusText.textContent = `Status: ${isChecked ? 'ON' : 'OFF'}`;
  statusText.style.color = isChecked ? "#27ae60" : "#e74c3c";
  
  // Clear timer flag if user manually toggles
  timerWasStartedByUser = false;
}

function sendTimer() {
  const h = parseInt(document.getElementById("hours").value);
  const m = parseInt(document.getElementById("minutes").value);
  const s = parseInt(document.getElementById("seconds").value);
  const totalSec = h * 3600 + m * 60 + s;
  
  if (totalSec <= 0) {
    alert("⚠️ Please set a valid timer duration!");
    return;
  }
  
  const webSwitch = document.getElementById("relayToggle");
  const statusText = document.getElementById("relayStatus");
  const timerDisplay = document.getElementById("timerDisplay");
  
  // Mark that timer was started by user
  timerWasStartedByUser = true;
  
  // Send timer command
  const payload = JSON.stringify({
    plug: currentPlugId,
    cmd: "timer",
    seconds: totalSec
  });
  
  client.publish("smart/plug/cmd", payload);
  console.log("Timer sent:", payload);
  
  // ✅ TIMER LOGIC:
  // 1. If web switch is ON → keep it ON, web switch stays ON until timer finishes
  // 2. If web switch is OFF → turn it ON
  // Either way, timer will turn relay OFF (physically) = web switch ON
  webSwitch.checked = true;
  
  statusText.textContent = "Status: ON (Timer Starting)";
  statusText.style.color = "#27ae60";
  timerDisplay.innerHTML = `⏱️ Timer: ${formatTime(totalSec)} starting...`;
}

// ================= HELPER FUNCTIONS =================
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  } else if (m > 0) {
    return `${m}m ${s}s`;
  } else {
    return `${s}s`;
  }
}
