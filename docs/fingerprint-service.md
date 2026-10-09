# Fingerprint Service receiver

ใช้งาน Client ตาม [คู่มือ Finger Service](https://github.com/anubis-098/finger_service/blob/main/Finger_Service/README.md) เว็บรับ TXT จากเครื่องอื่นได้แล้ว ไม่ต้องล็อกอินด้วยบัญชีบุคคลบน Client ให้ Super Admin สร้าง Service token แยกแต่ละเครื่องที่หน้า Fingerprint logs

## API

- `POST /api/fingerprint-service/heartbeat` — ทดสอบการเชื่อมต่อด้วย `Authorization: Bearer <token>` ไม่เพิ่มข้อมูลสแกน
- `POST /api/fingerprint-service/upload` — ส่งเนื้อหา TXT โดยตรง (ไม่ใช่ multipart) ไม่เกิน 10 MB พร้อม Bearer token, `X-Request-ID` UUID, `X-Filename` ชื่อไฟล์ .txt ที่ encodeURIComponent แล้ว
- Header เสริม `X-Machine-Name`, `X-Service-Version` ใช้แสดงสถานะ
- ตอบ `{ok:true, summary:{filename,added,duplicates,total,from,to}}` หลังบันทึกสำเร็จ
- รหัสส่งซ้ำเดิมและเนื้อหาเดิมจะได้ผลเดิม รหัสเดิมแต่เนื้อหาเปลี่ยนตอบ 409 ข้อมูล TXT ไม่ถูกต้องตอบ 400 Token ผิด/เพิกถอนตอบ 401
- Manage API อ่านได้เมื่อมี session; สร้าง/เพิกถอนได้เฉพาะ Super Admin พร้อมตรวจ origin

Server ตรวจเนื้อหาทั้งไฟล์ก่อนเพิ่มข้อมูล ใช้กลไกเพิ่มสแกน/ข้ามซ้ำเดิม และเปิดผลยืนยันที่มีสแกนใหม่ให้ตรวจซ้ำ ไม่ลบข้อมูลเดิม มีใบรับใน fingerprint DB สำหรับกู้คืนเมื่อเขียน employee DB ไม่สำเร็จในรอบแรก โดย Client ต้องส่งซ้ำด้วย Request ID เดิม

ตาราง `fingerprint_services`, `fingerprint_service_uploads` ใน employee DB และ `fingerprint_import_receipts` ใน fingerprint DB ถูกสร้างแบบ IF NOT EXISTS เมื่อใช้งาน ไม่ต้องลบ volume หรือรีเซ็ตข้อมูล ไม่เก็บ Token ตัวจริงบน Server และไม่ให้ Token นี้เรียก API บัญชี/การเงิน

ประวัติหน้าเว็บแสดง 30 ไฟล์ล่าสุดที่บันทึกสำเร็จ ข้อผิดพลาดส่งไฟล์อยู่ใน Log ฝั่ง Client ป้ายเชื่อมต่อดูการติดต่อล่าสุดภายใน 40 นาที ไม่ใช่ heartbeat ต่อเนื่อง หน้าเว็บ refresh สถานะทุก 30 วินาทีขณะที่มองเห็นหน้า

การทดสอบใช้ Compose แยก port 3001/5433 เท่านั้น ห้ามนำข้อมูล TEST01 จาก Dummy เข้าฐานข้อมูลจริง การทดสอบรับไฟล์ไม่รับประกัน UI ของโปรแกรม WEB8 แต่ละรุ่น ต้องทดลองคลิกกับเครื่องต้นทางจริงอีกครั้ง
