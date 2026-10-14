function validateInputs(totalStudents, groupCount) {
  const students = parseInt(totalStudents, 10);
  const groups = parseInt(groupCount, 10);

  if (isNaN(students) || isNaN(groups)) {
    return { valid: false, error: '숫자를 올바르게 입력해 주세요.' };
  }
  if (students < 2 || students > 60) {
    return { valid: false, error: '학생 수는 2명 이상 60명 이하이어야 합니다.' };
  }
  if (groups < 1 || groups > 12) {
    return { valid: false, error: '모둠 수는 1개 이상 12개 이하이어야 합니다.' };
  }
  if (students < groups) {
    return { valid: false, error: '학생 수는 모둠 수보다 크거나 같아야 합니다.' };
  }
  return { valid: true };
}

function distributeGroups(totalStudents, groupCount) {
  const students = parseInt(totalStudents, 10);
  const groups = parseInt(groupCount, 10);
  const base = Math.floor(students / groups);
  const remainder = students % groups;
  const result = [];

  for (let i = 0; i < groups; i++) {
    const count = i < remainder ? base + 1 : base;
    result.push({
      groupId: i + 1,
      name: `제 ${i + 1} 모둠`,
      count
    });
  }
  return result;
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    let j;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      j = buf[0] % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateShuffledSeats(totalStudents, groupCount) {
  const students = parseInt(totalStudents, 10);
  const groups = parseInt(groupCount, 10);
  const groupsInfo = distributeGroups(students, groups);
  const numbers = Array.from({ length: students }, (_, i) => i + 1);
  const shuffledNumbers = shuffleArray(numbers);

  let numIndex = 0;
  return groupsInfo.map(group => {
    const seats = [];
    for (let s = 0; s < group.count; s++) {
      seats.push({
        seatIndex: s + 1,
        studentNumber: shuffledNumbers[numIndex++]
      });
    }
    return {
      groupId: group.groupId,
      name: group.name,
      seats
    };
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateInputs, distributeGroups, shuffleArray, generateShuffledSeats };
}
