import { rmSync } from "node:fs";
import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

test("lingo course create returns chapter note ids and a browser URL", async () => {
  const home = `/tmp/lingo-course-cli-${crypto.randomUUID()}`;
  const child = Bun.spawn(
    [
      "bun",
      "run",
      cliPath,
      "course",
      "create",
      "--data",
      JSON.stringify({
        title: "Effect 핵심",
        goal: "Effect의 핵심 모델을 적용한다.",
        chapters: [
          { title: "동기 Effect", objective: "동기 실행을 설명한다.", labels: ["Effect"] },
          { title: "비동기 Effect", objective: "비동기 실행을 설명한다." },
        ],
      }),
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, HOME: home },
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    const response = JSON.parse(stdout);

    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
    expect(response).toEqual({
      ok: true,
      data: expect.objectContaining({
        courseId: expect.any(String),
        courseUrl: expect.stringMatching(/^http:\/\/127\.0\.0\.1:4312\/courses\/[0-9a-f-]+$/),
        chapterCount: 2,
        chapters: [
          expect.objectContaining({ position: 1, noteId: expect.any(String) }),
          expect.objectContaining({ position: 2, noteId: expect.any(String) }),
        ],
      }),
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("bare lingo course points to the supported create command", async () => {
  const child = Bun.spawn(["bun", "run", cliPath, "course"], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stderr] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ]);

  expect(exitCode).toBe(1);
  expect(JSON.parse(stderr).error.message).toBe(
    "Usage: lingo course create (--data <json> | --data-file <path>)",
  );
});
