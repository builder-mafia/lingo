import { expect, test } from "bun:test";

import type { KnowledgeMap } from "../../src/schemas/knowledge-map";
import { filterKnowledgeMap } from "../../src/ui/features/knowledge-map/knowledge-map-data";

const map: KnowledgeMap = {
  nodes: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      title: "비동기 Effect",
      labels: ["Effect"],
      status: "not_started",
      courseContext: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      title: "Fiber",
      labels: ["Effect"],
      status: "not_started",
      courseContext: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      title: "Cache invalidation",
      labels: ["Architecture"],
      status: "not_started",
      courseContext: null,
    },
  ],
  edges: [
    {
      id: "relation-1",
      sourceNoteId: "00000000-0000-4000-8000-000000000001",
      targetNoteId: "00000000-0000-4000-8000-000000000002",
      kind: "related",
    },
    {
      id: "relation-2",
      sourceNoteId: "00000000-0000-4000-8000-000000000002",
      targetNoteId: "00000000-0000-4000-8000-000000000003",
      kind: "related",
    },
  ],
};

test("mobile map search keeps matching notes and their direct connections", () => {
  const filtered = filterKnowledgeMap(map, "비동기");

  expect(filtered.nodes.map(({ title }) => title)).toEqual([
    "비동기 Effect",
    "Fiber",
  ]);
  expect(filtered.edges).toEqual([map.edges[0]]);
});
