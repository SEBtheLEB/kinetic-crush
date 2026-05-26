export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.querySelector('#screenRoot');
    this.hud = document.querySelector('#hud');
    this.bottom = document.querySelector('#bottomBar');
    this.levelName = document.querySelector('#levelName');
    this.progressText = document.querySelector('#progressText');
    this.comboText = document.querySelector('#comboText');
    this.charges = document.querySelector('#charges');
    this.hintText = document.querySelector('#hintText');
    this.debug = document.querySelector('#debugPanel');
    this.toastLayer = document.querySelector('#toastLayer');
    document.querySelector('#restartBtn').onclick = () => game.restartLevel();
    document.querySelector('#pauseBtn').onclick = () => game.togglePause();
  }

  bindButton(id, fn) {
    const el = this.root.querySelector(id);
    if (el) el.onclick = () => { this.game.audio.play('ui'); fn(); };
  }

  screen(html) {
    this.root.innerHTML = html;
  }

  showMenu() {
    this.hud.classList.add('hidden');
    this.bottom.classList.add('hidden');
    this.screen(`<section class="screen">
      <h1>Kinetic Crush</h1>
      <p>Momentum brick breaker for quick, heavy, physics-driven runs.</p>
      <div class="menu-actions">
        <button id="play" class="primary">Play</button>
        <button id="levels">Level Select</button>
        <button id="how">How to Play</button>
        <button id="settings">Settings</button>
      </div>
    </section>`);
    this.bindButton('#play', () => this.game.startLevel(this.game.save.data.unlockedLevels - 1));
    this.bindButton('#levels', () => this.showLevelSelect());
    this.bindButton('#how', () => this.showHowTo());
    this.bindButton('#settings', () => this.showSettings());
  }

  showLevelSelect() {
    const save = this.game.save.data;
    const nodes = this.game.levelManager.levels.map((level, i) => {
      const locked = i + 1 > save.unlockedLevels;
      const stars = '&#9733;'.repeat(save.stars[i + 1] ?? 0);
      const side = i % 2 === 0 ? 'left' : 'right';
      return `<div class="map-node ${side}">
        <button class="level-tile map-tile" data-level="${i}" ${locked ? 'disabled' : ''}>
          <span>${i + 1}</span>
          <span class="stars">${stars}</span>
        </button>
        <div class="map-label"><strong>${level.name}</strong><span>${locked ? 'Locked' : 'Unlocked'}</span></div>
      </div>`;
    }).join('');
    this.screen(`<section class="screen level-screen">
      <h2>Level Select</h2>
      <div class="level-map">${nodes}</div>
      <button id="back">Back</button>
    </section>`);
    this.root.querySelectorAll('[data-level]').forEach((btn) => btn.onclick = () => this.game.startLevel(Number(btn.dataset.level)));
    this.bindButton('#back', () => this.showMenu());
  }

  showHowTo() {
    this.screen(`<section class="screen">
      <h2>How to Play</h2>
      <div class="panel">
        <p>Grab any ball, drag it with a little delay, then release to fling.</p>
        <p>Every flick adds impulse to current velocity.</p>
        <p>Swipe with its movement for Momentum Boost and Perfect Push.</p>
        <p>Catch powerups for multiballs, Crush Mode, charge refills, and stronger hits.</p>
        <p>Faster hits deal much more damage. Break required bricks to clear.</p>
      </div>
      <button id="back">Back</button>
    </section>`);
    this.bindButton('#back', () => this.showMenu());
  }

  showSettings() {
    const s = this.game.save.data.settings;
    this.screen(`<section class="screen">
      <h2>Settings</h2>
      <div class="panel">
        <label class="setting-row">Music volume <input id="music" type="range" min="0" max="1" step=".05" value="${s.music}"></label>
        <label class="setting-row">SFX volume <input id="sfx" type="range" min="0" max="1" step=".05" value="${s.sfx}"></label>
        <label class="setting-row">Screen shake <input id="shake" type="checkbox" ${s.shake ? 'checked' : ''}></label>
        <label class="setting-row">Vibration <input id="vibration" type="checkbox" ${s.vibration ? 'checked' : ''}></label>
        <label class="setting-row">Reduced effects <input id="reduced" type="checkbox" ${s.reducedEffects ? 'checked' : ''}></label>
      </div>
      <button id="reset" class="danger">Reset Progress</button>
      <button id="back">Back</button>
    </section>`);
    const save = () => this.game.save.save();
    this.root.querySelector('#music').oninput = (e) => { s.music = Number(e.target.value); save(); };
    this.root.querySelector('#sfx').oninput = (e) => { s.sfx = Number(e.target.value); save(); };
    this.root.querySelector('#shake').onchange = (e) => { s.shake = e.target.checked; save(); };
    this.root.querySelector('#vibration').onchange = (e) => { s.vibration = e.target.checked; save(); };
    this.root.querySelector('#reduced').onchange = (e) => { s.reducedEffects = e.target.checked; save(); };
    this.bindButton('#reset', () => { this.game.save.reset(); this.showSettings(); });
    this.bindButton('#back', () => this.showMenu());
  }

  showPause() {
    this.screen(`<section class="screen">
      <h2>Paused</h2>
      <div class="menu-actions">
        <button id="resume" class="primary">Resume</button>
        <button id="restart">Restart</button>
        <button id="levels">Level Select</button>
        <button id="settings">Settings</button>
      </div>
    </section>`);
    this.bindButton('#resume', () => this.game.resume());
    this.bindButton('#restart', () => this.game.restartLevel());
    this.bindButton('#levels', () => this.showLevelSelect());
    this.bindButton('#settings', () => this.showSettings());
  }

  showComplete(result) {
    this.screen(`<section class="screen">
      <h2>Level Complete</h2>
      <div class="panel">
        <strong class="stars">${'&#9733;'.repeat(result.stars)}</strong>
        <p>Time: ${result.time.toFixed(1)}s</p>
        <p>Bricks: ${result.bricksBroken}</p>
        <p>Max combo: x${result.maxCombo}</p>
        <p>Flicks used: ${result.flicks}</p>
      </div>
      <div class="menu-actions">
        <button id="next" class="primary">Next Level</button>
        <button id="retry">Retry</button>
        <button id="levels">Level Select</button>
      </div>
    </section>`);
    this.bindButton('#next', () => this.game.nextLevel());
    this.bindButton('#retry', () => this.game.restartLevel());
    this.bindButton('#levels', () => this.showLevelSelect());
  }

  update() {
    const g = this.game;
    const visible = g.state === 'playing' || g.state === 'paused' || g.state === 'complete';
    this.hud.classList.toggle('hidden', !visible);
    this.bottom.classList.toggle('hidden', g.state !== 'playing');
    if (!visible) return;
    const requiredLeft = g.bricks.filter((b) => b.alive && b.required).length;
    const requiredTotal = g.requiredTotal;
    this.levelName.textContent = `Lv ${g.levelIndex + 1}: ${g.currentLevel.name}`;
    this.progressText.textContent = `${requiredTotal - requiredLeft} / ${requiredTotal}`;
    this.comboText.textContent = `x${g.combo}`;
    this.hintText.textContent = g.currentLevel.lesson;
    this.charges.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const c = document.createElement('span');
      c.className = 'charge';
      c.style.setProperty('--fill', Math.max(0, Math.min(1, g.flickCharges - i)));
      this.charges.appendChild(c);
    }
    if (g.debug) {
      this.debug.classList.remove('hidden');
      this.debug.textContent = `speed ${Math.round(g.ball.speed)}\nbricks ${g.bricks.filter((b) => b.alive).length}\nballs ${g.balls.length}\npowerups ${g.powerUps.length}\nlevel ${g.levelIndex + 1}\ncharges ${g.flickCharges.toFixed(2)}`;
    } else {
      this.debug.classList.add('hidden');
    }
  }

  toast(text, type = '') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = text;
    this.toastLayer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }
}
