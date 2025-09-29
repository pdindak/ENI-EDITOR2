import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import next from 'next';
import bodyParser from 'body-parser';
import { configureSessions, mountAuthRoutes } from './src/server/auth.js';
import { mountTlsRoutes } from './src/server/tls.js';
import { mountSshKeyRoutes } from './src/server/ssh-keys.js';
import { mountOpsRoutes } from './src/server/ops-routes.js';

const isDev = process.env.NODE_ENV !== 'production';
const httpPort = Number(process.env.HTTP_PORT || 8080);
const httpsPort = Number(process.env.HTTPS_PORT || 443);

// TLS configuration: supports PEM (crt/key) or PFX. All paths relative to process.cwd()
function loadTlsOptions() {
  const certDir = process.env.TLS_CERT_DIR || 'certs';
  const pfxPath = process.env.TLS_PFX_PATH || `${certDir}/server.pfx`;
  const keyPath = process.env.TLS_KEY_PATH || `${certDir}/server.key`;
  const certPath = process.env.TLS_CERT_PATH || `${certDir}/server.crt`;
  const caPath = process.env.TLS_CA_PATH || `${certDir}/chain.crt`;
  const passphrase = process.env.TLS_PASSPHRASE;

  const options = {};

  if (fs.existsSync(pfxPath)) {
    options.pfx = fs.readFileSync(pfxPath);
    if (passphrase) options.passphrase = passphrase;
    return options;
  }

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    options.key = fs.readFileSync(keyPath);
    options.cert = fs.readFileSync(certPath);
    if (fs.existsSync(caPath)) {
      options.ca = fs.readFileSync(caPath);
    }
    return options;
  }

  return null;
}

const serverDir = path.dirname(fileURLToPath(import.meta.url));

let httpsServer = null;

export async function start() {
  const app = next({ dev: isDev, dir: serverDir });
  await app.prepare();

  const server = express();
  server.use(bodyParser.json());
  configureSessions(server);
  mountAuthRoutes(server);

  // TLS management routes with hot-reload (must be before Next catch-all)
  const isSuperuserGuard = (req, res, nextFn) => {
    const u = req.session?.user;
    if (!u || u.role !== 'ENI-SUPERUSER') return res.status(403).json({ error: 'forbidden' });
    nextFn();
  };
  const reloadHttps = () => {
    try {
      const opts = loadTlsOptions();
      if (!opts) return;
      if (httpsServer) {
        httpsServer.close(() => {
          httpsServer = https.createServer(opts, server).listen(httpsPort, () => {
            console.log(`[ENI-Editor] HTTPS reloaded on :${httpsPort}`);
          });
        });
      } else {
        httpsServer = https.createServer(opts, server).listen(httpsPort, () => {
          console.log(`[ENI-Editor] HTTPS enabled on :${httpsPort}`);
        });
      }
    } catch (e) {
      console.error('Failed to reload HTTPS:', e);
    }
  };
  mountTlsRoutes(server, isSuperuserGuard, reloadHttps);
  mountSshKeyRoutes(server, isSuperuserGuard);
  mountOpsRoutes(server, isSuperuserGuard);

  // Example health endpoint for ops/monitoring
  server.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Hand off to Next for all other routes
  const handle = app.getRequestHandler();
  server.all('*', (req, res) => handle(req, res));

  // Always start HTTP on 8080
  http.createServer(server).listen(httpPort, () => {
    console.log(`[ENI-Editor] HTTP listening on :${httpPort}`);
  });

  // Start HTTPS on 443 if certs exist; otherwise log a notice
  const tlsOptions = loadTlsOptions();
  if (tlsOptions) {
    httpsServer = https.createServer(tlsOptions, server).listen(httpsPort, () => {
      console.log(`[ENI-Editor] HTTPS listening on :${httpsPort}`);
    });
  } else {
    console.warn('[ENI-Editor] No TLS cert found in ./certs (or env paths). HTTPS disabled.');
  }

}

// Only auto-start when executed directly (not when imported by Electron)
const thisFile = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === thisFile;
if (isMain) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
