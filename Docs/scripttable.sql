-- เปิดใช้งาน UUID extension ถ้ายังไม่ได้เปิดใช้งาน
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- สร้างตาราง users สำหรับเก็บข้อมูลผู้ใช้
CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY, -- LINE User ID
    displayName TEXT NOT NULL,
    pictureUrl TEXT,
    nationalId TEXT NOT NULL,
    phoneNumber TEXT NOT NULL,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- สร้างดัชนีเพื่อการค้นหาโดยใช้เลขบัตรประชาชน
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users (nationalId);

-- สร้างตาราง runs สำหรับเก็บข้อมูลการวิ่ง
CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId TEXT NOT NULL, -- อ้างอิงไปยัง users.userId โดยไม่บังคับ FK constraint
    runDate DATE NOT NULL,
    distance DECIMAL(10, 2) NOT NULL,
    duration DECIMAL(10, 2) NOT NULL,
    imageUrl TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- เพิ่ม foreign key constraint แบบแยกเพื่อให้แก้ไขง่าย
ALTER TABLE runs
    ADD CONSTRAINT fk_users_userId
    FOREIGN KEY (userId)
    REFERENCES users(userId)
    ON DELETE CASCADE;

-- สร้างดัชนีเพื่อการค้นหาและการจัดเรียงข้อมูล
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs (userId);
CREATE INDEX IF NOT EXISTS idx_runs_run_date ON runs (runDate);

-- สร้าง Row Level Security (RLS) Policies สำหรับตาราง users

-- เปิดใช้งาน RLS สำหรับตาราง users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy ให้อ่านข้อมูลผู้ใช้ได้ทั้งหมด (สำหรับแสดงอันดับ)
CREATE POLICY "Users are viewable by everyone." 
    ON users FOR SELECT 
    USING (true);

-- สร้าง Policy ให้แก้ไขข้อมูลตัวเองได้เท่านั้น (ถ้ามีการใช้ auth)
-- หมายเหตุ: คอมเมนต์ไว้ถ้าไม่ได้ใช้ auth ของ Supabase
-- CREATE POLICY "Users can update their own data." 
--    ON users FOR UPDATE 
--    USING (auth.uid() = userId);

-- สร้าง Policy ให้แก้ไขข้อมูลได้ทั้งหมด (สำหรับ API แบบไม่ใช้ auth)
CREATE POLICY "Anyone can update users data." 
    ON users FOR UPDATE 
    USING (true);

-- สร้าง Policy ให้เพิ่มข้อมูลผู้ใช้ได้ (สำหรับการลงทะเบียน)
CREATE POLICY "Anyone can insert users." 
    ON users FOR INSERT 
    WITH CHECK (true);

-- เปิดใช้งาน RLS สำหรับตาราง runs
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy ให้อ่านข้อมูลการวิ่งทั้งหมดได้ (สำหรับการจัดอันดับ)
CREATE POLICY "Running data is viewable by everyone." 
    ON runs FOR SELECT 
    USING (true);

-- สร้าง Policy ให้เพิ่มข้อมูลการวิ่งได้
CREATE POLICY "Anyone can insert running data." 
    ON runs FOR INSERT 
    WITH CHECK (true);

-- สร้าง Policy ให้แก้ไขข้อมูลการวิ่งได้ทั้งหมด (สำหรับ API แบบไม่ใช้ auth)
CREATE POLICY "Anyone can update running data." 
    ON runs FOR UPDATE 
    USING (true);

-- สร้าง Policy ให้ลบข้อมูลการวิ่งได้ทั้งหมด
CREATE POLICY "Anyone can delete running data." 
    ON runs FOR DELETE 
    USING (true);

-- สร้างฟังก์ชันสำหรับการคำนวณระยะทางรวมของผู้ใช้
CREATE OR REPLACE FUNCTION get_total_distance(user_id TEXT)
RETURNS DECIMAL AS $$
    SELECT COALESCE(SUM(distance), 0)
    FROM runs
    WHERE userId = user_id;
$$ LANGUAGE SQL;

-- สร้างฟังก์ชันสำหรับการคำนวณจำนวนครั้งที่วิ่งของผู้ใช้
CREATE OR REPLACE FUNCTION get_total_runs(user_id TEXT)
RETURNS INTEGER AS $$
    SELECT COUNT(*)
    FROM runs
    WHERE userId = user_id;
$$ LANGUAGE SQL;

-- สร้าง View สำหรับการดูอันดับนักวิ่ง
CREATE OR REPLACE VIEW runner_rankings AS
SELECT 
    u.userId,
    u.displayName,
    u.pictureUrl,
    COALESCE(SUM(r.distance), 0) as totalDistance,
    COUNT(r.id) as totalRuns
FROM 
    users u
LEFT JOIN 
    runs r ON u.userId = r.userId
GROUP BY 
    u.userId, u.displayName, u.pictureUrl
ORDER BY 
    totalDistance DESC;

-- ตั้งค่า Storage Policy ถ้าจำเป็น
-- คุณต้องเข้าไปที่ Supabase Dashboard > Storage > New Bucket
-- สร้าง bucket ชื่อ "running-proofs" และตั้งค่า Public