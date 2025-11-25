const broker = 'wss://broker.hivemq.com:8884/mqtt';
const client = mqtt.connect(broker);

const plugId = new URLSearchParams(location.search).get('plug');
const topic = 'smart/plug/data';

client.on('connect', () => {
  console.log('✅ Connected to broker');
  client.subscribe(topic);
});

client.on('message', (t, message) => {
  const text = message.toString();
  const regex = /plug:(\d+)\s+voltage:(\d+(?:\.\d+)?)V\s+current:(\d+(?:\.\d+)?)A/;
  const match = text.match(regex);

  if (match && match[1] === plugId) {
    const voltage = parseFloat(match[2]);
    const current = parseFloat(match[3]);
    const power = voltage * current;

    document.getElementById('plugData').innerHTML = `
      <div class="plug-card">
        <h2>Plug-${plugId}</h2>
        <div class="value">Voltage: ${voltage.toFixed(2)} V</div>
        <div class="value">Current: ${current.toFixed(3)} A</div>
        <div class="value"><b>Power: ${power.toFixed(2)} W</b></div>
      </div>
    `;
  }
});

function sendCommand(cmd) {
  const payload = JSON.stringify({ plug: parseInt(plugId), cmd });
  client.publish('smart/plug/cmd', payload);
  console.log("Sent:", payload);
}

function sendTimer() {
  const sec = parseInt(document.getElementById('timerInput').value);
  if (!isNaN(sec) && sec > 0) {
    const payload = JSON.stringify({ plug: parseInt(plugId), cmd: 'timer', seconds: sec });
    client.publish('smart/plug/cmd', payload);
    console.log("Sent:", payload);
  }
}
