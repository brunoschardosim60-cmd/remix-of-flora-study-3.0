/**
 * logger.ts — wrapper que silencia logs verbosos em produção.
 *
 * Uso: `import { logger } from "@/lib/logger";`
 * - `logger.log/info/debug` → só aparecem em DEV.
 * - `logger.warn/error` → sempre passam (úteis pra Sentry/console em prod).
 */

const isDev = !!(import.meta as any).env?.DEV;

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

export const logger = {
  log: (isDev ? console.log.bind(console) : noop) as LogFn,
  info: (isDev ? console.info.bind(console) : noop) as LogFn,
  debug: (isDev ? console.debug.bind(console) : noop) as LogFn,
  warn: console.warn.bind(console) as LogFn,
  error: console.error.bind(console) as LogFn,
};

export default logger;