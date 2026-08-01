import { describe, expect, test } from "bun:test";

const readProjectFile = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

describe("knowledge map UI", () => {
  test("loads the graph only from a lazy map route reached through the note view switch", async () => {
    const [router, routePaths, switchSource, graph] = await Promise.all([
      readProjectFile("src/ui/app/router.tsx"),
      readProjectFile("src/ui/app/route-paths.ts"),
      readProjectFile("src/ui/features/note-view-switch/NoteViewSwitch.tsx"),
      readProjectFile("src/ui/features/knowledge-map/KnowledgeGraph.tsx"),
    ]);

    expect(routePaths).toContain('map: "/map"');
    expect(router).toContain('path: "map"');
    expect(router).toContain('import("../pages/knowledge-map/KnowledgeMapPage")');
    expect(switchSource).toContain("routePaths.map");
    expect(switchSource).toContain("List");
    expect(switchSource).toContain("Waypoints");
    expect(graph).toContain('from "sigma"');
    expect(graph).toContain('from "graphology"');
    expect(graph).toContain('from "graphology-layout-forceatlas2"');
  });

  test("provides Base UI controls and a DOM relation view instead of trapping access in WebGL", async () => {
    const [page, inspector, relationList, styles] = await Promise.all([
      readProjectFile("src/ui/pages/knowledge-map/KnowledgeMapPage.tsx"),
      readProjectFile("src/ui/features/knowledge-map/KnowledgeMapInspector.tsx"),
      readProjectFile("src/ui/features/knowledge-map/KnowledgeMapList.tsx"),
      readProjectFile("src/ui/pages/knowledge-map/KnowledgeMapPage.module.css"),
    ]);

    expect(page).toContain("관계 목록");
    expect(page).toContain("@base-ui/react/dialog");
    expect(inspector).toContain("@base-ui/react/combobox");
    expect(inspector).toContain("Trash2");
    expect(relationList).toContain("<ul");
    expect(relationList).toContain("routePaths.note");
    expect(styles).toContain("@media (max-width: 700px)");
    expect(styles).toMatch(/\.graphRegion\s*\{[^}]*display:\s*none/s);
    expect(styles).toMatch(/\.mobileList\s*\{[^}]*display:\s*block/s);
  });

  test("does not initialize the WebGL renderer while the mobile relation list is active", async () => {
    const page = await readProjectFile(
      "src/ui/pages/knowledge-map/KnowledgeMapPage.tsx",
    );

    expect(page).toContain('window.matchMedia("(min-width: 701px)")');
    expect(page).toContain("isDesktopMap ? (");
    expect(page).toContain("<KnowledgeGraph");
  });
});
