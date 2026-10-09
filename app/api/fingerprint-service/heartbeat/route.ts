import { authenticateService,touchService } from "@/lib/fingerprint-service";
export const runtime="nodejs";
export async function POST(request:Request) {
  const service=await authenticateService(request);
  if(!service) return Response.json({error:"Invalid or revoked Service token"},{status:401});
  await touchService(service.id,request);
  return Response.json({ok:true,serviceId:service.id,serverTime:new Date().toISOString()});
}
