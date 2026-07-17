import styles from "./UnderstandingMapPage.module.css";

export const UnderstandingHero = () => (
  <section className={styles.hero} aria-labelledby="page-title">
    <p className={styles.eyebrow}>Understanding map</p>
    <h1 id="page-title" aria-label="지금의 이해를, 있는 그대로 봅니다.">
      지금의 이해를,
      <br /> 있는 그대로 봅니다.
    </h1>
    <p className={styles.heroDescription}>
      읽었다는 느낌에서 멈추지 않고, 직접 설명하며 배운 것을 나의 언어로
      바꾸는 공간입니다.
    </p>
  </section>
);
