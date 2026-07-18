import { isRouteErrorResponse, useRouteError } from "react-router";

import styles from "./AppErrorPage.module.css";

const describeError = (error: unknown) => {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return "요청한 로컬 데이터를 찾지 못했습니다.";
  }
  return "로컬 데이터 서버에 연결하지 못했습니다.";
};

export const AppErrorPage = () => {
  const error = useRouteError();

  return (
    <main className={styles.page}>
      <div className={styles.mark} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className={styles.eyebrow}>연결 확인</p>
      <h1>{describeError(error)}</h1>
      <p className={styles.description}>
        개발 중이라면 터미널에서 <code>bun run dev:ui</code>를 다시 실행해
        주세요. API 서버와 Vite가 함께 시작됩니다.
      </p>
      <button type="button" onClick={() => window.location.reload()}>
        다시 시도
      </button>
    </main>
  );
};
