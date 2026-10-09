"use client";
import { useEffect,useState } from "react";
import { useAccount } from "../auth-provider";
import { useTranslation } from "@/lib/i18n";
import { Monitor,Radio } from "lucide-react";
type Service={id:string;name:string;active:boolean;connected:boolean;machine_name:string|null;last_seen:string|null;version:string|null};
type Upload={id:string;name:string;filename:string;received_at:string;summary:{added:number;duplicates:number;from:string;to:string}};
export default function FingerprintServicePanel() {
  const {getLocale}=useTranslation(); const thai=getLocale().startsWith("th");
  const label=(th:string,en:string)=>thai?th:en;
  const account=useAccount();
  const [services,setServices]=useState<Service[]>([]),[uploads,setUploads]=useState<Upload[]>([]);
  const [name,setName]=useState("Finger Client"),[token,setToken]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function refresh() {
    const response=await fetch("/api/fingerprint-service/manage",{cache:"no-store"});
    if(!response.ok) throw Error("Cannot load service status");
    const data=await response.json(); setServices(data.services); setUploads(data.uploads);
  }
  useEffect(()=> {
    let active=true;
    const load=()=> { if(active && !document.hidden) void refresh().catch(e=>active&&setError(e.message)); };
    load(); const timer=setInterval(load,30000); return()=> {active=false;clearInterval(timer);};
  },[]);
  async function create() {
    setBusy(true);setError("");setToken("");
    try { const response=await fetch("/api/fingerprint-service/manage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});const data=await response.json();if(!response.ok) throw Error(data.error);setToken(data.token);await refresh(); }
    catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  async function revoke(id:string) {
    if(!confirm(label("เพิกถอน Token นี้? Client จะส่งไฟล์ไม่ได้จนกว่าจะใช้ Token ใหม่","Revoke this token? The client will need a new token."))) return;
    setBusy(true);
    try {const response=await fetch(`/api/fingerprint-service/manage?id=${id}`,{method:"DELETE"});if(!response.ok) throw Error("Cannot revoke token");await refresh();} catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  const connected=services.some(s=>s.connected);
  const date=(value:string|null)=>value?new Date(value).toLocaleString(getLocale()):"—";
  return <section className="panel fingerprint-service">
    <header className="fingerprint-service-heading"><div><div className="eyebrow">AUTOMATIC FILE TRANSFER</div><h2>{label("รับข้อมูลจากเครื่อง Client","Client file transfer")}</h2><p>{label("เพิ่มข้อมูลใหม่ ข้ามรายการซ้ำ และเก็บข้อมูลเดิม","Append new scans, skip duplicates and retain existing data")}</p></div><span className={`service-status ${connected?"is-connected":"is-disconnected"}`}><Radio size={16}/>{connected?label("ติดต่อได้ล่าสุด","Recently connected"):label("รอเชื่อมต่อ Service","Waiting for service")}</span></header>
    {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
    <p>{label("สถานะเขียวหมายถึง Server ได้รับการติดต่อภายใน 40 นาทีล่าสุด ไม่ใช่การเชื่อมต่อสด","Green means contact within the last 40 minutes, not a live connection")}</p>
    {account.role==="super_admin"&&<details className="service-details"><summary>{label("ตั้งค่า Client / สร้าง Service token","Client setup / Create service token")}</summary><p>{label("ใส่ URL ของเว็บนี้ใน Client พร้อม Token ที่สร้างด้านล่าง Token แสดงเพียงครั้งเดียว","Enter this website URL in the client with the token below. Tokens are shown only once.")}</p><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><input aria-label="Service name" value={name} maxLength={100} onChange={e=>setName(e.target.value)}/><button className="btn primary" disabled={busy||!name.trim()} onClick={create}>{label("สร้าง Token","Create token")}</button></div>{token&&<div><p>{label("คัดลอกไปเก็บใน Client ก่อนปิดหน้านี้","Copy to the client before closing this page")}</p><input aria-label="Service token" readOnly value={token} onFocus={e=>e.target.select()} style={{width:"100%"}}/></div>}</details>}
    <div className="service-stats">{services.filter(s=>s.active).map(s=><article key={s.id} className={s.connected?"is-connected":"is-disconnected"}><Monitor size={20}/><span>{s.name}</span><strong>{s.machine_name||label("ยังไม่ได้เชื่อมต่อ","Not connected")}</strong><small>{date(s.last_seen)} · {s.version||"—"}</small>{account.role==="super_admin"&&<button className="btn" disabled={busy} onClick={()=>revoke(s.id)}>{label("เพิกถอน Token","Revoke token")}</button>}</article>)}{!services.some(s=>s.active)&&<article className="is-disconnected"><Monitor/><strong>{label("ยังไม่มีเครื่องต้นทาง","No clients registered")}</strong></article>}</div>
    <div className="service-history"><h3>{label("ประวัติรับไฟล์ล่าสุด","Recent uploads")}</h3><div className="report-scroll"><table className="report-table"><thead><tr>{[label("เวลารับไฟล์","Received"),label("เครื่อง / ไฟล์","Client / File"),label("ช่วงเวลาสแกน","Scan range"),label("เพิ่มใหม่","Added"),label("ข้ามรายการซ้ำ","Duplicates")].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{uploads.map(u=><tr key={u.id}><td>{date(u.received_at)}</td><td>{u.name}<br/>{u.filename}</td><td>{u.summary.from.replace("T"," ")} – {u.summary.to.replace("T"," ")}</td><td>{u.summary.added}</td><td>{u.summary.duplicates}</td></tr>)}{!uploads.length&&<tr><td colSpan={5}>{label("ยังไม่มีไฟล์จาก Service","No service uploads yet")}</td></tr>}</tbody></table></div></div>
  </section>;
}
