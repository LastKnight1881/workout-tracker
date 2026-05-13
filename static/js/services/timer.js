// services/timer.js — rest timer pure logic + Web Audio beep

export class RestTimer {
  constructor(durationSec, onTick, onComplete) {
    this._total = durationSec;
    this._remaining = durationSec;
    this._onTick = onTick;
    this._onComplete = onComplete;
    this._intervalId = null;
    this._running = false;
  }

  get remaining() { return this._remaining; }
  get isRunning() { return this._running; }

  start() {
    if (this._running) return;
    this._running = true;
    this._intervalId = setInterval(() => {
      this._remaining -= 1;
      if (typeof this._onTick === 'function') this._onTick(this._remaining);
      if (this._remaining <= 0) {
        this._remaining = 0;
        this._running = false;
        clearInterval(this._intervalId);
        if (typeof this._onComplete === 'function') this._onComplete();
      }
    }, 1000);
  }

  pause() {
    if (!this._running) return;
    this._running = false;
    clearInterval(this._intervalId);
  }

  reset(newDuration) {
    this.pause();
    this._total = newDuration ?? this._total;
    this._remaining = this._total;
  }

  addSeconds(secs) {
    this._remaining = Math.max(0, this._remaining + secs);
    if (typeof this._onTick === 'function') this._onTick(this._remaining);
  }

  destroy() {
    clearInterval(this._intervalId);
  }
}

/**
 * Play a single beep via Web Audio API.
 */
export function playBeep(frequency = 880, duration = 0.3, volume = 0.5) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch (e) {
    // AudioContext may be unavailable in some environments
    console.warn('playBeep: AudioContext not available', e);
  }
}

export function playDoneBeeps() {
  playBeep(880, 0.25, 0.6);
  setTimeout(() => playBeep(880, 0.25, 0.6), 300);
  setTimeout(() => playBeep(1047, 0.4, 0.7), 600);
}
