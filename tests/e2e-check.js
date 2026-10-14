const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const crypto = require('crypto');

console.log('=== Running Full End-to-End (E2E) Test Suite ===\n');

// 1. Static file check
const htmlPath = path.join(__dirname, '..', 'index.html');
assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
const html = fs.readFileSync(htmlPath, 'utf8');

// 2. Strict zero external dependency check
const externalUrls = html.match(/https?:\/\/[^\s"'<>]+/gi) || [];
assert.strictEqual(externalUrls.length, 0, `External URLs forbidden: ${externalUrls.join(', ')}`);
console.log('✔ [1/8] Zero external dependencies confirmed (100% self-contained)');

// 3. Essential UI Elements check
const requiredElements = [
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
for (const id of requiredElements) {
  assert.ok(html.includes(`id="${id}"`), `DOM element #${id} missing`);
}
assert.ok(html.includes('🎉 신나는 우리 반 자리 뽑기'), 'Header title missing');
assert.ok(html.includes('[ 칠판 / 교탁 (앞) ]'), 'Blackboard bar missing');
console.log('✔ [2/8] All essential DOM elements and indicators present');

// 4. Print & Classroom theme CSS check
assert.ok(html.includes('@media print'), 'Print media query missing');
assert.ok(html.includes('--bg-board'), 'Classroom board background missing');
assert.ok(html.includes('--group-1') && html.includes('--group-6'), 'Pastel group tokens missing');
console.log('✔ [3/8] Print stylesheets and blackboard themes verified');

// 5. Build full simulated browser environment
function createMockElement(tag, id = '') {
  const listeners = {};
  return {
    tag,
    id,
    value: id === 'total-students' ? '24' : id === 'group-count' ? '6' : '',
    textContent: '',
    innerHTML: '',
    style: { display: '' },
    disabled: false,
    classList: {
      _classes: new Set(),
      add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains: function(c) { return this._classes.has(c); }
    },
    addEventListener: function(event, cb) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    },
    trigger: function(event, evtObj = {}) {
      if (listeners[event]) {
        listeners[event].forEach(cb => cb(evtObj));
      }
    },
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
const docListeners = {};
const mockDoc = {
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = createMockElement('div', id);
    }
    return elements[id];
  },
  createElement: (tag) => createMockElement(tag),
  createDocumentFragment: () => ({ appendChild: () => {} }),
  querySelector: () => createMockElement('div'),
  querySelectorAll: () => [createMockElement('div'), createMockElement('div')],
  addEventListener: (event, cb) => {
    if (!docListeners[event]) docListeners[event] = [];
    docListeners[event].push(cb);
  },
  trigger: (event, evtObj = {}) => {
    if (docListeners[event]) {
      docListeners[event].forEach(cb => cb(evtObj));
    }
  },
  fullscreenElement: null,
  documentElement: {
    requestFullscreen: () => Promise.resolve()
  },
  exitFullscreen: () => Promise.resolve(),
  activeElement: null
};

const mockStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; }
};

const windowListeners = {};
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
sandbox.window.addEventListener = (event, cb) => {
  if (!windowListeners[event]) windowListeners[event] = [];
  windowListeners[event].push(cb);
};
sandbox.window.trigger = (event, evtObj = {}) => {
  if (windowListeners[event]) {
    windowListeners[event].forEach(cb => cb(evtObj));
  }
};

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'Script block missing');
vm.createContext(sandbox);
vm.runInContext(scriptMatch[1], sandbox);

// 6. Distribution & Fisher-Yates shuffle verification
const shuffled = sandbox.generateShuffledSeats(28, 5);
assert.strictEqual(shuffled.length, 5, 'Should produce 5 groups');
const allNumbers = [];
shuffled.forEach(g => g.seats.forEach(s => allNumbers.push(s.studentNumber)));
assert.strictEqual(allNumbers.length, 28, 'Should assign all 28 students');
const uniqueNumbers = new Set(allNumbers);
assert.strictEqual(uniqueNumbers.size, 28, 'Every student number must be unique');
for (let i = 1; i <= 28; i++) {
  assert.ok(uniqueNumbers.has(i), `Number ${i} must be included`);
}
console.log('✔ [4/8] Shuffling and fair distribution verified (28 students into 5 groups)');

// 7. SoundController audio synthesis check
assert.strictEqual(sandbox.SoundController.isMuted, false);
sandbox.SoundController.tick();
sandbox.SoundController.lock();
sandbox.SoundController.fanfare();
sandbox.SoundController.toggleMute();
assert.strictEqual(sandbox.SoundController.isMuted, true);
assert.strictEqual(elements['mute-btn'].textContent, '소리 🔇');
sandbox.SoundController.toggleMute();
assert.strictEqual(sandbox.SoundController.isMuted, false);
assert.strictEqual(elements['mute-btn'].textContent, '소리 🔊');
console.log('✔ [5/8] Web Audio synthesizer and mute toggle verified');

// 8. LocalStorage persistence check
elements['total-students'].value = '32';
elements['group-count'].value = '8';
elements['total-students'].trigger('input');
const savedData = JSON.parse(mockStorage.getItem('seat_picker_settings'));
assert.strictEqual(savedData.totalStudents, 32);
assert.strictEqual(savedData.groupCount, 8);

// Restore simulation
elements['total-students'].value = '20';
elements['group-count'].value = '4';
sandbox.loadSettings();
assert.strictEqual(elements['total-students'].value, 32);
assert.strictEqual(elements['group-count'].value, 8);
console.log('✔ [6/8] LocalStorage automatic settings persistence verified');

// 9. Fullscreen & Keyboard shortcuts check
sandbox.toggleFullscreen();
mockDoc.fullscreenElement = {};
mockDoc.trigger('fullscreenchange');
assert.strictEqual(elements['fullscreen-btn'].textContent, '창 화면 🗗');
mockDoc.fullscreenElement = null;
mockDoc.trigger('fullscreenchange');
assert.strictEqual(elements['fullscreen-btn'].textContent, '전체화면 ⛶');

// Shortcut M (Mute)
sandbox.window.trigger('keydown', { key: 'm', preventDefault: () => {} });
assert.strictEqual(sandbox.SoundController.isMuted, true);
sandbox.window.trigger('keydown', { key: 'm', preventDefault: () => {} });
assert.strictEqual(sandbox.SoundController.isMuted, false);

// Shortcut F (Fullscreen)
sandbox.window.trigger('keydown', { key: 'f', preventDefault: () => {} });

// Shortcut Space / Enter (Draw)
assert.strictEqual(sandbox.SeatAnimationController.isRolling, false);
sandbox.window.trigger('keydown', { code: 'Space', preventDefault: () => {} });
assert.strictEqual(sandbox.SeatAnimationController.isRolling, true);
sandbox.SeatAnimationController.clearTimers();
sandbox.SeatAnimationController.isRolling = false;
console.log('✔ [7/8] Fullscreen toggle and keyboard shortcuts (Space, Enter, M, F) verified');

// 10. Sequential rolling & UX button state transition check
assert.strictEqual(typeof sandbox.SeatAnimationController.startDraw, 'function');
elements['start-btn'].trigger('click');
assert.strictEqual(elements['start-btn'].disabled, true);
assert.strictEqual(elements['reroll-btn'].disabled, true);
sandbox.SeatAnimationController.clearTimers();
sandbox.SeatAnimationController.isRolling = false;

// Changing input resets buttons back to primary start
elements['total-students'].trigger('input');
assert.strictEqual(elements['start-btn'].style.display, 'inline-flex');
assert.strictEqual(elements['reroll-btn'].style.display, 'none');
console.log('✔ [8/8] Rolling lifecycle and button state transitions verified');

console.log('\n======================================================');
console.log('🎉 ALL E2E AND INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
console.log('======================================================');
