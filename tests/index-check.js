const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const crypto = require('crypto');

console.log('Running index.html integrity check...');

const htmlPath = path.join(__dirname, '..', 'index.html');
assert.ok(fs.existsSync(htmlPath), 'index.html must exist');

const html = fs.readFileSync(htmlPath, 'utf8');

// 1. External dependencies check
const externalUrls = html.match(/https?:\/\/[^\s"'<>]+/gi) || [];
assert.strictEqual(externalUrls.length, 0, `Found external URLs: ${externalUrls.join(', ')}`);

// 2. Essential DOM elements check
const requiredIds = [
  'total-students',
  'group-count',
  'info-summary',
  'start-btn',
  'reroll-btn',
  'mute-btn',
  'fullscreen-btn',
  'groups-container',
  'confetti-canvas'
];

for (const id of requiredIds) {
  assert.ok(
    html.includes(`id="${id}"`),
    `Missing required DOM element with id="${id}"`
  );
}

// 3. Essential texts / indicators check
assert.ok(html.includes('🎉 신나는 우리 반 자리 뽑기'), 'Missing header title');
assert.ok(html.includes('칠판 / 교탁'), 'Missing blackboard indicator');

// 4. CSS check
assert.ok(html.includes('@media print'), 'Missing print media query');
assert.ok(html.includes('--bg-board'), 'Missing chalkboard theme variable');
assert.ok(html.includes('--group-1'), 'Missing pastel group tokens');

// 5. JavaScript syntax and execution check
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'Missing <script> tag');
const scriptContent = scriptMatch[1];

function createMockElement(tag, id = '') {
  return {
    tag,
    id,
    value: id === 'total-students' ? '24' : id === 'group-count' ? '6' : '',
    textContent: '',
    innerHTML: '',
    style: {},
    disabled: false,
    classList: {
      _classes: new Set(),
      add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains: function(c) { return this._classes.has(c); }
    },
    addEventListener: () => {},
    setAttribute: () => {},
    appendChild: () => {},
    querySelector: () => createMockElement('div'),
    querySelectorAll: () => [createMockElement('div'), createMockElement('div')],
    getContext: () => ({
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      fillRect: () => {}
    })
  };
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
  }
  resume() { return Promise.resolve(); }
  createOscillator() {
    return {
      type: 'triangle',
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
}

const elements = {};
const mockDoc = {
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = createMockElement('div', id);
    }
    return elements[id];
  },
  createElement: (tag) => createMockElement(tag),
  createDocumentFragment: () => ({
    appendChild: () => {}
  }),
  querySelector: () => createMockElement('div'),
  querySelectorAll: () => [createMockElement('div'), createMockElement('div')],
  addEventListener: () => {}
};

const mockStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; }
};

const sandbox = {
  document: mockDoc,
  window: null,
  AudioContext: MockAudioContext,
  localStorage: mockStorage,
  console,
  parseInt,
  isNaN,
  Math,
  Array,
  Uint32Array,
  Date,
  JSON,
  Set,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  crypto: crypto.webcrypto
};
sandbox.window = sandbox;
sandbox.window.innerWidth = 1200;
sandbox.window.innerHeight = 800;
sandbox.window.addEventListener = () => {};

vm.createContext(sandbox);
vm.runInContext(scriptContent, sandbox);

assert.strictEqual(typeof sandbox.validateInputs, 'function');
assert.strictEqual(typeof sandbox.distributeGroups, 'function');
assert.strictEqual(typeof sandbox.generateShuffledSeats, 'function');
assert.strictEqual(typeof sandbox.renderInitialSeats, 'function');
assert.strictEqual(typeof sandbox.updateInfoSummary, 'function');

assert.strictEqual(sandbox.validateInputs(24, 6).valid, true);
assert.strictEqual(sandbox.validateInputs(1, 6).valid, false);

const dist = sandbox.distributeGroups(25, 6);
assert.strictEqual(dist.length, 6);
assert.strictEqual(dist[0].count, 5);
assert.strictEqual(dist[1].count, 4);

// 6. SoundController checks
assert.strictEqual(typeof sandbox.SoundController, 'object', 'SoundController must be defined');
assert.strictEqual(typeof sandbox.SoundController.tick, 'function', 'SoundController.tick must be a function');
assert.strictEqual(typeof sandbox.SoundController.lock, 'function', 'SoundController.lock must be a function');
assert.strictEqual(typeof sandbox.SoundController.fanfare, 'function', 'SoundController.fanfare must be a function');
assert.strictEqual(typeof sandbox.SoundController.toggleMute, 'function', 'SoundController.toggleMute must be a function');
assert.strictEqual(typeof sandbox.SoundController.isMuted, 'boolean', 'SoundController.isMuted must be boolean');

assert.strictEqual(sandbox.SoundController.isMuted, false);
const muted = sandbox.SoundController.toggleMute();
assert.strictEqual(muted, true);
assert.strictEqual(sandbox.SoundController.isMuted, true);
sandbox.SoundController.toggleMute();
assert.strictEqual(sandbox.SoundController.isMuted, false);

// Audio synth calls without throwing
sandbox.SoundController.tick();
sandbox.SoundController.lock();
sandbox.SoundController.fanfare();

// 7. ConfettiEngine checks
assert.strictEqual(typeof sandbox.ConfettiEngine, 'object', 'ConfettiEngine must be defined');
assert.strictEqual(typeof sandbox.ConfettiEngine.fire, 'function', 'ConfettiEngine.fire must be a function');

sandbox.ConfettiEngine.fire(50);
assert.strictEqual(sandbox.ConfettiEngine.isActive, true);

// 8. SeatAnimationController checks
assert.strictEqual(typeof sandbox.SeatAnimationController, 'object', 'SeatAnimationController must be defined');
assert.strictEqual(typeof sandbox.SeatAnimationController.startDraw, 'function', 'SeatAnimationController.startDraw must be a function');
assert.strictEqual(typeof sandbox.SeatAnimationController.isRolling, 'boolean', 'SeatAnimationController.isRolling must be boolean');

sandbox.SeatAnimationController.startDraw();
assert.strictEqual(sandbox.SeatAnimationController.isRolling, true);
sandbox.SeatAnimationController.clearTimers();
sandbox.SeatAnimationController.isRolling = false;

// 9. Task 4 Convenience Features checks
assert.strictEqual(typeof sandbox.saveSettings, 'function', 'saveSettings must be a function');
assert.strictEqual(typeof sandbox.loadSettings, 'function', 'loadSettings must be a function');
assert.strictEqual(typeof sandbox.toggleFullscreen, 'function', 'toggleFullscreen must be a function');

// Test saving and loading settings
sandbox.saveSettings();
const savedRaw = mockStorage.getItem('seat_picker_settings');
assert.ok(savedRaw, 'seat_picker_settings should be saved in localStorage');
const parsed = JSON.parse(savedRaw);
assert.strictEqual(parsed.totalStudents, 24);
assert.strictEqual(parsed.groupCount, 6);

// Test loadSettings with altered values
mockStorage.setItem('seat_picker_settings', JSON.stringify({ totalStudents: 30, groupCount: 5 }));
sandbox.loadSettings();
assert.strictEqual(elements['total-students'].value, 30);
assert.strictEqual(elements['group-count'].value, 5);

console.log('All index.html integrity checks passed successfully!');
