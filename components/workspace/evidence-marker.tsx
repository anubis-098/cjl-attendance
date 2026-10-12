"use client";
import { Paperclip } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
export default function EvidenceMarker({count}:{count?:number}) {
  const {t}=useTranslation();
  return count ? <span className="evidence-marker" role="img" aria-label={`${t("มีรูปหลักฐานแนบ")} (${count})`} title={`${t("มีรูปหลักฐานแนบ")} (${count})`}><Paperclip size={13}/></span>:null;
}
