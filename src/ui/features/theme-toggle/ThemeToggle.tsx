import { Button } from "@base-ui/react/button";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";

import {
  applyTheme,
  persistTheme,
  readAppliedTheme,
  type Theme,
} from "../../shared/theme/theme";
import styles from "./ThemeToggle.module.css";

const nextThemeFor = (theme: Theme): Theme =>
  theme === "dark" ? "light" : "dark";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(readAppliedTheme);
  const nextTheme = nextThemeFor(theme);
  const label =
    nextTheme === "dark" ? "다크 모드로 전환" : "라이트 모드로 전환";

  return (
    <Button
      type="button"
      className={styles.button}
      aria-label={label}
      aria-pressed={theme === "dark"}
      title={label}
      onClick={() => {
        applyTheme(nextTheme);
        persistTheme(nextTheme);
        setTheme(nextTheme);
      }}
    >
      {nextTheme === "dark" ? (
        <Moon aria-hidden="true" />
      ) : (
        <Sun aria-hidden="true" />
      )}
    </Button>
  );
};
