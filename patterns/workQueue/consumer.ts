import amqplib from "amqplib";

const queue = "task_queue";
const NUM_CONSUMERS = 20;

const startWorker = async (id: number) => {
  try {
    const connection = await amqplib.connect(
      "amqp://navi:navi1234@localhost:5672"
    );
    const channel = await connection.createChannel();

    await channel.assertQueue(queue, { durable: true });

    channel.prefetch(1); // Ensure fair dispatch

    console.log(`[Worker ${id}] Waiting for messages...`);

    channel.consume(
      queue,
      (msg) => {
        if (msg !== null) {
          const messageContent = msg.content.toString();
          console.log(`[Worker ${id}] Received: ${messageContent}`);

          setTimeout(() => {
            console.log(`[Worker ${id}] Processed: ${messageContent}`);
            channel.ack(msg);
          }, Math.random() * 2000); // Simulate processing time
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error(`[Worker ${id}] Error:`, error);
  }
};

// Start multiple consumers in parallel
(async () => {
  await Promise.all(
    Array.from({ length: NUM_CONSUMERS }, (_, i) => startWorker(i + 1))
  );
})();
