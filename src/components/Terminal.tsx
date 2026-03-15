import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';

import { terminalService } from '../services/terminalService';

interface TerminalProps {
  sessionId?: string;
}

const PROMPT = '$ ';

export const Terminal: React.FC<TerminalProps> = ({
  sessionId,
}) => {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const resolvedSessionIdRef = useRef(sessionId ?? crypto.randomUUID());
  const bufferRef = useRef('');
  const cwdRef = useRef('');
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      lineHeight: 1.35,
      theme: {
        background: '#050505',
        foreground: '#f5f5f5',
        cursor: '#ff4e00',
        selectionBackground: 'rgba(255, 78, 0, 0.22)',
      },
    });
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    term.writeln('Amo Terminal');
    term.writeln('Real command execution is enabled for this session.');
    term.writeln('Shortcuts: `clear`, `pwd`, `cd <dir>`, arrows for history.');
    term.writeln('');
    term.write(PROMPT);

    const redrawInput = (value: string) => {
      term.write('\r\x1b[2K');
      term.write(PROMPT + value);
    };

    const execute = async (command: string) => {
      if (!command.trim()) {
        term.write('\r\n' + PROMPT);
        return;
      }

      if (command.trim() === 'clear') {
        term.clear();
        term.write(PROMPT);
        return;
      }

      busyRef.current = true;
      term.write('\r\n');

      try {
        const result = await terminalService.exec({
          command,
          sessionId: resolvedSessionIdRef.current,
          cwd: cwdRef.current || undefined,
          timeoutMs: 20000,
        });

        cwdRef.current = result.cwd;

        if (result.output) {
          result.output.split(/\r?\n/).forEach((line) => term.writeln(line));
        }

        if (result.exitCode !== 0) {
          term.writeln(`[exit ${result.exitCode}]`);
        }
      } catch (error) {
        term.writeln(error instanceof Error ? error.message : 'Command failed');
      } finally {
        busyRef.current = false;
        term.write(PROMPT);
      }
    };

    const onData = (data: string) => {
      if (busyRef.current) {
        return;
      }

      if (data === '\r') {
        const command = bufferRef.current;
        if (command.trim()) {
          historyRef.current.push(command);
        }
        historyIndexRef.current = historyRef.current.length;
        bufferRef.current = '';
        void execute(command);
        return;
      }

      if (data === '\u0003') {
        bufferRef.current = '';
        term.write('^C\r\n' + PROMPT);
        return;
      }

      if (data === '\u007F') {
        if (bufferRef.current.length > 0) {
          bufferRef.current = bufferRef.current.slice(0, -1);
          redrawInput(bufferRef.current);
        }
        return;
      }

      if (data === '\u001b[A') {
        if (historyRef.current.length === 0) {
          return;
        }
        historyIndexRef.current = Math.max(0, historyIndexRef.current - 1);
        bufferRef.current = historyRef.current[historyIndexRef.current] || '';
        redrawInput(bufferRef.current);
        return;
      }

      if (data === '\u001b[B') {
        if (historyRef.current.length === 0) {
          return;
        }
        historyIndexRef.current = Math.min(historyRef.current.length, historyIndexRef.current + 1);
        bufferRef.current = historyRef.current[historyIndexRef.current] || '';
        redrawInput(bufferRef.current);
        return;
      }

      if (data >= ' ') {
        bufferRef.current += data;
        term.write(data);
      }
    };

    const disposable = term.onData(onData);

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      disposable.dispose();
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return <div ref={terminalRef} className="h-full w-full" />;
};
