import type { ObservabilityConfig, LoggingConfig } from '../types/config.js';

const VALID_LEVELS: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error'];
const VALID_FORMATS: LoggingConfig['format'][] = ['json', 'text'];

async function appendToFile(destination: string, data: string): Promise<void> {
  try {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(destination, data);
  } catch {
    console.error(`Logger: failed to write to ${destination}`);
  }
}

export class Logger {
  private level: 'debug' | 'info' | 'warn' | 'error';
  private format: 'json' | 'text';
  private destination?: string;

  constructor(config?: ObservabilityConfig) {
    const level = config?.logging?.level ?? 'info';
    const format = config?.logging?.format ?? 'text';

    if (!VALID_LEVELS.includes(level)) {
      throw new Error(`Invalid log level: ${level}. Must be one of: ${VALID_LEVELS.join(', ')}`);
    }
    if (!VALID_FORMATS.includes(format)) {
      throw new Error(`Invalid log format: ${format}. Must be one of: ${VALID_FORMATS.join(', ')}`);
    }

    this.level = level;
    this.format = format;
    this.destination = config?.logging?.destination;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta).catch((err: unknown) => {
      console.error('Logger write failed:', err instanceof Error ? err.message : err);
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta).catch((err: unknown) => {
      console.error('Logger write failed:', err instanceof Error ? err.message : err);
    });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta).catch((err: unknown) => {
      console.error('Logger write failed:', err instanceof Error ? err.message : err);
    });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta).catch((err: unknown) => {
      console.error('Logger write failed:', err instanceof Error ? err.message : err);
    });
  }

  private async log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    if (VALID_LEVELS.indexOf(level) < VALID_LEVELS.indexOf(this.level)) {
      return;
    }

    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    const output =
      this.format === 'json'
        ? JSON.stringify(entry)
        : `[${entry.timestamp}] ${level.toUpperCase()}: ${message}${meta ? ` ${JSON.stringify(meta)}` : ''}`;

    if (this.destination) {
      await appendToFile(this.destination, `${output}\n`);
    } else if (level === 'error' || level === 'warn') {
      // eslint-disable-next-line no-console
      globalThis.console.error(output);
    } else {
      // eslint-disable-next-line no-console
      globalThis.console.log(output);
    }
  }
}
