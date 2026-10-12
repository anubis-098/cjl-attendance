import { guard } from "@/lib/auth";
import { employeeDB } from "@/lib/database";
import { ensureServiceSchema,newServiceToken,serviceHash } from "@/lib/fingerprint-service";
export const runtime="nodejs";
export async function GET() {
  const denied=await guard(); if(denied) return denied;
  await ensureServiceSchema();
  const services=await employeeDB.query("SELECT id,name,active,created_at,last_seen,machine_name,version,(active AND last_seen>now()-interval '40 minutes') AS connected FROM fingerprint_services ORDER BY created_at DESC");
  const uploads=await employeeDB.query("SELECT u.id,s.name,u.filename,u.received_at,u.summary FROM fingerprint_service_uploads u JOIN fingerprint_services s ON s.id=u.service_id ORDER BY u.received_at DESC LIMIT 3");
  return Response.json({services:services.rows,uploads:uploads.rows},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request) {
  const denied=await guard(true,true); if(denied) return denied;
  await ensureServiceSchema();
  const body=await request.json().catch(()=>null);
  if(typeof body?.name!=="string" || !body.name.trim() || body.name.length>100) return Response.json({error:"Enter a service name (1–100 characters)"},{status:400});
  const token=newServiceToken(), id=crypto.randomUUID();
  await employeeDB.query("INSERT INTO fingerprint_services(id,name,token_hash) VALUES($1,$2,$3)",[id,body.name.trim(),serviceHash(token)]);
  return Response.json({id,token},{status:201,headers:{"Cache-Control":"no-store"}});
}
export async function DELETE(request:Request) {
  const denied=await guard(true,true); if(denied) return denied;
  await ensureServiceSchema();
  const id=new URL(request.url).searchParams.get("id");
  if(!id || !/^[\da-f-]{36}$/i.test(id)) return Response.json({error:"Invalid service ID"},{status:400});
  await employeeDB.query("UPDATE fingerprint_services SET active=false WHERE id=$1",[id]);
  return Response.json({ok:true});
}
