import type {
  KnowledgeMap,
  KnowledgeMapEdge,
  KnowledgeMapNode,
} from "../../../schemas/knowledge-map";

export type KnowledgeMapConnection = {
  readonly edge: KnowledgeMapEdge;
  readonly note: KnowledgeMapNode;
};

export const getKnowledgeMapConnections = (
  map: KnowledgeMap,
  noteId: string,
): readonly KnowledgeMapConnection[] => {
  const nodesById = new Map(map.nodes.map((node) => [node.id, node]));

  return map.edges.flatMap((edge) => {
    const connectedId =
      edge.sourceNoteId === noteId
        ? edge.targetNoteId
        : edge.targetNoteId === noteId
          ? edge.sourceNoteId
          : undefined;
    const note = connectedId ? nodesById.get(connectedId) : undefined;
    return note ? [{ edge, note }] : [];
  });
};

export const groupKnowledgeMapNodes = (
  nodes: readonly KnowledgeMapNode[],
) => {
  const groups = new Map<string, KnowledgeMapNode[]>();
  for (const node of nodes) {
    const label = node.labels[0] ?? "기타";
    const group = groups.get(label) ?? [];
    group.push(node);
    groups.set(label, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "ko"))
    .map(([label, group]) => ({
      label,
      nodes: group.sort((left, right) =>
        left.title.localeCompare(right.title, "ko"),
      ),
    }));
};

export const filterKnowledgeMapNodes = (
  nodes: readonly KnowledgeMapNode[],
  query: string,
) => {
  const normalized = query.trim().toLocaleLowerCase("ko");
  if (!normalized) return [...nodes];

  return nodes.filter((node) =>
    [node.title, ...node.labels].some((value) =>
      value.toLocaleLowerCase("ko").includes(normalized),
    ),
  );
};

export const filterKnowledgeMap = (
  map: KnowledgeMap,
  query: string,
): KnowledgeMap => {
  if (!query.trim()) return map;

  const matches = filterKnowledgeMapNodes(map.nodes, query);
  const matchingNodeIds = new Set(matches.map((node) => node.id));
  const includedNodeIds = new Set(matchingNodeIds);
  const edges = map.edges.filter((edge) => {
    const isConnectedToMatch =
      matchingNodeIds.has(edge.sourceNoteId) ||
      matchingNodeIds.has(edge.targetNoteId);
    if (isConnectedToMatch) {
      includedNodeIds.add(edge.sourceNoteId);
      includedNodeIds.add(edge.targetNoteId);
    }
    return isConnectedToMatch;
  });

  return {
    nodes: map.nodes.filter((node) => includedNodeIds.has(node.id)),
    edges,
  };
};
