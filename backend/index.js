import app from './app.js';

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});

server.on('error', (error) => {
  console.error('❌ Server startup error:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.warn('⚠️ SIGTERM ricevuto: chiusura server...');
  server.close(() => {
    process.exit(0);
  });
});