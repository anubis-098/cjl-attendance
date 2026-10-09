import { authenticateService,boundedBody,serviceHash,touchService } from "@/lib/fingerprint-service";
import { parseFingerLog } from "@/lib/import-cj";
import { readWorkspace,stagePunches,updateEmployeeStore } from "@/lib/database";
import { reopenChangedScans } from "@/lib/fingerprint-import";
export const runtime="nodejs";
export async function POST(request:Request) {
  const service=await authenticateService(request);
  if(!service) return Response.json({error:"Invalid or revoked Service token"},{status:401});
  const requestId=request.headers.get("x-request-id");
  if(!requestId || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(requestId)) return Response.json({error:"Valid X-Request-ID required"},{status:400});
  let file:Buffer,filename:string,parsed:ReturnType<typeof parseFingerLog>;
  try {
    filename=decodeURIComponent(request.headers.get("x-filename")||"");
    if(!filename.toLowerCase().endsWith(".txt") || filename.length>240 || /[\\/\x00-\x1f]/.test(filename)) throw Error("A TXT filename is required");
    file=await boundedBody(request); parsed=parseFingerLog(file.toString("utf8"));
  } catch(error) { return Response.json({error:(error as Error).message},{status:400}); }
  const hash=serviceHash(file);
  let summary:unknown;
  try {
    await updateEmployeeStore(async(c,state)=> {
      const existing=await c.query("SELECT sha256,summary FROM fingerprint_service_uploads WHERE service_id=$1 AND request_id=$2",[service.id,requestId]);
      if(existing.rows[0]) {
        if(existing.rows[0].sha256!==hash) throw Error("Request ID already used for a different file");
        summary=existing.rows[0].summary; return;
      }
      const current=await readWorkspace(c);
      const batch=await stagePunches(parsed.punches,filename,{id:`${service.id}:${requestId}`,hash});
      const reviews=reopenChangedScans(current.data,batch.added);
      summary={filename,added:batch.added.length,duplicates:parsed.duplicateScans+batch.skipped,total:batch.total,from:parsed.punches[0].punch_timestamp,to:parsed.punches.at(-1)!.punch_timestamp};
      await c.query("UPDATE workspace SET active_punch_batch=$1,data=$2 WHERE id=1",[batch.id,JSON.stringify({...state.data,reviews,audit:[{id:crypto.randomUUID(),key:"IMPORT",actor:`Service: ${service.name}`,timestamp:new Date().toISOString(),reason:"Service TXT import: append and skip duplicates",before:"",after:JSON.stringify(summary)},...state.data.audit]})]);
      await c.query("INSERT INTO fingerprint_service_uploads(id,service_id,request_id,sha256,filename,summary) VALUES($1,$2,$3,$4,$5,$6)",[crypto.randomUUID(),service.id,requestId,hash,filename,JSON.stringify(summary)]);
    });
    await touchService(service.id,request);
    return Response.json({ok:true,summary});
  } catch(error) {
    const conflict=(error as Error).message==="Request ID already used for a different file";
    return Response.json({error:conflict?(error as Error).message:"Import could not complete. Retry with the same request ID."},{status:conflict?409:500});
  }
}
