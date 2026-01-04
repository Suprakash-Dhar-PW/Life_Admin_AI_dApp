
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { initEmailer, sendEmail } from "./reminderJob.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

console.log("🔍 Verifying Email Configuration...");
console.log(`User: ${process.env.EMAIL_USER}`);
console.log(`Host: ${process.env.EMAIL_HOST}`);

async function run() {
  await initEmailer();

  console.log("📨 Attempting to send test email...");
  await sendEmail({
    to: process.env.EMAIL_USER, // Send to self
    subject: "Direct Terminal Test",
    text: "If you see this, your .env configuration is correct!",
    html: "<h1>It Works!</h1><p>Sent from verify-email.js</p>"
  });

  console.log("✅ Done. Check your inbox.");
}

run().catch(console.error);
