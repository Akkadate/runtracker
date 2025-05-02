-- ตั้งค่าให้สามารถอัปโหลดไฟล์ได้ (สำหรับผู้ใช้ที่ล็อกอิน)
CREATE POLICY "Anyone can upload images"
ON storage.objects FOR INSERT
WITH CHECK (true);

-- ตั้งค่าให้สามารถดูไฟล์ได้ (สำหรับทุกคน)
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (true);