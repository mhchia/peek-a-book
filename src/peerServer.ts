import express = require('express');

import { defaultServerConfig } from "./config";

const app = express();
const expressPeerServer = require('peer').ExpressPeerServer;
const server = app.listen(defaultServerConfig.port);

const peerServer = expressPeerServer(server);

app.use(defaultServerConfig.path, peerServer);

app.use("/", express.static('./static/'));

peerServer.on('connection', (id: any) => {
    console.log(`A client connected : ${id}`);
})

peerServer.on('disconnect', (id: any) => {
    console.log(`A client say ~ bye bye : ${id}`);
});
