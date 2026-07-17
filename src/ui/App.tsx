import { Button } from "@base-ui/react/button";
import { useState } from "react";

import styles from "./App.module.css";

const NOTE_COMMAND =
  "lingo note create --data '{\"title\":\"새로 배운 주제\",\"labels\":[\"Learning\"]}'";

const MapIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20">
    <path d="M3.25 4.25 7.5 2.5l5 1.75 4.25-1.75v13.25l-4.25 1.75-5-1.75-4.25 1.75V4.25Z" />
    <path d="M7.5 2.5v13.25m5-11.5V17.5" />
  </svg>
);

const CompassIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7.25" />
    <path d="m12.7 7.3-1.35 4.05L7.3 12.7l1.35-4.05L12.7 7.3Z" />
  </svg>
);

const ArrowIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20">
    <path d="M4 10h11m-4-4 4 4-4 4" />
  </svg>
);

const LingoMark = () => (
  <span className={styles.mark} aria-hidden="true">
    <span />
    <span />
    <span />
  </span>
);

type CopyState = "idle" | "copied" | "failed";

export const App = () => {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const copyNoteCommand = async () => {
    try {
      await navigator.clipboard.writeText(NOTE_COMMAND);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const copyLabel =
    copyState === "copied" ? "명령을 복사했어요" : "노트 만들기 명령 복사";

  return (
    <div className={styles.appRoot}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="/" aria-label="Lingo 이해 지도로 이동">
          <LingoMark />
          <span className={styles.brandName}>lingo</span>
        </a>

        <nav className={styles.navigation} aria-label="주요 메뉴">
          <a className={styles.activeNavItem} href="/" aria-current="page">
            <MapIcon />
            이해 지도
          </a>
          <a className={styles.navItem} href="#start">
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
          <section className={styles.hero} aria-labelledby="page-title">
            <p className={styles.eyebrow}>Understanding map</p>
            <h1
              id="page-title"
              aria-label="지금의 이해를, 있는 그대로 봅니다."
            >
              지금의 이해를,
              <br />
              {" "}있는 그대로 봅니다.
            </h1>
            <p className={styles.heroDescription}>
              읽었다는 느낌에서 멈추지 않고, 직접 설명하며 배운 것을 나의
              언어로 바꾸는 공간입니다.
            </p>
          </section>

          <section
            className={styles.startPanel}
            id="start"
            aria-labelledby="start-title"
          >
            <div className={styles.panelIntro}>
              <span className={styles.stepLabel}>첫 번째 탐험</span>
              <h2 id="start-title">생각해보고 싶은 주제를 준비하세요.</h2>
              <p>
                AI와 나눈 대화나 새롭게 알게 된 내용을 노트로 만들면, 질문을
                통해 현재 이해의 빈틈을 확인할 수 있습니다.
              </p>
            </div>

            <div className={styles.commandArea}>
              <div className={styles.commandLabel}>
                <span>Terminal</span>
                <span>CLI</span>
              </div>
              <code className={styles.command}>{NOTE_COMMAND}</code>
              <Button className={styles.commandButton} onClick={copyNoteCommand}>
                {copyLabel}
                <ArrowIcon />
              </Button>
              <p className={styles.copyStatus} aria-live="polite">
                {copyState === "failed"
                  ? "브라우저에서 복사하지 못했어요. 위 명령을 직접 복사해 주세요."
                  : "명령을 실행하면 이 브라우저에서 이어서 생각할 수 있어요."}
              </p>
            </div>
          </section>

          <section className={styles.process} aria-labelledby="process-title">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>How lingo thinks</p>
              <h2 id="process-title">
                더 많이 저장하는 대신,
                <br />
                더 선명하게 이해합니다.
              </h2>
            </div>

            <ol className={styles.processList}>
              <li>
                <span>01</span>
                <div>
                  <h3>꺼내어 설명하기</h3>
                  <p>읽은 내용을 보지 않고 자신의 언어로 다시 구성합니다.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>빈틈 관찰하기</h3>
                  <p>틀림을 실패로 판단하지 않고 빠진 전제와 연결을 찾습니다.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>다르게 적용하기</h3>
                  <p>선명해진 이해를 새로운 상황에 조금씩 시험해봅니다.</p>
                </div>
              </li>
            </ol>
          </section>

          <footer className={styles.footer}>
            <p>배운 것을, 나의 언어로.</p>
            <span>Lingo</span>
          </footer>
        </div>
      </main>
    </div>
  );
};
