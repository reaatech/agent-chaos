import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Logger } from './Logger.js';

describe('Logger', () => {
  let consoleSpy: MockInstance<typeof console.log>;
  let errorSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(globalThis.console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should log info by default', () => {
    const logger = new Logger();
    logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('Test message');
  });

  it('should not log debug when level is info', () => {
    const logger = new Logger();
    logger.debug('Debug message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should log debug when level is debug', () => {
    const logger = new Logger({ logging: { level: 'debug', format: 'text' } });
    logger.debug('Debug message');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it('should not log info when level is warn', () => {
    const logger = new Logger({ logging: { level: 'warn', format: 'text' } });
    logger.info('Info message');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should log warn to stderr when level is warn', () => {
    const logger = new Logger({ logging: { level: 'warn', format: 'text' } });
    logger.warn('Warn message');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should log error to stderr when level is error', () => {
    const logger = new Logger({ logging: { level: 'error', format: 'text' } });
    logger.error('Error message');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should not log warn when level is error', () => {
    const logger = new Logger({ logging: { level: 'error', format: 'text' } });
    logger.warn('Warn message');
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should output json format', () => {
    const logger = new Logger({ logging: { level: 'info', format: 'json' } });
    logger.info('Json message', { key: 'value' });
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(parsed.message).toBe('Json message');
    expect(parsed.key).toBe('value');
  });

  it('should include metadata in text format', () => {
    const logger = new Logger({ logging: { level: 'info', format: 'text' } });
    logger.info('Text message', { key: 'value' });
    expect(consoleSpy.mock.calls[0][0]).toContain('Text message');
    expect(consoleSpy.mock.calls[0][0]).toContain('key');
  });

  it('should handle no metadata', () => {
    const logger = new Logger({ logging: { level: 'info', format: 'text' } });
    logger.info('No meta');
    expect(consoleSpy.mock.calls[0][0]).toContain('No meta');
  });
});
