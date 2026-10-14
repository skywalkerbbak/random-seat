# 우리 반 자리 뽑기 웹앱 설계 명세서 (Design Spec)

- **문서 작성일**: 2026-10-14
- **대상 프로젝트**: 우리 반 자리 뽑기 웹앱 (Classroom Random Seat Picker)
- **대상 파일**: `index.html` (단일 자립형 웹 애플리케이션)

---

## 1. 개요 및 목적 (Overview & Goals)
본 프로젝트는 초·중·고등학교 교실의 전자칠판, 교사용 PC, 태블릿 등 다양한 환경에서 별도의 설치(`node`, `npm` 등)나 인터넷 연결(외부 CDN) 없이, 단일 HTML 파일을 더블 클릭하여 바로 실행할 수 있는 **교실용 모둠 자리 뽑기 웹 애플리케이션**을 제작하는 것을 목적으로 한다.

학생들의 기대감과 몰입도를 극대화하기 위해 슬롯머신 스타일의 고속 롤링 애니메이션, 순차적 멈춤 효과, Web Audio 기반 자체 합성 효과음, 축하 폭죽(Confetti) 연출을 제공하며, 학생 이름 대신 **번호로만** 깔끔하고 선명하게 표시한다.

---

## 2. 핵심 요구사항 (Core Requirements)
1. **입력 기능**:
   - 총 학생 수 (기본값 24, 범위 2 ~ 60)
   - 모둠 수 (기본값 6, 범위 1 ~ 12)
   - 학생 수/모둠 수 변경 시 실시간 모둠별 배치 인원 안내 (예: "4명씩 6개 모둠")
2. **추첨 및 애니메이션**:
   - 1번부터 N번까지 중복 없이 무작위 셔플 (Fisher-Yates 알고리즘 + `crypto.getRandomValues()`)
   - 시작 버튼 클릭 시 모든 좌석 카드의 번호가 40ms 간격으로 빠르게 롤링
   - 약 1.5초 후 1모둠부터 순서대로 0.4초 간격으로 각 모둠 좌석이 '착- 착-' 확정되는 순차 애니메이션
   - 모둠 확정 시 강조 팝업 애니메이션(`scale(1.15)`)
   - 마지막 모둠까지 확정 시 전체 화면 축하 색종이 폭죽(Confetti) 연출
3. **오프라인 100% 효과음 (Web Audio API)**:
   - 외부 오디오 파일 다운로드 없이 브라우저 내장 오실레이터로 실시간 합성:
     - 롤링 중 틱-틱 사운드
     - 모둠별 확정 타격음
     - 최종 완료 시 C Major 코드 팡파레
   - 음소거(Mute) 토글 버튼 제공 (소리 On/Off)
4. **결과 표시 및 컨트롤**:
   - 상단에 [ 칠판 / 교탁 ] 기준 바 표시
   - 모둠별 구분 카드 (파스텔 테마 배색, 모둠 명칭 `제 1 모둠` 등)
   - 각 좌석은 큼직한 번호 카드 (예: `15번`)
   - 추첨 완료 후 언제든 즉시 다시 뽑을 수 있는 `다시 뽑기` 버튼 활성화
   - 학생 이름은 포함하지 않고 번호로만 표시
5. **교실 친화적 편의 기능**:
   - 전체화면 토글 버튼 (`F` 키 지원)
   - 설정값 자동 저장 (`localStorage`)
   - 단축키 지원 (`Space`/`Enter`로 추첨/다시추첨, `M`으로 음소거)
   - A4 인쇄 최적화 CSS (`@media print`)

---

## 3. 상세 아키텍처 및 구현 설계 (Architecture & Implementation)

### 3.1 파일 구조
* 단일 파일: `index.html`
  - `<style>`: CSS 변수 기반 디자인 토큰, 반응형 그리드, 롤링 및 팝업 애니메이션, 인쇄 스타일
  - `<body>`: 헤더, 컨트롤 패널, 칠판 기준 바, 모둠 좌석 그리드, 캔버스 레이어
  - `<script>`: 상태 관리, 셔플 엔진, 오디오 신시사이저, 파티클 캔버스 엔진, 이벤트 리스너

### 3.2 데이터 구조 및 상태 관리
```javascript
const state = {
  totalStudents: 24,
  groupCount: 6,
  isRolling: false,
  isMuted: false,
  groups: [], // Array<{ groupId: number, name: string, seats: Array<{ id: number, currentNumber: number, finalNumber: number, isLocked: boolean }> }>
};
```

### 3.3 학생 번호 배분 알고리즘
1. `numbers = Array.from({ length: totalStudents }, (_, i) => i + 1)`
2. Fisher-Yates 셔플:
   ```javascript
   for (let i = numbers.length - 1; i > 0; i--) {
     const randBuf = new Uint32Array(1);
     crypto.getRandomValues(randBuf);
     const j = randBuf[0] % (i + 1);
     [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
   }
   ```
3. 모둠별 인원 분배:
   - 기본 인원: `base = Math.floor(totalStudents / groupCount)`
   - 나머지: `remainder = totalStudents % groupCount`
   - 앞쪽 `remainder`개 모둠에는 `base + 1`명, 나머지 모둠에는 `base`명 배정.

### 3.4 사운드 신시사이저 (Web Audio API)
- `AudioContext`를 사용자 인터랙션(버튼 클릭) 시점에 활성화.
- **Tick Sound**: 짧은 0.03초 펄스파/삼각파 (440Hz -> 220Hz 핑음).
- **Lock Sound**: 0.08초 사인파/삼각파 (587.33Hz D5 -> 880Hz A5 경쾌한 락인).
- **Fanfare**: `[523.25, 659.25, 783.99, 1046.50]` (C5, E5, G5, C6) 아르페지오 화음 합성.

### 3.5 자체 Canvas Confetti 엔진
- 오프라인 100% 동작을 위해 전체 화면 오버레이 `<canvas id="confetti-canvas">` 구비.
- 150여 개의 다채로운 파티클 생성 후 중력, 공기 저항, 3D 회전 효과를 적용하여 3초간 화려하게 흩날린 후 자동 소멸.

---

## 4. 예외 처리 및 에러 핸들링 (Error Handling)
1. `totalStudents < groupCount`: 모둠 수가 학생 수보다 많으면 경고 배너 표시 및 추첨 비활성화.
2. `totalStudents > 60` 또는 `groupCount > 12`: 최대값 초과 시 자동 클램핑.
3. 추첨 진행 중 버튼 중복 클릭 방지: `isRolling === true` 상태에서는 시작/다시뽑기 버튼 비활성화.
4. 브라우저 AudioContext 자동재생 제한 처리: 사용자 제스처 기반 컨텍스트 초기화 및 `resume()`.

---

## 5. 검증 기준 (Verification Criteria)
- [ ] 단일 `index.html` 파일로 외부 연결 없이 모든 기능(UI, 사운드, 폭죽, 롤링) 정상 동작
- [ ] 1번부터 N번까지 중복 번호가 전혀 없고 모든 번호가 정확히 1회씩 배정되는지 검증
- [ ] 모둠 수가 균등하게 나뉘지 않을 때(예: 25명 6모둠) 5명 모둠과 4명 모둠이 오차 없이 배정되는지 검증
- [ ] '다시 뽑기' 버튼으로 연속 추첨 시 상태가 정상 초기화되는지 확인
- [ ] 반응형 화면(창 크기 조절, 모바일/태블릿, 전체화면)에서 모둠 그리드가 깔끔하게 정렬되는지 확인
