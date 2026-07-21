import { describe, expect, it, vi } from 'vitest';
import { createStreamWatchdog, withTimeoutSignal } from '@/lib/utils/fetch-timeout';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('withTimeoutSignal', () => {
  it('aborts with TimeoutError after the given delay', async () => {
    const signal = withTimeoutSignal(undefined, 30);
    expect(signal.aborted).toBe(false);
    await sleep(70);
    expect(signal.aborted).toBe(true);
    expect((signal.reason as DOMException).name).toBe('TimeoutError');
  });

  it('propagates a caller abort without waiting for the timeout', async () => {
    const controller = new AbortController();
    const signal = withTimeoutSignal(controller.signal, 60_000);
    controller.abort();
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(controller.signal.reason);
  });

  it('stays quiet when the caller signal is already handled before the timeout', async () => {
    const controller = new AbortController();
    const signal = withTimeoutSignal(controller.signal, 40);
    controller.abort();
    await sleep(80);
    // Still aborted for the caller's reason — the timeout must not override it.
    expect(signal.reason).toBe(controller.signal.reason);
  });
});

describe('createStreamWatchdog', () => {
  it('fires no-event when the stream goes silent', async () => {
    const onTimeout = vi.fn();
    const watchdog = createStreamWatchdog({ noEventMs: 40, totalMs: 10_000, onTimeout });
    watchdog.start();
    await sleep(90);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith('no-event');
  });

  it('resets the no-event timer on activity', async () => {
    const onTimeout = vi.fn();
    const watchdog = createStreamWatchdog({ noEventMs: 60, totalMs: 10_000, onTimeout });
    watchdog.start();
    for (let i = 0; i < 3; i++) {
      await sleep(30);
      watchdog.notifyActivity();
    }
    expect(onTimeout).not.toHaveBeenCalled();
    watchdog.stop();
  });

  it('fires total when the stream outlives the overall cap despite activity', async () => {
    const onTimeout = vi.fn();
    const watchdog = createStreamWatchdog({ noEventMs: 60, totalMs: 100, onTimeout });
    watchdog.start();
    for (let i = 0; i < 5; i++) {
      await sleep(30);
      watchdog.notifyActivity();
    }
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith('total');
  });

  it('fires at most once and stops cleanly', async () => {
    const onTimeout = vi.fn();
    const watchdog = createStreamWatchdog({ noEventMs: 30, totalMs: 60, onTimeout });
    watchdog.start();
    await sleep(120);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    const onTimeout2 = vi.fn();
    const watchdog2 = createStreamWatchdog({ noEventMs: 30, totalMs: 60, onTimeout: onTimeout2 });
    watchdog2.start();
    watchdog2.stop();
    await sleep(100);
    expect(onTimeout2).not.toHaveBeenCalled();
  });
});
