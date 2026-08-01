import { Link } from "react-router";

import type { KnowledgeMap } from "../../../schemas/knowledge-map";
import { routePaths } from "../../app/route-paths";
import {
  getKnowledgeMapConnections,
  groupKnowledgeMapNodes,
} from "./knowledge-map-data";
import styles from "./KnowledgeMapList.module.css";

type KnowledgeMapListProps = {
  readonly map: KnowledgeMap;
};

export const KnowledgeMapList = ({ map }: KnowledgeMapListProps) => (
  <div className={styles.groups}>
    {groupKnowledgeMapNodes(map.nodes).map((group) => (
      <section className={styles.group} key={group.label}>
        <h2>
          {group.label}
          <span>{group.nodes.length}</span>
        </h2>
        <ul>
          {group.nodes.map((node) => {
            const connections = getKnowledgeMapConnections(map, node.id);
            return (
              <li className={styles.note} key={node.id}>
                <Link className={styles.noteLink} to={routePaths.note(node.id)}>
                  {node.title}
                </Link>
                {connections.length > 0 ? (
                  <ul className={styles.connections} aria-label={`${node.title}의 연결`}>
                    {connections.map(({ edge, note }) => (
                      <li key={edge.id}>
                        <span aria-hidden="true" />
                        <Link to={routePaths.note(note.id)}>{note.title}</Link>
                        {edge.kind === "course_sequence" ? <small>코스</small> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className={styles.unconnected}>연결 없음</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    ))}
  </div>
);
