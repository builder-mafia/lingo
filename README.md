# Lingo

배운 것을 모아두고, 자신의 말로 다시 설명하며 이해를 확인하는 local-first 학습 도구입니다.

AI 에이전트와 스킬은 `lingo` CLI로 노트와 질문을 만들고, 사용자는 localhost 브라우저에서 답합니다. 답변과 피드백은 내 컴퓨터의 SQLite에 쌓이며 Lingo 자체는 특정 AI provider를 호출하지 않습니다.

```text
AI agent / skill ── lingo CLI ── local SQLite
                                      │
User ─────────── browser UI ──────────┘
```

## Installation

macOS와 Linux에서 최신 GitHub Release를 설치합니다. Bun이나 Node.js는 필요하지 않습니다.

```bash
curl -fsSL https://raw.githubusercontent.com/builder-mafia/lingo/main/install.sh | sh
```

기본 설치 경로는 `~/.local/bin/lingo`입니다. 이 디렉터리가 `PATH`에 없다면 사용하는 셸 설정에 다음 내용을 추가합니다.

```bash
export PATH="$HOME/.local/bin:$PATH"
```

특정 버전이나 다른 설치 경로도 선택할 수 있습니다.

```bash
curl -fsSL https://raw.githubusercontent.com/builder-mafia/lingo/main/install.sh | \
  sh -s -- --version v0.5.0 --install-dir "$HOME/bin"
```

설치 스크립트는 운영체제와 CPU에 맞는 실행 파일을 선택하고 `SHA256SUMS`로 검증한 뒤 기존 `lingo`를 교체합니다.

지원 환경:

- macOS Apple Silicon, macOS Intel
- Linux arm64, Linux x64

설치가 끝나면 사용 가능한 명령을 바로 확인할 수 있습니다.

```bash
lingo --help
```

### Update

설치 스크립트로 받은 독립 실행 파일은 다음 명령으로 최신 stable GitHub Release까지 업데이트합니다.

```bash
lingo --update
```

새 버전이 있으면 다음과 같이 이전 버전과 설치된 버전을 반환합니다.

```json
{
  "ok": true,
  "data": {
    "updated": true,
    "previousVersion": "0.4.0",
    "version": "0.5.0"
  }
}
```

이미 최신 버전이면 실행 파일을 변경하지 않습니다.

```json
{
  "ok": true,
  "data": {
    "updated": false,
    "version": "0.5.0"
  }
}
```

업데이트는 현재 운영체제와 CPU에 맞는 자산 및 `SHA256SUMS`를 검증하고, 내려받은 실행 파일의 버전을 확인한 뒤 원래 파일을 원자적으로 교체합니다. 실패하면 기존 실행 파일을 보존하고 단계, URL, 응답 등 진단 정보를 JSON 오류의 `details`에 담습니다. 소스에서 `bun run`으로 실행한 Lingo와 심볼릭 링크·쓰기 권한이 없는 실행 파일은 직접 교체하지 않습니다.

### Agent Skill

Codex, Claude Code, Cursor 등에서 Lingo CLI를 올바른 학습 흐름으로 사용할 수 있도록 agent skill을 함께 제공합니다.

```bash
npx skills add builder-mafia/lingo --skill lingo
```

이 명령은 agent용 지침을 설치합니다. 실제 `lingo` 실행 파일은 위 설치 스크립트로 별도 설치해야 합니다. 모든 프로젝트에서 사용하려면 `-g`를 추가할 수 있습니다.

## Quick Start

### 1. 브라우저 작업공간 열기

```bash
lingo start
```

Lingo는 localhost 서버를 열고 접속 주소를 JSON으로 반환합니다.

```json
{
  "ok": true,
  "data": {
    "serverUrl": "http://127.0.0.1:4312"
  }
}
```

명령을 실행한 터미널은 서버를 유지하기 위해 계속 열어둡니다. 브라우저에서 `serverUrl`을 열고, 아래 CLI 명령은 다른 터미널에서 실행합니다.

### 2. 첫 노트 만들기

```bash
lingo note create --data '{
  "title": "캐시 무효화 이해하기",
  "labels": ["Backend", "Architecture"]
}'
```

성공 응답의 `data.noteId`를 이후 명령의 `<note-id>`에 사용합니다. `data.noteUrl`을 열면 해당 노트로 바로 이동합니다.

```json
{
  "ok": true,
  "data": {
    "noteId": "<note-id>",
    "title": "캐시 무효화 이해하기",
    "labels": ["Backend", "Architecture"],
    "createdAt": "2026-07-18T12:00:00.000Z",
    "noteUrl": "http://127.0.0.1:4312/notes/<note-id>"
  }
}
```

### 3. 내용과 질문 쌓기

```bash
lingo note content set <note-id> --data '{
  "content": "캐시 무효화는 캐시된 값과 원본 데이터의 일관성을 언제, 어떻게 맞출지 결정하는 문제입니다.\n\n- **TTL**은 오래된 값이 남을 수 있는 시간을 제한합니다.\n- **명시적 무효화**는 원본 변경에 반응해 캐시를 갱신합니다."
}'
```

```bash
lingo question add <note-id> --data '{
  "question": "캐시 무효화가 어려운 이유를 자신의 말로 설명해보세요.",
  "referenceAnswer": "원본 변경 시점과 캐시 갱신 시점이 어긋나면 오래된 값이 노출되며, 동시 요청과 실패 상황까지 고려해야 하기 때문이다."
}'
```

이제 브라우저의 노트 작업공간에서 질문을 열고 답할 수 있습니다.

### 체계적인 코스 만들기

하나의 주제가 아니라 큰 도메인을 순서대로 학습하려면 코스를 만듭니다. 각 장은 기존 노트와 같은 학습 단위라서 Markdown 내용, 주관식·객관식 질문, 답변과 피드백 흐름을 그대로 사용합니다.

```bash
lingo course create --data '{
  "title": "Effect 핵심 이해하기",
  "goal": "동기·비동기 Effect와 오류 모델을 설명하고 실제 코드에 적용한다.",
  "chapters": [
    {
      "title": "동기 Effect",
      "objective": "Effect.succeed, Effect.fail, Effect.sync의 실행 모델을 구분한다.",
      "labels": ["Effect", "Basics"]
    },
    {
      "title": "비동기 Effect",
      "objective": "비동기 작업의 성공, 실패, 취소 흐름을 설명한다.",
      "labels": ["Effect", "Async"]
    }
  ]
}'
```

Lingo는 코스와 장별 노트를 한 번에 만들고 `courseUrl`과 각 장의 `noteId`를 반환합니다. AI 에이전트나 스킬은 각 `noteId`에 기존 `note content set`, `question add` 명령으로 학습 자료를 채웁니다. 브라우저의 `코스`에서 전체 경로를 보고, 어느 장이든 자유롭게 열 수 있습니다.

## How It Works

Lingo는 AI와 사용자가 서로 다른 인터페이스를 사용하도록 역할을 나눕니다.

1. AI 에이전트나 스킬이 대화에서 배운 내용을 `lingo` CLI로 정리합니다.
2. 노트 내용과 질문이 로컬 SQLite에 저장됩니다.
3. 사용자는 `lingo start`로 연 브라우저에서 질문에 자신의 말로 답합니다.
4. 외부 AI 에이전트가 평가할 답변을 CLI로 읽고 피드백을 다시 저장합니다.
5. 사용자는 브라우저에서 피드백을 확인하고 다시 답하거나 질문을 정리합니다.

Lingo는 답변을 대신 만들거나 AI provider를 선택하지 않습니다. Codex, Claude Code, Cursor 또는 다른 도구가 Lingo를 호출할 수 있지만, 로컬 앱은 어느 provider를 사용했는지 알 필요가 없습니다.

## Commands

`lingo --help`만 사람이 읽는 텍스트를 출력하며, 나머지 CLI 응답은 JSON입니다. 실패하면 JSON 오류를 stderr에 출력하고 0이 아닌 종료 코드를 반환합니다.

| 목적 | 명령 |
| --- | --- |
| 전체 도움말 | `lingo --help` 또는 `lingo -h` |
| 버전 확인 | `lingo --version` |
| 최신 stable 버전으로 업데이트 | `lingo --update` |
| 브라우저 작업공간 열기 | `lingo start` |
| 순서 있는 코스와 장별 노트 만들기 | `lingo course create (--data <json> \| --data-file <path>)` |
| 노트 만들기 | `lingo note create (--data <json> \| --data-file <path>)` |
| 노트 내용 저장 | `lingo note content set <note-id> (--data <json> \| --data-file <path>)` |
| 노트 내용 조회 | `lingo note content get <note-id>` |
| 질문 추가 | `lingo question add <note-id> (--data <json> \| --data-file <path>)` |
| 주관식 답변 저장 | `lingo answer set <question-id> (--data <json> \| --data-file <path>)` |
| 평가가 필요한 답변 조회 | `lingo answer list <note-id>` |
| AI 피드백 저장 | `lingo evaluation set <question-id> (--data <json> \| --data-file <path>)` |

### Notes

노트에는 필수 제목과 선택 라벨을 저장합니다. 라벨의 앞뒤 공백과 중복은 자동으로 제거됩니다.

```bash
lingo note create --data '{
  "title": "좋은 API 경계 설계하기",
  "labels": ["API", "Design"]
}'
```

내용은 현재 이해에 맞게 언제든 전체를 갱신할 수 있습니다.

```bash
lingo note content set <note-id> --data '{
  "content": "API 경계를 설계할 때는 변경 이유가 다른 책임을 분리하고, 각 책임을 안정적인 계약으로 연결합니다."
}'
```

기존 내용을 더 깊게 정리할 때는 먼저 현재 본문을 읽습니다.

```bash
lingo note content get <note-id>
```

### Subjective Questions

`referenceAnswer`가 있으면 주관식 질문으로 저장됩니다.

```bash
lingo question add <note-id> --data '{
  "question": "이 API에서 인증과 권한 검사를 분리해야 하는 이유는 무엇인가요?",
  "referenceAnswer": "인증은 사용자의 신원을 확인하고 권한 검사는 해당 사용자의 행동 가능 범위를 판단하므로 변경 이유가 다르다."
}'
```

브라우저 UI가 답변을 저장하지만 CLI에서도 같은 답변을 저장하거나 갱신할 수 있습니다.

```bash
lingo answer set <question-id> --data '{
  "content": "신원을 확인하는 일과 허용된 행동을 판단하는 일은 서로 다른 정책에 따라 바뀌기 때문이다."
}'
```

### Multiple-choice Questions

`choices`와 `correctId`가 있으면 객관식 질문으로 저장됩니다. `correctId`는 정답 선택지의 `order`를 가리킵니다.

```bash
lingo question add <note-id> --data '{
  "question": "HTTP 401과 403을 가장 잘 구분한 설명은 무엇인가요?",
  "choices": [
    {
      "order": 1,
      "option": "401은 인증이 필요하고 403은 권한이 부족하다",
      "explanation": "신원 확인 여부와 접근 권한 여부를 구분한다."
    },
    {
      "order": 2,
      "option": "두 상태 코드는 항상 같은 의미다",
      "explanation": "인증과 권한 실패는 서로 다른 상황이다."
    }
  ],
  "correctId": 1
}'
```

### AI Evaluation

외부 AI 에이전트는 아직 피드백이 없는 주관식 답변을 읽습니다.

```bash
lingo answer list <note-id>
```

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

평가가 끝나면 피드백을 저장합니다.

```bash
lingo evaluation set <question-id> --data '{
  "feedback": "인증과 권한의 변경 이유를 잘 구분했습니다. 여러 역할이 하나의 리소스에 접근할 때 정책이 어떻게 달라지는지도 설명해보세요."
}'
```

피드백을 저장한 답변은 다음 `answer list <note-id>` 결과에서 제외됩니다.

## Structured Input

JSON 입력이 필요한 명령은 다음 중 정확히 하나를 사용합니다.

- `--data '<JSON string>'`
- `--data-file <JSON file path>`

긴 입력은 JSON 파일로 관리할 수 있습니다.

```json
{
  "question": "낙관적 잠금은 어떤 충돌을 방지하나요?",
  "referenceAnswer": "읽은 이후 다른 요청이 값을 변경했는지 버전으로 확인해 덮어쓰기를 방지한다."
}
```

```bash
lingo question add <note-id> --data-file ./question.json
```

`--data`와 `--data-file`을 함께 사용하거나 같은 플래그를 두 번 전달하면 명령이 실패합니다.

입력 규칙:

- 모든 ID는 UUID입니다.
- 코스에는 순서 있는 장이 2개 이상 필요하며 각 장은 제목과 학습 목표를 가집니다.
- 제목, 내용, 질문, 답변, 피드백은 빈 문자열일 수 없습니다.
- 객관식 질문은 선택지가 2개 이상이어야 합니다.
- `choices[].order`는 중복되지 않는 양의 정수입니다.
- `correctId`는 실제 `choices[].order` 중 하나여야 합니다.
- 객관식은 `choices`와 `correctId`, 주관식은 `referenceAnswer`를 전달합니다.

## Local Data and Privacy

- 모든 노트, 질문, 답변, 피드백은 기본적으로 `~/.lingo/lingo.sqlite`에 저장됩니다.
- `lingo start`는 외부 네트워크가 아닌 `127.0.0.1:4312`에만 서버를 엽니다.
- 실행 파일을 업데이트해도 로컬 데이터베이스는 유지됩니다.
- Lingo 앱은 AI provider의 API 키나 계정을 요구하지 않습니다.
- 답변 평가에 어떤 AI를 사용할지와 어떤 데이터를 전달할지는 Lingo를 호출하는 사용자 또는 스킬이 결정합니다.

포트를 변경하려면 `LINGO_PORT`를 지정합니다.

```bash
LINGO_PORT=4400 lingo start
```

## Development

소스에서 개발할 때만 Bun이 필요합니다.

```bash
git clone https://github.com/builder-mafia/lingo.git
cd lingo
bun install --frozen-lockfile
bun test
bun run typecheck
```

로컬 API 서버와 Vite UI를 함께 실행합니다.

```bash
bun run dev:ui
```

기본 주소는 UI `http://127.0.0.1:5173`, API `http://127.0.0.1:4312`입니다. `LINGO_UI_PORT`와 `LINGO_PORT`로 각각 변경할 수 있습니다.

독립 실행 파일을 현재 플랫폼용으로 빌드합니다.

```bash
bun run build:binary
```

지원하는 다른 플랫폼을 지정할 수도 있습니다.

```bash
bun run build:binary --target bun-darwin-arm64 --outfile dist/bin/lingo-darwin-arm64
bun run build:binary --target bun-darwin-x64 --outfile dist/bin/lingo-darwin-x64
bun run build:binary --target bun-linux-arm64 --outfile dist/bin/lingo-linux-arm64
bun run build:binary --target bun-linux-x64-baseline --outfile dist/bin/lingo-linux-x64
```

## Release

릴리스할 버전으로 `package.json`을 갱신하고 `main`에 머지한 뒤 release 명령을 실행합니다. 명령은 현재 버전으로 annotated tag를 만들고 원격에 push합니다.

```bash
git switch main
git pull --ff-only
bun run release --dry-run
bun run release
```

release 명령은 작업 트리가 깨끗한지, 로컬 `main`이 `origin/main`과 같은지, 같은 버전 태그가 이미 존재하는지 검사합니다. 마지막 확인을 생략해야 하는 자동화 환경에서는 `bun run release --yes`를 사용합니다.

Release 워크플로는 전체 테스트와 타입 검사를 통과한 뒤 macOS·Linux의 arm64·x64 실행 파일, `SHA256SUMS`, artifact attestation을 게시합니다.

## Architecture

```text
src/
├── cli/commands/  # CLI use cases
├── layers/        # Effect services and Live Layers
├── schemas/       # Zod domain contracts
├── server/        # Hono localhost API and UI server
├── ui/            # Vite + React browser app
├── cli.ts         # CLI entry point
└── runtime.ts     # Effect Layer composition
```

- [Product requirements](./docs/requirements.md)
- [Design system](./docs/design.md)
- [UI architecture](./docs/ui-architecture.md)
