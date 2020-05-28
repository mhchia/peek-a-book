type TPeerConfig = { host: string; port: number; path: string; secure: boolean; debug?: number };

const defaultPeerConfig: TPeerConfig = {
  host: 'peekabookpeerserver.mhchia.com', // Our self-deployed peerjs-server
  port: 8000,
  path: '/myapp',
  secure: true,
  debug: 3, // Log more for debugging
};

export { defaultPeerConfig, TPeerConfig };
