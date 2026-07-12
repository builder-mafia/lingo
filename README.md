# Lingo

로컬 우선 노트·문제 풀이 앱입니다. 스킬은 `lingo` CLI로 노트와 문제를 만들고, 사용자는 이후 localhost 브라우저 UI에서 문제를 풉니다.

## 현재 구현 범위

- Bun + TypeScript 실행 환경
- Effect 기반 CLI 실행 흐름 및 오류 처리
- Bun 내장 SQLite 기반 로컬 note 영속성
- `lingo note create`로 빈 노트 생성 및 localhost URL 반환
- `lingo note summary set`으로 노트 요약 저장·갱신
- Zod 기반 노트·요약·객관식 문제 스키마
- `--data` 인라인 JSON 및 `--data-file` JSON 파일 입력
- 객관식 선택지의 `order`, `option`, `explanation` 및 `correctId` 무결성 검증

## 사용법

```bash
bun install
bun run ./src/cli.ts note create
```

성공하면 로컬 SQLite에 저장된 `noteId`와 이후 브라우저 UI에서 열 URL을 JSON으로 반환합니다. 데이터베이스는 기본적으로 `~/.lingo/lingo.sqlite`에 생성됩니다.

노트 요약은 JSON 문자열 또는 JSON 파일로 저장·갱신할 수 있습니다.

```bash
bun run ./src/cli.ts note summary set <note-id> --data '{"content":"노트의 핵심 요약"}'
```

객관식 입력 검증 예시:

```bash
bun run ./src/cli.ts problem multiple-choice validate --data '{
  "question": "고객 문제를 검증하는 첫 행동은 무엇인가요?",
  "choices": [
    {
      "order": 1,
      "option": "기능을 전부 구현한다",
      "explanation": "고객 문제를 검증하기 전 구현부터 시작하면 불필요한 기능을 만들 위험이 큽니다."
    },
    {
      "order": 2,
      "option": "잠재 고객을 인터뷰한다",
      "explanation": "정답입니다. 실제 문제와 현재 행동을 확인해 가설을 검증할 수 있습니다."
    }
  ],
  "correctId": 2
}'
```

JSON 파일도 지원합니다.

```bash
bun run ./src/cli.ts problem multiple-choice validate --data-file ./problem.json
```

## 검증 규칙

- 객관식 문제는 선택지가 2개 이상이어야 합니다.
- `choices[].order`는 양의 정수이며 중복될 수 없습니다.
- `option`과 `explanation`은 비어 있을 수 없습니다.
- `correctId`는 반드시 하나의 `choices[].order` 값이어야 합니다.
- `--data`와 `--data-file`은 동시에 사용할 수 없습니다.

## 구조

```text
src/
├── cli/
│   ├── commands/       # 단일 CLI 유스케이스
│   ├── errors.ts       # 애플리케이션 오류 모델·표현
│   └── run.ts          # 명령 라우팅
├── cli.ts              # 실행 진입점
├── runtime.ts          # 공유 Layer를 조립한 AppRuntime
├── layers/             # 재사용 가능한 Effect 서비스와 Live Layers
│   ├── database.ts
│   └── json-input.ts
└── schemas/            # 모든 Zod 도메인 스키마
    ├── multiple-choice.ts
    ├── note-summary.ts
    └── note.ts

tests/
├── cli/
└── schemas/
```

`schemas/`는 도메인 데이터 계약만 담당합니다. CLI 입력 처리, 명령 라우팅, 오류 표현은 각각 별도 파일로 분리해 단일 책임 원칙을 유지합니다.

## 개발

```bash
bun test
bun run typecheck
```
