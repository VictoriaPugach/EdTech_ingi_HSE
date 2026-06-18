import { useCallback, useRef, useState } from 'react';

/**
 * Запуск Python прямо в браузере через Pyodide (WebAssembly).
 *
 * Почему так: исполнять детский код на сервере — риск (нужна песочница);
 * Pyodide исполняет его в изолированной WASM-среде на клиенте, без бэкенда.
 * Рантайм (~10 МБ) грузится с CDN ЛЕНИВО — только при первом «Запустить»,
 * поэтому не утяжеляет загрузку страницы.
 */

const PYODIDE_VERSION = 'v0.26.4';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

let scriptPromise: Promise<void> | null = null;

function ensurePyodideScript(): Promise<void> {
  if (window.loadPyodide) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${PYODIDE_BASE}pyodide.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Не удалось загрузить Python-рантайм'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export interface PythonRunner {
  /** Текст вывода (stdout+stderr) или null, если ещё не запускали. */
  output: string | null;
  /** Идёт ли загрузка рантайма / выполнение. */
  running: boolean;
  /** true пока грузится Pyodide в первый раз. */
  loading: boolean;
  run: (code: string) => Promise<void>;
  clear: () => void;
}

export function usePythonRunner(): PythonRunner {
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const pyRef = useRef<PyodideInterface | null>(null);

  const run = useCallback(async (code: string) => {
    setRunning(true);
    try {
      if (!pyRef.current) {
        setLoading(true);
        setOutput('Загрузка Python… (первый запуск может занять несколько секунд)');
        await ensurePyodideScript();
        pyRef.current = await window.loadPyodide!({ indexURL: PYODIDE_BASE });
        setLoading(false);
      }
      const py = pyRef.current;
      let buf = '';
      py.setStdout({ batched: (s) => { buf += `${s}\n`; } });
      py.setStderr({ batched: (s) => { buf += `${s}\n`; } });
      setOutput('');
      await py.runPythonAsync(code);
      setOutput(buf.length ? buf : '(программа выполнилась без вывода)');
    } catch (e) {
      setOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setOutput(null), []);

  return { output, running, loading, run, clear };
}
