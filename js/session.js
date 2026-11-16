// Timer engine. Time-based (not tick-counting) so it stays accurate when throttled.
import { buildTimeline, sideLabel } from './data.js';
import { sfx, voiceGuide, haptics } from './audio.js';

const now = () => performance.now();

export class Session {
  constructor(routine, { scale = 1, onStep, onTick, onDone } = {}) {
    this.routine = routine;
    const { steps, moves } = buildTimeline(routine, scale);
    this.steps = steps;
    this.moves = moves;
    this.total = steps.reduce((a, s) => a + s.secs, 0);
    this.onStep = onStep;
    this.onTick = onTick;
    this.onDone = onDone;
    this.i = 0;
    this.paused = true;
    this.elapsedBefore = 0; // ms elapsed in current step before last resume
    this.resumedAt = 0;
    this.lastWhole = null;
    this.halfDone = false;
    this.finished = false;
    this.timer = null;
    this.activeMs = 0; // real time spent un-paused
    this.skips = 0;
    this.scale = scale;
  }

  get step() { return this.steps[this.i]; }

  stepElapsed() {
    return this.elapsedBefore + (this.paused ? 0 : now() - this.resumedAt);
  }

  remaining() {
    return Math.max(0, this.step.secs - this.stepElapsed() / 1000);
  }

  /** real seconds spent in the session (excluding pauses) */
  activeSeconds() {
    return (this.activeMs + (this.paused || this.finished ? 0 : now() - this.resumedWall)) / 1000;
  }

  start() {
    this.enter(0);
    this.resume();
  }

  resume() {
    if (!this.paused || this.finished) return;
    this.paused = false;
    this.resumedAt = now();
    this.resumedWall = now();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 100);
    this.tick();
  }

  pause() {
    if (this.paused) return;
    this.elapsedBefore += now() - this.resumedAt;
    this.activeMs += now() - this.resumedWall;
    this.paused = true;
    clearInterval(this.timer);
    voiceGuide.stop();
    haptics.stop();
    this.onTick?.(this);
  }

  toggle() { this.paused ? this.resume() : this.pause(); }

  destroy() {
    clearInterval(this.timer);
    this.paused = true;
    this.finished = true;
    voiceGuide.stop();
    haptics.stop();
  }

  /** Jump to step index, resetting its clock. */
  enter(i, { silent = false } = {}) {
    this.i = i;
    this.elapsedBefore = 0;
    this.resumedAt = now();
    this.lastWhole = Math.ceil(this.step.secs);
    this.halfDone = false;
    if (!silent) this.announce();
    this.onStep?.(this);
  }

  announce() {
    const st = this.step;
    if (st.kind === 'prep') {
      const m = st.next;
      voiceGuide.say(`Get ready. First up: ${m.stretch.name}${m.side ? ', ' + sideLabel(m) : ''}.`);
    } else if (st.kind === 'rest') {
      const m = st.next;
      if (st.switchSides) {
        sfx.switchSides();
        voiceGuide.say(`Switch sides. ${sideLabel(m)}.`);
      } else {
        voiceGuide.say(`Next: ${m.stretch.name}${m.side ? ', ' + sideLabel(m) : ''}.`);
      }
      haptics.buzz([40, 60, 40]);
    } else {
      sfx.go();
      haptics.buzz(90);
      const m = st.move;
      const cue = m.stretch.cues[0];
      setTimeout(() => {
        if (this.step === st && !this.paused) voiceGuide.say(cue, { interrupt: false });
      }, 450);
    }
  }

  tick() {
    if (this.paused || this.finished) return;
    let rem = this.remaining();
    // Catch up if the page was throttled for a long time.
    let guard = 0;
    while (rem <= 0 && guard++ < 200) {
      const overflow = this.stepElapsed() / 1000 - this.step.secs;
      if (this.i >= this.steps.length - 1) {
        this.complete();
        return;
      }
      const big = overflow > 1.5;
      if (this.step.kind === 'hold' && !big) sfx.holdEnd();
      this.enter(this.i + 1, { silent: big });
      this.elapsedBefore = Math.max(0, overflow) * 1000;
      this.resumedAt = now();
      rem = this.remaining();
    }
    const whole = Math.ceil(rem);
    if (whole !== this.lastWhole) {
      this.lastWhole = whole;
      if (whole <= 3 && whole >= 1) {
        sfx.tick();
        haptics.buzz(25);
      }
    }
    const st = this.step;
    if (st.kind === 'hold' && !this.halfDone && st.secs >= 20 && rem <= st.secs / 2) {
      this.halfDone = true;
      sfx.half();
      const cues = st.move.stretch.cues;
      voiceGuide.say(cues[1] || 'Halfway there.', { interrupt: false });
    }
    this.onTick?.(this);
  }

  next() {
    if (this.step.kind === 'hold') this.skips++;
    // jump to next hold
    let j = this.i + 1;
    while (j < this.steps.length && this.steps[j].kind !== 'hold') j++;
    if (j >= this.steps.length) {
      this.complete();
      return;
    }
    this.enter(j, { silent: this.paused });
    if (!this.paused) this.resumedAt = now();
    this.onTick?.(this);
  }

  prev() {
    const cur = this.step;
    if (cur.kind === 'hold' && this.stepElapsed() > 3000) {
      this.enter(this.i, { silent: this.paused });
    } else {
      let j = this.i - 1;
      while (j > 0 && this.steps[j].kind !== 'hold') j--;
      this.enter(Math.max(0, j), { silent: this.paused });
    }
    this.onTick?.(this);
  }

  complete() {
    if (this.finished) return;
    if (!this.paused) this.activeMs += now() - this.resumedWall;
    this.finished = true;
    clearInterval(this.timer);
    sfx.complete();
    haptics.buzz([80, 80, 80, 80, 200]);
    voiceGuide.say('Great work. Routine complete.');
    this.onDone?.(this);
  }
}
