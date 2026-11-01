import { useRef, useState } from "react";
import { Button } from "../../ui/button/index.js";
import { EmptyState } from "../../ui/empty-state/index.js";
import { IconArrowLeft, IconBell } from "../../icons/generated/icons.js";
import { NotificationList, type NotificationItem } from "../../ui/notification-list/index.js";
import { Panel, PanelBody, PanelHeader } from "../../ui/surface/index.js";

const HOUR = 3_600_000;
const NOW = Date.now();

interface Message extends NotificationItem {
  body: string;
}

const MESSAGES: Message[] = [
  {
    id: "1",
    title: "Avery Quinn mentioned you on Harbour Library",
    description: "Can you check the stair widths on level 2?",
    body: "Can you check the stair widths on level 2? The revised plan narrows them by 100 mm, and the review is on Thursday.",
    at: NOW - HOUR / 2,
    group: "Mentions",
  },
  {
    id: "2",
    title: "Budget review requested",
    description: "Orchard House · Noor Haddad",
    body: "Orchard House is 8% over plan after the structural change. Please confirm the revised figure before the end of the month.",
    at: NOW - 3 * HOUR,
    tone: "warning",
    toneLabel: "Action needed",
    group: "Reviews",
  },
  {
    id: "3",
    title: "Mira Rowan assigned you a task",
    description: "Cedar Pavilion · Update the lighting schedule",
    body: "Update the lighting schedule with the fittings chosen on Monday. The drawings are in the project folder.",
    at: NOW - 6 * HOUR,
    group: "Assignments",
  },
  {
    id: "4",
    title: "Quarry Gallery was approved",
    description: "Approved by Jun Park",
    body: "Quarry Gallery has passed design review. The next stage is documentation.",
    at: NOW - 28 * HOUR,
    tone: "success",
    toneLabel: "Approved",
    read: true,
    group: "Reviews",
  },
  {
    id: "5",
    title: "Weekly digest",
    description: "18 open projects, 4 overdue tasks",
    body: "18 projects are open and 4 tasks are overdue. Hours logged rose by 24 compared with last week.",
    at: NOW - 75 * HOUR,
    read: true,
  },
];

/**
 * An inbox: filters and rows on the left, the open message beside them. Below the width for
 * both, the message takes the list's place and "Inbox" returns to it.
 */
export default function InboxTemplate() {
  const [items, setItems] = useState<readonly NotificationItem[]>(MESSAGES);
  const [openId, setOpenId] = useState<string | null>(null);
  const pane = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const open = MESSAGES.find((item) => item.id === openId);
  const setRead = (ids: readonly string[], read: boolean) =>
    setItems((rows) => rows.map((row) => (ids.includes(row.id) ? { ...row, read } : row)));
  const close = () => {
    setOpenId(null);
    opener.current?.focus();
  };
  return (
    <div className="@container/screen h-full min-h-0 p-gutter">
      <div className="grid h-full min-h-0 gap-panels @3xl/screen:grid-cols-2">
        <Panel className={open ? "hidden min-h-0 @3xl/screen:flex" : "min-h-0"}>
          <PanelBody className="flex min-h-0 flex-col">
            <NotificationList
              aria-label="Inbox"
              items={items}
              filters={[
                { id: "all", label: "All" },
                { id: "unread", label: "Unread", matches: (item) => !item.read },
                { id: "mentions", label: "Mentions", matches: (item) => item.group === "Mentions" },
              ]}
              onOpen={(item) => {
                opener.current = document.activeElement as HTMLElement;
                setOpenId(item.id);
                setRead([item.id], true);
                requestAnimationFrame(() => pane.current?.focus());
              }}
              onReadChange={setRead}
              onMarkAllRead={() => setItems((rows) => rows.map((row) => ({ ...row, read: true })))}
              onDismiss={(item) => setItems((rows) => rows.filter((row) => row.id !== item.id))}
            />
          </PanelBody>
        </Panel>
        <Panel ref={pane} tabIndex={-1} scroll className={open ? "min-h-0" : "hidden min-h-0 @3xl/screen:flex"} aria-label="Message">
          {open ? (
            <>
              <PanelHeader
                title={open.title}
                actions={
                  <Button className="@3xl/screen:hidden" size="sm" variant="ghost" icon={<IconArrowLeft />} onClick={close}>
                    Inbox
                  </Button>
                }
              />
              <PanelBody>
                <p className="max-w-measure">{open.body}</p>
              </PanelBody>
            </>
          ) : (
            <PanelBody>
              <EmptyState icon={<IconBell />}>No message open</EmptyState>
            </PanelBody>
          )}
        </Panel>
      </div>
    </div>
  );
}
