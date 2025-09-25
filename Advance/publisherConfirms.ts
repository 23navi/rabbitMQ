import amqplib, { Channel, ConfirmChannel, Connection } from "amqplib";

const QUEUE_NAME = "pub_confirms_queue";
const MESSAGE_COUNT = 50_000;

async function createConnection(): Promise<Connection> {
  return amqplib.connect({
    protocol: "amqp",
    hostname: "localhost",
    username: "guest",
    password: "guest",
  });
}

// -------------------- Individual Confirms --------------------
async function publishMessagesIndividually(isPubConfEnabled: boolean) {
  const connection = await createConnection();
  const channel: Channel | ConfirmChannel = isPubConfEnabled
    ? await connection.createConfirmChannel()
    : await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: false, autoDelete: true });

  const start = Date.now();
  for (let i = 0; i <= MESSAGE_COUNT; i++) {
    const message = String(i);
    if (isPubConfEnabled) {
      await new Promise<void>((resolve, reject) => {
        (channel as ConfirmChannel).sendToQueue(
          QUEUE_NAME,
          Buffer.from(message),
          {},
          (err, ok) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } else {
      channel.sendToQueue(QUEUE_NAME, Buffer.from(message));
    }
  }
  const end = Date.now();
  console.log(
    `Published ${MESSAGE_COUNT} messages${
      isPubConfEnabled ? " with confirms" : ""
    } in ${end - start} ms`
  );

  await channel.close();
  await connection.close();
}

// -------------------- Batch Confirms --------------------
async function publishMessagesInBatch(batchSize = 100) {
  const connection = await createConnection();
  const channel = await connection.createConfirmChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: false, autoDelete: true });

  let outstanding = 0;
  const start = Date.now();
  for (let i = 0; i < MESSAGE_COUNT; i++) {
    const message = String(i);
    channel.sendToQueue(QUEUE_NAME, Buffer.from(message));
    outstanding++;

    if (outstanding === batchSize) {
      await channel.waitForConfirms();
      outstanding = 0;
    }
  }
  if (outstanding > 0) await channel.waitForConfirms();
  const end = Date.now();
  console.log(`Published ${MESSAGE_COUNT} messages in batch in ${end - start} ms`);

  await channel.close();
  await connection.close();
}

// -------------------- Asynchronous Confirms --------------------
async function handlePublishConfirmsAsynchronously() {
  const connection = await createConnection();
  const channel = await connection.createConfirmChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: false, autoDelete: true });

  const outstandingConfirms = new Map<number, string>();

  // RabbitMQ doesn't provide native sequence number callback in JS,
  // so we rely on the callback from sendToQueue
  const start = Date.now();

  for (let i = 0; i < MESSAGE_COUNT; i++) {
    const message = String(i);
    const seqNo = channel.publish("", QUEUE_NAME, Buffer.from(message), {}, (err) => {
      if (err) {
        console.error(`Message "${message}" was NACKed`);
      }
      outstandingConfirms.delete(seqNo);
    });
    outstandingConfirms.set(seqNo, message);
  }

  // Wait until all confirms are processed (simple polling)
  const timeout = Date.now() + 60_000; // 60 seconds
  while (outstandingConfirms.size > 0 && Date.now() < timeout) {
    await new Promise((res) => setTimeout(res, 100));
  }

  if (outstandingConfirms.size > 0) {
    throw new Error("All messages could not be confirmed in 60 seconds");
  }

  const end = Date.now();
  console.log(
    `Published ${MESSAGE_COUNT} messages and handled confirms asynchronously in ${
      end - start
    } ms`
  );

  await channel.close();
  await connection.close();
}

// -------------------- Main --------------------
(async () => {
  await publishMessagesIndividually(false);
  await publishMessagesIndividually(true);
  await publishMessagesInBatch();
  await handlePublishConfirmsAsynchronously();

  console.log("Done");
})();
