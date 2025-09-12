class ConcurrencyQueue {
  constructor(limit = 2) {
    this.limit = limit;
    this.queue = []; // [{ fn, resolve, reject }]
    this.active = 0;
    this.listeners = new Set(); // => onChange subscribers
  }

  setLimit(n) {
    this.limit = Math.max(1, Number(n) || 1);
  }

  // Register to listen for changes (returns unsubscribe function)
  subscribe(cb) {
    this.listeners.add(cb);
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
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this._runNext();
    });
  }

  _runNext() {
    if (this.active >= this.limit || this.queue.length === 0) return;

    const job = this.queue.shift();
    this.active += 1;
    this._emit(); // notify task started

    (async () => {
      try {
        const result = await job.fn();
        job.resolve(result);
      } catch (e) {
        job.reject(e);
      } finally {
        this.active -= 1;
        this._emit(); // notify task completed
        this._runNext();
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

const queue = new ConcurrencyQueue(2);
export default queue;
