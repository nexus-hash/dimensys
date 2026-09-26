import { describe, it, expect } from 'vitest';
import { isWorkerMessage, PROTOCOL_VERSION } from '../worker/protocol';

describe('isWorkerMessage', () => {
  it('accepts known worker message types', () => {
    expect(isWorkerMessage({ type: 'ack', seq: 1 })).toBe(true);
    expect(
      isWorkerMessage({ type: 'frame', t: 0.1, keysEpoch: 0, metrics: new Float64Array(0), health: new Uint8Array(0), events: [] }),
    ).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isWorkerMessage(null)).toBe(false);
    expect(isWorkerMessage('ready')).toBe(false);
    expect(isWorkerMessage({ type: 'init', seq: 1 })).toBe(false);
    expect(isWorkerMessage({})).toBe(false);
  });

  it('starts at protocol version 1', () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});
