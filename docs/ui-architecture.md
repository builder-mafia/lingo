# Lingo UI Architecture

이 문서는 Lingo 브라우저 앱의 런타임, 라우팅, 상태, 컴포넌트 경계를 정의한다. 제품 경험과 시각 판단은 [`design.md`](./design.md)를 따른다.

## Architecture Decisions

### Vite + React Router

- Vite가 개발 서버, React 변환, CSS Modules, 코드 분할, 프로덕션 번들을 담당한다.
- React Router의 route object와 nested layout으로 URL, 페이지, 앱 셸의 관계를 명시한다.
- Next.js는 사용하지 않는다. Lingo UI에는 SSR, React Server Components, 원격 배포 런타임이 필요하지 않다.
- route page는 lazy import해 초기 번들에 현재 화면만 포함한다.

### Hono + Bun

- Hono가 `/health`, `/api/*`, 정적 자산, SPA fallback을 담당한다.
- `Bun.serve`는 Hono의 `fetch` handler를 실행하고 서버 생명주기를 Effect에 연결하는 런타임 어댑터다.
- 브라우저 앱은 같은 localhost origin의 `/api/*`에서 SQLite 데이터를 읽고 쓴다. HTML에 사용자 데이터를 주입하거나 브라우저가 SQLite 파일을 직접 열지 않는다.
- UI API는 Zod 입력 계약을 사용하고, Effect `Database` 서비스를 통해서만 영속화한다.

### Build once, serve many

- 개발 중에는 `bun run dev:ui`가 로컬 API 서버의 준비를 확인한 뒤 Vite를 실행한다. Vite는 HMR을 제공하고 `/api`와 `/health`를 해당 서버에 proxy한다.
- 배포 전 `vite build`가 `dist/ui`에 hash된 HTML·JS·CSS를 만든다.
- npm·Homebrew 패키지는 `dist/ui`를 포함한다. 최종 사용자는 별도 프론트엔드 빌드 없이 `lingo start`만 실행한다.
- 서버는 기본적으로 `127.0.0.1`에만 bind한다.

## Source Boundaries

```text
src/ui/
├── app/
│   ├── App.tsx                 # RouterProvider 조립
│   ├── router.tsx              # route tree와 loader
│   └── route-paths.ts          # 링크용 URL 생성 함수
├── layouts/
│   └── app-shell/              # 얇은 top bar와 Outlet
├── pages/
│   ├── notes/                  # 홈 노트 목록과 필터
│   ├── note-overview/          # 노트 내용과 선택적인 질문 이력
│   ├── question-session/       # 한 질문의 답변 흐름
│   └── not-found/
├── features/
│   ├── note-search/            # URL 검색과 Notes 전용 Cmd/Ctrl+F
│   ├── note-filters/           # 상태·label·정렬 URL 상태
│   └── note-status/            # Base UI 상태 선택과 저장
├── shared/
│   └── api/                    # fetch, response schema, 오류 정규화
├── styles/
│   └── global.css              # 색·공간 token, reset, 문서 기본값
├── index.html
└── main.tsx

src/server/
└── local-web-app.ts            # Hono API·정적 SPA route
```

경계는 파일 크기만으로 나누지 않는다.

- `app`: provider와 전역 조립만 담당한다.
- `layouts`: 여러 route가 공유하는 지속적인 화면 구조만 담당한다.
- `pages`: route 하나의 읽기 순서와 feature 조합을 담당한다.
- `features`: 검색, 상태 변경, 답변 제출처럼 상태를 가진 사용자 행동을 소유한다.
- `shared`: 두 개 이상의 도메인 feature에서 실제로 공유하는 기술 코드만 둔다.
- 재사용이 발생하기 전에는 범용 component나 전역 store를 만들지 않는다.

## State Ownership

상태는 읽고 변경하는 가장 작은 feature에 둔다.

- 서버 데이터: route loader가 병렬로 읽고 page에 전달한다.
- form·interaction 상태: 해당 feature component가 소유한다.
- 검색·필터·정렬: URL search params에 둔다.
- 상태 변경: 상태 선택 feature가 요청 중·실패 상태를 소유하고 성공 후 route data를 갱신한다.
- 전역 client store: 멀리 떨어진 route들이 같은 client state를 동시에 수정해야 할 때만 검토한다.
- 서버 cache가 실제로 필요해지면 전용 query library 도입을 검토한다.

`useMemo`, `memo`, 전역 store는 기본값이 아니다. 작은 구독 경계와 명확한 데이터 흐름을 먼저 만든다.

## Information Architecture

| Route | Page | Primary question |
| --- | --- | --- |
| `/` | Notes Workspace | 무엇을 모아두었고 지금 무엇을 다시 생각할 수 있는가? |
| `/trash` | Trash | 제거한 노트를 복원하거나 영구 삭제할 것인가? |
| `/notes/:noteId` | Note Overview | 이 주제의 현재 내용과 선택한 연습 이력은 무엇인가? |
| `/notes/:noteId/questions/:questionId` | Question Session | 이 질문을 지금 내 언어로 어떻게 설명할 수 있는가? |

route는 `app/router.tsx` 한 곳에서 선언하고 링크는 `app/route-paths.ts`의 생성 함수를 사용한다. 서버는 모든 비 API GET deep link에 같은 `index.html`을 반환하고 실제 페이지 선택은 React Router가 담당한다.

초기 버전에는 별도 설정 페이지, command palette, 작동하지 않는 내비게이션을 만들지 않는다.

## Page Responsibilities

### App Shell

- 얇은 top bar에 브랜드와 현재 위치를 breadcrumb로 보여준다.
- 왼쪽 sidebar는 두지 않는다.
- route 콘텐츠가 전체 작업 폭을 사용할 수 있게 하고, 읽기 화면 내부에서만 본문 폭을 제한한다.
- 포털 기반 Base UI 컴포넌트를 위해 앱 root에 독립 stacking context를 둔다.

### Notes Workspace

- 실제 노트를 최근 활동 순서로 비교할 수 있는 table/list가 중심이다.
- 검색은 우상단에서 항상 보이고 제목과 요약을 즉시 좁힌다.
- 열 순서는 `노트`, `열린 질문`, `최근 활동`, `라벨`, `상태`다.
- 상태는 행 안에서 바꾸되 행 navigation을 일으키지 않는다.
- `질문 있는 노트` 필터는 연습이 필요한 항목만 같은 목록에서 좁힌다.

### Note Overview

- 내용을 먼저 보여주고 질문이 있을 때만 단일 `질문` 섹션을 뒤에 둔다.
- 질문 행은 질문 문장 자체를 주요 링크로 사용한다.
- 열린 질문을 먼저 배치하고 답변한 질문은 같은 목록에서 체크와 낮은 대비로 구분한다.
- 질문이 없으면 질문 섹션과 빈 상태를 렌더링하지 않는다.

### Question Session

- 질문 하나와 답변 하나에 집중한다.
- 요약과 이전 답변은 기본적으로 접힌 context panel에서 언제든 연다.
- 답변 저장 후 외부 평가를 기다리는 상태를 명확히 보여주고 가짜 AI spinner를 사용하지 않는다.
- 피드백 후 `다시 답하기`와 `이 질문은 여기까지` 중 사용자가 선택한다.
- 답변 제출 후 다음 미응답 질문으로 이동하고, 남은 질문이 없으면 노트로 돌아간다.

## Shared UI Rules

- 상호작용 기반은 Base UI를 package 경로에서 직접 import한다.
- 스타일은 같은 feature, layout, page 폴더의 CSS Module에 둔다.
- 반복 색상은 전역 CSS 변수로 정의하고 Module에서는 변수만 참조한다.
- 전역 CSS는 token, reset, 문서 기본값만 담당한다.
- 링크는 링크 semantics를 유지하고 실제 행동에만 button을 사용한다.
- 포커스와 상태는 색상만으로 전달하지 않는다.
- 목록의 반복 조작은 애니메이션하지 않고 popup과 버튼 피드백만 짧게 사용한다.
- `prefers-color-scheme`과 `prefers-reduced-motion`을 존중한다.

## References

- [Vite: Backend Integration](https://vite.dev/guide/backend-integration.html)
- [React Router: Routing](https://reactrouter.com/start/data/routing)
- [Hono: Bun](https://hono.dev/docs/getting-started/bun)
- [Base UI: Quick start](https://base-ui.com/react/overview/quick-start)
