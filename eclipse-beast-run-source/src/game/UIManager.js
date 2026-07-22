const $ = (selector) => document.querySelector(selector);

export class UIManager {
  constructor(game) {
    this.game = game;
    this.screens = ['#menu-screen', '#pause-screen', '#gameover-screen', '#settings-screen', '#skin-screen'];
    this.hud = $('#hud');
    this.power = $('#power-status');
    this.bind();
  }

  bind() {
    const action = (selector, fn) => $(selector)?.addEventListener('click', () => { this.game.audio.play('ui'); fn(); });
    action('#play-btn', () => this.game.startRun());
    action('#pause-btn', () => this.game.pause());
    action('#resume-btn', () => this.game.resume());
    action('#pause-restart-btn', () => this.game.startRun());
    action('#pause-menu-btn', () => this.game.showMenu());
    action('#retry-btn', () => this.game.startRun());
    action('#result-menu-btn', () => this.game.showMenu());
    action('#settings-btn', () => this.show('settings'));
    action('#settings-back', () => this.show('menu'));
    action('#skin-btn', () => this.show('skin'));
    action('#skin-back', () => this.show('menu'));
    action('#sound-toggle', () => this.game.toggleSound());
    action('#haptics-toggle', () => this.game.toggleHaptics());
  }

  show(name) {
    const map = { menu: '#menu-screen', pause: '#pause-screen', gameover: '#gameover-screen', settings: '#settings-screen', skin: '#skin-screen' };
    this.screens.forEach((selector) => $(selector)?.classList.remove('active'));
    if (map[name]) $(map[name])?.classList.add('active');
    this.hud.classList.toggle('hidden', !['running', 'pause'].includes(name));
  }

  updateHud(data) {
    $('#score').textContent = Math.floor(data.score).toLocaleString();
    $('#distance').textContent = `${Math.floor(data.distance)}m`;
    $('#shards').textContent = data.shards;
    $('#multiplier').textContent = `×${data.multiplier}`;
    $('#sigil-text').textContent = `${data.sigils}/3`;
    [...$('#sigil-pips').children].forEach((pip, index) => pip.classList.toggle('active', index < data.sigils));
    if (data.power) {
      this.power.classList.remove('hidden');
      $('#power-name').textContent = data.power.name;
      $('#power-fill').style.transform = `scaleX(${Math.max(0, data.power.remaining / data.power.duration)})`;
    } else {
      this.power.classList.add('hidden');
    }
  }

  toast(text, tone = 'gold') {
    const node = document.createElement('div');
    node.className = `toast ${tone}`;
    node.textContent = text;
    $('#toast-layer').append(node);
    window.setTimeout(() => node.remove(), 1150);
  }

  flash(type = 'gold') {
    const layer = $('#flash-layer');
    layer.className = `flash ${type}`;
    requestAnimationFrame(() => layer.classList.add('active'));
    window.setTimeout(() => { layer.className = ''; }, 260);
  }

  setSettings(save) {
    $('#sound-toggle b').textContent = save.sound ? 'ON' : 'OFF';
    $('#haptics-toggle b').textContent = save.haptics ? 'ON' : 'OFF';
    $('#menu-best').textContent = `BEST ${save.bestScore.toLocaleString()}`;
  }

  showResult(stats, newHigh) {
    $('#result-kicker').textContent = newHigh ? 'A NEW ECLIPSE RISES' : 'THE ECLIPSE FADES';
    $('#result-title').textContent = newHigh ? 'NEW HIGH SCORE' : 'RUN ENDED';
    $('#result-score').textContent = Math.floor(stats.score).toLocaleString();
    $('#result-best').textContent = Math.floor(stats.best).toLocaleString();
    $('#result-distance').textContent = `${Math.floor(stats.distance)}m`;
    $('#result-shards').textContent = stats.shards;
    $('#result-transformations').textContent = stats.transformations;
    this.show('gameover');
  }
}
