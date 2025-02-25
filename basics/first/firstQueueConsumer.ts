import amqp from "amqplib";

const setup = async () => {
  try {
    const connection = await amqp.connect(
      "amqp://navi:navi1234@localhost:5672"
    );
    const channel = await connection.createChannel();

    const exchange = "direct_logs";

    // Declare the exchange
    await channel.assertExchange(exchange, "direct", { durable: false });

    // Declare queues
    const { queue: errorQueue } = await channel.assertQueue("error_logs", {
      durable: false,
    });
    const { queue: infoQueue } = await channel.assertQueue("info_logs", {
      durable: false,
    });

    // Bind queues with specific routing keys
    await channel.bindQueue(errorQueue, exchange, "error");
    await channel.bindQueue(infoQueue, exchange, "info");

    console.log("Queues bound to exchange with routing keys");

    // Consume messages from the error_logs queue
    channel.consume(
      errorQueue,
      (msg) => {
        if (msg) {
          console.log(`Received from error_logs: ${msg.content.toString()}`);
          channel.ack(msg); // Acknowledge message
        }
      },
      { noAck: false } // Ensures messages are acknowledged manually
    );

    // Consume messages from the info_logs queue
    channel.consume(
      infoQueue,
      (msg) => {
        if (msg) {
          console.log(`Received from info_logs: ${msg.content.toString()}`);
          channel.ack(msg);
        }
      },
      { noAck: false }
    );

    console.log("Waiting for messages...");
  } catch (error) {
    console.error("Error setting up RabbitMQ:", error);
  }
};

setup();
