// concurrencyQueue.js
// Queue that limits concurrent running tasks + emits state change events.
// Shared across the entire app (singleton).

class ConcurrencyQueue {
  constructor(limit = 2) {
    this.limit = Math.max(1, Number(limit) || 1);
    this.queue = []; // [{ fn, resolve, reject }]
    this.active = 0; // number of currently running tasks
    this.listeners = new Set(); // subscribers receive { active, pending }
  }

  setLimit(n) {
    this.limit = Math.max(1, Number(n) || 1);
    this._emit();
  }

  // --- Pub/Sub for app-wide overlay ---
  subscribe(cb) {
    if (typeof cb !== "function") return () => {};
    this.listeners.add(cb);
    // immediately push current state when subscribing
    try {
      cb({ active: this.active, pending: this.queue.length });
    } catch {}
    return () => this.listeners.delete(cb);
  }
  _emit() {
    for (const cb of this.listeners) {
      try {
        cb({ active: this.active, pending: this.queue.length });
      } catch {}
    }
  }

  enqueue(fn) {
    // fn: () => Promise<any>
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this._runNext();
    });
  }

  _runNext() {
    if (this.active >= this.limit || this.queue.length === 0) return;

    const job = this.queue.shift();
    this.active += 1;
    this._emit(); // task started

    (async () => {
      try {
        const result = await job.fn();
        job.resolve(result);
      } catch (e) {
        job.reject(e);
      } finally {
        this.active -= 1;
        this._emit(); // task finished
        this._runNext(); // continue running if there are available slots
      }
    })();
  }

  pendingSize() {
    return this.queue.length;
  }
  activeSize() {
    return this.active;
  }
  isBusy() {
    return this.active > 0;
  }
}

const queue = new ConcurrencyQueue(2); // maximum 2 concurrent tasks
export default queue;
