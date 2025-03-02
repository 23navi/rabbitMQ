import amqp from "amqplib";

const consumeMessages = async () => {
  const connection = await amqp.connect("amqp://navi:navi1234@localhost:5672");
  const channel = await connection.createChannel();

  const exchange = "header_exchange";
  const queue = "header_queue";

  // Declare Headers Exchange
  await channel.assertExchange(exchange, "headers", { durable: true });

  // Declare Queue
  await channel.assertQueue(queue, { durable: true });

  // Bind Queue with Headers (x-match: all means all headers must match)
  await channel.bindQueue(queue, exchange, "", {
    "x-match": "all", // Change to 'any' if at least one header should match
    type: "notification",
    priority: "high",
  });

  console.log(" Queue is set up.");

  console.log(`Waiting for messages in ${queue}...`);

  channel.consume(queue, (msg) => {
    if (msg) {
      console.log(`✅ Received: ${msg.content.toString()}`);
      channel.ack(msg);
    }
  });
};

consumeMessages().catch(console.error);
