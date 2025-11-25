// MQTT setup
const broker = 'wss://broker.hivemq.com:8884/mqtt';
const client = mqtt.connect(broker);

const plugId = new URLSearchParams(location.search).get('plug');
const topic = 'smart/plug/data';

// Relay toggle (must be top-level)
function toggleRelay() {
  const state = document.getElementById("relayToggle").checked;

  const payload = JSON.stringify({
    plug: parseInt(plugId),
    cmd: state ? "on" : "off"
  });

  client.publish("smart/plug/cmd", payload);
  console.log("Relay command:", payload);
}

// Timer sender (must be top-level)
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

// MQTT connection
client.on('connect', () => {
  console.log('✅ Connected to broker');
  client.subscribe(topic);
});

// MQTT message handler
client.on('message', (t, message) => {
  const text = message.toString();

  // Expected format:
  // plug:1 voltage:234.5V current:0.123A relay:1
  const regex = /plug:(\d+)\s+voltage:(\d+(?:\.\d+)?)V\s+current:(\d+(?:\.\d+)?)A\s+relay:(\d+)/;
  const match = text.match(regex);

  if (match && match[1] === plugId) {
    const voltage = parseFloat(match[2]);
    const current = parseFloat(match[3]);
    const relayState = parseInt(match[4]);
    const power = voltage * current;

    // Update UI card
    document.getElementById('plugData').innerHTML = `
      <div class="plug-card">
        <h2><i class="bi bi-plug-fill"></i> Plug-${plugId}</h2>
        <div class="value"><i class="bi bi-lightning-charge"></i> Voltage: ${voltage.toFixed(2)} V</div>
        <div class="value"><i class="bi bi-current"></i> Current: ${current.toFixed(3)} A</div>
        <div class="value"><i class="bi bi-bar-chart-line"></i> <b>Power: ${power.toFixed(2)} W</b></div>
      </div>
    `;

    // Sync relay toggle switch
    document.getElementById("relayToggle").checked = relayState === 1;
  }
});
