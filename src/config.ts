type ServerConfig = { host: string, port: number, path: string };

const defaultServerConfig: ServerConfig = {
  host: 'peekabookpeerserver.mhchia.com',  // A temporary peerjs-server
  port: 8000,
  path: '/myapp',
};

export { defaultServerConfig, ServerConfig };
