// UI copy only. Employee names, imported values and free-form notes are not translated.
const entries = `
ภาพหลักฐานเต็ม|Full evidence image
ปิดภาพ|Close image
เปิดภาพเต็ม|Open full image
ย่อภาพ|Zoom out
ซูมภาพ 2 เท่า|Zoom image 2x
คลิกรูปเพื่อย่อ · เลื่อนเพื่อดูส่วนอื่น|Click to zoom out · Scroll to explore
คลิกรูปเพื่อซูม 2 เท่า|Click image to zoom 2x
โหลดรูปไม่สำเร็จ กรุณาปิดแล้วเปิดใหม่|Could not load image. Close and try again.
มีรูปหลักฐานแนบ|Image evidence attached
เพิ่มพนักงาน|Add employee
บันทึกพนักงาน|Save employee
เพิ่มพนักงานเรียบร้อยแล้ว|Employee added successfully
เพิ่มพนักงานแล้ว กรุณารีเฟรชหน้าจอ|Employee added. Please refresh the page.
ค่าเงินและเบี้ยเลี้ยงเริ่มต้น|Default pay and allowances
เติมจากอัตราส่วนกลาง · OT per hrs. ×1.5 · OT Holiday ×3.0 · ปรับอัตราเงินได้ใน Monthly OT pay|Filled from global rates · OT per hrs. ×1.5 · OT Holiday ×3.0 · Configure rates in Monthly OT pay
โหลดค่าเริ่มต้นใหม่|Reload defaults
เลือกเวลาทำงาน หรือระบุเวลาเอง|Select a schedule or enter times below
เลือกข้อมูล|Select a value
ยังไม่มีตัวเลือก กรุณากรอกข้อมูล|No existing options. Enter a value.
อัตโนมัติ|Automatic
รหัสพนักงานนี้มีอยู่แล้ว|Employee ID already exists
ข้อมูลหรืออัตราเงินเปลี่ยนแล้ว กรุณาโหลดค่าเริ่มต้นใหม่|Data or rates changed. Reload defaults before saving.
Guest ดูเวลาเท่านั้น · Employee ดูเฉพาะตนเอง · ทั้งสองระดับไม่เห็นข้อมูลการเงิน|Guest views attendance; Employee views only their own records. Neither can view financial data.
รหัสพนักงานที่ผูกบัญชี|Linked employee ID
ดูข้อมูลเท่านั้น · ไม่มีสิทธิ์แก้ไขหรือดูข้อมูลการเงิน|Read only · No editing or financial access
เลือกพนักงานเพื่อดูเวลาทำงานและสถานะ OT|Select an employee to view attendance and OT status
กรุณาระบุรหัสพนักงานสำหรับ Employee|An employee ID is required for Employee accounts
ไม่พบรหัสพนักงานในฐานข้อมูล|Employee ID was not found
บัญชีนี้ไม่มีสิทธิ์ดำเนินการ|This account does not have permission
สถานะคาบเวลาสแกน|Scan period status
สแกนไม่ครบ / กำกวม|Incomplete / ambiguous scans
จับคู่สแกนเอง|Pair scans manually
จับคู่สแกนด้วยตนเอง · รอยืนยัน OT|Manually paired scans · OT pending confirmation
ยกเลิกจับคู่สแกน|Cancel manual pairing
ยืนยันจับคู่|Confirm pairing
ยกเลิกคู่นี้|Remove this pair
ลากจากสแกนเข้าไปยังสแกนออก หรือคลิกสองเวลาเรียงกัน|Drag from the entry scan to the exit scan, or click two times in order
ลากจากสแกนเข้าไปยังสแกนออก หรือคลิกสองเวลาเรียงกัน · ปิดสแกนที่ไม่มีคู่ได้|Drag from entry to exit, or click two scans in order · Unmatched scans can be disabled
ปิดสแกนที่ไม่มีคู่|Disable this unmatched scan
เปิดใช้สแกนนี้|Re-enable this scan
ปิดแล้ว|Disabled
บันทึกการจับคู่ / ปิดสแกน|Save pairs / disabled scans
บันทึกการปิดสแกนที่ไม่มีคู่แล้ว|Unmatched scan disabled
กรุณาเลือกคู่สแกนหรือสแกนที่ต้องการปิด|Select scan pairs or scans to disable
เปิดใช้สแกนที่ปิดไว้ก่อนนำมาจับคู่|Re-enable disabled scans before pairing them
เลือกได้เฉพาะเวลาสแกนจริงของพนักงานคนนี้|Only this employee's actual scans can be selected
ไม่พบกะ Master ที่ตรงกับเวลาสแกนนี้|No Master shift matches this scan time
ปิดสแกนที่ไม่มีคู่จากปฏิทิน|Disabled unmatched scan from calendar
เวลาทั้งหมดเป็นสแกนจริง · จับคู่ข้ามวันได้ · การจับคู่ไม่ใช่การยืนยัน OT|Actual scans only · Overnight pairs supported · Pairing does not approve OT
เลือกสแกนออก|Select exit scan
สแกนยังไม่มีคู่|Unpaired scan
ยังไม่มีคู่|Unpaired
สแกนเดี่ยวยังไม่ระบุเข้า/ออก กรุณาจับคู่|Single scan with unknown direction. Please pair scans
พบสแกนออกอย่างเดียว ยังไม่มีคู่|Exit scan only, not yet paired
พบสแกนเข้าอย่างเดียว ยังไม่มีคู่|Entry scan only, not yet paired
เวลาแก้ไขยังไม่ครบ กรุณาจับคู่|Incomplete correction. Please pair scans
บันทึกการจับคู่แล้ว · ยังไม่ได้ยืนยัน OT|Pairing saved · OT not yet approved
กรุณาเลือกคู่สแกน|Please select scan pairs
กรุณาเลือกเวลาสแกนจริงของพนักงานคนนี้|Select actual scans for this employee
เวลาออกต้องหลังเวลาเข้าและห่างกันไม่เกิน 24 ชั่วโมง|Exit must follow entry within 24 hours
บันทึกได้หนึ่งคู่ต่อวันเริ่มงาน|One pair per work start date
คู่สแกนทับกันหรือใช้สแกนซ้ำ|Pairs overlap or reuse a scan
คู่สแกนทับเวลาที่บันทึกไว้|Pair overlaps a saved correction
Service ค่าแรง|Wage Service
Service OT|OT Service
ค่าจ้างฐาน / วัน|Base daily wage
พนักงานตามกะในวันนี้|Employees scheduled today
ดูตารางวันนี้ →|View today's schedule →
ค่าจ้างและรายได้รวม|Wages and total income
ปฏิทิน Actual: แสดงเวลาสแกนจริง · ฟ้า = งานปกติ · เหลือง = มี OT · เขียว = ยืนยันแล้ว · แดง = สแกนไม่ครบ/กำกวม|Actual calendar: recorded times · Blue = regular work · Yellow = OT · Green = confirmed · Red = incomplete/ambiguous scans
พบสแกนหลังเวลาออกที่แก้ไขไว้ โปรดตรวจสอบก่อนยืนยัน|A recorded scan is later than the corrected exit. Review before confirming.
ใช้สแกนท้ายสุดของคาบ รวมสแกนออกซ้ำระหว่างคาบ|Used the final scan of the period, including intermediate repeat exits
กำหนดช่วงวันที่|Custom date range
จากวันที่|From date
ถึงวันที่|To date
พนักงานที่มีสแกน|Employees with scans
วันที่เลือก|Selected dates
นับคนไม่ซ้ำจากสแกนจริง ไม่ขึ้นกับจำนวนครั้งที่สแกน|Unique employees with recorded scans, regardless of scan count
เวลาเข้า: นาที 01–20 ปัดลง หลังนาที 20 ปัดขึ้น · งาน 8 ชม. + พัก 1 ชม. แล้วนับ OT · OT ขั้นต่ำ 1 ชม. ปัดลงทุก 30 นาที · H/H8: 8 ชม. แรก x2.0 ส่วนเกิน x3.0 · PH/PH8: 8 ชม. แรก x1.0 ส่วนเกิน x3.0 · เบี้ยเลี้ยงเฉพาะวันทำงานปกติ · ไม่รวมภาษีหรือหักเงิน|Entry: minutes 01–20 round down; after minute 20 round up. OT starts after 8 work hours + 1-hour break. Minimum OT: 1 hour, rounded down to half hours. H/H8: first 8 hours x2.0, extra x3.0. PH/PH8: first 8 hours x1.0, extra x3.0. Allowances on regular workdays only. Before tax and deductions.
เลือกได้เมื่อ OT x1.5 / x3.0 ก่อนหักพักเกิน 3.0 ชม.|Available when gross x1.5 / x3.0 OT exceeds 3 hours.
OT ก่อนหักพัก |Gross OT 
OT สุทธิ |Net OT 
ปฏิทิน Actual: แสดงเวลาสแกนจริง · ฟ้า = งานปกติ · เหลือง = มี OT · แดง = สแกนไม่ครบ/กำกวม|Actual calendar: recorded times · Blue = regular work · Yellow = OT · Red = incomplete/ambiguous scans
เวลาเริ่มคำนวณ|Credited start time
เริ่ม OT หลังงาน 8 ชม. + พัก 1 ชม.|OT starts after 8 work hours + 1-hour break
นาที 01–20 ปัดลงต้นชั่วโมง หลังนาที 20 ปัดขึ้น · เวลาสแกนจริงไม่เปลี่ยน|Minutes 01–20 round down; after minute 20 round up. Recorded scan times remain unchanged.
Actual · เวลาสแกน|Actual · Fingerprint times
เวลาคาดการณ์|Estimated time
คู่สแกนรอตรวจสอบ|Scan pair needs review
คู่สแกนกำกวม โปรดตรวจสอบ|Ambiguous scan pair. Please review.
จับคู่จากลำดับสแกนจริง|Paired from the scan sequence
พบสแกนออกอย่างเดียว คาดเวลาเข้าย้อนหลัง 8 ชม.|Exit scan only. Entry estimated 8 hours earlier.
พบสแกนเข้าอย่างเดียว คาดเวลาออกอีก 8 ชม.|Entry scan only. Exit estimated 8 hours later.
สแกนเดี่ยวไม่ทราบเข้า/ออก แสดงช่วงคาดการณ์ 8 ชม.|Single scan with unknown direction. Showing an estimated 8-hour period.
ช่วงสแกนติดกันหรือทับกัน ไม่ยืนยันว่าเป็นสแกนออก โปรดตรวจสอบ|Adjacent or overlapping scan periods. Exit is not certain; please review.
เวลาแก้ไขยังไม่ครบ แสดงช่วงคาดการณ์ 8 ชม.|Incomplete corrected times. Showing an estimated 8-hour period.
เวลาที่หัวหน้างานแก้ไข|Supervisor-corrected times
พบหลายช่วงในวันเดียวกัน โปรดตรวจสอบก่อนยืนยัน|Multiple periods on one day. Review before confirming.
ช่วง Actual ใช้แสดงผลเท่านั้น ตรวจสอบเวลาเข้า–ออกและกะก่อนยืนยัน ไม่ใช้เวลาคาดการณ์คำนวณเงิน|Actual periods are for display. Review entry, exit and shift before confirming. Estimated times are not used for pay.
นำเฉพาะเวลาสแกนจริงมาให้ตรวจสอบ|Use recorded endpoints for review
ปฏิทิน Actual: แถบยึดสแกนจริง · สีแดง = คาดการณ์/คู่สแกนกำกวม · เส้นประ = มีเฉพาะแผน Master · เวลาคาดการณ์ไม่ใช้คำนวณเงิน|Actual calendar: bars follow scans · Red = estimated/ambiguous only · Estimated times do not calculate pay
ค่าจ้างวันหยุดจ่ายเฉพาะ PH/PH8 · วันหยุดประจำสัปดาห์นับวันที่มาทำงานจริง เงินแสดงเฉพาะ OT ยืนยันแล้ว x2.0/x3.0 ซึ่งรวมในยอด OT อยู่แล้ว ไม่บวกซ้ำ · รวมเงินได้เป็นยอดก่อนหักเงิน|Holiday wages apply only to PH/PH8. Weekly rest days count actual worked days; money shows confirmed x2.0/x3.0 OT already included in total OT, not added twice. Total earnings are before deductions.
คิดตามวันเริ่มกะ · OT ขั้นต่ำ 1 ชม. ต่ออัตรา ปัดลงทุก 30 นาที · H/H8 ทำงานในกะสูงสุด 8 ชม. เป็น x2.0 ส่วนเกินและ OT ก่อน/หลังกะเป็น x3.0 · หักพักในกะ 1 ชม. · ค่าจ้างวันหยุดแยกเฉพาะ PH/PH8 · เบี้ยเลี้ยงเฉพาะวันทำงานปกติ · ไม่รวมภาษีหรือหักเงิน|Counted by shift start date. Minimum OT is 1 hour per rate, rounded down to half hours. H/H8 pays x2.0 for up to 8 in-shift hours, x3.0 for excess and pre/post-shift OT. One-hour in-shift break. Separate holiday wages apply only to PH/PH8. Allowances apply only to regular workdays. Before tax and deductions.
เฉพาะพนักงานที่เลือก · OT ค่ากะ และเบี้ยเลี้ยงเฉพาะที่ยืนยันแล้ว · จำนวนวันรวมเป็นคน-วัน|Selected employees only · Confirmed OT and allowances only · Days are totaled as person-days
ติ๊กเลือกหน้าชื่อพนักงานในตารางเพื่อแสดงยอดบน Dashboard|Select employees using the table checkboxes to display dashboard totals.
เลือกแล้ว|Selected
เลือก “สรุปค่าจ้างรายเดือนและวันทำงานจริง” เพื่อรวมค่าจ้างปกติและค่าจ้างวันหยุด · ยอดทั้งหมดก่อนภาษีและหักเงิน · หากอัตราไม่ครบจะแสดง “อัตราไม่ครบ” แทนยอดเงิน|Select monthly wages and worked days to include regular and holiday wages. Totals are before tax and deductions. Missing rates are marked instead of showing an amount.
ค่าจ้างวันหยุด OT เบี้ยเลี้ยง และค่ากะ|Holiday wages, OT and allowances
ค่าจ้างวันหยุด = ค่าจ้างรายวัน × วัน PH/PH8 และ H/H8 ทั้งวันที่หยุดและมาทำงาน · รวมเงินได้ = ค่าจ้างวันทำงานจริง + ค่าจ้างวันหยุด + OT และเบี้ยเลี้ยงยืนยันแล้ว ก่อนหักเงิน|Holiday wages = daily wage × PH/PH8 and H/H8 days, whether worked or not. Total earnings = worked-day wages + holiday wages + confirmed OT and allowances, before deductions.
คิดตามวันเริ่มกะ · OT ขั้นต่ำ 1 ชม. ต่ออัตรา ปัดลงทุก 30 นาที · อัตรา OT ปัดทศนิยม 2 ตำแหน่งก่อนคูณชั่วโมง เงินปัด 2 ตำแหน่งต่อคนต่ออัตราต่อรอบ · ค่ากะและเบี้ยเลี้ยงคิดต่อวันทำงานปกติที่มีสแกนครบ · ค่าจ้างรวมวันทำงานจริงและวันหยุด PH/PH8/H/H8 · ไม่รวมภาษีหรือหักเงิน|Counted by shift start date. Minimum OT is 1 hour per rate, rounded down to 30 minutes. Hourly rates and per-person amounts are rounded to 2 decimals. Allowances apply to regular days with complete punches. Wages include worked days and PH/PH8/H/H8 holidays. Before tax and deductions.
OT x1.0 ยืนยันแล้ว|Confirmed OT x1.0
OT x1.5 ยืนยันแล้ว|Confirmed OT x1.5
OT x2.0 ยืนยันแล้ว|Confirmed OT x2.0
OT x3.0 ยืนยันแล้ว|Confirmed OT x3.0
ค่ากะเช้า|Morning shift allowance
ค่ากะบ่าย|Afternoon shift allowance
ค่ากะดึก|Night shift allowance
รวมค่ากะ|Total shift allowances
ค่าความคาว|Seafood allowance
ค่าความเย็น|Cold allowance
รวมค่าเย็นคาว|Total department allowances
รวมค่าโอที|Total OT pay
ค่าวันหยุดนักขัตฤกษ์|Public holiday pay
รวมเงินได้ทั้งหมด|Total earnings
วันทำงานปกติ|Regular workdays
คน-วัน|person-days
ตามตัวกรองปัจจุบัน · OT ค่ากะ และเบี้ยเลี้ยงเฉพาะที่ยืนยันแล้ว · จำนวนวันรวมเป็นคน-วัน|Current filters · Confirmed OT and allowances only · Days are totaled as person-days
วันหยุดนับตามรหัสในตาราง เงินวันหยุดเป็น OT ยืนยันแล้วที่รวมในยอด OT อยู่แล้ว ไม่บวกซ้ำ · รวมเงินได้ = ค่าจ้างวันทำงานจริง + OT และเบี้ยเลี้ยงยืนยันแล้ว ก่อนหักเงิน|Holiday counts follow scheduled codes. Holiday pay is confirmed OT already included in total OT, not added twice. Total earnings = worked-day wages + confirmed OT and allowances, before deductions.
กราฟิกเวลาขอ OT|OT request timeline
แผนเวลาที่ขอ|Requested schedule
ช่วง OT ที่ขอ|Requested OT period
เสร็จสิ้นการขอ OT|Finish requesting OT
คลิกวันที่ในปฏิทินเพื่อกรอกหรือแก้ไขคำขอ OT|Click a date on the calendar to create or edit an OT request.
ขอ OT|Request OT
เลือกวันขอ OT|Select OT request date
ส่งคำขอ OT|Submit OT request
OT ก่อนกะ (ชม.)|Pre-shift OT (hrs)
OT หลังกะ (ชม.)|Post-shift OT (hrs)
OT ก่อนกะ|Pre-shift OT
OT หลังกะ|Post-shift OT
เหตุผล / งานที่ให้ทำ|Reason / assigned work
เลือกวันเริ่มกะได้หลายวัน ใช้จำนวนชั่วโมงเดียวกันทุกวันที่เลือก คำขอเดิมที่รออนุมัติจะถูกแก้ไข|Select multiple shift dates. The same hours apply to each selected date. Existing pending requests will be updated.
ระบุ 0 หากไม่ขอช่วงนั้น ขั้นต่ำ 1 ชั่วโมง เพิ่มครั้งละ 0.5 ชั่วโมง อิงเวลากะของแต่ละวัน|Enter 0 to skip a period. Minimum 1 hour, in 0.5-hour increments, relative to each day's shift.
OT ตั้งแต่ 5 ชั่วโมงขึ้นไป กรุณาตรวจสอบภาระงานก่อนส่งคำขอ|OT is 5 hours or more. Review the workload before submitting.
คำขอไม่ยืนยัน OT จริงและไม่เปลี่ยนยอดเงินเดือน|Requests do not confirm actual OT or change payroll amounts.
คำขอ OT ในเดือนนี้|OT requests this month
ยังไม่มีคำขอ OT|No OT requests yet
แก้ไขคำขอ|Edit request
รออนุมัติ|Pending approval
บันทึกคำขอ OT รออนุมัติแล้ว|OT request saved, pending approval.
บันทึกคำขอ OT รออนุมัติ|Saved OT request pending approval
บันทึกคำขอ OT ไม่สำเร็จ|Unable to save OT request.
ข้อมูลคำขอ OT ไม่ถูกต้อง|Invalid OT request details.
เลือกวัน ระบุเหตุผล และขอ OT อย่างน้อย 1 ชั่วโมง เพิ่มครั้งละ 0.5 ชั่วโมง|Select dates, provide a reason, and request at least 1 hour in 0.5-hour increments.
วันที่เลือกไม่มีกะ เป็นวันลา หรือช่วงกะรวม OT เกิน 24 ชั่วโมง|A selected date has no shift, is a leave day, or exceeds 24 hours including the shift and OT.
คำขอนี้ผ่านการตรวจสอบแล้ว ไม่สามารถแก้ไขได้|This request has already been reviewed and cannot be edited.
OT ยืนยันแล้ว (ชม.)|Confirmed OT (hrs)
OT รอยืนยัน (ชม.)|Pending OT (hrs)
ส่งออก CSV เฉพาะที่เลือก|Export selected to CSV
เลือกพนักงานทั้งหมดตามตัวกรอง|Select all employees matching filters
เลือกพนักงาน|Select employee
คน เฉพาะพนักงานที่เลือก|employees selected for export
ยังไม่ได้กรอก Email|Email not provided
แนะนำให้กรอก Email สำหรับบัญชีนี้ (ไม่บังคับ)|We recommend adding an email for this account (optional).
บันทึกบัญชีเรียบร้อยแล้ว|Account saved.
บันทึกไม่สำเร็จ|Unable to save.
จัดการบัญชีและสิทธิ์|Accounts & Permissions
Super Admin จัดการบัญชีได้ · Supervisor ใช้งาน Attendance อนุมัติ OT และเข้าถึงข้อมูลการเงิน / Export ได้|Super Admin manages accounts. Supervisors can manage attendance, approve OT, and access financial reports and exports.
สร้างบัญชี|Create account
แก้ไขบัญชี|Edit account
สร้างบัญชีใหม่|Create new account
ชื่อผู้ใช้|Username
ชื่อแสดง|Display name
Email (ไม่บังคับ)|Email (optional)
สิทธิ์|Role
รหัสผ่านใหม่ (เว้นว่างเพื่อใช้เดิม)|New password (leave blank to keep current)
รหัสผ่าน|Password
เปิดใช้งานบัญชี|Account enabled
รหัสผ่านอย่างน้อย 6 ตัวอักษร · แก้ Email อย่างเดียวไม่ต้องล็อกอินใหม่ · การแก้ไขข้อมูลบัญชีอื่นจะยกเลิกเซสชันเดิม|Minimum 6 characters. Email-only changes keep your session. Other account changes require a new login.
ยกเลิก|Cancel
บันทึก|Save
สถานะ|Status
จัดการ|Actions
ใช้งาน|Active
ปิดใช้งาน|Disabled
แก้ไข|Edit
ลบ|Delete
ประวัติการจัดการบัญชี (100 รายการล่าสุด)|Account history (latest 100 entries)
กรุณากรอกชื่อผู้ใช้และรหัสผ่าน|Enter your username and password.
กรุณากรอกชื่อผู้ใช้|Enter your username.
กรุณากรอกรหัสผ่าน|Enter your password.
ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง|Incorrect username or password.
เชื่อมต่อไม่ได้|Unable to connect.
เข้าสู่ระบบจัดการเวลาและโอที|Sign in to Attendance & OT
กำลังเข้าสู่ระบบ...|Signing in...
เข้าสู่ระบบ|Sign in
หากไม่สามารถเข้าสู้ระบบได้ โปรดแจ่ง IT Administrator|If you cannot sign in, contact your IT Administrator.
โหลดหลักฐานไม่สำเร็จ กรุณาเปิดรายละเอียดใหม่|Unable to load evidence. Reopen the details.
กรุณาเลือกไฟล์ขนาดไม่เกิน 5 MB|Select a file no larger than 5 MB.
แนบหลักฐานไม่สำเร็จ|Unable to upload evidence.
บันทึกไฟล์แล้ว แต่โหลดรายการไม่สำเร็จ กรุณาเปิดรายละเอียดใหม่|File saved, but the list could not be refreshed. Reopen the details.
หลักฐานการมาทำงาน|Attendance evidence
แนบหลักฐานประกอบกรณีสแกนไม่ครบได้ตามต้องการ การแนบไฟล์ไม่เปลี่ยนเวลาเข้า–ออกหรือยืนยัน OT อัตโนมัติ|Optionally attach evidence for missing punches. Uploading does not change attendance times or automatically approve OT.
กำลังโหลดหลักฐาน...|Loading evidence...
ยังไม่มีหลักฐานแนบ|No evidence attached.
จาก|From
พนักงาน|Employee
หัวหน้างาน|Supervisor
ดูรูปหลักฐาน|View evidence image
ดาวน์โหลด|Download
เพิ่มหลักฐาน (ไม่บังคับ)|Add evidence (optional)
หลักฐานจาก|Evidence provided by
ชื่อผู้ให้หลักฐาน (ไม่บังคับ)|Provider name (optional)
คำอธิบายหลักฐาน (ไม่บังคับ)|Evidence description (optional)
ไฟล์หลักฐาน|Evidence file
JPG / PNG / WebP / PDF · ไม่เกิน 5 MB ต่อไฟล์ · สูงสุด 10 ไฟล์ต่อวันเริ่มกะ|JPG / PNG / WebP / PDF · Up to 5 MB per file · Up to 10 files per shift date
กำลังแนบหลักฐาน...|Uploading evidence...
แนบหลักฐาน|Upload evidence
หลักฐานบันทึกแยกจากปุ่มบันทึกผลตรวจสอบ และเปิดดูย้อนหลังได้|Evidence is saved separately from the review and remains available later.
ไม่มีรายการที่อนุมัติได้ กรุณาตรวจสอบข้อมูลก่อน|No eligible records. Review the data first.
อนุมัติ|Approve
รายการแล้ว|records completed
ส่งออกรายงาน CSV แล้ว|CSV report exported.
ภาพรวมเวลาทำงาน|Attendance overview
จัดการเวลาทำงาน กระทบยอด OT และรับรองข้อมูลพนักงาน Agency|Manage working hours, reconcile OT, and confirm agency employee attendance.
ส่งออกรายงาน|Export report
นำเข้าข้อมูล|Import data
ข้อมูล CJ ช่วง|CJ data period
· แสดงเฉพาะกะที่จับคู่ได้ · ดาวน์โหลดข้อสังเกต|· Matched shifts only · Download issues
รายการได้ที่ “นำเข้าข้อมูล”|records under “Import data”
ตารางเวลาพนักงาน|Employee schedule
คน|people
ยืนยันที่เลือก|Confirm selected
เลือกพนักงานทั้งหมด|Select all employees
ชม.|hrs
สแกนไม่ครบ|Missing punches
ยืนยันแล้ว|Confirmed
← ต่อจากช่วงก่อนหน้า|← Continued from previous period
ต่อไปช่วงถัดไป →|Continues into next period →
รอยืนยันอัตรา|Rate confirmation needed
ยืนยันโอทีแล้ว|OT confirmed
ชั่วโมง OT x1.5 + x3.0 ตั้งแต่ 5 ชม.|OT x1.5 + x3.0 of 5 hours or more
OT สูงเกินเป้า|High OT
พบสแกน: ตรวจสอบวันลา / ขาดงาน|Punches found: review leave / absence
OT รอพิจารณา|OT pending review
เวลาปกติ|Regular hours
มีการตรวจสอบเวลา|Attendance reviewed
ไม่พบข้อมูลในช่วงเวลานี้|No records in this period
ลองเปลี่ยนวันที่ ตัวกรอง หรือนำเข้าข้อมูลเพิ่มเติม|Change the date or filters, or import more data.
1 ช่อง = 24 ชั่วโมง · แถบกะต่อเนื่องตามเวลา · ยอดชั่วโมงและส่งออกยึดวันเริ่มกะ|One cell = 24 hours · Shift bars follow actual times · Hours and exports use the shift start date
ปกติ|Normal
มาสาย / OT สูงเกินเป้า|Late / High OT
คลิกที่กะเพื่อดูรายละเอียดและตรวจสอบ|Click a shift to view and review details.
ประวัติการตรวจสอบ|Audit log
ประวัติการอนุมัติและแก้ไข พร้อมข้อมูลก่อน–หลัง ·|Approval and edit history with before/after values ·
รายการ|records
ส่งออกประวัติ|Export history
ค้นหาประวัติ|Search history
ค้นหารหัส ผู้ดำเนินการ หรือเหตุผล|Search ID, operator, or reason
วันที่ทำงาน|Work date
ล้างตัวกรอง|Clear filters
ไม่พบประวัติการแก้ไข|No edit history
การอนุมัติและแก้ไขเวลาจะถูกบันทึกไว้ที่นี่|Approvals and attendance edits will appear here.
ดูข้อมูลก่อนและหลังแก้ไข|View before and after values
ก่อนแก้ไข|Before
หลังแก้ไข|After
กำหนดวันหยุดประเพณีองค์กร|Set company holidays
ปิดวันหยุดองค์กร|Close company holidays
คลิกวันที่เพื่อกำหนด PH ร่วมกันทุกพนักงาน ทุกแผนก และทุก Agency (|Select dates to apply PH to all employees, departments, and agencies (
คนใน Master) รวมพนักงานที่เพิ่มในภายหลัง|employees in Master), including future employees.
วันหยุดองค์กรแทนวันลา ขาดงาน และวันหยุดรายบุคคลในวันที่เลือก หากยกเลิกจะกลับไปใช้ตารางเดิม ยอดยืนยันที่ได้รับผลกระทบจะเปิดให้ตรวจสอบใหม่|Company holidays override individual leave, absence, and holidays. Removing them restores the original schedule. Affected approvals must be reviewed again.
จ|Mon
อ|Tue
พ|Wed
พฤ|Thu
ศ|Fri
ส|Sat
อา|Sun
เลือก|Select
วัน · เพิ่ม|days · Add
วัน · ยกเลิก|days · Remove
วัน|days
เพิ่ม:|Add:
ยกเลิก:|Remove:
ไม่มีวันหยุดราชการตั้งต้น วันที่ที่เลือกจะใช้ร่วมกันใน Attendance ปฏิทินพนักงาน การคำนวณเงิน และ Export|No government holidays are preloaded. Selected dates apply to attendance, employee calendars, payroll, and exports.
บันทึกไม่สำเร็จ กรุณาปิดหน้าต่างและโหลดข้อมูลใหม่ก่อนลองอีกครั้ง|Unable to save. Close this dialog and reload before trying again.
กำลังบันทึก...|Saving...
ยืนยันใช้กับทุกพนักงาน|Apply to all employees
เพิ่มหมายเหตุรายวัน|Add daily remark
หมายเหตุวันที่|Remarks for
ปิด|Close
ขอบเขตหมายเหตุ|Remark scope
Global · พนักงานทุกคน|Global · All employees
Local · เฉพาะพนักงาน|Local · Employee only
หมายเหตุเฉพาะพนักงานคนนี้|Remark for this employee only
แสดงบนหัววันที่ในหน้า Attendance สำหรับพนักงานทุกคน|Shown on the Attendance date header for all employees.
เหตุการณ์ / หมายเหตุ|Event / remark
เช่น ฝนตกหนัก น้ำท่วมบริเวณทางเข้า|For example, heavy rain or flooding at the entrance
บันทึกเฉพาะขอบเขตที่เลือก · เว้นว่างแล้วบันทึกเพื่อลบหมายเหตุ · ไม่กระทบเวลาหรือการคำนวณเงิน|Save the selected scope only · Save blank to remove · Does not affect hours or pay
บันทึกหมายเหตุแล้ว|Remark saved.
บันทึกเฉพาะคนนี้|Save for this employee
บันทึกสำหรับทุกคน|Save for everyone
← กลับตารางเวลาพนักงาน|← Back to employee schedule
· ปฏิทินรายเดือน|· Monthly calendar
เดือนก่อนหน้า|Previous month
เดือนถัดไป|Next month
เลือกเดือน|Select month
เดือนนี้|This month
ยกเลิกการเลือก|Cancel selection
เลือกยืนยันเป็นกลุ่ม|Select for bulk confirmation
ยกเลิกกำหนดวันหยุด|Cancel holiday selection
กำหนดวันหยุด|Set holidays / leave
ยกเลิกเปลี่ยนกะ|Cancel shift changes
เปลี่ยนกะ|Change shift
เลือกวันหยุด วันลา หรือขาดงาน · WOP / PL / SL / AB ไม่คิด OT ค่ากะ และเบี้ยเลี้ยง|Select holidays, leave, or absence · WOP / PL / SL / AB receive no OT, shift pay, or allowances
รหัสวันหยุด|Holiday / leave code
PH · วันหยุดประเพณีองค์กร (ทุกพนักงาน)|PH · Company holiday (all employees)
คืนค่าตารางเดิม (ลบวันหยุด / วันลา / ขาดงานที่กำหนดเอง)|Restore schedule (remove custom holiday / leave / absence)
เลือกตามวัน|Select by weekday
เลือกวันหยุดประจำสัปดาห์|Select weekly rest days
เลือกวันในสัปดาห์|Select weekday
อาทิตย์|Sunday
จันทร์|Monday
อังคาร|Tuesday
พุธ|Wednesday
พฤหัสบดี|Thursday
ศุกร์|Friday
เสาร์|Saturday
ทุกวัน|Every
ในเดือนนี้|in this month
คลิกช่องวันที่เพื่อเลือกหรือยกเลิก · ใช้เฉพาะเดือนนี้ · การเปลี่ยนวันหยุดจะเปิดผลรับรองของวันที่เลือกให้ตรวจสอบใหม่|Click dates to select or clear · This month only · Changing holidays reopens affected approvals
เลือกกะที่ยืนยันได้ทั้งหมดในเดือนนี้|Select all eligible shifts this month
เลือกทั้งหมดในเดือนนี้|Select all this month
รายการที่ยืนยันได้|eligible records
เลือกเฉพาะกะที่เริ่มในเดือนนี้ สแกนครบ และยังไม่ได้ยืนยัน|Only unconfirmed shifts starting this month with complete punches can be selected.
ชั่วโมงปกติ|Regular hours
ชม. · OT ยืนยันแล้ว / ทำจริง|hrs · Confirmed / actual OT
ไม่มีข้อมูลกะ|No shift data
เฉพาะคน|Individual
ทุกคน|Everyone
เฉพาะคน:|Individual:
เลือกวันเปลี่ยนกะ|Select shift change date
เลือกวันหยุด|Select holiday
วันหยุดตามรหัส H / H8 / PH / PH8 ในตารางกะ · 1 ช่อง = 24 ชั่วโมง · คลิกแถบกะเพื่อดูรายละเอียด|H / H8 / PH / PH8 holidays follow the schedule · One cell = 24 hours · Click a shift for details
สัปดาห์|Week
2 สัปดาห์|2 weeks
เดือน|Month
ช่วงก่อนหน้า|Previous period
ช่วงถัดไป|Next period
เลือกวันที่|Select date
วันนี้|Today
ค้นหาชื่อ หรือรหัสพนักงาน...|Search employee name or ID...
ทุก Agency|All agencies
แผนก|Department
Section|Section
ประเภทสัญญา|Contract type
R · วันสิ้นสุดงานตาม Master: |R · Master employment end date:
 · ซ่อนกะหลังวันที่นี้| · shifts are hidden after this date
วันที่ออกตาม Master|Master departure date
Master ระบุลาออก แต่ไม่มีวันที่ออก · ระบบยังไม่ตัดกะ เพื่อไม่เดาวันสิ้นสุด|Master marks the employee as resigned but has no end date. Shifts remain until a date is provided.
ทุกแผนก|All departments
กะ|Shift
ทุกกะ|All shifts
กะทำงาน|Work shift
ประเภทพนักงาน|Employee type
พนักงานทุกประเภท|All employee types
ยังไม่ระบุประเภท|Type not specified
รับข้อมูลจากเครื่องต้นทาง|Source machine file transfer
ติดตาม Service ที่ดึงและส่งไฟล์สแกนนิ้วอัตโนมัติทุก 30 นาที|Monitor the service that exports and uploads fingerprint files every 30 minutes.
รอเชื่อมต่อ Service|Awaiting service connection
เครื่องต้นทาง|Source machine
ยังไม่ได้เชื่อมต่อ|Not connected
ชื่อเครื่องและเวอร์ชัน Service จะแสดงเมื่อเชื่อมต่อ|Machine name and service version will appear when connected.
รอบการทำงาน|Run interval
ทุก 30 นาที|Every 30 minutes
รอบถัดไป: รอข้อมูลจาก Service|Next run: awaiting service data
รับไฟล์จาก Service ล่าสุด|Last service upload
ยังไม่มีข้อมูล|No data yet
แสดงเวลาที่เซิร์ฟเวอร์รับไฟล์สำเร็จ|Time the server successfully received a file
เวลาสแกนล่าสุดในฐานข้อมูล|Latest punch in database
รวมข้อมูลนำเข้าด้วยตนเอง · เวลาไทย|Includes manual imports · Bangkok time
สถานะรอบปัจจุบัน|Current run status
รอ Service ส่งสถานะการทำงาน|Waiting for service status
อ่านหน้าจอ / คลิกปุ่ม|Read screen / click
Export ไฟล์|Export file
ส่งไฟล์|Upload file
ตรวจสอบข้อมูล|Validate data
บันทึกสำเร็จ|Saved successfully
ประวัติรับไฟล์อัตโนมัติ|Automatic upload history
แยกจากการนำเข้าไฟล์ด้วยตนเองด้านล่าง|Separate from manual imports below
เวลารับไฟล์|Received at
เครื่องต้นทาง / ไฟล์|Source machine / file
ช่วงเวลาสแกนในไฟล์|Punch period in file
เพิ่มใหม่|Added
ข้ามรายการซ้ำ|Duplicates skipped
รายการผิดพลาด|Rejected records
ผลการทำงาน|Result
ยังไม่มีประวัติจาก Service|No service upload history yet
เมื่อเชื่อมต่อแล้ว แต่ละรอบจะแสดงผลนำเข้าและสาเหตุหากทำงานไม่สำเร็จ|After connection, each run will show import results and failure details.
รายละเอียดการเชื่อมต่อที่จะแสดง|Connection details
ติดต่อ Service ล่าสุด|Last service contact
รอการเชื่อมต่อ|Awaiting connection
Service ID / เวอร์ชัน|Service ID / version
ยังไม่ได้ลงทะเบียนเครื่อง|No machine registered
รูปแบบไฟล์|File format
วิธีจัดเก็บ|Storage method
เพิ่มข้อมูลใหม่ ข้ามรายการซ้ำ และเก็บข้อมูลเดิม|Append new records, skip duplicates, and retain existing data
แจ้งเตือนเมื่อเครื่องต้นทางขาดการติดต่อ อ่านปุ่มไม่สำเร็จ Export ไม่สำเร็จ ส่งไฟล์ไม่ได้ หรือรูปแบบไฟล์ไม่ถูกต้อง|Alerts will cover offline machines, OCR failures, export failures, upload failures, and invalid files.
เตรียมหน้าสถานะไว้แล้ว ระบบเชื่อมต่อ Service และการรับไฟล์อัตโนมัติจะเพิ่มในขั้นถัดไป ระหว่างนี้นำเข้าไฟล์ด้วยตนเองได้ตามปกติ|This status page is prepared for future service integration. Automatic uploads are not connected yet. Manual imports remain available.
กรุณาเลือกทั้ง Master Data และ Raw Punch|Select both Master Data and Raw Punch files.
กรุณาเลือกไฟล์ CDC Agency Attendance ด้วย|Select the CDC Agency Attendance file too.
นำเข้าไม่สำเร็จ|Import failed.
นำเข้าและบันทึกลง SQL แล้ว|Imported and saved to SQL.
นำเข้าข้อมูลเวลาทำงาน|Import attendance data
ปิดนำเข้า|Close import
อัปโหลด Master และข้อมูลเครื่องสแกนเพื่อกระทบยอดอัตโนมัติ|Upload Master and fingerprint data for automatic reconciliation.
ผลนำเข้า CJ ล่าสุด:|Latest CJ import:
ข้อสังเกต|Issues
ดาวน์โหลดรายการตรวจสอบล่าสุด|Download latest review list
CSV / Excel รูปแบบมาตรฐาน|Standard CSV / Excel format
การนำเข้าจะแทนที่ตารางกะและผลตรวจสอบ แต่สแกนนิ้วจะเพิ่มต่อจากข้อมูลเดิมและข้ามรายการซ้ำเสมอ|Import replaces schedules and reviews. Fingerprints are always appended and deduplicated.
Master Name list.xlsx · ใช้ชีต Master Name|Master Name list.xlsx · Uses the Master Name sheet
ข้อมูลพนักงานและกะทำงาน|Employee and shift data
All-attlogd*.txt · รหัส วันที่ YYYYMMDD เวลา HHmm|All-attlogd*.txt · ID, YYYYMMDD date, HHmm time
ข้อมูลสแกนเข้า–ออกจากเครื่อง|Raw clock-in/out punches
CDC Agency Attendance · ตารางรายวันและ OT รวมทั้งงวด|CDC Agency Attendance · Daily schedule and period OT totals
ตรวจสอบผลการจับคู่ก่อนยืนยันนำเข้า|Review matching results before importing
CSV, XLSX หรือ XLS · วันที่ YYYY-MM-DD · เวลา HH:mm|CSV, XLSX or XLS · Date YYYY-MM-DD · Time HH:mm
ผลตรวจสอบก่อนนำเข้า|Import preview
คน ·|people ·
กะที่จับคู่ได้|matched shifts
สแกน|punches
รายการ · รวมรายการซ้ำ|records · duplicates
รายการ · สแกนที่ยังจับคู่ไม่ได้|records · unmatched punches
OT รวมในรายงาน|Report OT total
ชม. ใช้อ้างอิงเท่านั้น ระบบคำนวณและรับรอง OT จากเวลาสแกนจริงได้โดยไม่ต้องมีคำขอ OT|hrs, for reference only. OT is calculated and approved from actual punches without a prior request.
ใช้เฉพาะวันที่มีโค้ดใน Attendance และอยู่ในช่วงไฟล์สแกน รายการโค้ด/เวลากะที่ไม่ชัดเจนจะถูกแยกไว้ด้านล่าง ไม่ปรากฏในตารางคำนวณ|Only coded attendance dates within the punch period are used. Ambiguous codes or times are listed below and excluded from calculations.
พบข้อสังเกต|Issues found
ดาวน์โหลดรายการที่ต้องตรวจสอบ|Download records to review
ดาวน์โหลดตัวอย่าง Master CSV|Download Master CSV sample
ดาวน์โหลดตัวอย่าง Punch CSV|Download Punch CSV sample
หากรหัสเครื่องไม่ตรง emp_id ให้เพิ่มคอลัมน์ device_emp_id ใน Master เพื่อจับคู่โดยตรง|If the device ID differs from emp_id, add device_emp_id to the Master for direct matching.
กำลังกระทบยอด...|Reconciling...
ยืนยันนำเข้ารายการที่จับคู่ได้|Import matched records
ตรวจสอบไฟล์และการจับคู่|Validate files and matching
นำเข้าและกระทบยอด|Import and reconcile
แสดง|Show
จำนวนรายการต่อหน้า|Rows per page
รายการต่อหน้า|rows per page
ก่อนหน้า|Previous
หน้า|Page
ถัดไป|Next
เลือกข้อมูลส่งออก CSV|Select CSV export data
เลือกชุดข้อมูล|Choose an export preset
เลือกชุดที่ต้องการส่งออก ระบบจะเลือกหมวดข้อมูลให้โดยอัตโนมัติ|Choose a preset and its data groups will be selected automatically.
ชุดที่เลือก|Selected preset
ปรับแต่งหมวดข้อมูลเอง|Customize data groups
รหัส ชื่อ Agency แผนก และรอบคำนวณจะถูกรวมในไฟล์เสมอ|Employee ID, name, agency, department, and pay period are always included.
ชั่วโมงและยอด OT รวมเบี้ยเลี้ยงที่ยืนยันแล้ว|Approved OT hours and amounts, allowances included
รายการ OT และเบี้ยเลี้ยงที่ยังรอ Supervisor ยืนยัน|OT and allowances awaiting supervisor confirmation
ค่าจ้าง วันทำงาน วันหยุด และวันลา|Wages, working days, holidays, and leave
ทุกหมวดข้อมูล ทั้งยืนยันแล้ว รอยืนยัน และข้อมูลประกอบ|All groups, including approved, pending, and reference data
ส่งออกไม่ได้: พบพนักงานสแกนไม่ครบ|Export blocked: employees have incomplete scans
กรุณาตรวจสอบรายการสแกนไม่ครบก่อนส่งออก|Review incomplete scan records before exporting.
และอีก|and
ปิดหน้าต่างส่งออก|Close export dialog
รอบ|Period
ถึง|to
คน ตามตัวกรองปัจจุบัน รวมทุกหน้าตาราง|employees matching current filters, across all pages
ชุดข้อมูลส่งออก|Export selection
ยืนยันแล้วเท่านั้น|Confirmed only
รอยืนยันเท่านั้น|Pending only
ข้อมูลทั้งหมด|All data
ล้างตัวเลือก|Clear selection
เลือกข้อมูลเพิ่มเติมได้เอง · รหัส ชื่อ แผนก Agency และรอบคำนวณจะส่งออกเสมอ|Choose additional columns. ID, name, department, agency, and pay period are always included.
รอยืนยัน|Pending
ข้อมูลประกอบ|Additional data
เพิ่มแถวรวมท้ายไฟล์|Include totals row
เลือก “สรุปค่าจ้างรายเดือนและวันทำงานจริง” เพื่อรวมค่าจ้างปกติ · ยอดทั้งหมดก่อนภาษีและหักเงิน · หากอัตราไม่ครบจะแสดง “อัตราไม่ครบ” แทนยอดเงิน|Select monthly wages and worked days to include base pay. Totals are before tax and deductions. Missing rates are marked instead of showing an amount.
ตัวอย่างไฟล์ ·|File preview ·
คอลัมน์|columns
แสดงตัวอย่างสูงสุด 3 คน · ไฟล์ CSV ใช้หัวตารางภาษาไทยและตัวเลขทศนิยม 2 ตำแหน่ง เปิดใน Excel ได้|Preview up to 3 employees · CSV retains Thai column headers and 2 decimal places for Excel
กลุ่มข้อมูล ·|data groups ·
สรุปเงินเดือน|Salary summary
ดาวน์โหลด CSV|Download CSV
รอระบุอัตรา|Rate required
คำนวณเงินโอทีรายเดือน|Monthly OT pay
คำนวณ OT ค่ากะ และเบี้ยเลี้ยงจากเวลาทำงาน ตั้งอัตราได้บนเว็บ|Calculate OT, shift pay, and allowances from attendance. Configure rates here.
ส่งออก CSV|Export CSV
เดือนจ่าย|Pay month
รอบคำนวณ|Pay period
26 เดือนก่อน – 25 เดือนนี้|Previous month 26th – current month 25th
วันที่ 1 – สิ้นเดือน|1st – last day of month
อัปเดตยอด|Refresh totals
OT ยืนยันแล้ว (บาท)|Confirmed OT (THB)
รวมเฉพาะพนักงานที่คำนวณอัตราได้ครบ|Employees with complete rates only
OT รอยืนยัน (บาท)|Pending OT (THB)
ยังไม่รวมในยอดยืนยันแล้ว|Not included in confirmed totals
พนักงานในรอบ|Employees in period
ตามตัวกรองปัจจุบัน|Based on current filters
อัตราไม่ครบ / สแกนไม่ครบ|Missing rates / punches
คน / กะที่ต้องตรวจสอบ|people / shifts to review
เบี้ยเลี้ยงและค่ากะยืนยันแล้ว (บาท)|Confirmed allowances and shift pay (THB)
เฉพาะวันทำงานปกติ|Regular workdays only
เบี้ยเลี้ยงและค่ากะรอยืนยัน (บาท)|Pending allowances and shift pay (THB)
รวม OT และเบี้ยเลี้ยงยืนยันแล้ว (บาท)|Confirmed OT and allowances total (THB)
ไม่รวมค่าจ้างปกติ|Excludes base wages
สรุปค่าจ้างรายเดือน|Monthly wage summary
ซ่อนสรุปค่าจ้างรายเดือน|Hide monthly wage summary
แสดงสรุปค่าจ้างรายเดือน|Show monthly wage summary
ซ่อนข้อมูล|Hide data
แสดงข้อมูล|Show data
ค่าจ้างรายวัน × วันทำงานปกติที่มีเวลาเข้า–ออกครบ · ไม่นับวันหยุด วันลา และขาดงาน · ค่าจ้างปกตินับตามการทำงานจริงโดยไม่ขึ้นกับการยืนยัน OT|Daily wage × regular days with complete punches. Excludes holidays, leave, and absence. Base pay follows actual attendance independently of OT approval.
วันทำงานจริงรวม (คน-วัน)|Total worked days (person-days)
ค่าจ้างตามวันทำงานจริง (บาท)|Wages for days worked (THB)
ค่าจ้าง + OT และเบี้ยเลี้ยงยืนยันแล้ว (บาท)|Wages + confirmed OT and allowances (THB)
ยอดประมาณการ รวมรายการรอยืนยัน (บาท)|Projected total including pending items (THB)
ตามตัวกรองปัจจุบัน · นับวันเริ่มกะ กะข้ามคืนนับหนึ่งวัน · ไม่เฉลี่ยค่าจ้างตามชั่วโมง · ยอดก่อนภาษีและรายการหัก|Current filters · Overnight shifts count as one day on the start date · No hourly proration · Before tax and deductions
ซ่อนข้อมูลค่าจ้างอยู่ · กดไอคอนลูกตาเพื่อแสดง|Wage details hidden · Select the eye icon to reveal
ค้นหารายงานเงิน OT|Search OT pay report
ค้นหารหัสหรือชื่อพนักงาน|Search employee ID or name
Agency รายงานเงิน OT|OT pay agency filter
วันทำงานจริง / ค่าจ้างรายวัน|Worked days / daily wage
ค่าจ้าง + ยอดยืนยัน (บาท)|Wages + confirmed pay (THB)
OT เบี้ยเลี้ยง และค่ากะ|OT, allowances, and shift pay
ยอดประมาณการ (บาท)|Projected pay (THB)
รวมรายการรอยืนยัน|Includes pending items
ชม.ยืนยัน × บาท/ชม. = บาท|Confirmed hrs × THB/hr = THB
OT ยืนยัน|Confirmed OT
OT รอยืนยัน|Pending OT
เบี้ยเลี้ยงแผนก / ค่ากะ|Department allowance / shift pay
ยืนยัน / รอยืนยัน (บาท)|Confirmed / pending (THB)
รวม OT + เบี้ยเลี้ยง|OT + allowances total
ยืนยันแล้ว (บาท)|Confirmed (THB)
วันหยุด / ตรวจสอบ|Holidays / review
รายละเอียด|Details
บาท/วัน|THB/day
· ค่ากะ|· Shift pay
วันปกติยืนยัน|Confirmed regular days
วัน · รอยืนยัน|days · Pending
ดูรายวัน|View daily details
กำลังคำนวณ...|Calculating...
ไม่มีข้อมูลกะในรอบนี้|No shifts in this period
· ชั่วโมงและเบี้ยเลี้ยงรายวัน|· Daily hours and allowances
ค่าจ้างรายวัน|Daily wage
บาท · ฐาน OT = ค่าจ้าง ÷ 8 · เบี้ยเลี้ยงไม่รวมในฐาน OT|THB · OT base = daily wage ÷ 8 · Allowances excluded from OT base
วันที่|Date
รหัสกะ / วันหยุด|Shift / holiday code
ค่าจ้างปกติ (บาท)|Base wages (THB)
เบี้ยเลี้ยงแผนก (บาท)|Department allowance (THB)
ค่ากะ (บาท)|Shift pay (THB)
หมายเหตุ|Notes
· รวมในยอดยืนยัน|· Included in confirmed totals
คิดตามวันเริ่มกะ · OT ขั้นต่ำ 1 ชม. ต่ออัตรา ปัดลงทุก 30 นาที · อัตรา OT ปัดทศนิยม 2 ตำแหน่งก่อนคูณชั่วโมง เงินปัด 2 ตำแหน่งต่อคนต่ออัตราต่อรอบ · ค่ากะและเบี้ยเลี้ยงคิดต่อวันทำงานปกติที่มีสแกนครบ · สรุปค่าจ้างรวมค่าจ้างรายวันตามวันทำงานจริง · ไม่รวมภาษีหรือหักเงิน|Based on shift start date · Minimum 1 OT hour per rate, rounded down to half hours · Rates and amounts rounded to 2 decimals · Allowances apply to regular days with complete punches · Wages reflect days worked · Before tax and deductions
อัตราค่าจ้างและเบี้ยเลี้ยง|Wage and allowance rates
ตั้งค่าอัตราค่าจ้างและเบี้ยเลี้ยง ·|Configure wage and allowance rates ·
ใช้อัตราที่บันทึกแล้ว|Saved rates
ใช้อัตราเริ่มต้น|Default rates
สำหรับเดือนจ่าย|For pay month
(บาท)|(THB)
OT = ค่าจ้างรายวัน ÷ 8 × ตัวคูณ|OT = daily wage ÷ 8 × multiplier
บาท/ชม.|THB/hr
เบี้ยเลี้ยงและค่ากะจ่ายเฉพาะวันทำงานปกติที่มีสแกนเข้า–ออกครบ · M = Morning, A = Afternoon, N = Night · กะ D ไม่มีค่ากะ|Allowances apply only to regular days with complete punches · M = Morning, A = Afternoon, N = Night · D has no shift pay
ตรวจประเภทเบี้ยเลี้ยงของแผนก (|Review department allowance types (
แผนก)|departments)
Seafood / Saefood / SF ใช้ค่าความคาว · Frozen / Frozen CDC ใช้ค่าเย็น · แผนกอื่นเลือกเพิ่มเติมได้|Seafood / Saefood / SF receive seafood allowance · Frozen / Frozen CDC receive cold allowance · Configure other departments as needed
ไม่ระบุแผนก|Department not specified
ชื่อเดิมมีเบี้ยเลี้ยงต่างกัน ยังใช้อัตราเดิมรายคน กรุณาเลือกเพื่อใช้ร่วมกัน|Original department names have different allowances. Existing individual rates remain until a shared type is selected.
ไม่มีเบี้ยเลี้ยงแผนก|No department allowance
Seafood · ค่าความคาว|Seafood allowance
Frozen · ค่าเย็น|Frozen / cold allowance
อัตรานี้ใช้กับทุก Agency บันทึกแล้วจะคำนวณใหม่ทั้งเดือนจ่ายที่เลือก ไม่เปลี่ยนอัตราของเดือนอื่น|Applies to all agencies. Saving recalculates the selected pay month without changing other months.
กำลังบันทึก กรุณารอสักครู่|Saving. Please wait.
บันทึกวันหยุดไม่สำเร็จ|Unable to save holidays.
เปลี่ยนกะไม่สำเร็จ|Unable to change shift.
กำลังโหลดฐานข้อมูล...|Loading database...
ลองใหม่|Try again
รายการรออนุมัติ|Pending approvals
ชั่วโมงทำงานปกติ|Regular working hours
รายงาน OT ยืนยันแล้ว / ทำจริง|Confirmed / actual OT report
ตรวจสอบและอนุมัติรายวัน รายคน หรือรายการที่เลือก|Review and approve by date, employee, or selection.
รายละเอียดตามช่วงเวลาและตัวกรอง · ชั่วโมงแสดงก่อนคูณอัตรา|Details for the selected period and filters · Hours shown before multipliers
ยืนยันที่เลือก (|Confirm selected (
เลือกรายการในหน้านี้|Select records on this page
วันที่ / กะ|Date / shift
เข้า – ออก|In – out
OT ทำจริง (ชม.)|Actual OT (hrs)
OT อนุมัติ|Approved OT
ตามสิทธิ์ (ชม.)|Eligible (hrs)
ตรวจสอบ|Review
OT สูงเกินเป้า ·|High OT ·
อนุมัติแล้ว|Approved
รออนุมัติ|Pending approval
ดูรายละเอียด|View details
ไม่มีรายการรออนุมัติในช่วงเวลานี้|No pending approvals in this period
ไม่พบรายการตามตัวกรอง|No records match the filters
เปลี่ยนช่วงเวลา หรือเลือกตัวกรองอื่นเพื่อดูข้อมูล|Change the period or filters to view records.
กรุณาระบุเหตุผลในการแก้ไขเวลาหรือหักพัก OT|Enter a reason for changing times or deducting an OT break.
เวลาออกต้องอยู่หลังเวลาเข้า|Clock-out must be after clock-in.
กรุณาระบุเวลาเข้าก่อนรับรอง|Enter clock-in time before confirming.
กรุณาระบุเวลาออกก่อนรับรอง|Enter clock-out time before confirming.
กรุณาตรวจสอบข้อมูลสแกน กะ และอัตรา OT ให้ครบก่อนรับรอง|Check punches, shift details, and OT rates before confirming.
ตรวจสอบและยืนยันผลการทำงาน|Review and confirm attendance
บันทึกผลตรวจสอบและประวัติการแก้ไขแล้ว|Review and edit history saved.
รายละเอียดเวลาทำงาน|Attendance details
ตรวจสอบเวลาทำงาน|Review attendance
ปิดรายละเอียด|Close details
กะตามแผน|Planned shift
โค้ดต้นทาง Attendance:|Original attendance code:
เวลากะที่กำหนดเฉพาะวัน|Daily shift override
เวลากะจาก Master Name|Shift times from Master Name
· สแกน TXT ไม่ระบุเข้า–ออก จับคู่ตามช่วงเวลากะ|· TXT punches have no in/out flag and are matched to the shift window
กะที่กำหนดเฉพาะวัน ·|Daily shift override ·
ข้อมูลสแกนดิบ|Raw punches
เข้า|In
ออก|Out
สแกนอื่น|Other punch
ไม่พบข้อมูลสแกนในช่วงกะ|No punches in this shift window
OT ทำจริง|Actual OT
รับรองตามเวลาทำงานจริง ไม่ต้องมีคำขอ OT · นับตั้งแต่ 1 ชม. ต่ออัตรา · ปัดลงทุก 30 นาทีแยกตามตัวคูณ|Confirm actual hours without an OT request · Minimum 1 hour per rate · Rounded down to half hours by multiplier
OT สูงเกินเป้า · x1.5 + x3.0 รวม|High OT · x1.5 + x3.0 total
ชม. กรุณาตรวจสอบภาระงานก่อนยืนยัน|hrs. Review workload before confirming.
ชั่วโมงแยกตามตัวคูณ|Hours by multiplier
ผลจับคู่หรือยอด OT เปลี่ยนจากกฎเดิม กรุณาตรวจสอบและยืนยันใหม่|Matching or OT changed under updated rules. Review and confirm again.
OT ก่อนกะ|Pre-shift OT
ชม. · ไม่มีการหักพัก|hrs · No break deduction
หักพัก OT 30 นาที|Deduct 30-minute OT break
เลือกได้เมื่อ OT หลังเลิกกะ x1.5 / x3.0 ก่อนหักพักเกิน 3.0 ชม.|Available when pre-deduction post-shift OT at x1.5 / x3.0 exceeds 3.0 hours.
OT หลังเลิกกะก่อนหักพัก|Post-shift OT before break
หักพัก|Break deduction
OT หลังกะสุทธิ|Net post-shift OT
กะปกติ 9 ชม. หักพัก 1 ชม. = สุทธิ 8 ชม.|Regular shift: 9 hours minus 1-hour break = 8 hours
ตัวคูณ|Multiplier
ทำจริง (ชม.)|Actual (hrs)
ตามสิทธิ์อนุมัติ (ชม.)|Eligible for approval (hrs)
แสดงชั่วโมงหลังปัดลง ก่อนคูณอัตรา ยอดนี้จะนับเป็น OT ยืนยันแล้วเมื่อรับรองรายการ|Rounded-down hours before multipliers. Counted as confirmed OT once approved.
ปรับปรุงเวลา|Adjust attendance times
ข้อมูลที่รับรองแล้วถูกล็อก ปิดการรับรองเพื่อแก้ไข|Confirmed records are locked. Unconfirm to edit.
เวลาเข้า|Clock-in
เวลาออก|Clock-out
เหตุผลในการแก้ไข|Reason for edit
จำเป็นเมื่อเปลี่ยนเวลาหรือหักพัก OT|Required when changing times or deducting an OT break
ผลการทำงาน / หมายเหตุ (ไม่บังคับ)|Work results / notes (optional)
ระบุผลการทำงานตามเป้าหมาย OT|Enter work results or notes
ยืนยันความถูกต้องของเวลาและผลงาน|Confirm attendance and work results
บันทึกผลตรวจสอบ|Save review
ข้อมูลพนักงาน|Employees
เวลาสแกนนิ้ว|Fingerprint logs
คำนวณเงินโอที|Monthly OT pay
จัดการบัญชี|Manage accounts
ตั้งค่าบัญชี|Account settings
ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง|Unable to sign out. Try again.
ออกจากระบบ|Sign out
ข้อมูลจริงจากฐานข้อมูลพนักงานและเวลาสแกนนิ้ว|Live employee and fingerprint database records
ปิดข้อความ|Dismiss message
เปลี่ยนกะเฉพาะวันที่เลือก|Change shifts for selected dates
ใช้เวลากะที่มีในระบบ|Use an existing shift
เลือกต้นแบบ หรือกำหนดเวลาเอง|Select a template or enter custom times
กะใหม่|New shift
M · กะเช้า|M · Morning
D · กะเช้าไม่มีค่ากะ|D · Morning without shift pay
A · กะบ่าย|A · Afternoon
N · กะดึก|N · Night
คืนค่ากะเดิม|Restore original shift
เวลาเริ่มกะใหม่|New shift start
เวลาสิ้นสุดกะใหม่|New shift end
เหตุผลเปลี่ยนกะ|Reason for shift change
เช่น เปลี่ยนกะตามที่หัวหน้ายืนยัน|For example, shift change confirmed by supervisor
เวลาออกเป็นวันถัดไป ·|Ends the following day ·
เลือกช่องวันที่ด้านล่าง · ไม่เปลี่ยนรหัสวันหยุดหรือวันลา|Select dates below · Holiday and leave codes remain unchanged
บันทึกแล้วจะจับสแกนใหม่ ล้างเวลาเข้า–ออกที่แก้ด้วยมือในวันที่เลือก และเปิดการยืนยันของวันนั้นกับวันข้างเคียงให้ตรวจสอบใหม่ เก็บค่าเดิมไว้ในประวัติ|Saving rematches punches, clears manual times on selected dates, and reopens approvals on those and adjacent dates. Previous values remain in history.
เลือกทุกวันในเดือน|Select every day this month
ล้างวันที่เลือก|Clear selected dates
(+1 วัน)|(+1 day)
(วันก่อน)|(previous day)
ยังไม่ถึงเวลาเลิกกะ|Shift has not ended
ตามแผน|Planned
ทำจริง|Actual
รอจบกะ / สแกนออก|Awaiting shift end / clock-out
ข้อมูลสแกนไม่ครบ|Incomplete punch data
ในกะ|Within shift
ช่วง OT|OT period
สแกนเข้า – ออก|Clock-in – clock-out
OT ก่อน / หลังกะ|Pre-shift / post-shift OT
รอข้อมูลครบ|Awaiting complete data
OT รวมคำนวณ|Calculated OT total
· ยืนยันแล้ว|· Confirmed
หักพัก OT|OT break deduction
ⓘ OT ตั้งแต่ 5 ชม. โปรดให้หัวหน้างานตรวจสอบ|ⓘ OT is 5 hours or more. Supervisor review recommended.
แถบแสดงช่วงเวลาสแกนจริง · OT คำนวณปัดลงครึ่งชั่วโมง|Bars show actual punch times · OT rounded down to half hours
คลิกแถบกะเพื่อดูรายละเอียด / แก้ไข|Click a shift for details / edits
นำเข้าและบันทึกลงฐานข้อมูล SQL แล้ว|Imported and saved to the SQL database.
ตรวจสอบไฟล์พนักงานไม่สำเร็จ|Could not validate the employee file.
พนักงานที่ตรวจพบ|Employees found
แถวที่ควรตรวจสอบ|Rows to review
แถวรหัสซ้ำในไฟล์|Duplicate ID rows
ยืนยันนำเข้าพนักงาน|Confirm employee import
หัวตารางตามชีต Master Name · พนักงานทั้งหมดในฐานข้อมูล|Headers follow the Master Name sheet · All employees in the database
ไฟล์ TXT ไม่มี Header · รหัสพนักงาน / ปีเดือนวัน YYYYMMDD / เวลาสแกนนิ้ว HHmm ตาม 3 คอลัมน์ต้นทาง|TXT without headers · Employee ID / YYYYMMDD date / HHmm punch time from the three source columns
เทียบข้อมูล Attendance|Compare attendance
นำเข้าไฟล์ด้วยตนเอง|Manual file import
เลือก Excel หรือ CSV · จับคู่ตามชื่อคอลัมน์ สลับลำดับหรือเพิ่มคอลัมน์ได้|Choose Excel or CSV · Matched by column name, supporting reordered or extra columns
เลือกไฟล์ All-attlogd*.txt จากเครื่องสแกนนิ้ว|Select an All-attlogd*.txt file from the fingerprint system
วิธีนำเข้าข้อมูลพนักงาน|Employee import mode
เพิ่ม/อัปเดตข้อมูล|Add / update records
แทนที่ข้อมูลทั้งหมด|Replace all records
เพิ่มรหัสใหม่และอัปเดตข้อมูลของรหัสที่มีอยู่ตามไฟล์ เก็บพนักงานที่ไม่มีในไฟล์และตารางกะรายวันเดิมไว้ เปิดผลตรวจสอบใหม่เฉพาะรหัสที่นำเข้า ข้อมูลสแกนนิ้วยังคงอยู่|Add new IDs and update existing employees. Retain other employees and daily schedules. Reopen reviews only for imported IDs. Fingerprints are retained.
ใช้รายชื่อในไฟล์แทนข้อมูลพนักงานทั้งหมด พนักงานที่ไม่มีในไฟล์จะถูกนำออก ล้างตารางกะและผลตรวจสอบเดิม ข้อมูลสแกนนิ้วยังคงอยู่|Replace all employees with this file, removing those not listed and clearing schedules and reviews. Fingerprints are retained.
เพิ่มข้อมูลต่อจากทุกไฟล์เดิม ข้ามรายการซ้ำ เก็บสแกนเก่าไว้จนกว่าผู้พัฒนาจะสั่งลบ เปิดผลตรวจสอบใหม่เฉพาะกะที่มีสแกนเพิ่ม|Append to all existing files and skip duplicates. Old punches are retained until a developer explicitly deletes them. Only affected shift reviews are reopened.
กำลังนำเข้า...|Importing...
นำเข้าไฟล์|Import file
ผลนำเข้า|Import results
รายการ · ข้ามรายการซ้ำ|records · duplicates skipped
รายการ · รวมสะสม|records · cumulative total
ช่วงเวลาภายในไฟล์:|Period within file:
ค้นหาข้อมูล|Search records
ค้นหารหัส หรือชื่อพนักงาน|Search employee ID or name
ค้นหารหัสพนักงาน|Search employee ID
ทั้งหมด|All
ไม่ระบุ|Not specified
ผลตรวจสอบ|Validation result
พร้อมจับคู่|Ready to match
มีปัญหาข้อมูล|Data issues
รหัสพนักงาน|Employee ID
ปี/เดือน/วัน|Year / month / day
ชื่อ-นามสกุล|Full name
กำลังโหลด...|Loading...
ไม่พบข้อมูลที่ตรงกับตัวกรอง|No records match your filters
ยังไม่มีข้อมูล กรุณา Import File|No data yet. Import a file to begin.
รออนุมัติทั้งหมด|All pending approvals
ทุกสถานะ|All statuses
รอตรวจสอบทั้งหมด|All pending reviews
การอนุมัติ|Approval
รายละเอียดที่ต้องตรวจสอบ|Review issues
สถานะอื่น ๆ|Other statuses
พนักงานทั้งหมด|Total employees
ดูฐานข้อมูลพนักงานทั้งหมด →|View employee database →
ดูรายละเอียดชั่วโมงปกติ →|View regular hours →
OT ยืนยันแล้ว / ทำจริง|Confirmed / actual OT
ดูรายงาน OT และตัวคูณ →|View OT and multiplier report →
รอการอนุมัติ|Pending approval
ตรวจสอบและรับรองรายการ →|Review and confirm records →
รหัสผ่านใหม่ไม่ตรงกัน|New passwords do not match.
เปลี่ยนรหัสผ่านไม่สำเร็จ|Unable to change password.
เปลี่ยนรหัสผ่าน|Change password
เมื่อเปลี่ยนสำเร็จ ต้องล็อกอินใหม่ทุกอุปกรณ์|Changing your password signs you out on all devices.
รหัสผ่านปัจจุบัน|Current password
รหัสผ่านใหม่|New password
ยืนยันรหัสผ่านใหม่|Confirm new password
กำลังโหลดหน้า...|Loading page...
Work · วันทำงานปกติ|Work · Regular workday
Public Holiday · วันหยุดองค์กร|Organization holiday
มาทำงานวันประเพณี|Worked on a public holiday
Holiday · วันหยุดประจำสัปดาห์|Holiday · Weekly rest day
วันหยุดประจำสัปดาห์แต่มาทำงาน|Worked on a weekly rest day
กะเช้า|Morning shift
กะเช้าไม่ได้ค่ากะ|Morning shift without allowance
กะบ่าย|Afternoon shift
กะดึก|Night shift
Leave without Pay · ลากิจไม่ได้รับค่าจ้าง|Leave without pay
Personal Business Leave · ลากิจ|Personal business leave
Sick Leave · ลาป่วย|Sick leave
Absent · ขาดงาน|Absent
Resign · ลาออก|Resigned
คลัง|Warehouse
เวลาทำงาน|Working hours
บริษัท (Sup)|Company (Sup)
พื้นที่ (Area)|Area
สถานะ (Satatus)|Status (Satatus)
สถานะ (Status)|Status
วันหยุด (โค้ดเดิม)|Holiday (legacy code)
วันหยุดประจำสัปดาห์|Weekly rest day
วันหยุดองค์กร|Organization holiday
ระบบ|System
สำเร็จ|Completed
OT ต่ำกว่าที่ขอ|OT below requested hours
ยังไม่ได้ยืนยันโอที|OT not confirmed
มาสาย|Late
วันหยุด|Holiday
รอยืนยันอัตราวันหยุด|Holiday rate pending
ยังไม่มีคำขอ OT รายวัน|No daily OT request
ลา|Leave
ขาดงาน|Absent
ลาออก|Resigned
พบสแกนในวันลา / ขาดงาน / ลาออก|Punches on leave / absence / resignation day
ค่าจ้าง Agency / วัน|Agency daily wage
Seafood · ค่าความคาว / วัน|Seafood allowance / day
Frozen · ค่าเย็น / วัน|Cold allowance / day
Morning · ค่ากะเช้า / วัน|Morning shift allowance / day
Afternoon · ค่ากะบ่าย / วัน|Afternoon shift allowance / day
Night · ค่ากะดึก / วัน|Night shift allowance / day
สรุปค่าจ้างรายเดือนและวันทำงานจริง|Monthly wages and worked days
จำนวนวันหยุดประเพณี (PH / PH8)|Public holiday days (PH / PH8)
จำนวนวันลาและขาดงาน (WOP / PL / SL / AB)|Leave and absence days (WOP / PL / SL / AB)
ชั่วโมง OT ยืนยันแล้ว|Confirmed OT hours
เงิน OT ยืนยันแล้ว|Confirmed OT pay
เบี้ยเลี้ยงและค่ากะยืนยันแล้ว|Confirmed allowances and shift pay
เงินรวมยืนยันแล้ว (OT + เบี้ยเลี้ยง + ค่ากะ)|Confirmed total (OT + allowances + shift pay)
ชั่วโมง OT รอยืนยัน|Pending OT hours
เงิน OT รอยืนยัน|Pending OT pay
เบี้ยเลี้ยงและค่ากะรอยืนยัน|Pending allowances and shift pay
เงินรวมรอยืนยัน (OT + เบี้ยเลี้ยง + ค่ากะ)|Pending total (OT + allowances + shift pay)
ค่าจ้างรายวันและอัตรา OT ต่อชั่วโมง|Daily wage and hourly OT rates
วันหยุด สแกนไม่ครบ และหมายเหตุ|Holidays, missing punches, and notes
ลำดับ|No.
เริ่มงาน|Start date
รหัส|ID
ชื่อพนักงาน|Employee name
อัตราไม่ครบ|Missing rates
รวมทั้งหมด|Grand total
กะ D ไม่มีค่ากะ|Shift D has no shift allowance
ไม่พบกะหลัก M/A/N/D กรุณาตรวจ Master|No M/A/N/D base shift. Check Master.
ไม่นับเบี้ยเลี้ยง: ไม่มีเวลาทำงานครบหรือเป็นวันลา/ขาดงาน|No allowance: incomplete attendance, leave, or absence
ไม่จ่ายเบี้ยเลี้ยงในวันหยุด|No allowance on holidays
กรุณาล็อกอินใหม่|Please sign in again.
เฉพาะ Super Admin เท่านั้น|Super Admin access required.
รูปแบบ Email ไม่ถูกต้อง|Invalid email format.
กรุณากรอก Email ให้ถูกต้อง หรือเว้นว่างไว้|Enter a valid email or leave it blank.
รหัสผ่านต้องมี 6–256 ตัวอักษร|Password must contain 6–256 characters.
รหัสผ่านใหม่ต้องมี 6–256 ตัวอักษร|New password must contain 6–256 characters.
รหัสผ่านปัจจุบันไม่ถูกต้อง|Current password is incorrect.
ชื่อผู้ใช้นี้มีอยู่แล้ว|This username already exists.
ไม่พบบัญชีนี้|Account not found.
ข้อมูลบัญชีไม่ถูกต้อง|Invalid account data.
บัญชีถูกแก้ไขแล้ว กรุณาโหลดใหม่|Account changed. Reload before saving.
ลองเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที|Too many sign-in attempts. Try again in 15 minutes.
บัญชีถูกเปลี่ยน กรุณาล็อกอินใหม่|Account changed. Sign in again.
เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าระบบ|Unable to sign in. Check the system configuration.
ข้อมูลถูกเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก|Data changed. Reload before saving.
ข้อมูลถูกเปลี่ยนแล้ว กรุณาโหลดใหม่|Data changed. Reload the page.
บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูล|Unable to save. Check your entries.
หมายเหตุถูกเปลี่ยนแล้ว กรุณาปิดและโหลดข้อมูลใหม่|Remark changed. Close and reload.
อ่านฐานข้อมูลไม่ได้|Unable to read the database.
เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบบริการ PostgreSQL|Unable to connect to the database. Check PostgreSQL.
ไม่อนุญาตคำขอนี้|This request is not allowed.
ไม่อนุญาตคำขอจากเว็บไซต์อื่น|Requests from other websites are not allowed.
ข้อมูลยาวเกินไป|Input is too long.
ข้อมูลไม่ถูกต้อง|Invalid data.
ยังไม่ได้ตั้งค่าบัญชีเริ่มต้น|Initial accounts have not been configured.
รหัสพนักงาน|Employee ID
ลบบัญชี|Delete account
และยกเลิกการเข้าสู่ระบบของบัญชีนี้?|and revoke its active sessions?
เลือกกะ|Select shift
ยืนยันเวลาทำงานและ OT ตามจริง|Confirm actual working hours and OT
อนุมัติรายการที่เลือกและยืนยันผลงาน|Approve selected records and confirm work results
ผู้ใช้งานเว็บ|Web user
แก้ไขบัญชีและยกเลิกเซสชันเดิม|Account updated; previous sessions revoked
บันทึก Email โดยคงเซสชันเดิม|Email saved; sessions retained
เปลี่ยนรหัสผ่านตนเอง|Changed own password
แนบหลักฐานการมาทำงาน|Attendance evidence attached
แก้ไขหมายเหตุรายวัน|Daily remark edited
คืนค่าตารางกะเดิมและเปิดตรวจสอบใหม่|Original shift restored; review reopened
บาท|THB
เชื่อมต่อแล้ว|Connected
พื้นที่ทำงาน|Workspace
ภาพรวม|Overview
นำเข้าไฟล์พนักงาน|Import employee file
นำเข้าไฟล์สแกนนิ้ว|Import fingerprint file
เลือกภาษา|Select language
กรุณาระบุชื่อผู้ใช้ ชื่อแสดง และสิทธิ์ให้ถูกต้อง|Enter a valid username, display name, and role.
ไม่มีสิทธิ์จัดการบัญชีแล้ว กรุณาล็อกอินใหม่|Account management access has changed. Sign in again.
ไม่สามารถลบ ปิดใช้งาน หรือลดสิทธิ์บัญชีที่กำลังใช้อยู่|You cannot delete, disable, or demote your current account.
ต้องเหลือ Super Admin ที่ใช้งานได้อย่างน้อย 1 บัญชี|At least one active Super Admin must remain.
พนักงานหรือวันที่ไม่ถูกต้อง|Invalid employee or date.
ไฟล์ต้องมีขนาดไม่เกิน 5 MB|File must not exceed 5 MB.
ข้อมูลหลักฐานไม่ถูกต้อง|Invalid evidence data.
ไม่พบพนักงานใน Master|Employee not found in Master.
แนบหลักฐานได้สูงสุด 10 ไฟล์ต่อวันทำงาน|A maximum of 10 evidence files per workday is allowed.
บันทึกหลักฐานไม่สำเร็จ|Unable to save evidence.
บัญชีถูกแก้ไขแล้ว กรุณาล็อกอินใหม่|Account updated. Sign in again.
เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่|Unable to change password. Try again.
ข้อมูลเวอร์ชันไม่ถูกต้อง|Invalid data version.
เปลี่ยนวันหยุดองค์กรและเปิดตรวจสอบใหม่|Company holidays changed; review reopened
กำหนดวันหยุดประเพณีองค์กรร่วมกันทุกพนักงาน|Company holidays applied to all employees
บันทึกวันหยุดองค์กรไม่สำเร็จ กรุณาตรวจสอบวันที่|Unable to save company holidays. Check the dates.
กรุณาเลือกรหัสวันหยุดและวันที่ในเดือนเดียวกันให้ถูกต้อง|Select a valid holiday code and dates in the same month.
วันที่เลือกเป็นวันหยุดองค์กร กรุณาแก้ไขในปฏิทินวันหยุดองค์กร|These dates are company holidays. Edit them in the company holiday calendar.
กรุณาตรวจสอบเวลากะใน Master ก่อนกำหนดวันหยุดสำหรับวันที่ไม่มีกะ|Check Master shift times before adding holidays to dates without shifts.
ไฟล์รวมต้องไม่เกิน 32 MB|Total file size must not exceed 32 MB.
รูปแบบการนำเข้าพนักงานไม่ถูกต้อง|Invalid employee import mode.
เพิ่ม/อัปเดตข้อมูลพนักงาน และเปิดผลตรวจสอบเฉพาะรหัสที่นำเข้าใหม่|Employees added/updated; affected reviews reopened
แทนที่ข้อมูลพนักงานทั้งหมด และเปิดผลตรวจสอบใหม่|All employees replaced; reviews reopened
เพิ่มสแกนนิ้ว ข้ามรายการซ้ำ และเก็บข้อมูลเดิม|Punches appended, duplicates skipped, existing records retained
ไม่มีกะที่จับคู่ได้|No matching shifts.
รูปแบบการนำเข้าไม่ถูกต้อง|Invalid import format.
อ่านรายงานไม่ได้ กรุณาตรวจสอบรอบเดือนหรือฐานข้อมูล|Unable to load the report. Check the pay period or database.
เวอร์ชันข้อมูลไม่ถูกต้อง|Invalid data version.
กำหนดค่าจ้าง อัตรา OT และเบี้ยเลี้ยงประจำเดือน|Monthly wages, OT rates, and allowances updated
ข้อมูลเปลี่ยนแล้ว กรุณาอัปเดตยอดและลองบันทึกใหม่|Data changed. Refresh totals and save again.
ข้อมูลพนักงานหรือเวอร์ชันไม่ถูกต้อง|Invalid employee or data version.
กรุณาตรวจสอบกะหลักใน Master ของพนักงานก่อนเปลี่ยนกะ|Check the employee's Master shift before changing shifts.
ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่ก่อนบันทึก|Data changed. Reload before saving.
รูปแบบข้อมูลตรวจสอบไม่ถูกต้อง|Invalid review data format.
ไม่พบกะที่ต้องการตรวจสอบ|Shift not found.
ผลตรวจสอบไม่ถูกต้อง|Invalid review result.
เวลาไม่ถูกต้อง|Invalid time.
เวลาออกต้องหลังเวลาเข้า|Clock-out must be after clock-in.
รายการนี้ยังไม่สามารถรับรองได้|This record cannot be confirmed yet.
รองรับเฉพาะรูป JPG, PNG, WebP และ PDF|Only JPG, PNG, WebP, and PDF files are supported.
กรุณาเลือกวันที่ในเดือนเดียวกันให้ถูกต้อง|Select valid dates in the same month.
เปลี่ยนกฎ OT: ยกเลิกพัก OT 30 นาทีและเพิ่มตัวคูณ กรุณาตรวจสอบรับรองใหม่|OT rules changed: break deduction removed and multipliers added. Review and confirm again.
ไม่พบข้อมูลสแกนนิ้ว|No fingerprint records found.
ไฟล์ต้องมีขนาดไม่เกิน 10 MB|File must not exceed 10 MB.
ไฟล์มีแถวเกิน 10,000 แถว|File exceeds 10,000 rows.
ต้องใช้ชีต Master Name และ 3) Time Attendance From Agency|The Master Name and 3) Time Attendance From Agency sheets are required.
เวลากะไม่ถูกต้อง หรือ First/Last Time ไม่ตรงเวลาทำงาน|Invalid shift times or First/Last Time does not match working hours.
เวลาเริ่ม 24.00 ต้องยืนยันว่าเป็นวันเดียวกันหรือวันถัดไป|Confirm whether a 24:00 start belongs to the same or following day.
รหัสซ้ำแต่ข้อมูลต่างกัน|Duplicate ID with conflicting data
รวมแถวซ้ำที่ข้อมูลตรงกัน|Identical duplicate rows merged
ไม่พบหัวตาราง Attendance|Attendance headers not found.
วันที่ใน Attendance ไม่ตรงช่วงข้อมูลสแกน|Attendance dates do not match the punch period.
ไม่พบรหัสใน Master ที่ใช้ได้|No valid matching ID in Master.
ไฟล์ต้องมีข้อมูลอย่างน้อย 1 แถว|File must contain at least one row.
ไฟล์ต้องไม่เกิน 10 MB|File must not exceed 10 MB.
ไม่มีชื่อพนักงาน|Employee name is missing.
เวลาทำงานไม่ตรง First Time / Last Time|Working hours do not match First Time / Last Time.
ต้องยืนยันวันอ้างอิงของ 24.00|Confirm the date associated with 24:00.
· ข้อมูลกะขัดแย้ง ไม่ใช้คำนวณ|· Conflicting shift data; excluded from calculations
· ข้อมูลกะตรงกัน|· Shift data matches
ไม่พบข้อมูลพนักงาน|Employee data not found.
เวลากะ|Shift times
เวลาเข้างาน|Clock-in time
เวลาเริ่มกะ|Shift start
เวลาเลิกงาน|Clock-out time
เวลาจบกะ|Shift end
บริษัท|Company
เกิน 10,000 แถว|Exceeds 10,000 rows
เวลาทำงาน หรือ First Time + Last Time|Working hours or First Time + Last Time
ไม่พบชีต 3) Time Attendance From Agency|Sheet 3) Time Attendance From Agency not found.
ขนาดชีตเกินกำหนด|Worksheet size exceeds the limit.
ไม่พบหัวตาราง Employee ID / Display Name|Employee ID / Display Name headers not found.
อัตรา x1.0 ไม่สัมพันธ์กับ x1.5 กรุณาตรวจสอบสูตรต้นทาง|x1.0 and x1.5 rates are inconsistent. Check the source formula.
ไม่พบข้อมูลอัตราพนักงาน|Employee pay rates not found.
การตั้งค่าไม่ถูกต้อง|Invalid settings.
กรุณาระบุอัตราเป็นจำนวนเงินทศนิยมไม่เกิน 2 ตำแหน่ง และค่าจ้างต้องมากกว่า 0|Enter amounts with up to 2 decimal places. Daily wages must be greater than zero.
เงื่อนไขเบี้ยเลี้ยงหรือแผนกไม่ถูกต้อง|Invalid allowance or department settings.
รอบเดือนไม่ถูกต้อง|Invalid monthly period.
กรุณาเลือกวันที่ในเดือนเดียวกัน ไม่เกิน 31 วัน|Select up to 31 dates within the same month.
กรุณาระบุเหตุผลการเปลี่ยนกะ ไม่เกิน 1,000 ตัวอักษร|Enter a shift change reason of up to 1,000 characters.
กรุณาระบุกะ M/D/A/N และเวลาเริ่ม–สิ้นสุดให้ถูกต้อง|Enter a valid M/D/A/N shift and start/end times.
แนบแล้ว|Attached
ไฟล์|files
หลักฐาน|Evidence
วันหยุดองค์กร|Company holiday
ยืนยัน|Confirm
บันทึกวันหยุด|Saved holidays for
วันแล้ว|days
บันทึกกะ|Saved shifts for
ยืนยันวันหยุด|Confirm holidays
โปรดตรวจสอบ (Investigate): OT|Review required: OT
ตั้งแต่ 5 ชม. กรุณาให้หัวหน้างานตรวจสอบ|5 hours or more. Supervisor review required.
เบี้ยเลี้ยงแผนก|Department allowance
บันทึกอัตราเดือน|Save rates for
ยืนยันเปลี่ยนกะ|Confirm shift changes
ข้อมูลต้นฉบับ:|Original data:
`;
export const english: Record<string, string> = Object.fromEntries(
  entries
    .trim()
    .split("\n")
    .map((line) => {
      const i = line.indexOf("|");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
export const thai: Record<string, string> = {
  Attendance: "เวลาทำงาน",
  Approvals: "การอนุมัติ",
  "Audit log": "ประวัติการตรวจสอบ",
  Employees: "ข้อมูลพนักงาน",
  "Fingerprint logs": "เวลาสแกนนิ้ว",
  "Normal hours": "ชั่วโมงปกติ",
  Overtime: "โอที",
  "Monthly OT pay": "คำนวณเงินโอทีรายเดือน",
  "Accounts & Permissions": "บัญชีและสิทธิ์",
  "My account": "บัญชีของฉัน",
  "Employee calendar": "ปฏิทินพนักงาน",
  Workspace: "พื้นที่ทำงาน",
  WORKSPACE: "พื้นที่ทำงาน",
  "Agency Workspace": "พื้นที่ทำงาน Agency",
  "Operations management": "จัดการงานปฏิบัติการ",
  Connected: "เชื่อมต่อแล้ว",
  "Import File": "นำเข้าไฟล์",
  Remark: "หมายเหตุ",
  "ATTENDANCE DETAILS": "รายละเอียดเวลาทำงาน",
  "EMPLOYEE DATABASE": "ฐานข้อมูลพนักงาน",
  "FINGERPRINT DATABASE": "ฐานข้อมูลสแกนนิ้ว",
  "AUTOMATIC FILE TRANSFER": "รับส่งไฟล์อัตโนมัติ",
  "COMPANY HOLIDAYS": "วันหยุดองค์กร",
  "Import employee file": "นำเข้าไฟล์พนักงาน",
  "Import fingerprint file": "นำเข้าไฟล์สแกนนิ้ว",
  "Incomplete scan dashboard": "แดชบอร์ดสแกนไม่ครบ",
  "Ranked for the selected date range and filters": "จัดอันดับตามช่วงวันและตัวกรองที่เลือก",
  "incomplete shifts": "กะที่สแกนไม่ครบ",
  "Departments with most incomplete scans": "แผนกที่สแกนไม่ครบสูงสุด",
  "Employees with most incomplete scans": "พนักงานที่สแกนไม่ครบสูงสุด",
  "No incomplete scans in this period": "ไม่พบการสแกนไม่ครบในช่วงนี้",
  "Unknown department": "ไม่ระบุแผนก",
  "Unknown company": "ไม่ระบุบริษัท",
  "Employee profile photo": "รูปโปรไฟล์พนักงาน",
  "Change profile photo": "เปลี่ยนรูปโปรไฟล์",
  "Remove photo": "ลบรูป",
  "Edit profile": "แก้ไขข้อมูล",
  "Edit employee profile": "แก้ไขข้อมูลพนักงาน",
  "Department": "แผนก",
  "Company": "บริษัท",
  "Shift": "กะทำงาน",
  "Weekly holiday": "วันหยุดประจำสัปดาห์",
  "Employment status": "สถานะการทำงาน",
  "Start date": "วันที่เริ่มงาน",
  "End date": "วันที่สิ้นสุดงาน",
  "Full name": "ชื่อ-นามสกุล",
  "Section": "Section",
  "Shift code": "รหัสกะ",
  "Shift starts": "เวลาเริ่มกะ",
  "Shift ends": "เวลาเลิกกะ",
  "Contract": "สัญญาจ้าง",
  "Add employee details with Edit profile": "กดแก้ไขข้อมูลเพื่อเพิ่มรายละเอียดพนักงาน",
  "Uploading photo": "กำลังอัปโหลดรูป",
  "Save changes": "บันทึกการเปลี่ยนแปลง",
};
