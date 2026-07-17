import { GettingStartedSection } from "./GettingStartedSection";
import { LearningProcess } from "./LearningProcess";
import { UnderstandingHero } from "./UnderstandingHero";
import styles from "./UnderstandingMapPage.module.css";

export const UnderstandingMapPage = () => (
  <>
    <UnderstandingHero />
    <GettingStartedSection />
    <LearningProcess />
    <footer className={styles.footer}>
      <p>배운 것을, 나의 언어로.</p>
      <span>Lingo</span>
    </footer>
  </>
);
