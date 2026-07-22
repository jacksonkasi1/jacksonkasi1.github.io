const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class RunnerController {
  constructor() {
    this.reset();
  }

  reset() {
    this.lane = 0;
    this.targetLane = 0;
    this.laneLean = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.slideTimer = 0;
    this.slamming = false;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.landPulse = 0;
    this.powerDash = 0;
  }

  handle(action, lionActive) {
    if (action === 'left') this.targetLane = clamp(this.targetLane - 1, -1, 1);
    if (action === 'right') this.targetLane = clamp(this.targetLane + 1, -1, 1);
    if (action === 'up') this.jumpBuffer = 0.14;
    if (action === 'down') {
      if (this.grounded) this.slideTimer = 0.62;
      else {
        this.slamming = true;
        this.vy = -34;
      }
    }
    if (action === 'tap' && lionActive) {
      this.powerDash = 0.42;
      if (this.grounded) {
        this.vy = 16;
        this.grounded = false;
      }
    }
  }

  update(dt, lionActive) {
    const previousLane = this.lane;
    const laneSpeed = lionActive ? 15 : 12;
    this.lane += (this.targetLane - this.lane) * Math.min(1, dt * laneSpeed);
    this.laneLean += (((this.targetLane - this.lane) * -0.45) - this.laneLean) * Math.min(1, dt * 10);
    if (Math.abs(this.targetLane - this.lane) < 0.002) this.lane = this.targetLane;

    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = this.grounded ? 0.11 : Math.max(0, this.coyote - dt);
    this.slideTimer = Math.max(0, this.slideTimer - dt);
    this.landPulse = Math.max(0, this.landPulse - dt * 3.2);
    this.powerDash = Math.max(0, this.powerDash - dt);

    if (this.jumpBuffer > 0 && (this.grounded || this.coyote > 0)) {
      this.vy = lionActive ? 18.5 : 15.7;
      this.grounded = false;
      this.slamming = false;
      this.jumpBuffer = 0;
      this.coyote = 0;
      return { jumped: true, laneMoved: Math.abs(previousLane - this.lane) > 0.01 };
    }

    if (!this.grounded) {
      this.vy -= (lionActive ? 35 : 38) * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        const hard = this.slamming || this.vy < -17;
        this.y = 0;
        this.vy = 0;
        this.grounded = true;
        this.slamming = false;
        this.landPulse = hard ? 1 : 0.45;
        return { landed: true, hard, laneMoved: Math.abs(previousLane - this.lane) > 0.01 };
      }
    }
    return { laneMoved: Math.abs(previousLane - this.lane) > 0.01 };
  }

  get sliding() { return this.slideTimer > 0; }
}
