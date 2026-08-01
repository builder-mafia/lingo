import { Button } from "@base-ui/react/button";
import { Combobox } from "@base-ui/react/combobox";
import {
  Check,
  ChevronsUpDown,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router";

import type {
  KnowledgeMap,
  KnowledgeMapNode,
} from "../../../schemas/knowledge-map";
import { routePaths } from "../../app/route-paths";
import { getKnowledgeMapConnections } from "./knowledge-map-data";
import styles from "./KnowledgeMapInspector.module.css";

type KnowledgeMapInspectorProps = {
  readonly map: KnowledgeMap;
  readonly note: KnowledgeMapNode;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onAddRelation: (targetNoteId: string) => Promise<boolean>;
  readonly onRemoveRelation: (relationId: string) => Promise<boolean>;
};

export const KnowledgeMapInspector = ({
  map,
  note,
  busy,
  error,
  onAddRelation,
  onRemoveRelation,
}: KnowledgeMapInspectorProps) => {
  const inputId = useId();
  const [target, setTarget] = useState<KnowledgeMapNode | null>(null);
  const connections = useMemo(
    () => getKnowledgeMapConnections(map, note.id),
    [map, note.id],
  );
  const connectedIds = useMemo(
    () => new Set(connections.map(({ note: connected }) => connected.id)),
    [connections],
  );
  const candidates = useMemo(
    () =>
      map.nodes.filter(
        (candidate) =>
          candidate.id !== note.id && !connectedIds.has(candidate.id),
      ),
    [connectedIds, map.nodes, note.id],
  );

  useEffect(() => setTarget(null), [note.id]);

  return (
    <aside className={styles.inspector} aria-label="선택한 노트">
      <div className={styles.header}>
        <div>
          <span>선택한 노트</span>
          <h2>{note.title}</h2>
        </div>
        <Link className={styles.openLink} to={routePaths.note(note.id)}>
          <ExternalLink aria-hidden="true" />
          노트 열기
        </Link>
      </div>

      {note.labels.length > 0 ? (
        <div className={styles.labels}>
          {note.labels.map((label) => <span key={label}>{label}</span>)}
        </div>
      ) : null}

      <section className={styles.section}>
        <h3>연결된 노트</h3>
        {connections.length > 0 ? (
          <ul className={styles.connectionList}>
            {connections.map(({ edge, note: connected }) => (
              <li key={edge.id}>
                <Link to={routePaths.note(connected.id)}>{connected.title}</Link>
                {edge.kind === "related" ? (
                  <Button
                    className={styles.removeButton}
                    type="button"
                    aria-label={`${connected.title} 연결 제거`}
                    disabled={busy}
                    onClick={() => void onRemoveRelation(edge.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : (
                  <span className={styles.courseBadge}>코스</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>연결된 노트가 없습니다.</p>
        )}
      </section>

      {candidates.length > 0 ? (
        <section className={styles.section}>
          <h3>연결 추가</h3>
          <Combobox.Root
            items={candidates}
            value={target}
            onValueChange={setTarget}
            itemToStringLabel={(item) => item.title}
            itemToStringValue={(item) => item.id}
            isItemEqualToValue={(item, value) => item.id === value.id}
          >
            <label className={styles.visuallyHidden} htmlFor={inputId}>
              연결할 노트 검색
            </label>
            <Combobox.InputGroup className={styles.comboInputGroup}>
              <Combobox.Input
                id={inputId}
                className={styles.comboInput}
                placeholder="노트 검색"
              />
              <Combobox.Trigger className={styles.comboTrigger} aria-label="노트 목록 열기">
                <ChevronsUpDown aria-hidden="true" />
              </Combobox.Trigger>
            </Combobox.InputGroup>
            <Combobox.Portal>
              <Combobox.Positioner className={styles.positioner} sideOffset={4}>
                <Combobox.Popup className={styles.popup}>
                  <Combobox.Empty className={styles.comboEmpty}>
                    일치하는 노트가 없습니다.
                  </Combobox.Empty>
                  <Combobox.List className={styles.comboList}>
                    {(candidate: KnowledgeMapNode) => (
                      <Combobox.Item
                        className={styles.comboItem}
                        key={candidate.id}
                        value={candidate}
                      >
                        <Combobox.ItemIndicator className={styles.itemIndicator}>
                          <Check aria-hidden="true" />
                        </Combobox.ItemIndicator>
                        <span>{candidate.title}</span>
                      </Combobox.Item>
                    )}
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
          <Button
            className={styles.addButton}
            type="button"
            disabled={!target || busy}
            onClick={async () => {
              if (!target) return;
              if (await onAddRelation(target.id)) setTarget(null);
            }}
          >
            <Plus aria-hidden="true" />
            연결
          </Button>
        </section>
      ) : null}

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </aside>
  );
};
