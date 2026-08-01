import { Menu } from "@base-ui/react/menu";
import { Ellipsis, Trash2 } from "lucide-react";
import { Link } from "react-router";

import { routePaths } from "../../app/route-paths";
import styles from "./NotesMenu.module.css";

export const NotesMenu = () => (
  <Menu.Root>
    <Menu.Trigger className={styles.trigger} aria-label="노트 메뉴">
      <Ellipsis aria-hidden="true" />
    </Menu.Trigger>
    <Menu.Portal>
      <Menu.Positioner className={styles.positioner} sideOffset={5} align="end">
        <Menu.Popup className={styles.popup}>
          <Menu.LinkItem
            className={styles.item}
            closeOnClick
            render={<Link to={routePaths.trash} />}
          >
            <Trash2 aria-hidden="true" />
            <span>휴지통 보기</span>
          </Menu.LinkItem>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  </Menu.Root>
);
