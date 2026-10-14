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

const elements = {};
const mockDoc = {
  getElementById: (id) => {
    if (!elements[id]) {
      elements[id] = {
        id,
        value: id === 'total-students' ? '24' : id === 'group-count' ? '6' : '',
        classList: {
          add: () => {},
          remove: () => {}
        },
        addEventListener: () => {},
        setAttribute: () => {},
        appendChild: () => {}
      };
    }
    return elements[id];
  },
  createElement: (tag) => ({
    tag,
    setAttribute: () => {},
    appendChild: () => {},
    classList: { add: () => {}, remove: () => {} }
  }),
  createDocumentFragment: () => ({
    appendChild: () => {}
  })
};

const sandbox = {
  document: mockDoc,
  console,
  parseInt,
  isNaN,
  Math,
  Array,
  Uint32Array,
  crypto: crypto.webcrypto
};

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

console.log('All index.html integrity checks passed successfully!');
