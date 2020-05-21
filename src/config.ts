type ServerConfig = { host: string, port: number, path: string, debug?: number};

const defaultServerConfig: ServerConfig = {
  host: 'peekabookpeerserver.mhchia.com',  // A temporary peerjs-server
  port: 8000,
  path: '/myapp',
  debug: 3,  // Log more for debugging
};

export { defaultServerConfig, ServerConfig };
