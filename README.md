# Lead Intake Agent

> AI รับอีเมลจากลูกค้าที่สนใจสินค้า/บริการ แล้ววิเคราะห์ ให้คะแนน บันทึก และตอบกลับให้อัตโนมัติ  
> An AI agent that reads inbound customer emails, scores and saves each lead, and replies automatically.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![eve](https://img.shields.io/badge/eve-agent%20framework-black)](https://eve.dev)
[![AI SDK](https://img.shields.io/badge/AI%20SDK-7-black?logo=vercel)](https://ai-sdk.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![CI](https://github.com/mintelligence-dev/eve-lead-intake-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/mintelligence-dev/eve-lead-intake-extension/actions/workflows/ci.yml)

[ภาษาไทย](#ภาษาไทย) · [English](#english)

| | คืออะไร · What it is | ใช้ยังไง · How to use it |
|---|---|---|
| [`packages/eve`](packages/eve) | eve extension: ช่องทางอีเมล Resend, tool `enrich_sender` / `save_lead`, คำสั่ง AI, งานประจำวัน และ `./desk` ให้หน้าเว็บใช้ · The eve extension: Resend email channel, tools, instructions, daily job, and a `./desk` export for web pages | mount ใน `agent/extensions/` ([ดูวิธี](#ใช้เป็น-extension-ใน-agent-ของคุณ) · [how](#use-it-as-an-eve-extension)) |
| [`packages/core`](packages/core) | กติกาล้วน ไม่ผูก framework: ฟิลด์ lead, คะแนน, ตรวจเมลอัตโนมัติ, token ที่เซ็นแล้ว · Framework-free rules: lead fields, scores, automated-email check, signed tokens | `import … from "@eve-lead-intake-extension/core"` |
| [`examples/lead-intake-agent`](examples/lead-intake-agent) | แอปเต็มที่ใช้ extension นี้: Next.js หน้า Leads, ตั้งค่าฟิลด์, ฟอร์มลูกค้า, หน้าทดสอบ AI หน้าตาใช้ [Mintel UI](https://mintel-ui.vercel.app) · The complete app built on the extension, styled with Mintel UI | ปุ่ม Deploy ด้านล่าง · the Deploy button below |

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmintelligence-dev%2Feve-lead-intake-extension&root-directory=examples%2Flead-intake-agent&project-name=lead-intake-agent&repository-name=lead-intake-agent&env=AI_GATEWAY_API_KEY%2CCONTEXT_API_KEY%2CRESEND_API_KEY%2CRESEND_FROM_ADDRESS%2CADMIN_USERNAME%2CADMIN_PASSWORD&envDescription=AI_GATEWAY_API_KEY%3A%20Vercel%20%3E%20AI%20Gateway%20%3E%20API%20Keys.%20CONTEXT_API_KEY%3A%20context.dev%20dashboard.%20RESEND_API_KEY%3A%20Resend%20%3E%20API%20Keys%20%28Full%20access%29.%20RESEND_FROM_ADDRESS%3A%20onboarding%40resend.dev%20until%20your%20domain%20is%20verified.%20ADMIN_USERNAME%20%2F%20ADMIN_PASSWORD%3A%20the%20web%20login%20you%20choose.%20Postgres%20%28Neon%29%20is%20set%20up%20on%20this%20page%3B%20afterwards%20add%20the%20Resend%20webhook%20%28see%20README%29.&envLink=https%3A%2F%2Fgithub.com%2Fmintelligence-dev%2Feve-lead-intake-extension%23environment-variables&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22envVarPrefix%22%3A%22DATABASE%22%2C%22allowConnectExistingProduct%22%3Atrue%7D%5D)

> ปุ่ม Deploy ใช้ติดตั้งระบบ**แยกของคุณเอง** (key, ฐานข้อมูล และอีเมลของคุณ) · Installs **your own copy** with your own keys, database and email.

---

## ภาษาไทย

### ทำอะไรได้

1. **รับอีเมลลูกค้า** ผ่าน [Resend](https://resend.com) และบันทึกลงฐานข้อมูลทันที ก่อนเรียก AI
2. **AI วิเคราะห์ทุกฉบับ** หาข้อมูลบริษัทผู้ส่ง ([context.dev](https://context.dev)) แล้วดึงข้อมูลแยกช่อง (ชื่อ ตำแหน่ง บริษัท เบอร์ สินค้าที่สนใจ ขนาดทีม งบ ช่วงเวลา สิ่งที่ขอ ความเร่งด่วน) และ**ให้คะแนน 🔥 Hot / 🟠 Warm / 🔵 Cold** พร้อมเหตุผล
3. **คัดสแปมออก** เมลขายของ โฆษณา หรือ phishing ถูกเก็บแยกและไม่ตอบ ส่วนเมลอัตโนมัติ (ตอบกลับอัตโนมัติ, bounce, mailing list, no-reply) ถูกข้ามตั้งแต่ก่อนถึง AI
4. **ตอบลูกค้าอัตโนมัติ** ในภาษาเดียวกับลูกค้า ต่อเธรดเดิม พร้อม**ลิงก์ฟอร์ม**ให้ลูกค้ายืนยันข้อมูลติดต่อเอง (มีช่องยินยอม PDPA)
5. **หน้า Leads สำหรับทีม** กรองตามคะแนน ค้นหา แก้ไข ลบ (กู้คืนได้) Export Excel และกด "วิเคราะห์ใหม่" ให้รายการที่ค้าง
6. **หน้าทดสอบ AI** จำลองอีเมลแล้วดู AI วิเคราะห์แบบสด โดยไม่ส่งเมลจริง และ lead ที่ได้แยกจาก lead จริง

### หลักความปลอดภัย

| กฎ | บังคับใช้อย่างไร |
|---|---|
| AI ล่มแล้ว lead ไม่หาย | บันทึกอีเมลก่อนเรียก AI (`recordInboundEmail()`) · retry แล้วสลับ model สำรอง (`resilientModel()`) · ส่งรายการค้างให้ AI ใหม่ (`redispatchStuckAnalyses()`) · ปุ่ม "วิเคราะห์ใหม่" |
| AI ไม่ทำตามคำสั่งในอีเมล และไม่ให้ราคาหรือรับปากแทนทีม | `packages/eve/extension/instructions/1-workflow.md` กำหนดให้ถือเนื้อหาอีเมลเป็นข้อมูลที่เชื่อไม่ได้ และตอบรับสั้นๆ อย่างเดียว |
| AI ไม่เดาข้อมูล | ทุกช่องใน `save_lead` ไม่บังคับ และสั่งให้กรอกเฉพาะที่อีเมลบอก · ข้อมูลที่ลูกค้ายืนยันแล้วไม่ถูก AI เขียนทับ (`completeAnalysis()`) |
| ไม่ตอบสแปมและบอท | `threadLeadIsSpam()` (ตัดสินรายเธรด) · `isAutomatedEmail()` (header / ผู้ส่ง) · ตอบ follow-up ไม่เกิน 3 ครั้งต่อเธรดต่อวัน |
| webhook ปลอมไม่ได้ | ตรวจลายเซ็น svix ด้วย `RESEND_WEBHOOK_SECRET` · กันเมลซ้ำด้วย chat state ใน Postgres และ UNIQUE `resend_email_id` |
| หน้าเว็บต้อง login | คุกกี้เซ็น HMAC อายุ 7 วัน (secret จาก env หรือสุ่มเก็บในฐานข้อมูล ถ้าโหลดไม่ได้ ระบบไม่ให้ login) (`proxy.ts`) และตรวจซ้ำใน server action / route ทุกตัว (`isAdmin()`, `appAuth`) |
| ลิงก์ฟอร์มลูกค้าปลอมไม่ได้ | token เซ็น HMAC ผูกเลข lead หมดอายุ 14 วัน (`form-token.ts`) · เปิดได้เฉพาะข้อมูลของ lead นั้น |
| ฐานข้อมูลต่อไม่ได้ ระบบรับเมลไม่ค้าง | chat state สลับไปใช้หน่วยความจำชั่วคราวภายใน 3 วินาที (`resilientState()`) |

### ใช้เป็น extension ใน agent ของคุณ

ถ้ามี eve agent อยู่แล้ว ไม่ต้องใช้ทั้งแอป ติดตั้ง extension แล้วสร้างไฟล์ mount ไฟล์เดียว:

```ts
// agent/extensions/lead.ts
import lead from "@eve-lead-intake-extension/eve";

export default lead({
  databaseUrl: process.env.DATABASE_URL,
  email: { fromAddress: "leads@mail.example.com", replyTo: "inbox@example.com" },
  enrichment: { contextApiKey: process.env.CONTEXT_API_KEY! }, // ไม่ใส่ = ข้ามการหาข้อมูลบริษัท
  form: { baseUrl: "https://leads.example.com" },               // ไม่ใส่ = ไม่แนบลิงก์ฟอร์ม
  dataLanguage: "Thai",
});
```

agent จะได้ `lead__save_lead`, `lead__enrich_sender`, ช่องทาง `lead__resend` (webhook ยังเป็น `/eve/v1/resend`), route "วิเคราะห์ใหม่" และงานประจำวัน · คำสั่ง AI ของ extension บอกแค่ขั้นตอนรับ lead ส่วนตัวตน (identity) ของ agent ยังเป็นของคุณ

หน้าเว็บหรือโค้ดที่ไม่ได้รันใน agent ใช้ `openLeadDesk()` จาก `@eve-lead-intake-extension/eve/desk` ด้วยค่าเดียวกัน (อ่าน/แก้ lead, ฟิลด์, ลิงก์ฟอร์ม, session ผู้ดูแล) ตัวอย่างอยู่ที่ [`lead-intake.config.ts`](examples/lead-intake-agent/lead-intake.config.ts) และ [`lead.desk.ts`](examples/lead-intake-agent/lead.desk.ts) ซึ่งใช้ config ชุดเดียวกับ mount

> ยังไม่ได้เผยแพร่ขึ้น npm ตอนนี้ใช้ได้ผ่าน workspace ใน repo นี้ (ดู[รันในเครื่อง](#รันในเครื่อง))

### ติดตั้งด้วยปุ่ม Deploy

1. กดปุ่ม **Deploy with Vercel** ด้านบน แล้ว login Vercel
2. ในส่วน **Add Products → Storage** กด **Add** ที่ Neon เพื่อสร้างฐานข้อมูล Postgres (แบบฟรีได้) หรือเชื่อมกับของที่มีอยู่แล้ว ระบบตั้งตัวแปรฐานข้อมูลให้เอง · ถ้าอยากใช้ Postgres เจ้าอื่น ดู[เลือกฐานข้อมูล](#เลือกฐานข้อมูล)
3. กรอก 6 ช่อง ([ดูว่าเอามาจากไหน](#ช่องที่ต้องกรอกตอน-deploy)) แล้วกด Deploy
4. ใน Resend → Webhooks สร้าง webhook event **`email.received`** ชี้ไปที่ `https://<โดเมนของคุณ>/eve/v1/resend` แล้วนำ signing secret มาใส่ในตัวแปร `RESEND_WEBHOOK_SECRET`
5. ตั้ง `RESEND_REPLY_TO` เป็นที่อยู่รับเมลของคุณใน Resend และตั้ง `COMPANY_NAME` / `PRIVACY_POLICY_URL` สำหรับฟอร์มลูกค้า
6. กด **Redeploy** แล้วส่งอีเมลทดสอบไปที่ที่อยู่รับเมล

#### ช่องที่ต้องกรอกตอน Deploy

| ช่อง | คืออะไร | เอามาจากไหน |
|---|---|---|
| `AI_GATEWAY_API_KEY` | key ของ Vercel AI Gateway ใช้ได้กับ AI ทุกเจ้า | Vercel dashboard → AI Gateway → API Keys → Create key · model ส่วนใหญ่ต้องเติม credits ก่อน |
| `CONTEXT_API_KEY` | ใช้หาข้อมูลบริษัทจากโดเมนอีเมลผู้ส่ง | สมัคร [context.dev](https://context.dev) → Dashboard → API Keys |
| `RESEND_API_KEY` | รับและส่งอีเมล | Resend → API Keys → Create · **ต้องเลือก Full access** (แบบส่งอย่างเดียวอ่านเมลขาเข้าไม่ได้) |
| `RESEND_FROM_ADDRESS` | ที่อยู่ที่ใช้ส่งเมลตอบ | ก่อนยืนยันโดเมน ใช้ `onboarding@resend.dev` (ส่งได้เฉพาะถึงเจ้าของบัญชี Resend) หลังยืนยันโดเมน ใช้เช่น `leads@mail.บริษัท.com` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | บัญชี login หน้าเว็บ | ตั้งเอง ควรใช้รหัสผ่านยาวและเดายาก |

ไม่ต้องตั้ง secret สำหรับเซ็นคุกกี้ login และลิงก์ฟอร์ม ระบบสุ่มให้เองตอนใช้งานครั้งแรกและเก็บในฐานข้อมูล (ตาราง `app_settings`) ถ้าอยากกำหนดเอง ตั้ง `ADMIN_SESSION_SECRET` ได้

### เลือกฐานข้อมูล

ใช้ Postgres เจ้าไหนก็ได้ ระบบสร้างตาราง `leads` และอัปเดตโครงสร้างให้เองตอนใช้งานครั้งแรก ไม่ต้องรัน migration

| เจ้า | ตั้งค่ายังไง |
|---|---|
| **Neon** (Vercel Marketplace) | ปุ่ม Deploy สร้างให้เอง (prefix `DATABASE`) ถ้าเพิ่มเองทีหลัง ตั้ง prefix เป็น `DATABASE` จะได้ `DATABASE_URL` แบบ pooled (host มี `-pooler`) |
| **Supabase** (Vercel Marketplace) | integration ตั้ง `POSTGRES_URL` ให้ ระบบอ่านชื่อนี้ได้เอง (เป็น URL แบบ pooled พอร์ต 6543) |
| **Prisma Postgres, AWS RDS, ตั้งเอง ฯลฯ** | ตั้ง `DATABASE_URL` เอง ถ้าเจ้านั้นมี connection pooler ให้ใช้ URL ของ pooler |

- **บน Vercel ควรใช้ URL แบบ pooled เสมอ** เพราะแต่ละ function เปิด connection ของตัวเอง ถ้าต่อตรงอาจชนขีดจำกัดจำนวน connection ของฐานข้อมูล
- **เลือก region ของฐานข้อมูลให้ตรงกับเซิร์ฟเวอร์** `examples/lead-intake-agent/vercel.json` ตั้งให้เซิร์ฟเวอร์รันที่สิงคโปร์ (`sin1`) จึงควรสร้างฐานข้อมูลที่สิงคโปร์ด้วย (Neon: AWS Asia Pacific (Singapore)) ถ้าฐานข้อมูลอยู่ region อื่น ให้แก้ `regions` ใน `vercel.json` ให้ตรงกัน ไม่อย่างนั้นทุก query ต้องวิ่งข้ามทวีป หน้าเว็บจะช้าลงหลายเท่า
- ระบบเข้ารหัสการเชื่อมต่อ (TLS) ให้เอง ยกเว้น `localhost` และเคารพ `sslmode` ใน URL
- ทดสอบแล้วกับ Neon และกับ Postgres มาตรฐานที่สร้างจากฐานข้อมูลว่าง ส่วน Supabase, Prisma Postgres และ AWS RDS ยังไม่ได้ทดสอบกับบัญชีจริง

### เลือก AI model

ตั้งด้วย `AI_MODEL` (หลัก) และ `AI_FALLBACK_MODEL` (สำรอง) ใช้ชื่อแบบ `provider/model` จาก [AI Gateway model catalog](https://vercel.com/ai-gateway/models) เช่น `anthropic/claude-haiku-5.5`, `openai/gpt-5.5`, `google/gemini-3.5-flash`

| ตั้งค่าแบบไหน | ระบบใช้อะไร |
|---|---|
| ไม่ได้ตั้งอะไรเพิ่ม | ผ่าน AI Gateway: `anthropic/claude-haiku-5.5` สำรองด้วย `google/gemini-3.5-flash-lite` (คนละเจ้า ล่มพร้อมกันยาก) |
| มี `GOOGLE_GENERATIVE_AI_API_KEY` | model `google/…` เรียก Gemini ตรงด้วย key นี้ ค่าเริ่มต้นเป็น `google/gemini-3.6-flash` สำรองด้วย `google/gemini-flash-latest` |
| ตั้ง `AI_MODEL` เอง | model ที่ไม่ใช่ `google/…` ผ่าน AI Gateway เสมอ |

- บน Vercel AI Gateway ยืนยันตัวตนด้วย OIDC ของ deployment ได้เอง `AI_GATEWAY_API_KEY` จึงจำเป็นเฉพาะตอนรันนอก Vercel แต่ปุ่ม Deploy ยังถามไว้เพื่อความชัดเจน
- **AI Gateway แบบ free tier ใช้ได้แค่บาง model** model ที่ตั้งเป็นค่าเริ่มต้นต้องเติม credits ก่อน (ถ้าไม่เติมจะได้ error 403)
- ถ้า model หลักล่ม ระบบลองซ้ำ 2 ครั้ง (2 และ 6 วินาที) แล้วสลับไปใช้ model สำรอง 1 ครั้ง

### ค่าใช้จ่าย

**AI model:** คิดตามจำนวน token อีเมล 1 ฉบับเรียก model ประมาณ 3 ครั้ง (ตัดสินใจหาข้อมูลบริษัท → วิเคราะห์และบันทึก → ร่างคำตอบ) รวมประมาณ 10,000–12,000 input tokens และ 600 output tokens ตัวเลขนี้ประเมินจากขนาดคำสั่งและ schema ของ tool **ยังไม่ได้วัดจากการใช้งานจริง** และภาษาไทยใช้ token มากกว่าภาษาอังกฤษ

| model | ราคา input / output ต่อ 1M token* | ประมาณต่ออีเมล |
|---|---|---|
| `anthropic/claude-haiku-5.5` (ค่าเริ่มต้น) | $0.10 / $0.50 | ~$0.0015 |
| `google/gemini-3.5-flash-lite` (สำรอง) | $0.30 / $2.50 | ~$0.005 |
| `anthropic/claude-sonnet-5.5` | $2.00 / $10.00 | ~$0.03 |

\* ดึงจาก `https://ai-gateway.vercel.sh/v1/models` เมื่อ 10 พ.ย. 2569 ราคาเปลี่ยนได้ ส่วน `google/gemini-3.6-flash` ไม่มีใน AI Gateway ถ้าใช้ ให้ดูราคาที่ Google AI Studio

**บริการอื่น:** Vercel แพ็กเกจ Hobby ใช้ทดลองได้ แต่ใช้เชิงพาณิชย์ต้องเป็น Pro ขึ้นไป และ Hobby ตั้งงานอัตโนมัติได้วันละครั้ง · Resend, context.dev, และ Postgres (เช่น Neon, Supabase) มีแพ็กเกจฟรีสำหรับทดลอง ดูราคาและขีดจำกัดล่าสุดที่เว็บผู้ให้บริการ · **ไม่ต้องใช้ Redis** สถานะเธรดอีเมลเก็บใน Postgres ตัวเดียวกัน (ตาราง `chat_state_*`)

### เพิ่ม / ลดฟิลด์ข้อมูล

**บนหน้าเว็บ:** `/leads` → ปุ่ม **ตั้งค่าฟิลด์** (`/settings/fields`) เพิ่มฟิลด์, แก้ชื่อ ประเภท ตัวเลือก และคำอธิบายให้ AI, เลือกว่าแสดงในตาราง/ฟอร์มลูกค้า/Excel, ลากหรือกดลูกศรเพื่อเรียงลำดับ, ซ่อน/แสดง แล้วกด **บันทึก** มีผลกับอีเมลถัดไป ตาราง ฟอร์มลูกค้า และ Excel ภายในประมาณ 15 วินาที **ไม่ต้อง deploy**

- รายการที่บันทึกเก็บในฐานข้อมูล (ตาราง `app_settings`) ส่วน [`packages/core/src/lead-schema.ts`](packages/core/src/lead-schema.ts) คือ**ค่าเริ่มต้น**ของระบบที่ติดตั้งใหม่ และใช้กับปุ่ม "คืนค่าเริ่มต้น"
- AI รับรายการฟิลด์ล่าสุดทุกครั้งที่มีอีเมลใหม่ (`packages/eve/extension/instructions/2-lead-fields.ts`) และระบบตรวจค่าที่ AI ส่งกลับกับรายการล่าสุดก่อนบันทึก
- ค่าของฟิลด์เก็บในคอลัมน์ JSON `custom_fields` **เพิ่มหรือลบฟิลด์ได้โดยไม่ต้องแก้โครงสร้างตาราง**
- **ซ่อน = ไม่ลบข้อมูล** กดแสดงอีกครั้งได้ · รหัสฟิลด์ (key) สร้างให้อัตโนมัติและเปลี่ยนไม่ได้ เปลี่ยนชื่อที่แสดงได้ตามใจ
- ฟิลด์ใหม่มีผลกับ lead ใหม่ lead เก่าจะว่างในช่องนั้น
- คะแนน Hot/Warm/Cold และเหตุผลเป็นช่องหลัก ไม่อยู่ในรายการนี้ (เกณฑ์อยู่ใน `packages/eve/extension/instructions/1-workflow.md`)
- เพิ่มฟิลด์ที่ AI กรอกแล้ว ควรลองในหน้าทดสอบ AI ก่อน · ฟิลด์ที่ให้ลูกค้ากรอกเป็นข้อมูลส่วนบุคคลควรอยู่ในข้อความยินยอม PDPA

### หน้าเว็บ

| Path | ใช้ทำอะไร |
|---|---|
| `/login` | เข้าสู่ระบบผู้ดูแล |
| `/` | พาไปหน้า `/leads` |
| `/settings/fields` | **ตั้งค่าฟิลด์** เพิ่ม/แก้/ซ่อน/เรียงฟิลด์ข้อมูล lead |
| `/leads` | ตาราง lead หน้าละ 10 รายการ กรองตามคะแนน ค้นหา แก้ไข ลบ Export Excel · ปุ่ม "สแปม" และ "ทดสอบ" ดูรายการแยก |
| `/s` | **ทดสอบ AI** ฟอร์มจำลองอีเมลด้านบน ขั้นตอนและผลวิเคราะห์แบบสดด้านล่าง **ไม่ส่งอีเมลจริง** |
| `/f/<token>` | **หน้าสาธารณะ** ฟอร์มให้ลูกค้ายืนยันข้อมูลติดต่อ (ลิงก์อยู่ในเมลตอบกลับ) |

**ภาษา:** ทุกหน้ามีปุ่ม **TH / EN** มุมขวาบน (จำค่าไว้ในคุกกี้) ถ้ายังไม่เคยเลือก ระบบดูภาษาของเบราว์เซอร์ (ค่าเริ่มต้นไทย) ฟอร์มลูกค้าจึงขึ้นภาษาอังกฤษให้ลูกค้าต่างชาติเอง ชื่อฟิลด์และตัวเลือกภาษาอังกฤษตั้งได้ที่หน้าตั้งค่าฟิลด์ · ข้อความที่ AI เขียน (เช่น เหตุผลของคะแนน) เป็นภาษาไทย เปลี่ยนได้ด้วย `LEAD_DATA_LANGUAGE`

**หน้าตา:** ใช้ design system [Mintel UI](https://mintel-ui.vercel.app) (สีแบรนด์ทั้งโหมดสว่าง/มืด, ฟอนต์ Manrope + Rubik + IBM Plex Sans Thai) ผ่าน shadcn registry ที่ลงทะเบียนไว้ใน `examples/lead-intake-agent/components.json` เพิ่ม component ได้ด้วย `npx shadcn@latest add @mintel/<ชื่อ>` (รันในโฟลเดอร์ `examples/lead-intake-agent`)

### การทำงาน

```
ลูกค้า ── อีเมล ──▶ Resend ── webhook (ลายเซ็น svix) ──▶ /eve/v1/resend
                                                         │
             กรองเมลอัตโนมัติ/ซ้ำ → บันทึกลง Postgres ("กำลังวิเคราะห์")
                                                         │
                  AI agent: enrich_sender (context.dev) → save_lead (ข้อมูลแยกช่อง + คะแนน)
                                                         │
ลูกค้า ◀── เมลตอบ + ลิงก์ฟอร์ม ── Resend ◀──────────────────┘
```

### Environment variables

ดูคำอธิบายครบทุกตัวใน [`.env.example`](examples/lead-intake-agent/.env.example) · **ห้าม commit `.env.local` หรือค่าจริงลง repo**

| ตัวแปร | จำเป็น | ใช้ทำอะไร |
|---|---|---|
| `AI_GATEWAY_API_KEY` | บน Vercel ไม่จำเป็น | key ของ AI Gateway |
| `AI_MODEL`, `AI_FALLBACK_MODEL` | | model หลักและสำรอง ([เลือก AI model](#เลือก-ai-model)) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | | เรียก Gemini ตรงแทน AI Gateway |
| `DATABASE_URL` | ✓ | Postgres เจ้าไหนก็ได้ ([เลือกฐานข้อมูล](#เลือกฐานข้อมูล)) ถ้าไม่มี ระบบอ่าน `POSTGRES_URL` แทน |
| `CONTEXT_API_KEY` | ✓ | หาข้อมูลบริษัทผู้ส่ง |
| `RESEND_API_KEY` | ✓ | key แบบ Full access |
| `RESEND_FROM_ADDRESS` | ✓ | ที่อยู่ผู้ส่งเมลตอบ |
| `RESEND_WEBHOOK_SECRET` | ✓ | signing secret ของ webhook (`whsec_…`) ถ้าไม่ตั้ง ระบบรับเมลไม่ได้ |
| `RESEND_REPLY_TO` | แนะนำ | ที่อยู่รับเมล ลูกค้ากด Reply แล้วเมลกลับเข้าระบบ |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | ✓ | login หน้าเว็บ |
| `ADMIN_SESSION_SECRET` | | secret เซ็นคุกกี้ login และลิงก์ฟอร์ม ถ้าไม่ตั้ง ระบบสุ่มเองแล้วเก็บในฐานข้อมูล · ถ้าเปลี่ยนค่า ทุกคนถูก logout และลิงก์ฟอร์มที่ส่งไปแล้วเปิดไม่ได้ |
| `PUBLIC_APP_URL` | | URL ของเว็บสำหรับลิงก์ในเมล (ค่าเริ่มต้นคือโดเมน production ของ Vercel) |
| `COMPANY_NAME`, `PRIVACY_POLICY_URL` | | ชื่อบริษัทและลิงก์นโยบายความเป็นส่วนตัวในฟอร์มลูกค้า |
| `LEAD_FORM_SECRET` | | secret แยกสำหรับลิงก์ฟอร์ม (ค่าเริ่มต้นใช้ secret เดียวกับคุกกี้ login) |
| `LEAD_DATA_LANGUAGE` | | ภาษาที่ AI ใช้เขียนข้อมูล lead เช่น `English` (ค่าเริ่มต้น `Thai`) |
| `SIMULATE_AI_OUTAGE` | | **ใช้สาธิตเท่านั้น** `primary` = จำลอง model หลักล่ม, `all` = จำลองทุก model ล่ม |

แก้ตัวแปรใน Vercel แล้วต้อง **Redeploy** ถึงจะมีผล

### รันในเครื่อง

ต้องใช้ **Node.js 24**

รันคำสั่งที่โฟลเดอร์บนสุดของ repo (npm workspaces):

```bash
npm install
cp examples/lead-intake-agent/.env.example examples/lead-intake-agent/.env.local   # กรอกค่าจริง
npm run dev                  # http://localhost:3000 (โหมด dev ไม่ถาม login)
```

| คำสั่ง | |
|---|---|
| `npm run dev` | เปิดระบบในเครื่อง |
| `npm run typecheck` | ตรวจ type ทั้ง 3 ส่วน |
| `npm test` | เทสต์ของ `packages/core` |
| `npm run build` | build core, extension และแอปตัวอย่าง |
| `npx eve deploy` (ใน `examples/lead-intake-agent`) | deploy ขึ้น Vercel production |
| `node --env-file=.env.local scripts/demo-stuck-lead.mjs <อีเมล>` (ใน `examples/lead-intake-agent`) | สร้าง lead ค้าง "กำลังวิเคราะห์" ไว้สาธิตปุ่มวิเคราะห์ใหม่ |

### โครงสร้างโปรเจกต์

```
packages/core/src/            กติกาล้วน ไม่มี dependency
  lead-schema.ts              ฟิลด์เริ่มต้นของ lead + ตัวช่วยตรวจค่า
  lead-details.ts             สถานะและคะแนน Hot/Warm/Cold
  automated-email.ts          ตรวจเมลอัตโนมัติ / bounce / mailing list
  prompt.ts                   รูปแบบข้อความอีเมลที่ส่งให้ AI
  signing.ts                  token ลิงก์ฟอร์มและคุกกี้ login ที่เซ็นกันปลอม
packages/eve/extension/       eve extension (mount แล้วได้ชื่อ lead__…)
  extension.ts                config ทั้งหมดของ extension (zod)
  instructions/               1-workflow.md ขั้นตอน เกณฑ์คะแนน กติกา · 2-lead-fields.ts รายการฟิลด์ล่าสุด
  tools/                      enrich_sender (context.dev), save_lead
  channels/resend.ts          รับเมล / กรอง / ตอบ / แนบลิงก์ฟอร์ม
  channels/lead-admin.ts      ปุ่ม "วิเคราะห์ใหม่" (POST /eve/v1/lead-admin/reanalyze/:id)
  schedules/daily-maintenance.ts  ทุกวัน 09:00 (เวลาไทย): วิเคราะห์รายการค้าง + ลบ chat state ที่หมดอายุ
  lib/desk.ts                 openLeadDesk() สำหรับหน้าเว็บ (export ./desk)
  lib/leads-db.ts, field-config.ts, settings.ts, chat-state.ts, …   ตาราง leads, ฟิลด์, ตั้งค่า, สถานะเธรด (Postgres)
examples/lead-intake-agent/   แอปเต็ม (ปุ่ม Deploy ติดตั้งโฟลเดอร์นี้)
  lead-intake.config.ts       config ชุดเดียว ใช้ทั้ง mount และหน้าเว็บ (อ่านจาก env)
  lead.desk.ts                desk ของแอปนี้
  agent/agent.ts              เลือก model + retry + model สำรอง (lib/model.ts, lib/resilient-model.ts)
  agent/instructions.md       ตัวตนของ agent
  agent/extensions/lead.ts    mount extension
  agent/channels/eve.ts       ช่องทางเว็บ + auth
  app/                        หน้า leads, ฟอร์มลูกค้า f/[token], ตั้งค่าฟิลด์, ทดสอบ AI, login
  proxy.ts                    บังคับ login ก่อนเข้าหน้าเว็บ
  vercel.json                 region ของเซิร์ฟเวอร์ (sin1 ตรงกับฐานข้อมูล)
  .env.example                รายชื่อตัวแปรทั้งหมด
```

### ข้อจำกัด

- **อีเมลขาออก:** ก่อนยืนยันโดเมนใน Resend ระบบส่งเมลตอบได้เฉพาะถึงเจ้าของบัญชี Resend
- **รองรับ Resend เจ้าเดียว:** โค้ดรับ-ส่งเมลผูกกับ Resend (`packages/eve/extension/channels/resend.ts` ใช้ฟังก์ชันภายในของ `chat` และ `@resend/chat-sdk-adapter` ถ้าอัปเกรดไลบรารีแล้วเมลตอบผิดปกติ ให้ตรวจไฟล์นี้ก่อน)
- **Login:** บัญชีผู้ดูแลเดียว ยังไม่จำกัดจำนวนครั้งที่กรอกรหัสผิด
- **extension ตั้งต้นจากอีเมล:** mount แล้วได้ช่องทางอีเมล Resend เสมอ (ต้องตั้ง `email.fromAddress` และ key ของ Resend) `save_lead` ใช้จากช่องทางอื่นได้ แต่การตอบกลับและลิงก์ฟอร์มทำงานเฉพาะในอีเมล
- **ฐานข้อมูลเดียวต่อ process:** mount extension และ `openLeadDesk()` ใน process เดียวกันต้องใช้ `databaseUrl` เดียวกัน
- **เทสต์อัตโนมัติมีเฉพาะ `packages/core`** ส่วนรับ-ส่งอีเมลและฐานข้อมูลยังทดสอบด้วยมือ และยังไม่มีแจ้งเตือนเมื่อระบบมีปัญหา

### ร่วมพัฒนา

ยินดีรับ issue และ pull request ก่อนส่ง PR ให้รัน `npm run typecheck`, `npm test` และ `npm run build` ให้ผ่าน ถ้าเป็นการเปลี่ยนแปลงใหญ่ ให้เปิด issue คุยกันก่อน · ห้าม commit key หรือ `.env.local`

### ผู้พัฒนา

- [kongkeat](https://github.com/kongkeat): ผู้เขียน Lead Intake Agent เวอร์ชันแรก
- ทีม M Intelligence

### สัญญาอนุญาต

เผยแพร่ภายใต้ [MIT License](LICENSE) © 2026 M Intelligence  
นำไปใช้ แก้ไข และใช้เชิงพาณิชย์ได้ โดยต้องคงข้อความลิขสิทธิ์และสัญญาอนุญาตไว้ในสำเนาทุกชุด ซอฟต์แวร์นี้ให้ "ตามสภาพ" ไม่มีการรับประกันใดๆ

---

## English

### What it does

1. **Takes in customer emails** through [Resend](https://resend.com) and saves each one to the database before any AI runs.
2. **Analyzes every email:** looks up the sender's company ([context.dev](https://context.dev)), extracts structured fields (name, title, company, phone, product interest, team size, budget, timeline, request type, urgency), and **scores the lead 🔥 Hot / 🟠 Warm / 🔵 Cold** with a reason.
3. **Filters spam:** sales pitches, ads and phishing are kept aside and never answered. Auto-replies, bounces, mailing lists and no-reply senders are dropped before the agent runs.
4. **Replies automatically** in the customer's language, in the same thread, with a **link to a form** where the customer confirms their contact details (with PDPA consent).
5. **Leads page for the team:** filter by score, search, edit, delete (recoverable), export to Excel, and re-run stuck analyses with one click.
6. **AI test page:** simulate an email and watch the analysis live. Nothing is emailed, and test leads stay separate from real ones.

### Safeguards

| Rule | How it is enforced |
|---|---|
| A model outage never loses a lead | The email is saved before the agent runs (`recordInboundEmail()`). Transient errors are retried, then a fallback model is used (`resilientModel()`). Stuck analyses are re-run (`redispatchStuckAnalyses()`), or on demand with the Re-analyze button. |
| The agent ignores instructions inside emails and never quotes prices or makes promises | `packages/eve/extension/instructions/1-workflow.md` treats email content as untrusted data and limits replies to a short acknowledgment. |
| The agent doesn't guess | Every `save_lead` field is optional and filled only from what the email says. Customer-confirmed details are never overwritten by a re-analysis (`completeAnalysis()`). |
| No replies to spam or bots | `threadLeadIsSpam()` (per thread), `isAutomatedEmail()` (headers and sender), and at most 3 follow-up replies per thread per day. |
| Forged webhooks are rejected | Svix signatures are checked with `RESEND_WEBHOOK_SECRET`. Duplicates are dropped via the chat state in Postgres and a UNIQUE `resend_email_id`. |
| The web app requires login | HMAC-signed 7-day session cookie (secret from env or generated into the database; if it can't be loaded, nobody can log in) (`proxy.ts`), re-checked in every server action and route (`isAdmin()`, `appAuth`). |
| Customer form links can't be forged | HMAC-signed tokens bound to one lead, valid for 14 days (`form-token.ts`). |
| An unreachable database doesn't hang intake | Chat state falls back to memory within 3 s (`resilientState()`). |

### Use it as an eve extension

Already have an eve agent? Mount the extension with one file instead of taking the whole app:

```ts
// agent/extensions/lead.ts
import lead from "@eve-lead-intake-extension/eve";

export default lead({
  databaseUrl: process.env.DATABASE_URL,
  email: { fromAddress: "leads@mail.example.com", replyTo: "inbox@example.com" },
  enrichment: { contextApiKey: process.env.CONTEXT_API_KEY! }, // leave out to skip company lookup
  form: { baseUrl: "https://leads.example.com" },               // leave out to send no form link
  dataLanguage: "English",
});
```

Your agent gets `lead__save_lead`, `lead__enrich_sender`, the `lead__resend` channel (the webhook stays at `/eve/v1/resend`), the re-analyze route and the daily job. The extension's instructions only describe lead intake; your agent keeps its own identity.

Code that runs outside the agent, such as web pages, uses `openLeadDesk()` from `@eve-lead-intake-extension/eve/desk` with the same settings to read and change leads, fields, form links and admin sessions. See [`lead-intake.config.ts`](examples/lead-intake-agent/lead-intake.config.ts) and [`lead.desk.ts`](examples/lead-intake-agent/lead.desk.ts), which share one config with the mount.

> Not published to npm yet. For now, use it through this repository's workspace (see [Running locally](#running-locally)).

### Deploying

1. Click **Deploy with Vercel** above and sign in.
2. Under **Add Products → Storage**, click **Add** on Neon to create a Postgres database (free plan works) or connect an existing one; the database variable is set for you. To use another Postgres provider, see [Choosing a database](#choosing-a-database).
3. Fill in the 6 values (see [the table below](#values-asked-for-on-deploy)) and deploy.
4. In Resend → Webhooks, create an **`email.received`** webhook pointing at `https://<your-domain>/eve/v1/resend`, and set its signing secret as `RESEND_WEBHOOK_SECRET`.
5. Set `RESEND_REPLY_TO` to your Resend receiving address, and `COMPANY_NAME` / `PRIVACY_POLICY_URL` for the customer form.
6. **Redeploy**, then send a test email to your receiving address.

#### Values asked for on deploy

| Variable | What it is | Where to get it |
|---|---|---|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key, works with any provider | Vercel dashboard → AI Gateway → API Keys → Create key. Most models need paid credits. |
| `CONTEXT_API_KEY` | Company lookup from the sender's domain | [context.dev](https://context.dev) → Dashboard → API Keys |
| `RESEND_API_KEY` | Receives and sends email | Resend → API Keys → Create. **Must be Full access** (a send-only key can't read inbound mail). |
| `RESEND_FROM_ADDRESS` | Sender address for replies | `onboarding@resend.dev` until your domain is verified (it only delivers to the Resend account owner), then e.g. `leads@mail.your-company.com` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Web login | Choose your own; use a long, unique password. |

No signing secret is needed: one is generated on first use and stored in the database (table `app_settings`). Set `ADMIN_SESSION_SECRET` to choose your own.

### Choosing a database

Any Postgres works; the `leads` table is created and migrated automatically on first use.

| Provider | Setup |
|---|---|
| **Neon** (Vercel Marketplace) | Created by the Deploy button (prefix `DATABASE`). If you add it yourself, use the `DATABASE` prefix to get a pooled `DATABASE_URL` (`-pooler` host). |
| **Supabase** (Vercel Marketplace) | The integration sets `POSTGRES_URL` (pooled, port 6543), which is read automatically. |
| **Prisma Postgres, AWS RDS, self-hosted, …** | Set `DATABASE_URL` yourself; use the provider's pooler URL if it has one. |

**Keep the database and the functions in one region.** `examples/lead-intake-agent/vercel.json` runs the functions in Singapore (`sin1`), so create the database there too (Neon: AWS Asia Pacific (Singapore)), or change `regions` in `vercel.json` to match your database. Otherwise every query crosses an ocean and pages get several times slower.

On Vercel, always use a pooled URL: every function instance opens its own connections. TLS is required except on `localhost`, and `sslmode` in the URL is honored. Tested with Neon and with a stock Postgres starting from an empty database; Supabase, Prisma Postgres and AWS RDS haven't been tried against real accounts yet.

### Choosing the AI model

Set `AI_MODEL` (primary) and `AI_FALLBACK_MODEL` to `provider/model` ids from the [AI Gateway catalog](https://vercel.com/ai-gateway/models), e.g. `anthropic/claude-haiku-5.5`, `openai/gpt-5.5` or `google/gemini-3.5-flash`.

| Setup | What runs |
|---|---|
| Nothing extra | AI Gateway: `anthropic/claude-haiku-5.5`, falling back to `google/gemini-3.5-flash-lite` (a different provider, so one outage can't take down both) |
| `GOOGLE_GENERATIVE_AI_API_KEY` set | `google/…` models call Gemini directly with that key. Defaults become `google/gemini-3.6-flash` → `google/gemini-flash-latest`. |
| Your own `AI_MODEL` | Anything that isn't `google/…` always goes through AI Gateway. |

On Vercel the Gateway authenticates with the deployment's OIDC token, so `AI_GATEWAY_API_KEY` is only required elsewhere; the Deploy button asks for it anyway. **The Gateway's free tier covers only a few models**; the defaults need paid credits (otherwise you get a 403). A failing primary model is retried twice (after 2 s and 6 s), then the fallback is tried once.

### Costs

**Model:** you pay per token. One email takes about 3 model calls (decide on enrichment → analyze and save → write the reply), roughly 10,000–12,000 input and 600 output tokens in total. This is estimated from the instruction and tool-schema sizes, **not yet measured from live calls**, and Thai text uses more tokens than English.

| Model | Input / output per 1M tokens* | Per email (approx.) |
|---|---|---|
| `anthropic/claude-haiku-5.5` (default) | $0.10 / $0.50 | ~$0.0015 |
| `google/gemini-3.5-flash-lite` (fallback) | $0.30 / $2.50 | ~$0.005 |
| `anthropic/claude-sonnet-5.5` | $2.00 / $10.00 | ~$0.03 |

\* Fetched from `https://ai-gateway.vercel.sh/v1/models` on 2026-11-10; prices change. `google/gemini-3.6-flash` isn't on AI Gateway; see Google AI Studio pricing if you use it.

**Other services:** the Vercel Hobby plan is fine for trying it out, but commercial use requires Pro, and Hobby runs scheduled jobs at most once a day. Resend, context.dev, and Postgres providers (e.g. Neon, Supabase) all have free tiers for testing; check each provider for current prices and limits. **No Redis is needed:** email thread state lives in the same Postgres (tables `chat_state_*`).

### Adding or removing lead fields

**On the web:** `/leads` → **Field settings** (`/settings/fields`). Add fields; edit the label, type, options and the AI description; choose whether each shows in the table, the customer form and Excel; drag or use the arrows to reorder; hide/show; then **Save**. Changes reach the next email, the table, the customer form and Excel within about 15 seconds, **without a deploy**.

The saved list lives in the database (`app_settings`); [`packages/core/src/lead-schema.ts`](packages/core/src/lead-schema.ts) holds the defaults for new installs and the "reset" button. The agent gets the current list with every new email (`packages/eve/extension/instructions/2-lead-fields.ts`), and its answers are checked against that list before saving. Values live in the `custom_fields` JSON column, so no migration is needed; hiding a field keeps its data, and field keys are generated and never change (labels can). The Hot/Warm/Cold score is built in (rubric in `agent/instructions.md`). Try new AI fields on the AI test page first.

### Pages

| Path | Purpose |
|---|---|
| `/login` | Admin sign-in |
| `/` | Redirects to `/leads` |
| `/settings/fields` | **Field settings:** add, edit, hide and reorder lead fields |
| `/leads` | Leads table, 10 per page: score filters, search, edit, delete, Excel export; separate spam and test views |
| `/s` | **AI test page:** a simulated email on top, live steps and results below. **No email is sent.** |
| `/f/<token>` | **Public** customer contact form (linked from the reply email) |

**Language:** every page has a **TH / EN** switch in the top right (kept in a cookie). Until someone picks one, the browser's language decides (Thai by default), so foreign customers see the form in English. Set English field names and options on the field settings page. Text the AI writes (e.g. the score reason) is in Thai; change it with `LEAD_DATA_LANGUAGE`.

**Look and feel:** the pages use the [Mintel UI](https://mintel-ui.vercel.app) design system (brand colors in light and dark, Manrope + Rubik + IBM Plex Sans Thai) through the shadcn registry listed in `examples/lead-intake-agent/components.json`. Add more with `npx shadcn@latest add @mintel/<name>` from `examples/lead-intake-agent`.

### Environment variables

Every variable is described in [`.env.example`](examples/lead-intake-agent/.env.example). **Never commit `.env.local` or real values.** Required: `DATABASE_URL` (or `POSTGRES_URL`), `CONTEXT_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, `RESEND_WEBHOOK_SECRET` (without it no email is received), `ADMIN_USERNAME`, `ADMIN_PASSWORD`, plus AI access (`AI_GATEWAY_API_KEY` outside Vercel, or `GOOGLE_GENERATIVE_AI_API_KEY`). Recommended: `RESEND_REPLY_TO`. Optional: `ADMIN_SESSION_SECRET` (generated and stored in the database when unset; changing it logs everyone out and breaks form links already sent), `AI_MODEL`, `AI_FALLBACK_MODEL`, `PUBLIC_APP_URL`, `COMPANY_NAME`, `PRIVACY_POLICY_URL`, `LEAD_FORM_SECRET`, `LEAD_DATA_LANGUAGE` (language of the text the AI writes, default `Thai`), and `SIMULATE_AI_OUTAGE` (demos only). Changes in Vercel take effect after a **Redeploy**.

### Running locally

Requires **Node.js 24**.

Run these from the repository root (npm workspaces):

```bash
npm install
cp examples/lead-intake-agent/.env.example examples/lead-intake-agent/.env.local   # fill in real values
npm run dev                  # http://localhost:3000 (no login in dev)
```

| Command | |
|---|---|
| `npm run dev` | Run the app locally |
| `npm run typecheck` | Type-check all three parts |
| `npm test` | Tests for `packages/core` |
| `npm run build` | Build core, the extension and the example app |
| `npx eve deploy` (in `examples/lead-intake-agent`) | Deploy to Vercel production |
| `node --env-file=.env.local scripts/demo-stuck-lead.mjs <email>` (in `examples/lead-intake-agent`) | Create a lead stuck on "analyzing" to demo the Re-analyze button |

### Project layout

```
packages/core/src/            framework-free rules, no dependencies
  lead-schema.ts              default lead fields + value checks
  lead-details.ts             statuses and Hot/Warm/Cold scores
  automated-email.ts          detects auto-replies, bounces, mailing lists
  prompt.ts                   the email message format the agent reads
  signing.ts                  signed form-link and login tokens
packages/eve/extension/       the eve extension (mounted as lead__…)
  extension.ts                every setting the extension takes (zod)
  instructions/               1-workflow.md steps, rubric, guardrails · 2-lead-fields.ts the live field list
  tools/                      enrich_sender (context.dev), save_lead
  channels/resend.ts          receive / filter / reply / attach the form link
  channels/lead-admin.ts      Re-analyze button (POST /eve/v1/lead-admin/reanalyze/:id)
  schedules/daily-maintenance.ts  daily at 09:00 Bangkok: re-run stuck analyses + delete expired chat state
  lib/desk.ts                 openLeadDesk() for web pages (the ./desk export)
  lib/leads-db.ts, field-config.ts, settings.ts, chat-state.ts, …   leads, fields, settings, thread state (Postgres)
examples/lead-intake-agent/   the complete app (what the Deploy button installs)
  lead-intake.config.ts       one config for the mount and the pages (from env)
  lead.desk.ts                this app's desk
  agent/agent.ts              model choice + retry + fallback (lib/model.ts, lib/resilient-model.ts)
  agent/instructions.md       the agent's identity
  agent/extensions/lead.ts    mounts the extension
  agent/channels/eve.ts       web channel + auth
  app/                        leads, customer form f/[token], field settings, AI test page, login
  proxy.ts                    requires login for the web pages
  vercel.json                 function region (sin1, next to the database)
  .env.example                every environment variable
```

### Tech stack

[eve](https://eve.dev) · Next.js 16 (App Router) · React 19 · Vercel AI SDK 7 + AI Gateway · Resend (`@resend/chat-sdk-adapter`) · Postgres (any provider; `postgres.js`, chat state via `@chat-adapter/state-pg`) · Zod 4 · Tailwind CSS 4 · [Mintel UI](https://mintel-ui.vercel.app) (theme and components through its shadcn registry) · exceljs

### Limitations

- Before your domain is verified in Resend, replies only reach the Resend account owner.
- Resend is the only supported email provider (`packages/eve/extension/channels/resend.ts` relies on internals of `chat` and `@resend/chat-sdk-adapter`; check it first if replies misbehave after an upgrade).
- A single admin account, with no login rate limiting yet.
- The extension is email-first: mounting it always adds the Resend email channel (it needs `email.fromAddress` and a Resend key). `save_lead` works from other channels, but replies and form links only happen over email.
- One database per process: an extension mount and `openLeadDesk()` in the same process must use the same `databaseUrl`.
- Automated tests cover `packages/core` only; email and database paths are tested by hand. No alerting when something breaks.

### Contributing

Issues and pull requests are welcome. Please make sure `npm run typecheck`, `npm test` and `npm run build` pass before opening a PR, and open an issue first for larger changes. Never commit keys or `.env.local`.

### Contributors

- [kongkeat](https://github.com/kongkeat): author of the original Lead Intake Agent
- The M Intelligence team

## License

Released under the [MIT License](LICENSE). Copyright © 2026 M Intelligence.
