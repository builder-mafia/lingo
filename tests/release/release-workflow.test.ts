import { expect, test } from "bun:test";

const projectRoot = new URL("../..", import.meta.url).pathname;
const workflowPath = `${projectRoot}/.github/workflows/release.yml`;

test("release workflow publishes verified native archives from version tags", async () => {
  const workflowFile = Bun.file(workflowPath);
  expect(await workflowFile.exists()).toBe(true);

  const workflow = await workflowFile.text();
  const packageMetadata = await Bun.file(`${projectRoot}/package.json`).json();

  expect(packageMetadata.packageManager).toMatch(/^bun@\d+\.\d+\.\d+$/);
  expect(workflow).toContain('      - "v*.*.*"');
  expect(workflow).toContain("bun install --frozen-lockfile");
  expect(workflow).toContain("bun test");
  expect(workflow).toContain("bun run typecheck");
  expect(workflow).toContain("package.json version must match release tag");

  for (const [runner, target, platform] of [
    ["macos-15", "bun-darwin-arm64", "darwin-arm64"],
    ["macos-15-intel", "bun-darwin-x64", "darwin-x64"],
    ["ubuntu-24.04-arm", "bun-linux-arm64", "linux-arm64"],
    ["ubuntu-24.04", "bun-linux-x64-baseline", "linux-x64"],
  ]) {
    expect(workflow).toContain(`runner: ${runner}`);
    expect(workflow).toContain(`target: ${target}`);
    expect(workflow).toContain(`platform: ${platform}`);
  }

  expect(workflow).toContain("./release/lingo --version");
  expect(workflow).toContain("actions/attest@v4");
  expect(workflow).toContain("actions/upload-artifact@v4");
  expect(workflow).toContain("actions/download-artifact@v4");
  expect(workflow).toContain("SHA256SUMS");
  expect(workflow).toContain("gh release create");
  expect(workflow).toContain("needs: build");
});
