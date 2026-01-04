import fs from "fs";
import { sendEmail } from "./mailer.js";

/* -------------------------
   DB Helpers
-------------------------- */
const readDB = (dbPath) => {
  if (!fs.existsSync(dbPath)) return [];
  return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
};

const writeDB = (dbPath, data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

/* -------------------------
   CORE REMINDER LOGIC
-------------------------- */
export async function runReminderCheck(dbPath) {
  const db = readDB(dbPath);
  const now = new Date();
  let updated = false;

  for (const item of db) {
    // 1️⃣ Must have email
    if (!item.email) continue;

    // 2️⃣ Only pending tasks
    if (item.status !== "PENDING") continue;

    // 3️⃣ Must have deadline
    if (!item.renewalDate) continue;

    const deadline = new Date(item.renewalDate);
    const diffMinutes = Math.floor((deadline - now) / 60000);

    // 4️⃣ Notify if deadline is within 30 minutes
    const THRESHOLD = 30;
    if (diffMinutes <= 0 || diffMinutes > THRESHOLD) continue;

    // 5️⃣ Anti-spam: skip if already notified recently
    const alreadyNotifiedRecently =
      item.lastNotified &&
      now - new Date(item.lastNotified) < 2 * 60 * 60 * 1000;

    if (alreadyNotifiedRecently) continue;

    // 6️⃣ Send reminder email
    console.log(
      `🔔 Sending reminder: ${item.service} (${diffMinutes} mins left)`
    );

    await sendEmail({
      to: item.email,
      subject: `⏳ ${diffMinutes} mins left — ${item.service}`,
      text: `Your task "${item.service}" expires in ${diffMinutes} minutes.`,
      html: `
        <div style="font-family:sans-serif;padding:20px">
          <h2>⏰ Deadline Approaching</h2>
          <p><strong>${item.service}</strong></p>
          <p>${diffMinutes} minutes remaining</p>
          <a href="https://life-admin-ai-five.vercel.app"
             style="padding:10px;background:#7c3aed;color:white;text-decoration:none">
            Submit Proof
          </a>
        </div>
      `
    });

    // 7️⃣ Lock notification
    item.lastNotified = new Date().toISOString();
    updated = true;
  }

  if (updated) {
    writeDB(dbPath, db);
  }
}
