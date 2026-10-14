"use client";
import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useAccount } from "../auth-provider";
import { useWorkspace, type WorkspaceScope } from "./provider";

export default function WorkspaceSelector() {
  const { getLocale } = useTranslation();
  const thai = getLocale().startsWith("th");
  const { workspaceScope: scope, setWorkspaceScope } = useWorkspace();
  const account = useAccount();
  const storageKey = `cj-workspace-scope:${account.id}`;
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<WorkspaceScope["workspace"]>("agency");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const name = (workspace: WorkspaceScope["workspace"]) => thai ? `พื้นที่ทำงาน ${workspace === "agency" ? "Agency" : "HR"}` : `${workspace === "agency" ? "Agency" : "HR"} Workspace`;
  useEffect(() => {
    setWorkspaceScope({ workspace: "agency", site: "CDC" });
    setExpanded("agency");
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ workspace: "agency", site: "CDC" }));
    } catch { /* The selector still works when browser storage is unavailable. */ }
  }, [storageKey, setWorkspaceScope]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  function select(workspace: WorkspaceScope["workspace"], site: WorkspaceScope["site"]) {
    if (workspace !== "agency" || site !== "CDC") return;
    const next = { workspace, site };
    setWorkspaceScope(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Optional preference storage. */ }
    setOpen(false);
    trigger.current?.focus();
  }
  return <div className="workspace-selector" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <button ref={trigger} type="button" className="workspace workspace-trigger" aria-expanded={open} aria-controls="workspace-options" onClick={() => { setExpanded(scope.workspace); setOpen(previous => !previous); }}>
      <span className="workspace-icon"><Building2 size={19} /></span>
      <span><b>{name(scope.workspace)}</b><small>Site · {scope.site}</small></span>
      <ChevronDown size={14} />
    </button>
    {open && <div id="workspace-options" className="workspace-options" aria-label={thai ? "เลือกพื้นที่ทำงานและ Site" : "Choose workspace and site"}>
      {(["agency", "hr"] as const).map(workspace => <div key={workspace}>
        <button type="button" className="workspace-option" disabled={workspace !== "agency"} aria-expanded={expanded === workspace} aria-controls={`workspace-sites-${workspace}`} onClick={() => setExpanded(workspace)}>
          <Building2 size={16} /><span>{name(workspace)}</span>{workspace !== "agency" ? <small className="workspace-unavailable">{thai ? "ยังไม่พร้อม" : "Coming soon"}</small> : <ChevronRight size={14} className={expanded === workspace ? "expanded" : ""} />}
        </button>
        {expanded === workspace && <div id={`workspace-sites-${workspace}`} className="workspace-sites">
          {(["CDC", "HDC"] as const).map(site => <button type="button" key={site} className="workspace-option" disabled={workspace !== "agency" || site !== "CDC"} aria-pressed={scope.workspace === workspace && scope.site === site} onClick={() => select(workspace, site)}>
            <MapPin size={15} /><span>{site}</span>{site !== "CDC" && <small className="workspace-unavailable">{thai ? "ยังไม่พร้อม" : "Coming soon"}</small>}{scope.workspace === workspace && scope.site === site && <Check size={15} />}
          </button>)}
        </div>}
      </div>)}
    </div>}
  </div>;
}
