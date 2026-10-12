"use client";
import { FileCheck2, LoaderCircle, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
export default function UploadProgress({
  fileName,
  progress,
  busy,
  onDiscard,
}: {
  fileName: string;
  progress: number;
  busy: boolean;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();
  return <div className="upload-progress" role="status" aria-live="polite">
    <span className="upload-progress-icon">{busy ? <LoaderCircle size={17} className="is-spinning" /> : <FileCheck2 size={17} />}</span>
    <div><b>{fileName}</b><div className="upload-progress-track"><i style={{ width: `${progress}%` }} /></div><small>{t(busy ? `กำลังอัปโหลด ${progress}%` : "อัปโหลดเรียบร้อยแล้ว")}</small></div>
    <button type="button" className="button upload-discard" disabled={false} aria-label={t(busy ? "ยกเลิกการอัปโหลด" : "ล้างไฟล์ที่เลือก")} title={t(busy ? "ยกเลิกการอัปโหลด" : "ล้างไฟล์ที่เลือก")} onClick={onDiscard}><Trash2 size={16} /></button>
  </div>;
}
