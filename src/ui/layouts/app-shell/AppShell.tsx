import { Link, Outlet } from "react-router";

import { routePaths } from "../../app/route-paths";
import { LingoMark } from "./LingoMark";
import styles from "./AppShell.module.css";

export const AppShell = () => (
  <div className={styles.appRoot}>
    <header className={styles.topBar}>
      <Link className={styles.brand} to={routePaths.notes} aria-label="Lingo 노트로 이동">
        <LingoMark />
        <span className={styles.brandName}>lingo</span>
      </Link>
      <div className={styles.divider} aria-hidden="true" />
      <span className={styles.location}>노트</span>
      <span className={styles.localState}>이 기기에 저장됨</span>
    </header>
    <main className={styles.main}>
      <Outlet />
    </main>
  </div>
);
