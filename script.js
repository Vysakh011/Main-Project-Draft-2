// MQTT setup for browser (HiveMQ Public Broker)
const broker = 'wss://broker.hivemq.com:8884/mqtt';
const client = mqtt.connect(broker);

// Your topic must match the ESP8266 publish topic
// Example: "home/plug1/data"
const topics = ['smart/plug/data'];
const plugs = {};

client.on('connect', () => {
  console.log('✅ Connected to HiveMQ broker');
  topics.forEach(t => {
    client.subscribe(t, (err) => {
      if (!err) console.log(`📡 Subscribed to topic: ${t}`);
      else console.error('❌ Subscription error:', err);
    });
  });
});

client.on('message', (topic, message) => {
  try {
    const text = message.toString();
    console.log(`📨 Message received on ${topic}:`, text);

    // Expected format from ESP8266:
    // plug:1 voltage:234V current:0.05A
    const regex = /plug:(\d+)\s+voltage:(\d+(?:\.\d+)?)V\s+current:(\d+(?:\.\d+)?)A/;
    const match = text.match(regex);

    if (match) {
      const id = `Plug-${match[1]}`;
      const voltage = parseFloat(match[2]);
      const current = parseFloat(match[3]);
      const power = voltage * current;

      plugs[id] = { id, voltage, current, power };
      updateUI();
    } else {
      console.warn('⚠️ Unrecognized message format:', text);
    }
  } catch (err) {
    console.error('⚠️ Parse or process error:', err);
    console.error('Raw message:', message.toString());
  }
});

function updateUI() {
  const container = document.getElementById('plugs');
  container.innerHTML = '';

  let total = 0;

  for (const id in plugs) {
    const p = plugs[id];
    total += p.power;

    const card = `
      <div class="plug-card">
        <h2><i class="bi bi-plug-fill"></i> ${p.id}</h2>
        <div class="value"><i class="bi bi-lightning-charge"></i> Voltage: ${p.voltage.toFixed(2)} V</div>
        <div class="value"><i class="bi bi-current"></i> Current: ${p.current.toFixed(3)} A</div>
        <div class="value"><i class="bi bi-bar-chart-line"></i> <b>Power: ${p.power.toFixed(2)} W</b></div>
      </div>
    `;

    container.innerHTML += card;
  }

  document.getElementById('total').innerHTML =
    `<i class="bi bi-graph-up-arrow"></i> Total Power: ${total.toFixed(2)} W`;
}
