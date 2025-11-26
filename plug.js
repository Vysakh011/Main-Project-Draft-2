// plug.js
const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt");

client.on("connect", () => {
  console.log("MQTT connected");
  client.subscribe("smart/plug/data");
});

client.on("message", (topic, message) => {
  const msg = message.toString();
  console.log("MQTT DATA:", msg);

  // Example payload: plug:1 voltage:230.0V current:0.123A relay:1 timer:25
  const parts = msg.split(" ");
  const plugId = parseInt(parts[0].split(":")[1]);
  const voltage = parseFloat(parts[1].split(":")[1]);
  const current = parseFloat(parts[2].split(":")[1]);
  const relay = parseInt(parts[3].split(":")[1]);
  const timer = parseInt(parts[4].split(":")[1]);

  // Update live card
  const container = document.getElementById("plugData");
  container.innerHTML = `
    <div class="plug-card">
      <h2>Plug ${plugId}</h2>
      <p class="value"><i class="bi bi-battery"></i> Voltage: ${voltage.toFixed(1)} V</p>
      <p class="value"><i class="bi bi-lightning"></i> Current: ${current.toFixed(3)} A</p>
      <p class="value"><i class="bi bi-power"></i> Relay: ${relay === 1 ? "ON" : "OFF"}</p>
      <p class="value"><i class="bi bi-clock"></i> Timer: ${timer} sec</p>
    </div>
  `;

  // ✅ Sync toggle with relay state
  const toggle = document.getElementById("relayToggle");
  const status = document.getElementById("relayStatus");
  if (relay === 1) {
    toggle.checked = true;
    status.textContent = "Status: ON";
  } else {
    toggle.checked = false;
    status.textContent = "Status: OFF";
  }

  // ✅ Show timer countdown if active
  const timerDisplay = document.getElementById("timerDisplay");
  if (timer > 0) {
    timerDisplay.textContent = `Timer Running: ${timer} sec left`;
  } else {
    timerDisplay.textContent = "";
  }
});

// ================= CONTROL FUNCTIONS =================
function toggleRelay() {
  const toggle = document.getElementById("relayToggle");
  const status = document.getElementById("relayStatus");

  if (toggle.checked) {
    client.publish("smart/plug/cmd", JSON.stringify({ plug: 1, cmd: "on" }));
    status.textContent = "Status: ON";
  } else {
    client.publish("smart/plug/cmd", JSON.stringify({ plug: 1, cmd: "off" }));
    status.textContent = "Status: OFF";
  }
}

function sendTimer() {
  const h = parseInt(document.getElementById("hours").value);
  const m = parseInt(document.getElementById("minutes").value);
  const s = parseInt(document.getElementById("seconds").value);
  const totalSec = h * 3600 + m * 60 + s;

  if (totalSec > 0) {
    client.publish("smart/plug/cmd", JSON.stringify({ plug: 1, cmd: "timer", seconds: totalSec }));
    document.getElementById("timerDisplay").textContent = `Timer Started: ${totalSec} sec`;
    // ✅ Force toggle ON when timer starts
    const toggle = document.getElementById("relayToggle");
    toggle.checked = true;
    document.getElementById("relayStatus").textContent = "Status: ON";
  }
}
