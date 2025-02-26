import amqplib, { Connection, Channel } from "amqplib";

const queue = "task_queue";

let counter = 0;

let connection: Connection;
let channel: Channel;

const sendTask = async () => {
  try {
    await channel.assertQueue(queue, { durable: true });

    setInterval(() => {
      const msg = `Task ${(counter += 1)}`;
      channel.sendToQueue(queue, Buffer.from(msg), { persistent: true });
      console.log(`[x] Sent: ${msg}`);
    }, 100);
  } catch (error) {
    console.error("Error:", error);
  }
};

(async () => {
  try {
    connection = await amqplib.connect("amqp://navi:navi1234@localhost:5672");
    channel = await connection.createChannel();
    sendTask();
  } catch (error) {
    console.error("Error:", error);
  }
})();
