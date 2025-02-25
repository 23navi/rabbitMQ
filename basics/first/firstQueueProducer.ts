import amqp from "amqplib";

const publishMessage = async () => {
  try {
    const connection = await amqp.connect(
      "amqp://navi:navi1234@localhost:5672"
    );
    const channel = await connection.createChannel();

    const exchange = "direct_logs";
    await channel.assertExchange(exchange, "direct", { durable: false });

    const logLevels = ["error", "info"];

    setInterval(() => {
      const logLevel = logLevels[Math.floor(Math.random() * logLevels.length)]; // Randomly select 'error' or 'info'
      const message = `Log message with level: ${logLevel}`;

      channel.publish(exchange, logLevel, Buffer.from(message));
      console.log(`Sent: ${message}`);
    }, 2);
  } catch (error) {
    console.error("Error in producer:", error);
  }
};

publishMessage();
