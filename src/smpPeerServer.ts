import { defaultPeerConfig } from './config';

import fs = require('fs');
import express = require('express');
import http = require('http');
import https = require('https');

// NOTE: Using `require` instead of `import` since something is wrong in the types of peer server
//  "node_modules/peer/index.d.ts:8:43 - error TS2709: "
//  "Cannot use namespace 'EventEmitter' as a type."
const expressPeerServer = require('peer').ExpressPeerServer;

const certDir = `${__dirname}/../certs`;
const keyPath = `${certDir}/privkey.pem`;
const certPath = `${certDir}/cert.pem`;
const errCodeFileNotFound = 'ENOENT';

function runServer(): void {
  let isSSLSupported;
  let key;
  let cert;

  try {
    key = fs.readFileSync(keyPath);
    cert = fs.readFileSync(certPath);
    isSSLSupported = true;
  } catch (err) {
    if (err.code === errCodeFileNotFound) {
      console.log("Couldn't find certs. Running without SSL...");
      isSSLSupported = false;
    } else {
      throw err;
    }
  }

  const app = express();

  let server: https.Server | http.Server;
  if (isSSLSupported) {
    server = https.createServer({ key, cert }, app);
  } else {
    server = http.createServer(app);
  }

  let peerServer;
  if (isSSLSupported) {
    // Sanity check
    if (key === undefined || cert === undefined) {
      throw new Error('key or cert is undefined, but we should have it loaded');
    }
    peerServer = expressPeerServer(server, {
      ssl: { key: key.toString('utf8'), cert: cert.toString('utf8') },
    });
  } else {
    peerServer = expressPeerServer(server);
  }

  // TODO: Confirm this is correct
  app.use(defaultPeerConfig.path, peerServer);

  // FIXME: Remove it later when we don't need debugging
  app.use('/', express.static('./demo/'));

  server.listen(defaultPeerConfig.port);

  peerServer.on('connection', (id: string) => {
    console.log(`A client connected : ${id}`);
  });

  peerServer.on('disconnect', (id: string) => {
    console.log(`A client say ~ bye bye : ${id}`);
  });
  // TODO: Listen to more events

  console.log('PeerServer is ready!');
}

runServer();
