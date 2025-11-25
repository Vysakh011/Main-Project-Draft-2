// MQTT setup
const broker = 'wss://broker.hivemq.com:8884/mqtt';
const client = mqtt.connect(broker);

const plugId = new URLSearchParams(location.search).get('plug');
const topic = 'smart/plug/data';

// Relay toggle (global)
function toggleRelay() {
  const state = document.getElementById("relayToggle").checked;

  const payload = JSON.stringify({
    plug: parseInt(plugId),
    cmd: state ? "on" : "off"
  });

  client.publish("smart/plug/cmd", payload);
  console.log("Relay command:", payload);
}

// Timer sender (global)
function sendTimer() {
  const h = parseInt(document.getElementById('hours').value);
  const m = parseInt(document.getElementById('minutes').value);
  const s = parseInt(document.getElementById('seconds').value);

  const totalSec = h * 3600 + m * 60 + s;

  if (totalSec <= 0) {
    console.log("Timer not set");
    return;
  }

  const payload = JSON.stringify({
    plug: parseInt(plugId),
    cmd: "timer",
    seconds: totalSec
  });

  client.publish("smart/plug/cmd", payload);
  console.log("Timer command:", payload);
}

// MQTT events
client.on('connect', () => {
  console.log('✅ Connected to broker');
  client.subscribe(topic);
});

client.on('message', (t, message) => {
  const text = message.toString();

  // plug:1 voltage:234.5V current:0.123A relay:1 timer:30
  const regex = /plug:(\d+)\s+voltage:(\d+(?:\.\d+)?)V\s+current:(\d+(?:\.\d+)?)A\s+relay:(\d+)\s+timer:(\d+)/;
  const match = text.match(regex);

  if (!match) return;
  if (match[1] !== plugId) return;

  const voltage = parseFloat(match[2]);
  const current = parseFloat(match[3]);
  const relayState = parseInt(match[4]);
  const remaining = parseInt(match[5]);
  const power = voltage * current;

  let timerText = "";
  if (remaining > 0) {
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');

    timerText = `<div class="value"><i class="bi bi-clock"></i> Timer: ${hh}:${mm}:${ss}</div>`;
  }

  document.getElementById('plugData').innerHTML = `
    <div class="plug-card">
      <h2><i class="bi bi-plug-fill"></i> Plug-${plugId}</h2>
      <div class="value"><i class="bi bi-lightning-charge"></i> Voltage: ${voltage.toFixed(2)} V</div>
      <div class="value"><i class="bi bi-current"></i> Current: ${current.toFixed(3)} A</div>
      <div class="value"><i class="bi bi-bar-chart-line"></i> <b>Power: ${power.toFixed(2)} W</b></div>
      ${timerText}
    </div>
  `;

  // Sync relay toggle
  document.getElementById("relayToggle").checked = relayState === 1;
});
