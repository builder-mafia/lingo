import { List, Waypoints } from "lucide-react";
import { Link } from "react-router";

import { routePaths } from "../../app/route-paths";
import styles from "./NoteViewSwitch.module.css";

type NoteViewSwitchProps = {
  readonly active: "list" | "map";
};

export const NoteViewSwitch = ({ active }: NoteViewSwitchProps) => (
  <nav className={styles.switcher} aria-label="노트 보기 방식">
    <Link
      className={active === "list" ? styles.active : undefined}
      to={routePaths.notes}
      aria-current={active === "list" ? "page" : undefined}
    >
      <List aria-hidden="true" />
      목록
    </Link>
    <Link
      className={active === "map" ? styles.active : undefined}
      to={routePaths.map}
      aria-current={active === "map" ? "page" : undefined}
    >
      <Waypoints aria-hidden="true" />
      지도
    </Link>
  </nav>
);
