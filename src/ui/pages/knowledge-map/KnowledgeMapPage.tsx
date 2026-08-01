import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { ListTree, Minus, Plus, Scan, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useLoaderData,
  useNavigate,
  useRevalidator,
} from "react-router";

import type { KnowledgeMap } from "../../../schemas/knowledge-map";
import { routePaths } from "../../app/route-paths";
import {
  KnowledgeGraph,
  type KnowledgeGraphHandle,
} from "../../features/knowledge-map/KnowledgeGraph";
import { KnowledgeMapInspector } from "../../features/knowledge-map/KnowledgeMapInspector";
import { KnowledgeMapList } from "../../features/knowledge-map/KnowledgeMapList";
import {
  filterKnowledgeMap,
  filterKnowledgeMapNodes,
} from "../../features/knowledge-map/knowledge-map-data";
import { NoteSearch } from "../../features/note-search/NoteSearch";
import { NoteViewSwitch } from "../../features/note-view-switch/NoteViewSwitch";
import {
  addKnowledgeMapRelation,
  removeKnowledgeMapRelation,
} from "../../shared/api/workspace";
import styles from "./KnowledgeMapPage.module.css";

const desktopMapQuery = "(min-width: 701px)";

const useDesktopMap = () => {
  const [isDesktopMap, setIsDesktopMap] = useState(() =>
    window.matchMedia("(min-width: 701px)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(desktopMapQuery);
    const syncViewport = () => setIsDesktopMap(mediaQuery.matches);
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  return isDesktopMap;
};

export const KnowledgeMapPage = () => {
  const map = useLoaderData() as KnowledgeMap;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const graphRef = useRef<KnowledgeGraphHandle>(null);
  const [query, setQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDesktopMap = useDesktopMap();
  const matchingNodes = useMemo(
    () => filterKnowledgeMapNodes(map.nodes, query),
    [map.nodes, query],
  );
  const matchingNodeIds = useMemo(
    () => (query.trim() ? new Set(matchingNodes.map((node) => node.id)) : null),
    [matchingNodes, query],
  );
  const selectedNode = map.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const mobileMap = useMemo(
    () => filterKnowledgeMap(map, query),
    [map, query],
  );

  useEffect(() => {
    const closeSelection = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedNodeId(null);
    };
    window.addEventListener("keydown", closeSelection);
    return () => window.removeEventListener("keydown", closeSelection);
  }, []);

  useEffect(() => {
    if (!query.trim() || matchingNodes.length === 0) return;
    const firstMatch = matchingNodes[0]!;
    setSelectedNodeId(firstMatch.id);
    window.requestAnimationFrame(() => graphRef.current?.focusNode(firstMatch.id));
  }, [matchingNodes, query]);

  const mutateRelation = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
      await revalidator.revalidate();
      return true;
    } catch {
      setError("연결을 변경하지 못했습니다. 다시 시도해 주세요.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="map-heading">
      <header className={styles.headingRow}>
        <div className={styles.headingTitle}>
          <h1 id="map-heading">지식 지도</h1>
          <span>{map.nodes.length}개 노트 · {map.edges.length}개 연결</span>
        </div>
        <div className={styles.headingActions}>
          <NoteViewSwitch active="map" />
          <NoteSearch
            value={query}
            onChange={setQuery}
            label="지도에서 노트 검색"
          />
        </div>
      </header>

      {map.nodes.length === 0 ? (
        <div className={styles.empty}>
          <strong>아직 저장된 노트가 없습니다.</strong>
          <span>노트를 만들면 이곳에서 지식의 연결을 볼 수 있습니다.</span>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <div className={styles.zoomControls} aria-label="지도 확대 및 위치">
              <Button type="button" aria-label="축소" onClick={() => graphRef.current?.zoomOut()}>
                <Minus aria-hidden="true" />
              </Button>
              <Button type="button" aria-label="확대" onClick={() => graphRef.current?.zoomIn()}>
                <Plus aria-hidden="true" />
              </Button>
              <Button type="button" aria-label="화면에 맞춤" onClick={() => graphRef.current?.fit()}>
                <Scan aria-hidden="true" />
              </Button>
            </div>

            <Dialog.Root>
              <Dialog.Trigger className={styles.listTrigger}>
                <ListTree aria-hidden="true" />
                관계 목록
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Backdrop className={styles.dialogBackdrop} />
                <Dialog.Viewport className={styles.dialogViewport}>
                  <Dialog.Popup className={styles.dialogPopup}>
                    <div className={styles.dialogHeading}>
                      <div>
                        <Dialog.Title className={styles.dialogTitle}>관계 목록</Dialog.Title>
                        <Dialog.Description className={styles.dialogDescription}>
                          라벨별 노트와 직접 이어진 지식을 탐색합니다.
                        </Dialog.Description>
                      </div>
                      <Dialog.Close className={styles.dialogClose} aria-label="닫기">
                        <X aria-hidden="true" />
                      </Dialog.Close>
                    </div>
                    <KnowledgeMapList map={map} />
                  </Dialog.Popup>
                </Dialog.Viewport>
              </Dialog.Portal>
            </Dialog.Root>
          </div>

          <div className={styles.graphRegion}>
            {isDesktopMap ? (
              <KnowledgeGraph
                ref={graphRef}
                map={map}
                selectedNodeId={selectedNodeId}
                matchingNodeIds={matchingNodeIds}
                onSelectNode={setSelectedNodeId}
                onOpenNode={(noteId) => navigate(routePaths.note(noteId))}
              />
            ) : null}
            {map.edges.length === 0 ? (
              <p className={styles.noConnections}>
                연결된 노트가 아직 없습니다. 코스의 장은 순서대로 연결됩니다.
              </p>
            ) : null}
            {matchingNodeIds && matchingNodes.length === 0 ? (
              <p className={styles.noMatches}>조건에 맞는 노트가 없습니다.</p>
            ) : null}
            {selectedNode ? (
              <KnowledgeMapInspector
                map={map}
                note={selectedNode}
                busy={busy}
                error={error}
                onAddRelation={(targetNoteId) =>
                  mutateRelation(() =>
                    addKnowledgeMapRelation(selectedNode.id, targetNoteId),
                  )
                }
                onRemoveRelation={(relationId) =>
                  mutateRelation(() => removeKnowledgeMapRelation(relationId))
                }
              />
            ) : null}
          </div>

          <div className={styles.mobileList}>
            {mobileMap.nodes.length > 0 ? (
              <KnowledgeMapList map={mobileMap} />
            ) : (
              <p className={styles.mobileEmpty}>조건에 맞는 노트가 없습니다.</p>
            )}
          </div>

          <p className={styles.liveRegion} aria-live="polite">
            {selectedNode ? `${selectedNode.title} 선택됨` : ""}
          </p>
        </>
      )}
    </section>
  );
};
