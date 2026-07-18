# Lingo

로컬 우선 노트·질문 풀이 앱입니다. 스킬은 `lingo` CLI로 노트·질문·답변·평가를 SQLite에 저장하고, 사용자는 이후 localhost 브라우저 UI에서 질문에 답합니다.

- 기본 데이터베이스: `~/.lingo/lingo.sqlite`
- 모든 응답: JSON
- 구조화 입력: `--data '<JSON>'` 또는 `--data-file <파일>` 중 **하나만** 사용

## 빠른 시작

```bash
bun install
bun run build:ui
bun run ./src/cli.ts start
```

서버는 `http://127.0.0.1:4312`에서 실행됩니다. 다른 터미널에서 노트를 만듭니다.

```bash
bun run ./src/cli.ts note create --data '{
  "title": "고객 문제 가설 검증",
  "labels": ["Product", "Interview"]
}'
```

성공하면 새 노트의 ID와 localhost URL을 반환합니다.

```json
{
  "ok": true,
  "data": {
    "noteId": "<note-id>",
    "title": "고객 문제 가설 검증",
    "labels": ["Product", "Interview"],
    "createdAt": "2026-07-16T12:00:00.000Z",
    "noteUrl": "http://127.0.0.1:4312/notes/<note-id>"
  }
}
```

아래 예시에서는 이 값을 `<note-id>`로 표기합니다.

## CLI 명령 한눈에 보기

| 목적 | 명령 |
| --- | --- |
| 로컬 서버 실행 | `lingo start` |
| 노트 만들기 | `lingo note create --data <json>` |
| 노트 요약 저장 | `lingo note summary set <note-id>` |
| 객관식/주관식 질문 추가 | `lingo question add <note-id>` |
| 주관식 답변 저장 | `lingo answer set <question-id>` |
| 아직 평가되지 않은 답변 조회 | `lingo answer list <note-id>` |
| AI 평가 결과 저장 | `lingo evaluation set <question-id>` |

명령은 리소스 중심으로 짧게 유지합니다. 질문 종류는 별도의 `--type`이 아니라 입력 JSON의 구조로 판별합니다.

## 로컬 서버 실행

```bash
bun run ./src/cli.ts start
```

서버가 준비되면 다음 JSON을 출력하고 종료하지 않은 채 localhost 요청을 기다립니다.

```json
{
  "ok": true,
  "data": {
    "serverUrl": "http://127.0.0.1:4312"
  }
}
```

출력된 `serverUrl`을 브라우저에서 열면 Lingo의 Understanding Map 화면을 볼 수 있습니다. `GET /health`는 서버 준비 상태를 JSON으로 반환합니다. 서버는 외부 네트워크에 공개되지 않도록 `127.0.0.1`에만 바인딩됩니다.

## Practice: 노트부터 평가까지

### 1. 노트 만들기

```bash
bun run ./src/cli.ts note create --data '{
  "title": "고객 문제 가설 검증",
  "labels": ["Product", "Interview"]
}'
```

출력의 `data.noteId`를 다음 단계의 `<note-id>` 자리에 넣습니다.

### 2. 요약 저장하기

```bash
bun run ./src/cli.ts note summary set <note-id> --data '{
  "content": "고객 인터뷰로 사업 아이디어의 문제 가설을 검증하는 연습 노트"
}'
```

### 3. 객관식 질문 추가하기

`choices`가 있으면 Lingo가 객관식 질문으로 저장합니다.

```bash
bun run ./src/cli.ts question add <note-id> --data '{
  "question": "고객 문제를 검증하는 첫 행동은 무엇인가요?",
  "choices": [
    {
      "order": 1,
      "option": "기능을 전부 구현한다",
      "explanation": "문제를 확인하기 전에 구현부터 시작하면 불필요한 기능을 만들 위험이 큽니다."
    },
    {
      "order": 2,
      "option": "잠재 고객을 인터뷰한다",
      "explanation": "실제 문제와 현재 행동을 확인해 가설을 검증할 수 있습니다."
    }
  ],
  "correctId": 2
}'
```

출력의 `data.questionId`를 `<question-id>`로 사용합니다.

### 4. 주관식 질문 추가하기

`referenceAnswer`가 있으면 Lingo가 주관식 질문으로 저장합니다.

```bash
bun run ./src/cli.ts question add <note-id> --data '{
  "question": "고객 인터뷰에서 확인할 핵심 가설을 한 문장으로 작성하세요.",
  "referenceAnswer": "누가 어떤 상황에서 어떤 비용이나 불편을 반복적으로 겪는지 확인한다."
}'
```

### 5. 주관식 답변 저장하기

```bash
bun run ./src/cli.ts answer set <question-id> --data '{
  "content": "초기 창업자는 고객이 시간을 많이 쓰는 반복 업무를 겪는지 먼저 인터뷰로 확인해야 한다."
}'
```

같은 `<question-id>`로 다시 실행하면 답변을 새 내용으로 갱신합니다.

### 6. AI 평가 대상 답변 읽기

스킬은 이 JSON을 읽은 뒤 Lingo 밖에서 원하는 AI를 사용해 평가합니다.

```bash
bun run ./src/cli.ts answer list <note-id>
```

반환값에는 평가에 필요한 질문과 답변 문맥이 들어 있습니다.

```json
{
  "ok": true,
  "data": [
    {
      "questionId": "<question-id>",
      "question": "...",
      "referenceAnswer": "...",
      "answer": "..."
    }
  ]
}
```

### 7. AI 평가 결과 저장하기

Lingo는 AI provider를 직접 호출하지 않습니다. 스킬이 만든 feedback만 저장합니다.

```bash
bun run ./src/cli.ts evaluation set <question-id> --data '{
  "feedback": "핵심 방향은 맞습니다. 고객이 실제로 겪는 반복 업무와 현재 해결 방법을 더 구체적으로 적어 보세요."
}'
```

평가를 저장한 답변은 다음 `answer list <note-id>` 결과에서 제외됩니다.

## JSON 파일 입력

긴 입력은 파일로 관리할 수 있습니다.

```bash
cat > question.json <<'JSON'
{
  "question": "가설 검증에 가장 먼저 확인할 것은 무엇인가요?",
  "referenceAnswer": "대상 고객이 문제를 실제로 반복 경험하는지 확인한다."
}
JSON

bun run ./src/cli.ts question add <note-id> --data-file ./question.json
```

`--data`와 `--data-file`은 동시에 사용할 수 없으며, 같은 플래그를 두 번 사용할 수도 없습니다.

## 입력 검증 규칙

- 모든 ID는 UUID여야 합니다.
- 노트 `title`은 필수이며 공백일 수 없습니다.
- 노트 `labels`는 선택 사항입니다. 각 label의 앞뒤 공백과 중복은 제거됩니다.
- 요약·답변·feedback·질문 문장은 비어 있을 수 없습니다.
- 객관식 질문은 선택지가 2개 이상이어야 합니다.
- `choices[].order`는 양의 정수이며 중복될 수 없습니다.
- `correctId`는 반드시 하나의 `choices[].order` 값이어야 합니다.
- `choices`와 `referenceAnswer`를 모두 넣지 말고, 만들려는 질문 형태에 맞는 JSON만 전달합니다.

## 개발

```bash
bun test
bun run typecheck
bun run build:binary
```

UI를 수정할 때는 하나의 명령으로 로컬 API 서버와 Vite 개발 서버를 함께
실행합니다. 이미 `lingo start`가 실행 중이면 해당 서버를 재사용합니다.

```bash
bun run dev:ui
```

기본 주소는 UI `http://127.0.0.1:5173`, API `http://127.0.0.1:4312`입니다.
필요하면 `LINGO_UI_PORT`와 `LINGO_PORT`로 각각 변경할 수 있습니다.

배포용 UI는 `bun run build:ui`로 `dist/ui`에 생성됩니다. `bun run build:binary`는 UI, Bun 런타임, CLI와 서버 코드를 `dist/bin/lingo` 단일 실행 파일에 포함합니다. 따라서 배포된 `lingo start`는 Bun이나 프론트엔드 빌드 환경 없이 실행됩니다. 사용자 데이터베이스는 실행 파일에 포함하지 않고 `~/.lingo/lingo.sqlite`에 유지합니다.

릴리스 대상과 출력 경로도 지정할 수 있습니다.

```bash
bun run build:binary --target bun-darwin-arm64 --outfile dist/bin/lingo-darwin-arm64
bun run build:binary --target bun-darwin-x64 --outfile dist/bin/lingo-darwin-x64
bun run build:binary --target bun-linux-arm64 --outfile dist/bin/lingo-linux-arm64
bun run build:binary --target bun-linux-x64-baseline --outfile dist/bin/lingo-linux-x64
```

실행 파일에 포함된 버전은 다음 명령으로 JSON 형태로 확인합니다.

```bash
lingo --version
```

## 구조

```text
src/
├── cli/commands/  # 단일 CLI 유스케이스
├── cli.ts         # 실행 진입점
├── runtime.ts     # 공유 Effect Layer를 조립한 AppRuntime
├── layers/        # SQLite·JSON 입력 같은 재사용 서비스
├── schemas/       # Zod 도메인 계약
├── server/        # Hono 앱과 HTTP 라우팅
└── ui/            # Vite 기반 React 브라우저 앱
```

`schemas/`는 도메인 계약만 담당합니다. 입력 처리, 명령 라우팅, 저장소, 오류 표현은 별도 책임으로 분리합니다.
