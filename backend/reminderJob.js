import cron from "node-cron";
import fs from "fs";
import nodemailer from "nodemailer";

// Shared Transporter
let transporter = null;

export async function initEmailer() {
  if (transporter) return;
  try {
    // Check if we have real credentials in ENV (Not implemented in this demo env, defaulting to Ethereal)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("📧 Email System Ready (Mode: Ethereal Test)");
  } catch (err) {
    console.warn("⚠️ Email init failed:", err);
  }
}

export async function sendEmail({ to, subject, text, html, icalEvent }) {
  if (!transporter) await initEmailer();
  if (!transporter) return;

  try {
    const opts = {
      from: '"Protocol.Commit" <ai@lifeadmin.so>',
      to,
      subject,
      text,
      html,
    };

    if (icalEvent) {
      opts.icalEvent = {
        filename: 'commitment.ics',
        method: 'request',
        content: icalEvent
      };
    }

    const info = await transporter.sendMail(opts);
    console.log(`📩 Email Sent to ${to}: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (e) {
    console.error("Email send error:", e);
  }
}

export function generateICal({ service, start, end, description, url }) {
  // Simple iCal format
  const formatDate = (date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const now = formatDate(new Date());

  return `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Protocol.Commit//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${Date.now()}@protocol.commit
DTSTAMP:${now}
DTSTART:${formatDate(new Date(start))}
DTEND:${formatDate(new Date(end))}
SUMMARY:${service} (Protocol.Commit)
DESCRIPTION:${description}
URL:${url}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR
`.trim();
}

// Helper to read DB
const readDB = (dbPath) => {
  if (!fs.existsSync(dbPath)) return [];
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
};

const writeDB = (dbPath, data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

export async function startReminderJob(dbPath) {
  await initEmailer();

  // Run every minute
  cron.schedule("* * * * *", async () => {
    // console.log("Running reminder check...");
    const db = readDB(dbPath);
    let updated = false;
    const now = new Date();

    for (const item of db) {
      if (!item.renewalDate) continue;
      if (item.status !== "PENDING" && item.status !== "ON_CHAIN_ONLY") continue;

      const renewal = new Date(item.renewalDate);
      const diffMs = renewal - now;
      const diffMins = Math.round(diffMs / 60000);

      // Conditions:
      // 1. Due soon (e.g. within 30 mins)
      // 2. Already overdue (expired) but recently (within last 5 mins) to notify expiration? 
      // Let's stick to approaching.

      const thresholdMins = 30; // Notify if <= 30 mins left

      const shouldNotify = diffMins > 0 && diffMins <= thresholdMins && !wasNotifiedRecently(item.lastNotified);

      if (shouldNotify) {
        console.log(`🔔 Deadline Near: ${item.service} (${diffMins} mins left)`);

        if (item.email) {
          await sendEmail({
            to: item.email,
            subject: `⏳ Hurry! 30 Mins Left: ${item.service}`,
            text: `Your commitment "${item.service}" is due in ${diffMins} minutes. Submit your proof now!`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #fff; border-radius: 10px;">
                <h2 style="color: #c084fc;">Deadline Approaching!</h2>
                <p>You have <strong>${diffMins} minutes</strong> left to complete: <strong>${item.service}</strong>.</p>
                <p>Stake: <strong>${item.stakeAmount} SOL</strong></p>
                <a href="http://localhost:5173" style="display: inline-block; padding: 10px 20px; background: #c084fc; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Submit Proof Now</a>
              </div>
            `
          });
        }

        item.lastNotified = new Date().toISOString();
        updated = true;
      }
    }

    if (updated) {
      writeDB(dbPath, db);
    }
  });
}

function wasNotifiedRecently(lastNotified) {
  if (!lastNotified) return false;
  const diff = new Date() - new Date(lastNotified);
  // Don't notify again if notified within last 2 hours
  return diff < 2 * 60 * 60 * 1000;
}
