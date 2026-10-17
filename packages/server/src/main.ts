import { startServer } from './server';

// In dev the port is fixed (Vite proxies /ws to it); PORT may belong to another tool.
const PORT = process.argv.includes('--dev') ? 8787 : Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? '0.0.0.0';
const log = (msg: string) => console.log(`[balik] ${msg}`);

const server = await startServer({ port: PORT, host: HOST, log });
log(`listening on http://localhost:${server.port} (ws: /ws)`);

const shutdown = () => {
  void server.close().then(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
