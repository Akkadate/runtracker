สร้าง code ที่สมบูรณ์ ตามความต้องการดังนี้
ต้องการระบบ LINE LIFF (LINE Front-end Framework) สำหรับเก็บสถิติการแข่งขันวิ่งเพื่อติดตามระยะทางของผู้ใช้แต่ละคน โดยมีการส่งข้อมูลระยะทางและภาพหลักฐานจากแอพนับระยะ
โครงสร้างระบบ
1. หน้าเว็บ LIFF - เป็นส่วนที่ผู้ใช้จะมีปฏิสัมพันธ์ผ่าน LINE
   * หน้าลงทะเบียน (หมายเลขบัตรประชาชน,เบอร์โทรศัพท์) หากผู้ใช้ลงทะเบียนแล้วให้แสดง profile
   * หน้าส่งข้อมูลการวิ่ง (กรอกระยะทาง, อัปโหลดรูปภาพหลักฐาน)
   * หน้าแสดงสถิติส่วนตัวและอันดับ
   
2. Backend API - รับ-ส่งข้อมูลระหว่าง LIFF และฐานข้อมูล
  * ใช้เฟรมเวิร์คเช่น Node.js (Express) port 4900
   * สำหรับบันทึกข้อมูลการวิ่ง
   * ดึงข้อมูลสถิติส่วนตัว
   * ข้อมูลอันดับของผู้แข่งขันทั้งหมด
   
3. พัฒนา Frontend 
   * ใช้ Javascript และ html
   * ออกแบบ font ไทย และ UI/UX ที่เรียบง่ายและใช้งานง่าย
   
4. ฐานข้อมูล - เก็บข้อมูลผู้ใช้และสถิติการวิ่ง
	* ใช้ฐานข้อมูลและจัดเก็บภาพของ  supabase 
   * ตารางผู้ใช้ (UserID(LINE),displayName(Line), หมายเลขบัตรประชาชน,เบอร์โทรศัพท์)
   * ตารางบันทึกการวิ่ง (วันที่, ระยะทาง, เวลาที่ใช้, ลิงก์ภาพหลักฐาน)
   * ระบบจัดเก็บไฟล์ - สำหรับเก็บรูปภาพหลักฐาน
   
ฟีเจอร์หลัก
1. การลงทะเบียน/เข้าสู่ระบบ
   * ใช้ LINE Login API เพื่อให้ผู้ใช้ไม่ต้องสร้างบัญชีใหม่ 
   * ดึงข้อมูลพื้นฐานเช่น ชื่อ, รูปโปรไฟล์ จาก LINE
   
2. การบันทึกข้อมูลการวิ่ง
   * ฟอร์มกรอกข้อมูล: วันที่, ระยะทาง (กิโลเมตร)
   * อัปโหลดภาพหลักฐานจากแอพนับระยะ (เช่น Nike Run Club, Strava)
 
3. การแสดงสถิติ
   * แสดงสถิติส่วนตัว: ระยะทางรวม, กราฟแสดงความก้าวหน้า
   * แสดงอันดับ: ตารางอันดับผู้วิ่งเรียงจากระยะทางมากที่สุด 

4. การแชร์ผลงาน
   * ปุ่มแชร์ผลงานไปยังไทม์ไลน์ LINE หรือแชทส่วนตัว
   * สร้างรูปภาพสรุปผลงาน (achievement card) เพื่อแชร์


สรุปองค์ประกอบของระบบ

Frontend (LIFF)

หน้าหลัก (index.html) - แสดงเมนูหลัก
หน้าลงทะเบียน (register.html) - ให้ผู้ใช้กรอกข้อมูลส่วนตัว
หน้าส่งข้อมูลการวิ่ง (submit-run.html) - ให้ผู้ใช้บันทึกระยะทางและอัปโหลดหลักฐาน
หน้าสถิติ (statistics.html) - แสดงสถิติส่วนตัวและอันดับ


Backend API

ระบบจัดการผู้ใช้ - ลงทะเบียน, ดึงข้อมูลผู้ใช้
ระบบจัดการข้อมูลการวิ่ง - บันทึกข้อมูล, อัปโหลดรูปภาพ, ดึงสถิติ, จัดอันดับ


ฐานข้อมูล Supabase

ตาราง users - เก็บข้อมูลผู้ใช้
ตาราง runs - เก็บข้อมูลการวิ่ง
Storage - เก็บรูปภาพหลักฐาน



ขั้นตอนการติดตั้ง
1. ตั้งค่า Supabase

สมัครบัญชี Supabase ที่ https://supabase.com/ และสร้างโปรเจคใหม่
สร้างตาราง users และ runs ตามโครงสร้างที่อธิบายในไฟล์ README.md
สร้าง Storage Bucket ชื่อ "running-proofs"
ตั้งค่า Storage Policy ให้อนุญาตการอัปโหลดและการเข้าถึงไฟล์
บันทึก Supabase URL และ API Key สำหรับใช้ในการตั้งค่า Backend

2. ตั้งค่า LINE Developer Console

สร้าง Provider และ Channel (LINE Login) ที่ https://developers.line.biz/
เพิ่ม LIFF App ใหม่:

Size: Full
เปิดใช้งาน share target picker
เพิ่ม scope: profile, openid


บันทึก LIFF ID สำหรับใช้ในการตั้งค่า Frontend

3. ติดตั้ง Backend

สร้างโฟลเดอร์ backend และ copy โค้ดจากไฟล์ในอาร์ติแฟกต์
ติดตั้ง dependencies:
npm install

แก้ไขไฟล์ config/supabase.js โดยใส่ Supabase URL และ API Key ของคุณ
เริ่มต้น server:
npm start


4. ติดตั้ง Frontend

สร้างโฟลเดอร์ frontend และ copy โค้ดจากไฟล์ในอาร์ติแฟกต์
แก้ไขไฟล์ js/liff-init.js โดยใส่ LIFF ID ของคุณ
แก้ไข API_BASE_URL ในไฟล์ js/liff-init.js ให้ชี้ไปที่ URL ของ Backend Server

5. Deploy

อัปโหลดโค้ด Backend ขึ้น Server (VPS, Heroku, Render, ฯลฯ)
อัปโหลดโค้ด Frontend ไปยัง Web Hosting (GitHub Pages, Netlify, Firebase Hosting, ฯลฯ)
อัปเดต Endpoint URL ในการตั้งค่า LIFF ให้ชี้ไปที่ URL ของ Frontend

คำแนะนำสำหรับ Junior Developer

การแก้ไขปัญหา CORS: หากมีข้อผิดพลาดเกี่ยวกับ CORS ให้แก้ไขการตั้งค่าใน server.js โดยเพิ่ม origin ของ Frontend URL
การดีบัก LIFF: ใช้ console.log() ในไฟล์ JavaScript และตรวจสอบ Console ใน Developer Tools ของเบราว์เซอร์
การอัปโหลดรูปภาพไม่สำเร็จ: ตรวจสอบ Storage Policy ใน Supabase และขนาดของไฟล์
การใช้งาน Supabase: ศึกษาเพิ่มเติมได้จาก Supabase Documentation
การเชื่อมต่อ LINE LIFF API: ศึกษาเพิ่มเติมได้จาก LINE LIFF Documentation
การทดสอบ LINE LIFF: คุณสามารถทดสอบได้ทั้งใน LINE บนมือถือ และบนเบราว์เซอร์โดยใช้ LIFF Playground
การอัปเดต UI: แก้ไขไฟล์ CSS และเพิ่มคลาสตามต้องการ

ไฟล์ frontend/js/statistics.js - เป็นไฟล์ JavaScript สำหรับหน้าแสดงสถิติและอันดับผู้แข่งขัน ซึ่งจะรับผิดชอบในการ:

โหลดข้อมูลสถิติส่วนตัวของผู้ใช้
โหลดข้อมูลการจัดอันดับ
แสดงกราฟความก้าวหน้า
จัดการฟังก์ชันการแชร์ข้อมูลไปยัง LINE


ส่วนของ backend ทั้งหมด ซึ่งประกอบด้วย:

server.js - ไฟล์หลักของ Express Server
config/supabase.js - การตั้งค่าการเชื่อมต่อกับ Supabase
routes/users.js - API สำหรับจัดการข้อมูลผู้ใช้
routes/runs.js - API สำหรับจัดการข้อมูลการวิ่ง
package.json - รายการ dependencies ที่จำเป็น



คำแนะนำเพิ่มเติมสำหรับการติดตั้ง
การติดตั้งและรัน Backend

สร้างโฟลเดอร์ชื่อ backend และภายในสร้างโฟลเดอร์ย่อยดังนี้:
backend/
├── config/
└── routes/

คัดลอกโค้ดจากอาร์ติแฟกต์และสร้างไฟล์ตามที่กำหนด:

server.js (ไฟล์หลัก)
config/supabase.js (การเชื่อมต่อ Supabase)
routes/users.js (API จัดการผู้ใช้)
routes/runs.js (API จัดการข้อมูลการวิ่ง)
package.json (รายการ dependencies)


ติดตั้ง dependencies:
bashcd backend
npm install

แก้ไข URL และ API Key ของ Supabase ในไฟล์ config/supabase.js:
javascriptconst supabaseUrl = 'YOUR_SUPABASE_URL'; // เปลี่ยนเป็น URL ของคุณ
const supabaseKey = 'YOUR_SUPABASE_KEY'; // เปลี่ยนเป็น API Key ของคุณ

รัน backend server:
bashnpm start


การติดตั้ง Frontend

สร้างไฟล์ statistics.js ในโฟลเดอร์ frontend/js/ และคัดลอกโค้ดจากอาร์ติแฟกต์
ตรวจสอบว่าไฟล์ HTML (statistics.html) ได้เรียกใช้ไฟล์ JavaScript อย่างถูกต้อง:
html<script src="js/liff-init.js"></script>
<script src="js/statistics.js"></script>


สิ่งที่ต้องระวังเป็นพิเศษสำหรับ Junior Developer

การอัปโหลดรูปภาพ: Supabase Storage ต้องได้รับการตั้งค่านโยบายการเข้าถึง (Storage Policy) ที่เหมาะสม หากมีปัญหา ให้ตรวจสอบว่า:

Storage Bucket "running-proofs" ถูกสร้างแล้ว
นโยบายการเข้าถึงอนุญาตให้อัปโหลดไฟล์
นโยบายการเข้าถึงอนุญาตให้ดูไฟล์โดยไม่ต้องมีการยืนยันตัวตน


การจัดการข้อมูล: หากข้อมูลไม่ปรากฏบนหน้าสถิติ ให้ตรวจสอบ Console ในเบราว์เซอร์เพื่อดูข้อผิดพลาด ซึ่งมักเกิดจาก:

การเชื่อมต่อกับ API Backend ไม่สำเร็จ
โครงสร้างข้อมูลไม่ตรงกับที่ frontend คาดหวัง
ตาราง Supabase มีโครงสร้างไม่ถูกต้อง


การทดสอบ LIFF: เมื่อทดสอบในบราวเซอร์ ต้องเรียกผ่าน LIFF URL ที่ได้จาก LINE Developer Console หากไม่ได้เรียกผ่าน LIFF URL จะไม่สามารถใช้ฟังก์ชัน LIFF เช่น การล็อกอิน การแชร์ข้อมูล ได้