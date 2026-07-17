import { CopyNoteCommand } from "../../features/copy-note-command/CopyNoteCommand";
import styles from "./UnderstandingMapPage.module.css";

export const GettingStartedSection = () => (
  <section
    className={styles.startPanel}
    id="start"
    aria-labelledby="start-title"
  >
    <div className={styles.panelIntro}>
      <span className={styles.stepLabel}>첫 번째 탐험</span>
      <h2 id="start-title">생각해보고 싶은 주제를 준비하세요.</h2>
      <p>
        AI와 나눈 대화나 새롭게 알게 된 내용을 노트로 만들면, 질문을 통해 현재
        이해의 빈틈을 확인할 수 있습니다.
      </p>
    </div>
    <CopyNoteCommand />
  </section>
);
