import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';

interface TerminalSession {
  id: string;
  cwd: string;
  running: boolean;
}

interface NativeTerminalPlugin {
  createSession(options: { sessionId: string; cwd?: string }): Promise<{ sessionId: string; cwd: string; output: string; success: boolean }>;
  write(options: { sessionId: string; data: string }): Promise<{ sessionId: string; output: string; cwd: string; success: boolean }>;
  read(options: { sessionId: string }): Promise<{ sessionId: string; output: string; cwd: string; running: boolean }>;
  resize(options: { sessionId: string; cols: number; rows: number }): Promise<{ sessionId: string; cols: number; rows: number; success: boolean }>;
  destroySession(options: { sessionId: string }): Promise<{ sessionId: string; success: boolean }>;
  exec(options: { command: string; sessionId: string; cwd?: string; timeoutMs?: number }): Promise<{ command: string; output: string; exitCode: number; cwd: string; sessionId: string }>;
}

declare global {
  interface Window {
    Capacitor?: {
      Plugins?: Record<string, any>;
    };
  }
}

const getNativeTerminal = (): NativeTerminalPlugin | null => {
  if (window.Capacitor?.Plugins?.NativeTerminal) {
    return window.Capacitor.Plugins.NativeTerminal as NativeTerminalPlugin;
  }
  return null;
};

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionRef = useRef<TerminalSession | null>(null);
  const readIntervalRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const promptShownRef = useRef(false);
  const inputBufferRef = useRef<string>('');
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const initTerminal = useCallback(async () => {
    if (!terminalRef.current || isInitializedRef.current) return;
    isInitializedRef.current = true;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 14,
      fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
      lineHeight: 1.2,
      theme: {
        background: '#0a0a0f',
        foreground: '#e4e4e7',
        cursor: '#ff4e00',
        cursorAccent: '#0a0a0f',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#71717a',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Write welcome message
    term.writeln('\x1b[1;36m╔════════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;36m║          \x1b[1;37mAmo Terminal v2.0\x1b[1;36m                      ║\x1b[0m');
    term.writeln('\x1b[1;36m║          \x1b[2mFull PTY shell session\x1b[0m              ║\x1b[0m');
    term.writeln('\x1b[1;36m╚════════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');

    // Create session
    await createSession(term);

    // Handle input - pass raw data to PTY
    term.onData((data) => {
      const session = sessionRef.current;
      if (!session?.running) return;

      const native = getNativeTerminal();
      
      if (native) {
        // Raw mode - send each keystroke to PTY
        writeToSession(data);
      } else {
        // Web fallback - local echo
        handleLocalInput(data);
      }
    });

    // Handle resize
    term.onResize(({ cols, rows }) => {
      if (sessionRef.current?.running) {
        resizeSession(cols, rows);
      }
    });

    // Refit when the terminal becomes visible (view switch)
    const observer = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        // Ignore fit errors when hidden
      }
    });
    if (terminalRef.current) {
      observer.observe(terminalRef.current);
    }

    return () => {
      observer.disconnect();
      destroySession();
      term.dispose();
      isInitializedRef.current = false;
    };
  }, []);

  const handleLocalInput = (data: string) => {
    const term = termRef.current;
    if (!term) return;

    if (data === '\r') {
      // Enter
      const command = inputBufferRef.current;
      if (command.trim()) {
        historyRef.current.push(command);
        historyIndexRef.current = historyRef.current.length;
      }
      term.write('\r\n');
      inputBufferRef.current = '';
      // Execute command
      executeWebCommand(command);
      return;
    }

    if (data === '\x03') {
      // Ctrl+C
      inputBufferRef.current = '';
      term.write('^C\r\n');
      return;
    }

    if (data === '\x7f') {
      // Backspace
      if (inputBufferRef.current.length > 0) {
        inputBufferRef.current = inputBufferRef.current.slice(0, -1);
        term.write('\b \b');
      }
      return;
    }

    if (data === '\x1b[A') {
      // Up arrow - history
      if (historyRef.current.length === 0) return;
      if (historyIndexRef.current > 0) {
        historyIndexRef.current--;
      }
      const hist = historyRef.current[historyIndexRef.current] || '';
      // Redraw line
      term.write('\r\x1b[2K');
      term.write('$ ' + hist);
      inputBufferRef.current = hist;
      return;
    }

    if (data === '\x1b[B') {
      // Down arrow
      if (historyRef.current.length === 0) return;
      if (historyIndexRef.current < historyRef.current.length) {
        historyIndexRef.current++;
      }
      const hist = historyRef.current[historyIndexRef.current] || '';
      term.write('\r\x1b[2K');
      term.write('$ ' + hist);
      inputBufferRef.current = hist;
      return;
    }

    if (data === '\x0c') {
      // Ctrl+L - clear
      term.clear();
      return;
    }

    if (data === '\x12') {
      // Ctrl+R - search (basic)
      return;
    }

    if (data >= ' ' || data === '\t') {
      inputBufferRef.current += data;
      term.write(data);
    }
  };

  const executeWebCommand = async (command: string) => {
    const term = termRef.current;
    if (!term) return;

    if (!command.trim()) {
      term.write('$ ');
      return;
    }

    if (command.trim() === 'clear' || command.trim() === 'cls') {
      term.clear();
      return;
    }

    if (command.trim() === 'exit') {
      term.writeln('\x1b[33mUse the reconnect button to start a new session\x1b[0m');
      term.write('$ ');
      return;
    }

    // Simple built-in commands
    if (command === 'help') {
      term.writeln('Available commands: help, clear, pwd, cd, ls, cat, echo');
      term.writeln('Full shell requires Android native terminal');
      term.write('$ ');
      return;
    }

    if (command.startsWith('echo ')) {
      term.writeln(command.slice(5));
      term.write('$ ');
      return;
    }

    if (command === 'pwd') {
      term.writeln(sessionRef.current?.cwd || '/');
      term.write('$ ');
      return;
    }

    term.writeln(`\x1b[31mCommand not found: ${command}\x1b[0m`);
    term.writeln('Type \x1b[33mhelp\x1b[0m for available commands');
    term.write('$ ');
  };

  const createSession = async (term?: XTerm) => {
    const terminal = term || termRef.current;
    if (!terminal) return;

    const native = getNativeTerminal();
    const sessionId = `amo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      setConnectionError(null);
      
      if (native) {
        // Use native PTY session
        const result = await native.createSession({ sessionId });
        sessionRef.current = { id: result.sessionId, cwd: result.cwd, running: result.success };
        setIsConnected(result.success);
        
        if (result.output) {
          terminal.write(result.output);
          promptShownRef.current = true;
        }

        // Start reading output in background
        startOutputReader();
      } else {
        // Fallback to web terminal emulation
        terminal.writeln('\x1b[33m[Web Mode]\x1b[0m Limited terminal emulation');
        terminal.writeln('For full shell, run on Android device');
        terminal.writeln('');

        sessionRef.current = { 
          id: sessionId, 
          cwd: '/', 
          running: true 
        };
        setIsConnected(true);
        
        terminal.write('$ ');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to connect';
      setConnectionError(msg);
      terminal.writeln(`\x1b[31mError: ${msg}\x1b[0m`);
      sessionRef.current = { id: sessionId, cwd: '/', running: false };
      setIsConnected(false);
    }
  };

  const writeToSession = async (data: string) => {
    const session = sessionRef.current;
    const native = getNativeTerminal();
    if (!session || !native) return;

    try {
      const result = await native.write({ sessionId: session.id, data });
      
      if (result.output) {
        const term = termRef.current;
        if (term) {
          term.write(result.output);
        }
      }
      
      if (result.cwd !== session.cwd) {
        session.cwd = result.cwd;
      }
    } catch (error) {
      // Session might have ended
      session.running = false;
      setIsConnected(false);
    }
  };

  const startOutputReader = () => {
    if (readIntervalRef.current) return;

    const readOutput = async () => {
      const session = sessionRef.current;
      const term = termRef.current;
      const native = getNativeTerminal();
      
      if (!session || !term || !session.running) {
        if (readIntervalRef.current) {
          clearInterval(readIntervalRef.current);
          readIntervalRef.current = null;
        }
        return;
      }

      try {
        if (native) {
          const result = await native.read({ sessionId: session.id });
          
          if (result.output) {
            term.write(result.output);
            promptShownRef.current = true;
          }
          
          if (result.cwd !== session.cwd) {
            session.cwd = result.cwd;
          }
          
          if (!result.running && session.running) {
            session.running = false;
            setIsConnected(false);
            term.writeln('\r\n\x1b[31m[Session Ended]\x1b[0m');
            clearInterval(readIntervalRef.current!);
            readIntervalRef.current = null;
          }
        }
      } catch (error) {
        if (session.running) {
          session.running = false;
          setIsConnected(false);
          clearInterval(readIntervalRef.current!);
          readIntervalRef.current = null;
        }
      }
    };

    // Poll for output every 30ms for responsive PTY
    readIntervalRef.current = window.setInterval(readOutput, 30);
  };

  const resizeSession = async (cols: number, rows: number) => {
    const session = sessionRef.current;
    const native = getNativeTerminal();
    
    if (session && native) {
      try {
        await native.resize({ sessionId: session.id, cols, rows });
      } catch (e) {
        // Ignore resize errors
      }
    }
  };

  const destroySession = async () => {
    const session = sessionRef.current;
    const native = getNativeTerminal();

    if (readIntervalRef.current) {
      clearInterval(readIntervalRef.current);
      readIntervalRef.current = null;
    }

    if (session && native) {
      try {
        await native.destroySession({ sessionId: session.id });
      } catch (e) {
        // Ignore destroy errors
      }
    }

    sessionRef.current = null;
    setIsConnected(false);
  };

  const handleReconnect = () => {
    destroySession();
    if (termRef.current) {
      termRef.current.clear();
      termRef.current.writeln('\x1b[33mReconnecting...\x1b[0m\r\n');
    }
    createSession();
  };

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    
    initTerminal().then(cleanup => {
      cleanupFn = cleanup;
    }).catch(() => {});

    return () => {
      cleanupFn?.();
      if (readIntervalRef.current) {
        clearInterval(readIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-[#0a0a0f]">
      {/* Connection status bar */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-[#18181b] border-b border-white/10 flex items-center justify-between px-3 text-xs z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-white/60">
            {isConnected ? 'Connected' : connectionError ? 'Error' : 'Connecting...'}
          </span>
          {sessionRef.current?.cwd && (
            <span className="text-white/40 ml-2">{sessionRef.current.cwd}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <button
              onClick={handleReconnect}
              className="text-[#ff4e00] hover:text-[#ff6b33] transition-colors"
            >
              Reconnect
            </button>
          )}
          <span className="text-white/30">Ctrl+C interrupt</span>
        </div>
      </div>

      {/* Terminal container */}
      <div 
        ref={terminalRef} 
        className="h-full w-full"
      />
    </div>
  );
}
