const SWIPE_THRESHOLD = 28;
const MAX_SWIPE_MS = 650;

export class InputManager {
  constructor(target) {
    this.target = target;
    this.queue = [];
    this.pointer = null;
    this.bound = [];
  }

  bind() {
    const on = (node, type, fn, opts) => {
      node.addEventListener(type, fn, opts);
      this.bound.push(() => node.removeEventListener(type, fn, opts));
    };

    on(this.target, 'pointerdown', (event) => {
      event.preventDefault();
      this.target.setPointerCapture?.(event.pointerId);
      this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
    }, { passive: false });

    on(this.target, 'pointermove', (event) => event.preventDefault(), { passive: false });

    on(this.target, 'pointerup', (event) => {
      event.preventDefault();
      if (!this.pointer || event.pointerId !== this.pointer.id) return;
      const dx = event.clientX - this.pointer.x;
      const dy = event.clientY - this.pointer.y;
      const elapsed = performance.now() - this.pointer.time;
      this.pointer = null;
      if (elapsed > MAX_SWIPE_MS) return;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) {
        this.push('tap');
      } else if (Math.abs(dx) > Math.abs(dy)) {
        this.push(dx > 0 ? 'right' : 'left');
      } else {
        this.push(dy > 0 ? 'down' : 'up');
      }
    }, { passive: false });

    on(this.target, 'pointercancel', () => { this.pointer = null; });
    on(this.target, 'contextmenu', (event) => event.preventDefault());

    on(window, 'keydown', (event) => {
      const map = {
        ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
        ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down',
        KeyE: 'tap', Escape: 'pause', KeyR: 'restart'
      };
      const action = map[event.code];
      if (!action || event.repeat) return;
      event.preventDefault();
      this.push(action);
    }, { passive: false });
  }

  push(action) {
    this.queue.push({ action, time: performance.now() });
    if (this.queue.length > 8) this.queue.shift();
  }

  drain() {
    const actions = this.queue;
    this.queue = [];
    return actions;
  }

  dispose() {
    this.bound.forEach((off) => off());
    this.bound = [];
  }
}
