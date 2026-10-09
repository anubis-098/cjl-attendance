-- Run against fingerprint_db for databases created before the header rename.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fingerprint_file' AND column_name='รหัส') THEN
    ALTER VIEW fingerprint_file RENAME COLUMN "รหัส" TO "รหัสพนักงาน";
    ALTER VIEW fingerprint_file RENAME COLUMN "วันที่" TO "ปี/เดือน/วัน";
    ALTER VIEW fingerprint_file RENAME COLUMN "เวลาสแกน" TO "เวลาสแกนนิ้ว";
  END IF;
END $$;
