"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { AttendanceEvidence } from "@/lib/attendance-evidence";
export default function EvidenceImageViewer({item,onClose}:{item:AttendanceEvidence;onClose:()=>void}) {
  const {t}=useTranslation();
  const dialog=useRef<HTMLDialogElement>(null);
  const [zoomed,setZoomed]=useState(false);
  const [size,setSize]=useState({width:0,height:0});
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const node=dialog.current;node?.showModal();
    return()=>{node?.close();requestAnimationFrame(()=>{if(previous?.isConnected)previous.focus({preventScroll:true});});};
  },[]);
  return createPortal(<dialog ref={dialog} className="evidence-image-dialog" aria-label={t("ภาพหลักฐานเต็ม")}
    onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
    <header><span>{item.filename}</span><button type="button" className="evidence-image-close" aria-label={t("ปิดภาพ")} onClick={onClose}><X size={24}/></button></header>
    <div className="evidence-image-stage">
      {failed?<p role="alert">{t("โหลดรูปไม่สำเร็จ กรุณาปิดแล้วเปิดใหม่")}</p>:<button type="button" className={`evidence-image-zoom ${zoomed?"is-zoomed":""}`} aria-label={t(zoomed?"ย่อภาพ":"ซูมภาพ 2 เท่า")} aria-pressed={zoomed} onClick={()=>setZoomed(v=>!v)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/attendance-evidence/${item.id}?preview=1`} alt={item.filename} onError={()=>setFailed(true)} onLoad={e=>{if(!zoomed)setSize({width:e.currentTarget.clientWidth,height:e.currentTarget.clientHeight});}} style={zoomed?{width:size.width*2,height:size.height*2}:undefined}/>
      </button>}
    </div>
    <footer>{zoomed?<ZoomOut size={17}/>:<ZoomIn size={17}/>} {t(zoomed?"คลิกรูปเพื่อย่อ · เลื่อนเพื่อดูส่วนอื่น":"คลิกรูปเพื่อซูม 2 เท่า")}</footer>
  </dialog>,document.body);
}
