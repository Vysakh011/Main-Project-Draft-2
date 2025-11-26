// MQTT client setup (example, adjust broker URL as needed)
const client = mqtt.connect("ws://broker.hivemq.com:8884/mqtt");

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker");
  client.subscribe("smart/plug/data");
});

client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    // Accept both formats: nested {data:{...}} or flat {...}
    const plugData = data.data || data;

    if (
      plugData.voltage !== undefined &&
      plugData.current !== undefined &&
      plugData.relay !== undefined
    ) {
      updatePlugUI(data.plug, plugData);
    } else {
      console.warn("⚠️ Unrecognized message format:", message.toString());
    }
  } catch (err) {
    console.error("❌ Error parsing message:", err);
  }
});

// Example UI update function
function updatePlugUI(plugId, plugData) {
  const container = document.getElementById("plugs");
  let card = document.getElementById(`plug-${plugId}`);

  if (!card) {
    card = document.createElement("div");
    card.className = "plug-card";
    card.id = `plug-${plugId}`;
    container.appendChild(card);
  }

  card.innerHTML = `
    <h2>Plug ${plugId}</h2>
    <p class="value"><i class="bi bi-battery"></i> Voltage: ${plugData.voltage} V</p>
    <p class="value"><i class="bi bi-lightning"></i> Current: ${plugData.current} A</p>
    <p class="value"><i class="bi bi-toggle-on"></i> Relay: ${plugData.relay ? "ON" : "OFF"}</p>
    <p class="value"><i class="bi bi-clock"></i> Timer: ${plugData.timer} s</p>
  `;

  // Update total power if you calculate it
  const totalCard = document.getElementById("total");
  const power = (plugData.voltage * plugData.current).toFixed(2);
  totalCard.innerHTML = `<i class="bi bi-graph-up-arrow"></i> Total Power: ${power} W`;
}
