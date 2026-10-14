const assert = require('assert');
const { validateInputs, distributeGroups, generateShuffledSeats } = require('../src/core');

console.log('Running Task 1 tests...');

// 1. Validation Tests
assert.deepStrictEqual(validateInputs(24, 6), { valid: true });
assert.strictEqual(validateInputs(5, 6).valid, false); // 학생수 < 모둠수
assert.strictEqual(validateInputs(1, 1).valid, false); // 학생수 < 2
assert.strictEqual(validateInputs(61, 5).valid, false); // 학생수 > 60
assert.strictEqual(validateInputs(20, 0).valid, false); // 모둠수 < 1
assert.strictEqual(validateInputs(20, 13).valid, false); // 모둠수 > 12
assert.deepStrictEqual(validateInputs('24', '6'), { valid: true }); // 문자열 입력 지원

// 2. Group Distribution Tests
const dist = distributeGroups(25, 6);
assert.strictEqual(dist.length, 6);
const totalAssigned = dist.reduce((acc, g) => acc + g.count, 0);
assert.strictEqual(totalAssigned, 25);
assert.strictEqual(dist[0].count, 5); // 앞쪽 1개 모둠은 5명
assert.strictEqual(dist[1].count, 4); // 나머지 5개 모둠은 4명

// String input check
const distStr = distributeGroups('25', '6');
assert.strictEqual(distStr.length, 6);
assert.strictEqual(distStr[0].count, 5);

// 3. Shuffled Seats & Number Integrity Tests
const result = generateShuffledSeats(30, 5);
assert.strictEqual(result.length, 5);
const allNumbers = [];
result.forEach(group => {
  assert.strictEqual(group.seats.length, 6);
  group.seats.forEach(s => allNumbers.push(s.studentNumber));
});
assert.strictEqual(allNumbers.length, 30);
const uniqueNumbers = new Set(allNumbers);
assert.strictEqual(uniqueNumbers.size, 30);
for (let i = 1; i <= 30; i++) {
  assert.ok(uniqueNumbers.has(i), `Number ${i} should be present`);
}

console.log('All Task 1 tests passed successfully!');
