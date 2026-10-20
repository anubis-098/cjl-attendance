"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Camera, Check, Clock3, Pencil, Trash2, UserRound, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "./provider";
import { useAccount } from "../auth-provider";
import { canManageAttendance } from "@/lib/permissions";
import { postFormWithProgress } from "@/lib/browser-upload";

type Profile = {
  name: string; department: string; section: string; shiftCode: string;
  shiftStart: string; shiftEnd: string; startDate: string; weeklyHoliday: string;
  status: string; company: string; contract: string; endDate: string;
  issue: string; hasPhoto: boolean;
};
const empty: Profile = { name: "", department: "", section: "", shiftCode: "", shiftStart: "08:00", shiftEnd: "17:00", startDate: "", weeklyHoliday: "", status: "", company: "", contract: "", endDate: "", issue: "", hasPhoto: false };
// Select choices verified against Master_Name_List_update_19-oct-26.xlsx.
const fields: { key: keyof Profile; label: string; type?: string; options?: string[] }[] = [
  { key: "name", label: "Full name" },
  { key: "department", label: "Department", options: ["CDC Fresh Food Opearation", "CDC Dry Food Operation"] },
  { key: "section", label: "Section", options: ["Chilled", "Frozen", "FD-FT", "Despatch", "Inventory FF", "Data Entry", "Inventory FZ", "Dry", "Fresh Equipment Cleaning", "FROZEN", "Seafood", "CS Claim Fresh", "FV", "Equip Cleaning"] },
  { key: "company", label: "Company", options: ["The First", "Buzz", "Beyond", "Direk", "STM"] },
  { key: "shiftCode", label: "Shift code", options: ["A", "M", "D", "N"] }, { key: "shiftStart", label: "Shift starts", type: "time" },
  { key: "shiftEnd", label: "Shift ends", type: "time" }, { key: "weeklyHoliday", label: "Weekly holiday", options: ["อาทิตย์", "อังคาร", "เสาร์"] },
  { key: "status", label: "Employment status", options: ["Active", "Resign"] }, { key: "contract", label: "Contract", options: ["Normal", "Resigned", "Contract"] },
  { key: "startDate", label: "Start date", type: "date" }, { key: "endDate", label: "End date", type: "date" },
];
export default function EmployeeProfileCard({ employeeId, fallbackName, payrollSettings }: { employeeId: string; fallbackName: string; payrollSettings?: ReactNode }) {
  const { t, getLocale } = useTranslation();
  const { refresh, setToast } = useWorkspace();
  const canEdit = canManageAttendance(useAccount().role);
  const [profile, setProfile] = useState<Profile>({ ...empty, name: fallbackName });
  const [draft, setDraft] = useState<Profile>(empty);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const label = (th: string, en: string) => getLocale().startsWith("en") ? en : th;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/employees/${encodeURIComponent(employeeId)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw Error(body.error || "Could not load profile");
      setProfile({ ...empty, ...body.profile, name: body.profile.name || fallbackName });
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load profile"); }
    finally { setLoading(false); }
  }, [employeeId, fallbackName]);
  useEffect(() => { void load(); }, [load]);
  const photoUrl = `/api/employees/${encodeURIComponent(employeeId)}/photo?v=${photoVersion}`;
  async function uploadPhoto(file?: File) {
    if (!file) return;
    setBusy(true); setProgress(0); setError("");
    const form = new FormData(); form.set("file", file);
    try {
      await postFormWithProgress(`/api/employees/${encodeURIComponent(employeeId)}/photo`, form, setProgress);
      setProfile(p => ({ ...p, hasPhoto: true })); setPhotoVersion(v => v + 1);
      setToast(label("อัปโหลดรูปโปรไฟล์แล้ว", "Profile photo uploaded"));
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setBusy(false); window.setTimeout(() => setProgress(null), 900); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function deletePhoto() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/photo`, { method: "DELETE" });
      const body = await response.json(); if (!response.ok) throw Error(body.error);
      setProfile(p => ({ ...p, hasPhoto: false })); setPhotoVersion(v => v + 1);
      setToast(label("ลบรูปโปรไฟล์แล้ว", "Profile photo removed"));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not remove photo"); }
    finally { setBusy(false); }
  }
  function edit() { setDraft({ ...profile }); setEditing(true); setError(""); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/employees/${encodeURIComponent(employeeId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const body = await response.json(); if (!response.ok) throw Error(body.error || "Could not save profile");
      setProfile(p => ({ ...draft, hasPhoto: p.hasPhoto, issue: "" })); setEditing(false);
      await refresh(); setToast(label("บันทึกข้อมูลพนักงานแล้ว", "Employee profile saved"));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save profile"); }
    finally { setBusy(false); }
  }
  const display = [
    ["Department", profile.department], ["Section", profile.section], ["Company", profile.company],
    ["Shift", `${profile.shiftCode} · ${profile.shiftStart}–${profile.shiftEnd}`],
    ["Weekly holiday", profile.weeklyHoliday], ["Status", profile.status],
    ["Contract", profile.contract], ["Start date", profile.startDate], ["End date", profile.endDate],
  ].filter(([, value]) => String(value || "").trim());
  return <>
    <section className="employee-profile-card panel">
      <div className="employee-profile-cover"><span className="employee-profile-mark">CJ <i>LOGISTICS</i></span></div>
      <div className="employee-profile-main">
        <div className="employee-profile-avatar-wrap">
          <div className="employee-profile-avatar">
            {profile.hasPhoto ? <img src={photoUrl} alt={t("Employee profile photo")} onError={() => setProfile(p => ({ ...p, hasPhoto: false }))} /> : <span>{(profile.name || fallbackName || employeeId).trim().charAt(0).toUpperCase()}</span>}
          </div>
          {canEdit && <button className="employee-photo-button" type="button" disabled={busy} aria-label={t("Change profile photo")} title={t("Change profile photo")} onClick={() => fileRef.current?.click()}><Camera size={16}/></button>}
          <input ref={fileRef} className="employee-photo-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void uploadPhoto(event.target.files?.[0])} />
        </div>
        <div className="employee-profile-title">
          <div className="employee-profile-name-line"><div><h1>{profile.name || fallbackName || employeeId}</h1><p>{employeeId}</p></div></div>
          <div className="employee-profile-meta-row">
            <div className="employee-profile-tags">
              {profile.department && <span className="employee-profile-tag department-tag">{profile.department}</span>}
              {profile.company && <span className="employee-profile-tag">{profile.company}</span>}
              {profile.status && <span className={`employee-profile-tag ${profile.status.toLowerCase().includes("resign") ? "status-inactive" : "status-active"}`}>{profile.status}</span>}
            </div>
            <div className="employee-profile-actions">
              {payrollSettings}
              {canEdit && profile.hasPhoto && <button type="button" className="button employee-photo-remove" disabled={busy} onClick={() => void deletePhoto()}><Trash2 size={15}/>{t("Remove photo")}</button>}
              {canEdit && <button type="button" className="button primary" disabled={busy || loading} onClick={edit}><Pencil size={15}/>{t("Edit profile")}</button>}
            </div>
          </div>
        </div>
      </div>
      <div className="employee-profile-details">
        {display.map(([key, value]) => <div className="employee-profile-detail" key={key}><span>{t(key)}</span><b>{key === "Shift" && <Clock3 size={14}/>} {value}</b></div>)}
        {!loading && !display.length && <span className="employee-profile-empty"><UserRound size={15}/>{t("Add employee details with Edit profile")}</span>}
      </div>
      {progress !== null && <div className="employee-photo-progress" role="status"><span style={{ width: `${progress}%` }}/><small>{t("Uploading photo")} {progress}%</small></div>}
      {error && <p className="employee-profile-error" role="alert">{error}</p>}
    </section>
    {editing && <div className="employee-profile-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setEditing(false); }}>
      <section className="employee-profile-modal" role="dialog" aria-modal="true" aria-labelledby="employee-profile-edit-title">
        <header><div><h2 id="employee-profile-edit-title">{t("Edit employee profile")}</h2><p>{employeeId}</p></div><button className="button" type="button" aria-label={t("Close")} disabled={busy} onClick={() => setEditing(false)}><X size={17}/></button></header>
        <form onSubmit={save}>
          <div className="employee-profile-form-grid">{fields.map(field => <label key={field.key}>{t(field.label)}{field.options ? <select required={["department", "company", "shiftCode"].includes(field.key)} value={String(draft[field.key] || "")} onChange={event => setDraft(p => ({ ...p, [field.key]: event.target.value }))}><option value="">{t("Select an option")}</option>{[...new Set([...field.options, String(draft[field.key] || "")].filter(Boolean))].map(option => <option key={option} value={option}>{option}</option>)}</select> : <input required={["name", "shiftStart", "shiftEnd"].includes(field.key)} type={field.type || "text"} maxLength={200} value={String(draft[field.key] || "")} onChange={event => setDraft(p => ({ ...p, [field.key]: event.target.value }))}/>}</label>)}</div>
          {error && <p className="employee-profile-error" role="alert">{error}</p>}
          <footer><button type="button" className="button calendar-cancel" disabled={busy} onClick={() => setEditing(false)}>{t("Cancel")}</button><button type="submit" className="button primary" disabled={busy}><Check size={16}/>{busy ? t("Saving…") : t("Save changes")}</button></footer>
        </form>
      </section>
    </div>}
  </>;
}
