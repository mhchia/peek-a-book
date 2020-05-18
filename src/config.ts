type ServerConfig = { host: string, port: number, path: string };

const defaultServerConfig: ServerConfig = { host: 'localhost', port: 8000, path: '/myapp' };

export { defaultServerConfig, ServerConfig };
