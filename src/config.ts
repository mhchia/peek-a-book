type ServerConfig = { host: string, port: number, path: string };

const defaultServerConfig: ServerConfig = {
  host: '18.180.165.244',  // A temporary peerjs-server
  port: 8000,
  path: '/myapp',
};

export { defaultServerConfig, ServerConfig };
