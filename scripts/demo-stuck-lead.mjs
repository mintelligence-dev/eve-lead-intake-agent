// Demo helper: creates an email lead stuck in the "analyzing" state (as if the AI
// was down when it arrived), so the "re-analyze" button on /leads can be
// pressed live. Pressing it runs the real agent and emails the reply to
// [to-address] (default: DEMO_EMAIL; Resend's test sender only delivers to the account owner).
//
// Run: node --env-file=.env.local scripts/demo-stuck-lead.mjs [to-address]
// Needs DATABASE_URL (production database).
import { randomBytes } from "node:crypto";
import { connect } from "./db.mjs";

const to = process.argv[2] ?? process.env.DEMO_EMAIL;
if (!to) {
  console.error("Usage: node --env-file=.env.local scripts/demo-stuck-lead.mjs <to-address> (or set DEMO_EMAIL)");
  process.exit(1);
}
const subject = "สนใจระบบ CRM สำหรับทีมขาย 20 คน";
const body = [
  "สวัสดีครับ",
  "",
  "บริษัทเรามีทีมขายประมาณ 20 คน ตอนนี้ยังใช้ Excel ติดตามลูกค้าอยู่",
  "อยากทราบว่าระบบของคุณช่วยเรื่องติดตาม lead และรายงานยอดขายได้ไหม",
  "สะดวกนัดเดโมช่วงสัปดาห์หน้าไหมครับ",
  "",
  "ขอบคุณครับ",
].join("\n");

// Same thread-id shape the Resend adapter uses. The reply's "Re: <subject>"
// comes from the lead row (channels/resend.ts restoreThreadSubject).
const threadId = `resend:${to}:${randomBytes(8).toString("hex")}`;

const sql = connect();
const [row] = await sql`
  INSERT INTO leads (from_email, subject, body, analysis_status, analysis_attempts,
                     analysis_requested_at, resend_email_id, thread_id)
  VALUES (${to}, ${subject}, ${body}, 'pending', 1, now(),
          ${`demo-${Date.now()}`}, ${threadId})
  RETURNING id`;

console.log(`Lead #${row.id} is now "กำลังวิเคราะห์" — open /leads and press วิเคราะห์ใหม่ (reply goes to ${to}).`);
await sql.end();
