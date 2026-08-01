import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Sigma from "sigma";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type { KnowledgeMap } from "../../../schemas/knowledge-map";
import styles from "./KnowledgeGraph.module.css";

type GraphNodeAttributes = {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly label: string;
};

type GraphEdgeAttributes = {
  readonly kind: "related" | "course_sequence";
  readonly size: number;
};

type GraphPalette = {
  readonly node: string;
  readonly nodeDim: string;
  readonly edge: string;
  readonly edgeDim: string;
  readonly accent: string;
  readonly label: string;
};

const readPalette = (): GraphPalette => {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    node: read("--color-map-node", "#727987"),
    nodeDim: read("--color-map-node-dim", "#c9cdd5"),
    edge: read("--color-map-edge", "#b9bec9"),
    edgeDim: read("--color-map-edge-dim", "#e4e6ea"),
    accent: read("--color-accent", "#4658c9"),
    label: read("--color-ink-muted", "#656a73"),
  };
};

const hash = (value: string) => {
  let result = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16_777_619);
  }
  return result >>> 0;
};

const positionFor = (id: string, primaryLabel: string) => {
  const labelAngle = (hash(primaryLabel) / 0xffffffff) * Math.PI * 2;
  const noteAngle = (hash(id) / 0xffffffff) * Math.PI * 2;
  const clusterRadius = 5.5;
  const jitterRadius = 0.7 + ((hash(`${id}:radius`) % 1_000) / 1_000) * 1.6;

  return {
    x: Math.cos(labelAngle) * clusterRadius + Math.cos(noteAngle) * jitterRadius,
    y: Math.sin(labelAngle) * clusterRadius + Math.sin(noteAngle) * jitterRadius,
  };
};

const buildGraph = (map: KnowledgeMap) => {
  const graph = new Graph<GraphNodeAttributes, GraphEdgeAttributes>({
    type: "undirected",
    multi: true,
  });

  for (const node of map.nodes) {
    graph.addNode(node.id, {
      ...positionFor(node.id, node.labels[0] ?? "기타"),
      size: 4.5,
      label: node.title,
    });
  }
  for (const edge of map.edges) {
    graph.addEdgeWithKey(edge.id, edge.sourceNoteId, edge.targetNoteId, {
      kind: edge.kind,
      size: edge.kind === "related" ? 1.2 : 0.9,
    });
  }

  if (graph.order > 1 && graph.size > 0) {
    forceAtlas2.assign(graph, {
      iterations: Math.min(100, 36 + Math.ceil(Math.sqrt(graph.order) * 5)),
      settings: {
        ...forceAtlas2.inferSettings(graph),
        barnesHutOptimize: graph.order > 100,
        gravity: 0.35,
        scalingRatio: 8,
        slowDown: 4,
      },
    });
  }

  return graph;
};

export type KnowledgeGraphHandle = {
  readonly fit: () => void;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly focusNode: (noteId: string) => void;
};

type KnowledgeGraphProps = {
  readonly map: KnowledgeMap;
  readonly selectedNodeId: string | null;
  readonly matchingNodeIds: ReadonlySet<string> | null;
  readonly onSelectNode: (noteId: string | null) => void;
  readonly onOpenNode: (noteId: string) => void;
};

export const KnowledgeGraph = forwardRef<
  KnowledgeGraphHandle,
  KnowledgeGraphProps
>(function KnowledgeGraph(
  {
    map,
    selectedNodeId,
    matchingNodeIds,
    onSelectNode,
    onOpenNode,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Sigma<GraphNodeAttributes, GraphEdgeAttributes> | null>(null);
  const selectedRef = useRef(selectedNodeId);
  const hoveredRef = useRef<string | null>(null);
  const matchingRef = useRef(matchingNodeIds);
  const onSelectRef = useRef(onSelectNode);
  const onOpenRef = useRef(onOpenNode);
  const paletteRef = useRef<GraphPalette | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const graph = useMemo(() => buildGraph(map), [map]);

  selectedRef.current = selectedNodeId;
  matchingRef.current = matchingNodeIds;
  onSelectRef.current = onSelectNode;
  onOpenRef.current = onOpenNode;

  const animationDuration = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160;

  useImperativeHandle(ref, () => ({
    fit: () => {
      void rendererRef.current?.getCamera().animatedReset({
        duration: animationDuration(),
      });
    },
    zoomIn: () => {
      void rendererRef.current?.getCamera().animatedZoom({
        duration: animationDuration(),
        factor: 1.45,
      });
    },
    zoomOut: () => {
      void rendererRef.current?.getCamera().animatedUnzoom({
        duration: animationDuration(),
        factor: 1.45,
      });
    },
    focusNode: (noteId) => {
      const renderer = rendererRef.current;
      const node = renderer?.getNodeDisplayData(noteId);
      if (!renderer || !node) return;
      void renderer.getCamera().animate(
        { x: node.x, y: node.y, ratio: 0.55 },
        { duration: animationDuration() },
      );
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container || graph.order === 0) return;

    try {
      paletteRef.current = readPalette();
      const renderer = new Sigma(graph, container, {
        allowInvalidContainer: false,
        enableEdgeEvents: false,
        hideEdgesOnMove: false,
        hideLabelsOnMove: false,
        labelColor: { color: paletteRef.current.label },
        labelDensity: graph.order <= 60 ? 1.4 : 0.7,
        labelFont: "Inter, Pretendard, sans-serif",
        labelRenderedSizeThreshold: graph.order <= 60 ? 0 : 7.5,
        labelSize: 12,
        minCameraRatio: 0.4,
        maxCameraRatio: 2,
        renderEdgeLabels: false,
        stagePadding: 54,
        zIndex: true,
      });
      rendererRef.current = renderer;

      const refreshReducers = () => {
        const palette = paletteRef.current ?? readPalette();
        const activeNode = selectedRef.current ?? hoveredRef.current;
        const matches = matchingRef.current;
        renderer.setSetting("labelColor", { color: palette.label });
        renderer.setSetting("nodeReducer", (node, data) => {
          const isActive = node === activeNode;
          const isNeighbor = activeNode ? graph.hasEdge(node, activeNode) : false;
          const isMatch = matches === null || matches.has(node);
          const dimmed = (activeNode && !isActive && !isNeighbor) || !isMatch;
          return {
            ...data,
            color: isActive ? palette.accent : dimmed ? palette.nodeDim : palette.node,
            forceLabel: isActive || (matches !== null && matches.has(node)),
            highlighted: isActive,
            size: isActive ? 6 : isNeighbor ? 5 : 4.5,
            zIndex: isActive ? 2 : isNeighbor ? 1 : 0,
          };
        });
        renderer.setSetting("edgeReducer", (edge, data) => {
          const [source, target] = graph.extremities(edge);
          const isActive = activeNode === source || activeNode === target;
          const matchesSearch =
            matches === null || (matches.has(source) && matches.has(target));
          return {
            ...data,
            color: isActive
              ? palette.accent
              : matchesSearch
                ? palette.edge
                : palette.edgeDim,
            size: isActive ? 1.8 : data.kind === "related" ? 1.2 : 0.9,
            zIndex: isActive ? 1 : 0,
          };
        });
        renderer.refresh();
      };

      renderer.on("clickNode", ({ node }) => {
        if (selectedRef.current === node) onOpenRef.current(node);
        else onSelectRef.current(node);
      });
      renderer.on("clickStage", () => onSelectRef.current(null));
      renderer.on("enterNode", ({ node }) => {
        hoveredRef.current = node;
        refreshReducers();
      });
      renderer.on("leaveNode", () => {
        hoveredRef.current = null;
        refreshReducers();
      });

      const themeObserver = new MutationObserver(() => {
        paletteRef.current = readPalette();
        refreshReducers();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      refreshReducers();

      return () => {
        themeObserver.disconnect();
        rendererRef.current = null;
        renderer.kill();
      };
    } catch {
      setUnavailable(true);
      return;
    }
  }, [graph]);

  useEffect(() => {
    rendererRef.current?.refresh();
  }, [matchingNodeIds, selectedNodeId]);

  if (unavailable) {
    return (
      <div className={styles.unavailable} role="status">
        이 환경에서는 시각 지도를 표시할 수 없습니다. 관계 목록을 이용해 주세요.
      </div>
    );
  }

  return <div className={styles.graph} ref={containerRef} aria-hidden="true" />;
});
