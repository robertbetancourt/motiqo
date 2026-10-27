import http from 'http';
import net from 'net';

const TARGET_PORT = 3014;
const TARGET_HOST = '127.0.0.1';
const PROXY_PORT = 3000;

const server = http.createServer((req, res) => {
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${TARGET_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy error connecting to Motiqo dev server: ' + err.message);
  });

  req.pipe(proxyReq, { end: true });
});

// Support WebSockets / HMR upgrades
server.on('upgrade', (req, socket, head) => {
  const proxySocket = net.connect(TARGET_PORT, TARGET_HOST, () => {
    proxySocket.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
      Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    if (head && head.length) proxySocket.write(head);
    socket.pipe(proxySocket);
    proxySocket.pipe(socket);
  });

  proxySocket.on('error', () => {
    socket.destroy();
  });
  socket.on('error', () => {
    proxySocket.destroy();
  });
});

server.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`Port proxy running on http://127.0.0.1:${PROXY_PORT} -> http://127.0.0.1:${TARGET_PORT}`);
});
