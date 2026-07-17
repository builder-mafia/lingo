# Lingo UI Architecture

이 문서는 Lingo의 화면 구조와 레이아웃 책임을 정의한다. 시각적 판단은 [`design.md`](./design.md)를 따르며, 구현은 Base UI와 CSS Modules를 사용한다.

## Information Architecture

| Route | Page | Primary question |
| --- | --- | --- |
| `/` | Understanding Map | 지금 무엇을 이해하고 있고, 무엇을 다시 생각해야 하는가? |
| `/notes/:noteId` | Note Overview | 이 주제에서 현재 이해 상태와 다음 행동은 무엇인가? |
| `/notes/:noteId/session` | Question Session | 이 질문을 내 언어로 어떻게 설명할 수 있는가? |
| `/notes/:noteId/result` | Session Reflection | 이번 시도에서 어떤 빈틈과 변화가 드러났는가? |

초기 버전에서는 별도의 설정 페이지를 만들지 않는다. 사용자에게 자주 필요한 환경 설정이 생기기 전까지 앱 셸의 보조 메뉴에서 다룬다.

## Layout Model

### App Shell

- 데스크톱에서는 왼쪽 사이드바가 현재 위치와 주요 화면을 보여준다.
- 본문은 읽기와 사고에 적합한 최대 너비를 유지하며, 대시보드처럼 화면 전체를 정보로 채우지 않는다.
- 좁은 화면에서는 사이드바를 상단 내비게이션으로 바꾸고 콘텐츠 흐름을 한 열로 유지한다.
- 포털 기반 Base UI 컴포넌트를 위해 앱 루트에 독립 stacking context를 둔다.

### Understanding Map

- 저장된 노트 수보다 현재 이해 상태와 다시 생각할 주제를 먼저 보여준다.
- 데이터가 없을 때는 제품 설명보다 첫 지적 탐험을 시작할 명확한 행동을 제공한다.
- 실제 노트 목록과 이해 상태 연결은 다음 UI 단계에서 API와 함께 구현한다.

### Note Overview

- 노트 제목, label, 핵심 요약을 가장 먼저 읽을 수 있어야 한다.
- 질문 수와 답변 상태는 압박하는 성과 수치가 아니라 탐험의 현재 위치로 표현한다.
- 주요 행동은 질문 세션 시작이며, 요약 읽기와 과거 답변 확인은 보조 행동이다.

### Question Session

- 한 번에 하나의 질문과 하나의 주요 행동만 보여준다.
- 답변 영역은 긴 글을 방해 없이 작성할 수 있어야 한다.
- 설명을 바로 보는 선택권을 제공하되, 먼저 떠올려보는 이유를 짧게 안내한다.

### Session Reflection

- 점수보다 발견한 빈틈, 선명해진 설명, 다시 생각할 내용을 보여준다.
- 다음 행동은 다시 답하기, 다른 질문으로 이동하기, 노트로 돌아가기 중 사용자가 선택한다.

## Shared UI Rules

- 접근 가능한 상호작용 기반은 Base UI를 직접 import해 사용한다.
- 컴포넌트 스타일은 같은 이름의 CSS Module에 둔다.
- 반복되는 색상은 전역 CSS 변수로 정의하고 Module에서는 변수만 참조한다.
- 전역 CSS는 토큰, reset, 문서 기본값만 담당한다.
- 링크는 링크 의미를 유지하고, 실제 행동에만 Button을 사용한다.
- 포커스와 상태는 색상만으로 전달하지 않는다.
- `prefers-reduced-motion`을 존중한다.
