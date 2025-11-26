// script.js
const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt");
const cards = {};       // plugId -> DOM element
const latest = {};      // plugId -> {voltage, current, relay, timer}

client.on("connect", () => {
  console.log("MQTT connected");
  client.subscribe("smart/plug/data");
});

client.on("message", (topic, message) => {
  let data;
  try { data = JSON.parse(message.toString()); } catch (e) { return; }

  const id = data.plug;
  latest[id] = {
    voltage: data.voltage || 0,
    current: data.current || 0,
    relay: data.relay || 0,
    timer: data.timer || 0
  };

  if (!cards[id]) {
    const card = document.createElement("div");
    card.className = "plug-card";
    card.id = "plug-" + id;
    document.getElementById("plugs").appendChild(card);
    cards[id] = card;
  }

  const v = latest[id].voltage;
  const a = latest[id].current;
  const p = v * a;

  cards[id].innerHTML = `
    <h2>Plug ${id}</h2>
    <p class="value"><i class="bi bi-battery"></i> Voltage: ${v.toFixed(1)} V</p>
    <p class="value"><i class="bi bi-lightning"></i> Current: ${a.toFixed(3)} A</p>
    <p class="value"><i class="bi bi-power"></i> Relay: ${latest[id].relay === 1 ? "ON" : "OFF"}</p>
    <p class="value"><i class="bi bi-clock"></i> Timer: ${latest[id].timer} sec</p>
    <p class="value"><i class="bi bi-graph-up"></i> Power: ${p.toFixed(1)} W</p>
  `;

  // Update total power across all plugs
  let total = 0;
  Object.values(latest).forEach(d => total += (d.voltage * d.current));
  document.getElementById("total").innerHTML =
    `<i class="bi bi-graph-up-arrow"></i> Total Power: ${total.toFixed(1)} W`;
});
