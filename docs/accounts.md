# บัญชีและสิทธิ์

มี 2 บทบาท: `super_admin` และ `supervisor`

ทั้งสองบทบาทเข้าถึง Attendance, Master, Fingerprint, การนำเข้า, การเปลี่ยนกะ/วันหยุด, หลักฐาน, ยืนยัน OT, Audit log, Monthly OT pay และ Export ได้
เฉพาะ Super Admin เข้าหน้า `/accounts` และ API จัดการบัญชี เพื่อสร้าง แก้ไขสิทธิ์ เปลี่ยนรหัสผ่าน ปิดใช้งาน หรือลบบัญชีได้
ทั้งสองบทบาทเปลี่ยนรหัสผ่านตัวเองผ่านไอคอนตั้งค่าบัญชี (`/account`) ได้

หน้าจัดการบัญชีมี Email แบบไม่บังคับ หากเว้นว่างจะแสดงไอคอนเตือน แก้ไขได้โดย Super Admin และเก็บใน `app_users.email` ฐานข้อมูลเดิมให้รัน `sql/010-account-email.sql` กับ `employee_db` ก่อนอัปเดตเว็บ

## ติดตั้งกับข้อมูลเดิม

ใช้ `sql/009-accounts.sql` กับ `employee_db` ก่อนอัปเดตเว็บ ไม่มีการลบข้อมูลพนักงานหรือสแกน
ฐานข้อมูลใหม่มี schema รวมใน `sql/001-databases.sql` แล้ว

```powershell
Get-Content sql/009-accounts.sql -Raw | docker compose exec -T database psql -U cj_app -d employee_db -v ON_ERROR_STOP=1
docker compose up --build -d
New-Item -ItemType Directory -Force .local
docker compose exec -T web node scripts/bootstrap-accounts.mjs | Set-Content -Encoding UTF8 .local/initial-accounts.json
```

รัน bootstrap ครั้งแรกเท่านั้น: สร้าง `superadmin` และ `supervisor` พร้อมรหัสผ่านสุ่มคนละชุด และกุญแจลงลายเซ็น JWT สุ่มใน SQL
ถ้ามีบัญชีอยู่แล้ว script จะปฏิเสธและไม่เปลี่ยนรหัสผ่านเดิม เก็บไฟล์รหัสผ่านเริ่มต้นให้ผู้ดูแลเท่านั้น (`.local` ถูกกันออกจาก Git และ Docker image)
ไม่มี endpoint สมัคร Super Admin สาธารณะ ไม่มีรหัสผ่านตั้งต้นใน source code

## เซสชัน

- JWT HS256 อายุ 24 ชั่วโมงนับจากล็อกอิน ไม่มี refresh token และไม่ต่อเวลาเมื่อใช้งาน
- เก็บ JWT ใน HttpOnly / SameSite=Strict cookie ไม่ใช้ localStorage
- HTTPS ใช้ Secure cookie; เมื่อตั้ง reverse proxy ให้ส่ง `X-Forwarded-Proto: https` หรือกำหนด `AUTH_COOKIE_SECURE=true` ให้ web container
- ทุก API ตรวจลายเซ็น เวลาหมดอายุ เซสชัน SQL สถานะบัญชี และเวอร์ชันบัญชี
- แก้ Email อย่างเดียวคงเซสชันและเวลาหมดอายุเดิมไว้ การแก้ข้อมูลบัญชีอื่น/รหัสผ่าน ปิดบัญชี หรือลบบัญชี จะทำให้เซสชันเดิมใช้งานไม่ได้ ออกจากระบบยกเลิกเซสชันปัจจุบัน
- ตรวจ Origin สำหรับคำขอแก้ไขข้อมูล ปฏิเสธคำขอข้ามเว็บไซต์
- จำกัดการลองล็อกอินแต่ละชื่อผู้ใช้ 10 ครั้งต่อ 15 นาที
- รหัสผ่านเก็บเป็น scrypt พร้อม salt แยกรายบัญชี และไม่ถูกส่งคืน API
- บันทึกประวัติจัดการบัญชีใน `account_audit` และชื่อผู้ล็อกอินจริงในประวัติการเปลี่ยนข้อมูลใหม่
- ห้ามลบ/ปิด/ลดสิทธิ์บัญชี Super Admin ที่ตนกำลังใช้งาน และคง Super Admin ที่ใช้งานได้อย่างน้อย 1 บัญชี

ข้อมูลบัญชี กุญแจ JWT และเซสชันอยู่ใน volume PostgreSQL เดิม รอดจากการ rebuild/restart ปกติ
สำรองฐานข้อมูลต้องรวม `app_users`, `auth_settings`, `auth_sessions` และ `account_audit`

โครงสร้างการตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์อ้างอิง [Next.js Authentication](https://nextjs.org/docs/app/guides/authentication)
