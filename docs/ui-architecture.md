# Lingo UI Architecture

이 문서는 Lingo 브라우저 앱의 런타임, 라우팅, 상태, 컴포넌트 경계를 정의한다. 시각적 판단은 [`design.md`](./design.md)를 따른다.

## Architecture Decisions

### Vite + React Router

- Vite가 개발 서버, React 변환, CSS Modules, 코드 분할, 프로덕션 번들을 담당한다.
- React Router의 route object와 nested layout으로 URL, 페이지, 앱 셸의 관계를 명시한다.
- Next.js는 사용하지 않는다. Lingo UI에는 SSR, React Server Components, 원격 배포 런타임이 필요하지 않다.
- 페이지 모듈은 route 단위로 lazy-load할 수 있게 유지한다.

### Hono + Bun

- Hono가 `/health`, 향후 `/api/*`, 정적 자산, SPA fallback 라우팅을 담당한다.
- `Bun.serve`는 Hono의 `fetch` handler를 실행하고 서버 생명주기를 Effect에 연결하는 런타임 어댑터로만 사용한다.
- 브라우저 앱을 HTTP Layer에서 동적으로 빌드하거나 HTML 문자열로 조립하지 않는다.

### Build once, serve many

- 개발 중에는 Vite dev server가 HMR을 제공하고 `/api`와 `/health`를 `lingo start`에 proxy한다.
- 배포 전 `vite build`가 `dist/ui`에 hash된 HTML·JS·CSS를 만든다.
- npm·Homebrew 패키지는 `dist/ui`를 포함한다. 최종 사용자는 별도 Node 개발 서버나 프론트엔드 빌드 없이 `lingo start`만 실행한다.
- 서버는 보안을 위해 기본적으로 `127.0.0.1`에만 bind한다.

## Source Boundaries

```text
src/ui/
├── app/
│   ├── App.tsx                 # RouterProvider만 조립
│   ├── router.tsx              # 실제 route tree
│   └── route-paths.ts          # 링크용 URL 생성 함수
├── layouts/
│   └── app-shell/              # 공통 navigation과 Outlet
├── pages/
│   ├── understanding-map/      # / 페이지 조합
│   └── not-found/              # 알 수 없는 client route
├── features/
│   └── copy-note-command/      # 클립보드 상태와 상호작용
├── styles/
│   └── global.css              # token, reset, 문서 기본값
├── index.html                  # Vite HTML entry
└── main.tsx                    # React DOM entry

src/server/
└── local-web-app.ts            # Hono route와 static SPA 제공
```

경계는 파일 크기만으로 나누지 않는다.

- `app`: provider와 전역 조립만 담당하며 도메인 UI나 feature state를 갖지 않는다.
- `layouts`: 여러 route가 공유하는 지속적인 화면 구조만 담당한다.
- `pages`: route 하나의 읽기 순서와 feature 조합을 담당한다.
- `features`: 복사, 답변 제출처럼 상태를 가진 사용자 행동을 소유한다.
- 페이지 내부의 작은 정적 표현은 해당 page 폴더 안에 둔다.
- 재사용이 실제로 발생하기 전에는 범용 `components`나 전역 store로 승격하지 않는다.

## State Ownership

상태는 상태를 읽고 변경하는 가장 작은 feature에 둔다. 클립보드 상태가 변하면 `CopyNoteCommand`만 다시 렌더링되고 Understanding Map, App Shell, Router는 영향을 받지 않는 구조가 기준이다.

- 서버 데이터: route loader 또는 도메인별 query hook에서 읽는다.
- form·interaction 상태: 해당 feature component가 소유한다.
- URL로 표현 가능한 상태: path 또는 search params에 둔다.
- 전역 client store: 둘 이상의 멀리 떨어진 route가 동시에 읽고 수정해야 할 때만 도입한다.
- 서버 데이터 cache가 필요해지면 직접 전역 상태를 만들기보다 TanStack Query 같은 전용 도구를 검토한다.

`useMemo`, `memo`, 전역 store는 기본값이 아니다. 먼저 상태 구독 경계와 컴포넌트 책임을 작게 유지한다.

## Information Architecture

| Route | Page | Primary question |
| --- | --- | --- |
| `/` | Understanding Map | 지금 무엇을 이해하고 있고, 무엇을 다시 생각해야 하는가? |
| `/notes/:noteId` | Note Overview | 이 주제에서 현재 이해 상태와 다음 행동은 무엇인가? |
| `/notes/:noteId/session` | Question Session | 이 질문을 내 언어로 어떻게 설명할 수 있는가? |
| `/notes/:noteId/result` | Session Reflection | 이번 시도에서 어떤 빈틈과 변화가 드러났는가? |

route는 `app/router.tsx` 한 곳에서 선언하고, 링크는 `app/route-paths.ts`의 생성 함수를 사용한다. 서버는 모든 비 API GET deep link에 같은 `index.html`을 반환하며 실제 페이지 선택은 React Router가 담당한다.

초기 버전에서는 별도의 설정 페이지를 만들지 않는다. 사용자에게 반복적으로 필요한 설정이 생기기 전까지 앱 셸의 보조 메뉴에서 다룬다.

## Page Responsibilities

### App Shell

- 데스크톱에서는 왼쪽 사이드바가 현재 위치와 주요 화면을 보여준다.
- 본문은 읽기와 사고에 적합한 최대 너비를 유지한다.
- 좁은 화면에서는 사이드바를 상단 내비게이션으로 바꾼다.
- 포털 기반 Base UI 컴포넌트를 위해 앱 루트에 독립 stacking context를 둔다.

### Understanding Map

- 저장된 노트 수보다 현재 이해 상태와 다시 생각할 주제를 먼저 보여준다.
- 데이터가 없을 때는 첫 지적 탐험을 시작할 명확한 행동을 제공한다.

### Note Overview

- 노트 제목, label, 핵심 요약을 가장 먼저 읽을 수 있어야 한다.
- 질문 수와 답변 상태는 성과 수치가 아니라 탐험의 현재 위치로 표현한다.
- 주요 행동은 질문 세션 시작이며, 요약과 과거 답변은 보조 행동이다.

### Question Session

- 한 번에 하나의 질문과 하나의 주요 행동만 보여준다.
- 답변 영역은 긴 글을 방해 없이 작성할 수 있어야 한다.
- 설명을 바로 보는 선택권을 제공하되, 먼저 떠올려보는 이유를 안내한다.

### Session Reflection

- 점수보다 발견한 빈틈, 선명해진 설명, 다시 생각할 내용을 보여준다.
- 다시 답하기, 다른 질문으로 이동하기, 노트로 돌아가기 중 사용자가 선택한다.

## Shared UI Rules

- 접근 가능한 상호작용 기반은 Base UI를 패키지 경로에서 직접 import한다.
- 컴포넌트 스타일은 같은 feature, layout, page 폴더의 CSS Module에 둔다.
- 반복되는 색상은 전역 CSS 변수로 정의하고 Module에서는 변수만 참조한다.
- 전역 CSS는 token, reset, 문서 기본값만 담당한다.
- 링크는 링크 의미를 유지하고 실제 행동에만 Button을 사용한다.
- 포커스와 상태는 색상만으로 전달하지 않는다.
- `prefers-reduced-motion`을 존중한다.

## References

- [Vite: Backend Integration](https://vite.dev/guide/backend-integration.html)
- [React Router: Routing](https://reactrouter.com/start/data/routing)
- [Hono: Bun](https://hono.dev/docs/getting-started/bun)
- [Hermes Agent Web Dashboard](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/web-dashboard.md)
- [OpenClaw Control UI](https://github.com/openclaw/openclaw/tree/main/ui)
