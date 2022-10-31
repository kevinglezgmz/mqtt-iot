// 'use strict';

// const redis = require('mqemitter-redis');

// let config = {
//   mqtt_port: 2883,
//   ws_port: 8888,
//   redis_port: 6379,
//   redis_host: '192.168.0.101',
//   redis_pass: 'carson',
//   redis_dbA: 0,
//   redis_dbB: 1
// };

// const mq = redis({
//   port: config.redis_port,
//   host: config.redis_host,
//   password: config.redis_pass,
//   db: config.redis_dbA,
//   family: 4
// });

// const persistence = require('aedes-persistence-redis')({
//   port: config.redis_port,
//   host: config.redis_host,
//   family: 4, // 4 (IPv4) or 6 (IPv6)
//   password: config.redis_pass,
//   db: config.redis_dbA,

//   maxSessionDelivery: 6000 // maximum offline messages deliverable on client CONNECT, default is 1000
//   // packetTTL: function (packet) { // offline message TTL, default is disabled
//   //  return 10; // seconds
// });

// let aedesOptions = {mq, persistence, concurrency: 200};

// let aedes = require('aedes')(aedesOptions);
// let server = require('net').createServer(aedes.handle);
// let ws = require('websocket-stream');

// server.listen(config.mqtt_port, function () {
//   console.log('MQTT server listening on port', config.mqtt_port);
// });

// ws.createServer({ server: server }, aedes.handle);

// server.listen(config.ws_port, function () {
//   console.log('WS server listening on port', config.ws_port);
// });

// aedes.on('client', function (client) {
//   console.log('new client', client.id);
// });

// aedes.on('connackSent', function (client) {
//   console.log('sent connack to %s', client.id);
// });

// aedes.on('subscribe', function (subscriptions, client) {
//   if (client) {
//     console.log('%s subscribe %s', subscriptions, client.id);
//   }
// });

// aedes.on('clientError', function (client, err) {
//   console.log('client error', client.id, err.message, err.stack);
// });

// aedes.on('connectionError', function (client, err) {
//   console.log('client error: client: %s, error: %s', client.id, err.message);
// });

// aedes.on('publish', function (packet, client) {
//   if (client) {
//     console.log('%s : topic %s : %s', client.id, packet.topic, packet.payload);
//   }
// });

// aedes.on('ack', function (message, client) {
//   console.log('%s ack\'d message', client.id);
// });

// aedes.on('clientDisconnect', function (client) {
//   console.log('%s disconnected', client.id);
// });

"use strict";

const aedes = require("aedes");
const mqemitter = require("mqemitter");
const persistence = require("aedes-persistence");
const mqttPacket = require("mqtt-packet");

const brokerPort = 4883;

function startAedes() {
  const broker = aedes({
    mq: mqemitter({
      concurrency: 100,
    }),
    persistence: persistence(),
    preConnect: function (client, packet, done) {
      console.log("Aedes preConnect check client ip:", client.connDetails);
      if (client.connDetails && client.connDetails.ipAddress) {
        client.ip = client.connDetails.ipAddress;
      }
      client.close();
      return done(null, true);
    },
  });

  const server = require("net").createServer(broker.handle);
  const server2 = require("net").createServer(broker.handle);
  let ws = require("websocket-stream");
  ws.createServer({ server: server2 }, aedes.handle);

  server.listen(process.env.PORT, "localhost", function () {
    console.log("Aedes listening on :", server.address());
    broker.publish({ topic: "aedes/hello", payload: "I'm broker " + broker.id });
  });

  server2.listen(4884, "localhost", function () {
    console.log("Aedes listening on :", server2.address());
    broker.publish({ topic: "aedes/hello", payload: "I'm broker " + broker.id });
  });

  broker.on("subscribe", function (subscriptions, client) {
    console.log(
      "MQTT client \x1b[32m" +
        (client ? client.id : client) +
        "\x1b[0m subscribed to topics: " +
        subscriptions.map((s) => s.topic).join("\n"),
      "from broker",
      broker.id
    );
  });

  broker.on("unsubscribe", function (subscriptions, client) {
    console.log(
      "MQTT client \x1b[32m" + (client ? client.id : client) + "\x1b[0m unsubscribed to topics: " + subscriptions.join("\n"),
      "from broker",
      broker.id
    );
  });

  // fired when a client connects
  broker.on("client", function (client) {
    console.log(
      "Client Connected: \x1b[33m" + (client ? client.id : client) + " ip  " + (client ? client.ip : null) + "\x1b[0m",
      "to broker",
      broker.id
    );
  });

  // fired when a client disconnects
  broker.on("clientDisconnect", function (client) {
    console.log("Client Disconnected: \x1b[31m" + (client ? client.id : client) + "\x1b[0m", "to broker", broker.id);
  });

  // fired when a message is published
  broker.on("publish", async function (packet, client) {
    console.log(
      "Client \x1b[31m" + (client ? client.id : "BROKER_" + broker.id) + "\x1b[0m has published",
      packet.payload.toString(),
      "on",
      packet.topic,
      "to broker",
      broker.id
    );
  });
}

startAedes();
