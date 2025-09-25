import amqplib, { Channel, Connection } from "amqplib";

const QUEUE_NAME = "transactqueue";

class SampleProducer {
    async run() {
        console.log("--> Running producer");

        try {
            const connection: Connection = await amqplib.connect("amqp://localhost");
            const channel: Channel = await connection.createChannel();

            await channel.assertQueue(QUEUE_NAME, {
                durable: false,
                exclusive: false,
                autoDelete: false,
            });

            // Transaction begin (txSelect)
            await channel.txSelect();

            for (let i = 0; i <= 5; i++) {
                let message = `Hello World ${i}`;
                if (i === 5) {
                    message = `Final Message ${i}`;
                }
                channel.sendToQueue(QUEUE_NAME, Buffer.from(message));
                console.log(` [x] Sent '${message}'`);
                await new Promise((res) => setTimeout(res, 2000));
            }

            // Commit all published messages
            await channel.txCommit();

            await channel.close();
            await connection.close();
        } catch (err) {
            console.error("Producer error:", err);
        }
    }
}

class SampleConsumer {
    async run() {
        // Wait for producer to send messages first
        await new Promise((res) => setTimeout(res, 5000));
        console.log("--> Running consumer");

        try {
            const connection: Connection = await amqplib.connect("amqp://localhost");
            const channel: Channel = await connection.createChannel();

            await channel.assertQueue(QUEUE_NAME, {
                durable: false,
                exclusive: false,
                autoDelete: false,
            });

            console.log(" [*] Waiting for messages....");

            channel.consume(
                QUEUE_NAME,
                async (msg) => {
                    if (msg) {
                        await channel.txSelect();
                        const message = msg.content.toString();
                        console.log(` [x] Received '${message}'`);

                        channel.ack(msg);

                        if (message.startsWith("Final Message")) {
                            console.log(" [!] Rolling back transaction");
                            await channel.txRollback();
                            // Optionally: channel.cancel(msg.fields.consumerTag);
                        } else {
                            await channel.txCommit();
                        }
                    }
                },
                { noAck: false }
            );
        } catch (err) {
            console.error("Consumer error:", err);
        }
    }
}

(async () => {
    const producer = new SampleProducer();
    const consumer = new SampleConsumer();

    await Promise.all([producer.run(), consumer.run()]);

    console.log("Done");
})();
