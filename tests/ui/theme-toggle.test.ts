import { describe, expect, test } from "bun:test";

import { resolveTheme } from "../../src/ui/shared/theme/theme";

const readSource = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

describe("theme toggle", () => {
  test("uses a saved preference before the operating system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("unknown", false)).toBe("light");
  });

  test("renders an accessible Base UI button with Lucide icons in the header", async () => {
    const [toggle, shell] = await Promise.all([
      readSource("src/ui/features/theme-toggle/ThemeToggle.tsx"),
      readSource("src/ui/layouts/app-shell/AppShell.tsx"),
    ]);

    expect(toggle).toContain('import { Button } from "@base-ui/react/button";');
    expect(toggle).toContain('import { Moon, Sun } from "lucide-react";');
    expect(toggle).toContain('aria-pressed={theme === "dark"}');
    expect(toggle).toContain("다크 모드로 전환");
    expect(toggle).toContain("라이트 모드로 전환");
    expect(shell).toContain("<ThemeToggle />");
  });

  test("applies the saved theme before the application renders", async () => {
    const [html, styles, theme] = await Promise.all([
      readSource("src/ui/index.html"),
      readSource("src/ui/styles/global.css"),
      readSource("src/ui/shared/theme/theme.ts"),
    ]);

    expect(html).toContain('localStorage.getItem("lingo:theme:v1")');
    expect(html.indexOf("lingo:theme:v1")).toBeLessThan(
      html.indexOf('src="/main.tsx"'),
    );
    expect(styles).toContain(':root[data-theme="dark"]');
    expect(styles).toContain("color-scheme: light;");
    expect(styles).toContain("color-scheme: dark;");
    expect(theme).toContain('export const themeStorageKey = "lingo:theme:v1";');
  });
});
