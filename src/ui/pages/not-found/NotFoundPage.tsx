import { Link } from "react-router";

import { routePaths } from "../../app/route-paths";
import styles from "./NotFoundPage.module.css";

export const NotFoundPage = () => (
  <section className={styles.page}>
    <p>Unknown path</p>
    <h1>아직 열리지 않은 길입니다.</h1>
      <Link to={routePaths.notes}>노트로 돌아가기</Link>
  </section>
);
