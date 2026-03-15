import express from "express";
import { createServer as createViteServer } from "vite";
import http from 'http';
import { spawn } from 'node:child_process';

const terminalSessions = new Map<string, string>();

const PORT = parseInt(process.env.PORT || "3000", 10);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post('/api/terminal/exec', async (req, res) => {
    try {
      const {
        command,
        sessionId,
        cwd,
        timeoutMs = 20000,
      } = req.body as {
        command?: string;
        sessionId?: string;
        cwd?: string;
        timeoutMs?: number;
      };

      if (!command || !sessionId) {
        res.status(400).send('command and sessionId are required');
        return;
      }

      const workingDirectory = cwd || terminalSessions.get(sessionId) || process.cwd();
      const marker = '__AMO_PWD__=';
      const shell = process.platform === 'win32' ? 'cmd.exe' : 'sh';
      const shellArgs = process.platform === 'win32'
        ? ['/d', '/s', '/c', `${command} & echo ${marker}%cd%`]
        : ['-lc', `${command}; printf '\n${marker}%s' "$PWD"`];

      const child = spawn(shell, shellArgs, {
        cwd: workingDirectory,
        env: process.env,
      });

      let output = '';
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        output += chunk.toString();
      });

      const exitCode = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error('Terminal command timed out'));
        }, timeoutMs);

        child.on('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          resolve(code ?? 0);
        });
      });

      let nextCwd = workingDirectory;
      let cleanOutput = output.trim();
      const markerIndex = output.lastIndexOf(marker);
      if (markerIndex >= 0) {
        nextCwd = output.slice(markerIndex + marker.length).trim();
        cleanOutput = output.slice(0, markerIndex).trim();
      }

      terminalSessions.set(sessionId, nextCwd);

      res.json({
        command,
        output: cleanOutput,
        exitCode,
        cwd: nextCwd,
        sessionId,
      });
    } catch (error) {
      res.status(500).send(error instanceof Error ? error.message : 'Terminal request failed');
    }
  });

  const httpServer = http.createServer(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM — shutting down...');
    httpServer.close(() => {
      console.log('[Server] Done');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8_000);
  });
}

startServer();
