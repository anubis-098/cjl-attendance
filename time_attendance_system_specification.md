# Agency Time Attendance & OT Reconciliation System (Prompt & Spec)

ระบบเว็บแอปพลิเคชันสำหรับนำเข้า ตรวจสอบ กระทบยอด (Reconcile) ข้อมูลสแกนนิ้วของพนักงาน Agency เทียบกับ Master Data กะการทำงาน และคำขอทำงานล่วงเวลา (OT Requisition) พร้อมระบบยืนยันผลโดยหัวหน้างาน (Supervisor Sign-off) และแสดงผลในรูปแบบ Compact Weekly/Monthly Calendar คล้ายคลึงกับ **Microsoft Teams Shifts**

---

## 1. System Overview & Objectives
1. **Automated Matching Engine:** จับคู่ข้อมูลสแกนนิ้วดิบ (Raw Fingerprint Log) กับกะการทำงาน (Shift Master) ตามรายชื่อพนักงาน
2. **OT Target Validation:** เปรียบเทียบชั่วโมงทำจริงกับเป้าหมาย OT ที่ขออนุมัติล่วงหน้า (Pre-approved OT vs Actual OT)
3. **Supervisor Verification Workflow:** หน้าจอให้หัวหน้างานกด Review, แก้ไขข้อผิดพลาด (Manual Override) และกด Lock/Approve ประจำงวด
4. **Compact Calendar UI:** หน้าต่างตารางเวลาสไตล์ MS Teams/Outlook มีความกระชับ พื้นที่จัดวางชัดเจน สบายตา แสดงสถานะด้วยสีและแท็กแบบ Micro-indicator

---

## 2. Recommended Tech Stack
* **Frontend:** Next.js (App Router), React, TypeScript
* **Styling:** Tailwind CSS, shadcn/ui, Lucide React
* **State & Data Table:** TanStack Table, TanStack Virtual (สำหรับการเลื่อนดูข้อมูลพนักงานจำนวนมากแบบลื่นไหล)
* **File Processing:** SheetJS (`xlsx`) สำหรับ Parse ข้อมูลจากเครื่องสแกนและ Master Data
* **Database & ORM:** PostgreSQL + Prisma ORM
* **Authentication:** NextAuth.js (Role: `SUPERVISOR`, `AGENCY_ADMIN`, `HR_VIEWER`)

---

## 3. Data Schema & Input Requirements

### 3.1 Master Data Schema (ไฟล์ข้อมูลหลัก)
| Field | Type | Description | Example |
|---|---|---|---|
| `emp_id` | String | รหัสพนักงาน Agency | `AG-2026-001` |
| `emp_name` | String | ชื่อ-นามสกุล | `สมชาย มั่นคง` |
| `department` | String | แผนก/ไลน์ผลิต | `Line A (Assembly)` |
| `date` | Date | วันที่ทำงาน | `2026-09-20` |
| `shift_code` | String | รหัสกะงาน | `S1`, `S2`, `OFF` |
| `shift_start` | Time | เวลาเริ่มกะตามแผน | `08:00` |
| `shift_end` | Time | เวลาสิ้นสุดกะตามแผน | `17:00` |
| `requested_ot_hrs`| Float | จำนวนชั่วโมง OT ที่ขอไว้ | `2.5` |
| `ot_task_target` | String | เป้าหมาย/งานที่ขอทำ OT | `แพ็คสินค้าล็อตด่วน 500 กล่อง` |

### 3.2 Raw Punch Data Schema (ข้อมูลดิบจากเครื่องสแกน)
| Field | Type | Description | Example |
|---|---|---|---|
| `device_emp_id` | String | รหัสที่บันทึกในเครื่องสแกน | `001` หรือ `AG-001` |
| `punch_timestamp`| DateTime| วันและเวลาที่สแกน | `2026-09-20 07:54:12` |
| `punch_type` | Enum | ประเภท (IN / OUT / UNKNOWN) | `CHECK_IN` |

---

## 4. Business Logic & Calculation Rules

### 4.1 การจับคู่เวลาเข้า-ออก (Punch Matching)
1. **Clock-in Window:** สแกนก่อนเริ่มกะได้ไม่เกิน 60 นาที ถึงหลังเริ่มกะ 120 นาที
2. **Clock-out Window:** สแกนหลังเวลาเลิกงาน หรือหลังเวลา OT ที่ขอไว้
3. **Tolerance & Grace Period:** 
   * สาย (Late): สแกนหลัง `shift_start` เกิน 5 นาที คิดสถานะ Late (แสดง Badge สีส้ม)
   * ขาดงาน (Missing Punch): ไม่มี Log สแกนเข้าหรือออก (แสดง Badge สีแดง `IN?` หรือ `OUT?`)

### 4.2 การคำนวณและเปรียบเทียบ OT (Target vs Actual)
1. **Eligible OT Start:** เริ่มนับหลังจากเวลา `shift_end` (เช่น เลิก 17:00 เริ่มนับ OT 17:30 หลังพัก 30 นาที)
2. **Actual OT Calculation:**
   $$\text{Actual OT} = \min\left(\text{Punched OT Hours}, \text{Requested OT Hours}\right)$$
   *(เว้นแต่หัวหน้างานจะกดอนุมัติ Over-budget ให้คิดตามที่ทำจริง)*
3. **Target Status Rules:**
   * **ACHIEVED (ตรงเป้า):** Actual OT $\ge$ Requested OT และหัวหน้างานยืนยันผลงาน
   * **UNDER (ต่ำกว่าเป้า):** ออกก่อนเวลา OT ที่ขอไว้ (ระบบจะคำนวณจ่ายเฉพาะเวลาจริง)
   * **UNAPPROVED (ทำเกินโดยไม่ขอ):** มีเวลาสแกนหลังกะ แต่ไม่มี `requested_ot_hrs` (ต้องให้หัวหน้างานพิจารณาเพิ่ม/ตัดออก)

### 4.3 Supervisor Approval Workflow
* **Pending Review:** มีการกระทบยอดแล้ว แต่หัวหน้างานยังไม่กดเซ็นรับรอง
* **Verified / Approved:** หัวหน้างานกด Approve รายคน หรือ Approve ประจำวัน/สัปดาห์
* **Manual Adjusted:** มีการแก้เวลาด้วยมือ (ระบบต้องบันทึก Audit Log: ชื่อผู้แก้ไข, เหตุผล, เวลาเดิม vs เวลาใหม่)

---

## 5. UI/UX Design System (Compact & Clean)

### 5.1 Design Philosophy
* **Ultra-Compact Spacing:** ใช้สเกล Padding/Margin ที่กระชับ (`px-2 py-1`, `gap-1.5`, `h-8` สำหรับปุ่มและ Input)
* **Font Scaling:** ใช้ฟอนต์ขนาด 11px - 13px (`text-xs` ถึง `text-sm`) ตัวเลขแสดงผลแบบ Monospace (`font-mono`) ป้องกันข้อความกระโดด
* **Calm Color Palette (Eye-Friendly):**
  * พื้นหลังหลัก: `slate-50` / `zinc-900`
  * กริดตาราง: `border-slate-200` เส้นบาง 1px
  * กะปกติ: โทนสีฟ้า/ครามจาง `bg-blue-50/70 border-blue-200 text-blue-800`
  * OT ผ่านเป้า: โทนสีเขียวสุภาพ `bg-emerald-50 border-emerald-200 text-emerald-800`
  * ข้อผิดพลาด/ต้องตรวจสอบ: สีส้มอำพัน `bg-amber-50 text-amber-700` หรือสีแดงกุหลาบ `bg-rose-50 text-rose-700`

### 5.2 Layout Architecture
1. **Top Bar (Filter & Action):**
   * เลือกรอบวันที่ (Date Picker: Week / Bi-weekly / Month)
   * ตัวกรอง Agency, แผนก, กะ, สถานะ (All / Issue Only / Pending Approval)
   * ปุ่ม Import Files (Master Data + Raw Fingerprint)
   * ปุ่มหลัก: **"Approve Selected (ยืนยันที่เลือก)"**
2. **Main Workspace: Compact Calendar Timeline (MS Teams Style):**
   * **Left Sticky Column:** รายชื่อพนักงาน + แผนก + สรุปชั่วโมงรวมประจำสัปดาห์
   * **Date Columns (Mon - Sun):**
     * แต่ละช่องวันจะแสดง Cell ขนาดกะทัดรัด
     * แถวบน: กะงานตามแผน (เช่น `08:00 - 17:00`)
     * แถวกลาง: เวลาสแกนจริง (`07:55 - 19:32` เป็น `font-mono`)
     * แถวล่าง: OT Badge (`OT: 2.0 / 2.0 hrs` พร้อมสัญลักษณ์ Checkmark)
3. **Detail Drawer / Modal (เมื่อคลิกที่ Cell):**
   * รายละเอียด Log ดิบทุกครั้งที่สแกนในวันนั้น
   * ช่องหมายเหตุผลการทำงานตามเป้าหมาย OT
   * ฟอร์มแก้ไขเวลาแบบด่วน (Quick Override) และกล่องยืนยันของหัวหน้างาน

---

## 6. Comprehensive AI Prompt (คำสั่งสร้างโค้ดแบบครบวงจร)

คัดลอกข้อความด้านล่างนี้ไปสั่ง AI เมื่อต้องการเริ่ม Generate โค้ดของโปรเจกต์:

```text
Act as a Senior Full-Stack Engineer and UI/UX Designer. Create a Next.js (App Router, Tailwind CSS, TypeScript, Lucide Icons) web application for an "Agency Time Attendance & OT Reconciliation System".

Core Requirements:
1. Data Input & In-Memory Matching Engine:
   - Provide a file upload modal that accepts two mock files or data inputs: Master Shift Data and Raw Biometric Log.
   - Implement reconciliation logic that matches employee punches to shifts with rules for late check-in, missing punches, and pre-approved OT comparison.
   
2. UI Layout (Compact, Teams Shifts-like):
   - Dense, space-efficient weekly timeline grid. Left column has Employee Name, ID, Agency, and Total Hours.
   - 7 columns for Monday to Sunday. Each cell must be compact (height ~70-80px), displaying Shift, In/Out punches, and an OT indicator pill.
   - Status color coding: Normal (Slate/Blue), Overtime Target Met (Emerald), Missing Punch/Late (Rose/Amber).
   - Use text sizes between 11px and 13px with mono font for timestamps.

3. Supervisor Interaction & Approvals:
   - Allow selecting multiple rows or an entire day to batch-approve.
   - Clicking an attendance card opens a compact drawer showing raw biometric records, requested OT targets, and an option for the supervisor to edit times or toggle the "Supervisor Sign-off" switch.
   - Include a summary header with stats: Total Headcount, Normal Hours, OT Hours Approved vs Requested, and Pending Approvals count.

Make the UI clean, minimalist, high-density, professional, and visually easy on the eyes. Use clean mock data so the app runs completely standalone.
```