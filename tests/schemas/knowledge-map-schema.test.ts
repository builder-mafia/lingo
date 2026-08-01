import { expect, test } from "bun:test";

import { knowledgeMapSchema } from "../../src/schemas/knowledge-map";

test("validates renderer-neutral knowledge map nodes and edges", () => {
  const sourceNoteId = "10f3c50f-9dda-477a-8f89-5f63838dd2b5";
  const targetNoteId = "e7b6098f-b384-41e4-84cf-ec6f36acc050";

  expect(
    knowledgeMapSchema.parse({
      nodes: [
        {
          id: sourceNoteId,
          title: "Effect",
          labels: ["TypeScript"],
          status: "in_progress",
          courseContext: null,
        },
      ],
      edges: [
        {
          id: "related-edge",
          sourceNoteId,
          targetNoteId,
          kind: "related",
        },
      ],
    }),
  ).toMatchObject({
    nodes: [expect.objectContaining({ id: sourceNoteId })],
    edges: [expect.objectContaining({ kind: "related" })],
  });
});
