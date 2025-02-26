import amqp from "amqplib";

const checkQueueSize = async () => {
  const conn = await amqp.connect("amqp://navi:navi1234@localhost:5672");
  const channel = await conn.createChannel();
  const queue = "info_logs";

  const res = await channel.checkQueue(queue);

  console.log({ res });
  console.log(`Queue size: ${res.messageCount}`);

  await channel.close();
  await conn.close();

  return res.messageCount;
};

checkQueueSize();
