import styles from "./UnderstandingMapPage.module.css";

const LEARNING_STEPS = [
  {
    number: "01",
    title: "꺼내어 설명하기",
    description: "읽은 내용을 보지 않고 자신의 언어로 다시 구성합니다.",
  },
  {
    number: "02",
    title: "빈틈 관찰하기",
    description: "틀림을 실패로 판단하지 않고 빠진 전제와 연결을 찾습니다.",
  },
  {
    number: "03",
    title: "다르게 적용하기",
    description: "선명해진 이해를 새로운 상황에 조금씩 시험해봅니다.",
  },
] as const;

export const LearningProcess = () => (
  <section className={styles.process} aria-labelledby="process-title">
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>How lingo thinks</p>
      <h2 id="process-title">
        더 많이 저장하는 대신,
        <br /> 더 선명하게 이해합니다.
      </h2>
    </div>

    <ol className={styles.processList}>
      {LEARNING_STEPS.map((step) => (
        <li key={step.number}>
          <span>{step.number}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
);
