"use client";
import { useTranslation } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { Paperclip, Download, Trash2 } from "lucide-react";
import { useAccount } from "../auth-provider";
import { useWorkspace } from "./provider";
import EvidenceImageViewer from "./evidence-image-viewer";
import UploadProgress from "./upload-progress";
import { postFormWithProgress } from "@/lib/browser-upload";
import {
  EVIDENCE_MAX_SIZE,
  type AttendanceEvidence,
} from "@/lib/attendance-evidence";

export default function EvidencePanel({
  employeeId,
  date,
  onBusy,
}: {
  employeeId: string;
  date: string;
  onBusy: (busy: boolean) => void;
}) {
  const { t, getLocale } = useTranslation();
  const { refresh } = useWorkspace();
  const account = useAccount();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [items, setItems] = useState<AttendanceEvidence[]>([]);
  const [viewing, setViewing] = useState<AttendanceEvidence | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null),
    [note, setNote] = useState(""),
    [progress, setProgress] = useState<number | null>(null),
    [lastFileName, setLastFileName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadAbort = useRef<AbortController | null>(null);
  const url = `/api/attendance-evidence?${new URLSearchParams({ employeeId, date })}`;
  useEffect(() => {
    const abort = new AbortController();
    fetch(url, { cache: "no-store", signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw Error("โหลดหลักฐานไม่สำเร็จ กรุณาเปิดรายละเอียดใหม่");
        setItems((await r.json()).evidence);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [url]);
  async function upload(selected: File) {
    if (busy) return;
    if (selected.size === 0 || selected.size > EVIDENCE_MAX_SIZE) {
      setError("กรุณาเลือกไฟล์ขนาดไม่เกิน 5 MB");
      fileInput.current?.focus();
      return;
    }
    setBusy(true);
    onBusy(true);
    setError("");
    setFile(selected);
    setLastFileName(selected.name);
    setProgress(0);
    const controller = new AbortController();
    uploadAbort.current = controller;
    try {
      const form = new FormData();
      form.set("employeeId", employeeId);
      form.set("date", date);
      form.set("source", "supervisor");
      form.set("note", note);
      form.set("file", selected);
      await postFormWithProgress("/api/attendance-evidence", form, setProgress, controller.signal);
      setFile(null);
      setNote("");
      if (fileInput.current) fileInput.current.value = "";
      const list = await fetch(url, { cache: "no-store" });
      if (!list.ok)
        throw Error(
          "บันทึกไฟล์แล้ว แต่โหลดรายการไม่สำเร็จ กรุณาเปิดรายละเอียดใหม่",
        );
      setItems((await list.json()).evidence);
      await refresh();
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "แนบหลักฐานไม่สำเร็จ");
    } finally {
      uploadAbort.current = null;
      setBusy(false);
      onBusy(false);
    }
  }
  function discardSelectedFile() {
    uploadAbort.current?.abort();
    uploadAbort.current = null;
    setFile(null); setProgress(null); setLastFileName("");
    if (fileInput.current) fileInput.current.value = "";
  }
  async function remove(id: string) {
    if (busy || account.role !== "super_admin") return;
    setBusy(true); onBusy(true); setError("");
    try {
      const response = await fetch(`/api/attendance-evidence/${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setItems(items => items.filter(item => item.id !== id));
      setDeleting(null);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "ลบหลักฐานไม่สำเร็จ"); }
    finally { setBusy(false); onBusy(false); }
  }
  const label = (th: string, en: string) => getLocale().startsWith("en") ? en : th;
  return (
    <section className="attendance-evidence">
      <h4>
        <Paperclip size={16} />
        {t("หลักฐานการมาทำงาน")}
      </h4>
      {loading ? (
        <p role="status">{t("กำลังโหลดหลักฐาน...")}</p>
      ) : (
        <p>
          {t(
            items.length
              ? `แนบแล้ว ${items.length} ไฟล์`
              : "ยังไม่มีหลักฐานแนบ",
          )}
        </p>
      )}
      <ul className="evidence-list">
        {items.map((item) => (
          <li key={item.id}>
            <b>{item.filename}</b>
            <small>
              {t("จาก")}
              {t(item.source === "employee" ? "พนักงาน" : "หัวหน้างาน")}
              {item.provider_name ? ` · ${item.provider_name}` : ""}
              {t(" ·")}
              {t(" ")}
              {t((item.file_size / 1024).toFixed(0))}
              {t(" KB ·")}
              {t(" ")}
              {t(
                new Date(item.created_at).toLocaleString(getLocale(), {
                  timeZone: "Asia/Bangkok",
                }),
              )}
            </small>
            {item.note && <p>{item.note}</p>}
            {item.content_type.startsWith("image/") && (
              <button type="button" className="evidence-preview-button" aria-label={`${t("เปิดภาพเต็ม")} ${item.filename}`} onClick={()=>setViewing(item)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="evidence-preview"
                  src={`/api/attendance-evidence/${item.id}?preview=1`}
                    alt={`${t("หลักฐาน")} ${item.filename}`}
                  loading="lazy"
                />
              </button>
            )}
            <a
              href={`/api/attendance-evidence/${item.id}`}
              className="button"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={16} />
              {label("ดาวน์โหลด", "Download")}
            </a>
            {account.role === "super_admin" && (deleting === item.id ? <div className="evidence-delete-confirm">
              <span>{label("ลบไฟล์นี้ถาวร?", "Permanently delete this file?")}</span>
              <button type="button" className="button remark-delete" disabled={busy} onClick={() => remove(item.id)}>{label("ยืนยันลบ", "Confirm delete")}</button>
              <button type="button" className="button" disabled={busy} onClick={() => setDeleting(null)}>{t("ยกเลิก")}</button>
            </div> : <button type="button" className="button remark-delete" disabled={busy} onClick={() => setDeleting(item.id)}><Trash2 size={15} />{label("ลบหลักฐาน", "Delete evidence")}</button>)}
          </li>
        ))}
      </ul>
      <details>
        <summary>{t("เพิ่มหลักฐาน (ไม่บังคับ)")}</summary>
        <fieldset disabled={busy || loading || items.length >= 10}>
          <label className="field">
            {t("คำอธิบายหลักฐาน (ไม่บังคับ)")}
            <textarea
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <label className="field">
            {t("ไฟล์หลักฐาน")}
            <input
              ref={fileInput}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              disabled={busy}
              onChange={(e) => {
                const selected = e.target.files?.[0];
                setError("");
                if (selected) void upload(selected);
              }}
            />
          </label>
          <small>
            {t(
              "JPG / PNG / WebP / PDF · ไม่เกิน 5 MB ต่อไฟล์ · สูงสุด 10 ไฟล์ต่อวันเริ่มกะ",
            )}
          </small>
          {(file || lastFileName) && progress !== null && <UploadProgress fileName={lastFileName} progress={progress} busy={busy} onDiscard={discardSelectedFile} />}
        </fieldset>
      </details>
      {error && (
        <p role="alert" className="error">
          {t(error)}
        </p>
      )}
      {viewing && <EvidenceImageViewer item={viewing} onClose={()=>setViewing(null)}/>}
    </section>
  );
}
