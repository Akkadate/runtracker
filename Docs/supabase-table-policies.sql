-- 1. การตั้งค่า RLS Policies สำหรับตาราง (Tables) ให้ใช้งานได้โดยไม่ต้อง Auth

-- ตั้งค่า RLS สำหรับตาราง users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ตั้งค่า Policy ให้ทุกคนสามารถเข้าถึงข้อมูลได้ (SELECT)
CREATE POLICY "Allow public read access to users" 
ON public.users
FOR SELECT 
TO anon  -- anon คือ role ที่ไม่มีการ auth
USING (true);  -- true หมายถึง อนุญาตสำหรับทุกแถว

-- ตั้งค่า Policy ให้ทุกคนสามารถแทรกข้อมูลได้ (INSERT)
CREATE POLICY "Allow public insert access to users" 
ON public.users
FOR INSERT 
TO anon
WITH CHECK (true);

-- ตั้งค่า Policy ให้ทุกคนสามารถแก้ไขข้อมูลได้ (UPDATE)
CREATE POLICY "Allow public update access to users" 
ON public.users
FOR UPDATE 
TO anon
USING (true);

-- ตั้งค่า Policy ให้ทุกคนสามารถลบข้อมูลได้ (DELETE)
CREATE POLICY "Allow public delete access to users" 
ON public.users
FOR DELETE 
TO anon
USING (true);

-- ตั้งค่า RLS สำหรับตาราง runs
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

-- ตั้งค่า Policy ให้ทุกคนสามารถเข้าถึงข้อมูลได้ (SELECT)
CREATE POLICY "Allow public read access to runs" 
ON public.runs
FOR SELECT 
TO anon
USING (true);

-- ตั้งค่า Policy ให้ทุกคนสามารถแทรกข้อมูลได้ (INSERT)
CREATE POLICY "Allow public insert access to runs" 
ON public.runs
FOR INSERT 
TO anon
WITH CHECK (true);

-- ตั้งค่า Policy ให้ทุกคนสามารถแก้ไขข้อมูลได้ (UPDATE)
CREATE POLICY "Allow public update access to runs" 
ON public.runs
FOR UPDATE 
TO anon
USING (true);

-- ตั้งค่า Policy ให้ทุกคนสามารถลบข้อมูลได้ (DELETE)
CREATE POLICY "Allow public delete access to runs" 
ON public.runs
FOR DELETE 
TO anon
USING (true);

-- 2. การตั้งค่า Storage Policies สำหรับ bucket "running-proofs"

-- ตั้งค่า Policy ให้ทุกคนสามารถเข้าถึงไฟล์ได้ (DOWNLOAD/SELECT)
CREATE POLICY "Allow public read access to running-proofs" 
ON storage.objects
FOR SELECT 
TO anon
USING (bucket_id = 'running-proofs');

-- ตั้งค่า Policy ให้ทุกคนสามารถอัปโหลดไฟล์ได้ (UPLOAD/INSERT)
CREATE POLICY "Allow public insert access to running-proofs" 
ON storage.objects
FOR INSERT 
TO anon
WITH CHECK (bucket_id = 'running-proofs');

-- ตั้งค่า Policy ให้ทุกคนสามารถแก้ไขไฟล์ได้ (UPDATE)
CREATE POLICY "Allow public update access to running-proofs" 
ON storage.objects
FOR UPDATE 
TO anon
USING (bucket_id = 'running-proofs');

-- ตั้งค่า Policy ให้ทุกคนสามารถลบไฟล์ได้ (DELETE)
CREATE POLICY "Allow public delete access to running-proofs" 
ON storage.objects
FOR DELETE 
TO anon
USING (bucket_id = 'running-proofs');