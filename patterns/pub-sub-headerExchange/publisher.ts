import amqp from "amqplib";

const publishMessage = async () => {
  const connection = await amqp.connect("amqp://navi:navi1234@localhost:5672");
  const channel = await connection.createChannel();
  const exchange = "header_exchange";

  // Declare Headers Exchange
  await channel.assertExchange(exchange, "headers", { durable: true });

  console.log("Exchange is set up.");

  const messages = [
    {
      text: "Message 1 - Matches 2 headers",
      headers: { type: "notification", priority: "high", abc: "xyz" },
    },
    {
      text: "Message 2 - Matches all 3 headers",
      headers: { type: "notification", priority: "high" },
    },
    {
      text: "Message 3 - Matches 1 header only",
      headers: { type: "notification", priority: "high" },
    },
  ];

  for (const msg of messages) {
    channel.publish(exchange, "", Buffer.from(JSON.stringify(msg.text)), {
      headers: msg.headers,
    });
    console.log(`Published: ${msg.text}`);
  }

  await channel.close();
  await connection.close();
};

publishMessage().catch(console.error);
