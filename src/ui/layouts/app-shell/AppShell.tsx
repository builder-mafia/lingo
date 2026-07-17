import { NavLink, Outlet } from "react-router";

import { routePaths } from "../../app/route-paths";
import { LingoMark } from "./LingoMark";
import { CompassIcon, MapIcon } from "./NavigationIcons";
import styles from "./AppShell.module.css";

export const AppShell = () => (
  <div className={styles.appRoot}>
    <aside className={styles.sidebar}>
      <NavLink
        className={styles.brand}
        to={routePaths.understandingMap}
        aria-label="Lingo 이해 지도로 이동"
      >
        <LingoMark />
        <span className={styles.brandName}>lingo</span>
      </NavLink>

      <nav className={styles.navigation} aria-label="주요 메뉴">
        <NavLink
          className={({ isActive }) =>
            isActive ? styles.activeNavItem : styles.navItem
          }
          to={routePaths.understandingMap}
          end
        >
          <MapIcon />
          이해 지도
        </NavLink>
        <a className={styles.navItem} href="/#start">
          <CompassIcon />
          시작하기
        </a>
      </nav>

      <div className={styles.sidebarNote}>
        <span className={styles.localIndicator} aria-hidden="true" />
        <div>
          <strong>나만의 사고 공간</strong>
          <span>고요하게 관찰하고, 대담하게 사고합니다.</span>
        </div>
      </div>
    </aside>

    <main className={styles.main}>
      <header className={styles.utilityBar}>
        <span>개인 학습 공간</span>
        <span className={styles.readyState}>
          <span aria-hidden="true" />
          준비됨
        </span>
      </header>
      <div className={styles.content}>
        <Outlet />
      </div>
    </main>
  </div>
);
