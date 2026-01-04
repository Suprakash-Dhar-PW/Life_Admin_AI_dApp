import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { runReminderCheck } from "./reminderJob.js";
import { sendEmail, generateICal } from "./mailer.js";
import { refundStake } from "./refundStake.js";

/* ---------------- ENV ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

console.log(`[ENV] Loaded config for user: ${process.env.EMAIL_USER || "Not Set"}`);

/* ---------------- APP ---------------- */
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/* ---------------- DB ---------------- */
const DB_FILE = path.join(__dirname, "db.json");

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
const writeDB = (data) =>
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

const normalize = (v) => (v ? v.trim() : "");

/* ---------------- ROUTES ---------------- */

app.get("/", (req, res) => {
  res.send("Life Admin AI Backend (Testnet) 🤖");
});

/* ---------- TEST EMAIL ---------- */
app.get("/api/test-email", async (req, res) => {
  const to = req.query.to;
  if (!to) return res.status(400).json({ error: "Missing ?to=email" });

  await sendEmail({
    to,
    subject: "✅ Life Admin AI – Email Working",
    text: "Email system is configured correctly.",
    html: "<h2>✅ Email system working</h2>",
  });

  res.json({ success: true });
});

/* ---------- COMMITMENTS ---------- */
app.get("/api/commitments", (req, res) => {
  res.json(readDB());
});

/* ---------- TRACK ---------- */
app.post("/api/track", async (req, res) => {
  const {
    mintAddress,
    owner,
    email,
    metadataUri,
    renewalDate,
    deadline,
    service,
    goal,
    stakeAmount,
    stake,
    verifier,
  } = req.body;

  const mint = normalize(mintAddress);
  if (!mint || !owner || !metadataUri)
    return res.status(400).json({ error: "Missing fields" });

  const db = readDB();
  if (db.find((x) => x.mintAddress === mint))
    return res.json({ message: "Already tracked" });

  const finalDeadline = renewalDate || deadline;
  const finalService = service || goal || "Unknown Task";
  const finalStake = parseFloat(stakeAmount || stake || "0");

  const item = {
    mintAddress: mint,
    owner,
    verifier:
      verifier || "FBuJ9xHqG4tATW5wKJAn1uRKpM4WujNtKfA25CzXNBhy",
    email,
    metadataUri,
    service: finalService,
    renewalDate: finalDeadline,
    stakeAmount: finalStake,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    lastNotified: null,
  };

  db.push(item);
  writeDB(db);

  /* Calendar invite */
  if (email) {
    const start = new Date(finalDeadline);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    await sendEmail({
      to: email,
      subject: `🔒 Locked: ${finalService}`,
      html: `<h2>${finalService}</h2><p>Deadline: ${start.toLocaleString()}</p>`,
      icalEvent: generateICal({
        service: finalService,
        start,
        end,
        description: `Stake: ${finalStake} SOL`,
        url: "https://life-admin-ai-five.vercel.app",
      }),
    });
  }

  res.json({ success: true });
});

/* ---------- PROOF ---------- */
app.post("/api/proof", (req, res) => {
  const { mintAddress, proofCid, submittedBy } = req.body;
  const mint = normalize(mintAddress);

  const db = readDB();
  const item = db.find((x) => x.mintAddress === mint);
  if (!item) return res.status(404).json({ error: "Not found" });
  if (item.owner !== submittedBy)
    return res.status(403).json({ error: "Not owner" });

  item.proofCid = proofCid;
  item.status = "PROOF_SUBMITTED";
  item.proofSubmittedAt = new Date().toISOString();

  writeDB(db);
  res.json({ success: true });
});

/* ---------- VERIFIER ---------- */
app.get("/api/verifier/:wallet", (req, res) => {
  const { wallet } = req.params;
  const db = readDB();
  // Filter for specific verifier AND (status PROOF_SUBMITTED OR PENDING)
  const tasks = db.filter(t =>
    t.verifier === wallet &&
    (t.status === "PROOF_SUBMITTED" || t.status === "PENDING")
  );
  res.json(tasks);
});

/* ---------- APPROVE ---------- */
app.post("/api/approve", async (req, res) => {
  const { mintAddress, verifier, txSignature } = req.body;
  const mint = normalize(mintAddress);

  const db = readDB();
  const item = db.find((x) => x.mintAddress === mint);

  if (!item) return res.status(404).json({ error: "Not found" });
  if (item.verifier !== verifier)
    return res.status(403).json({ error: "Unauthorized" });

  let sig = txSignature;

  // Only run server-side refund if client didn't do it
  if (!sig) {
    try {
      sig = await refundStake({
        toWallet: item.owner,
        amountSol: item.stakeAmount,
      });
    } catch (err) {
      console.error("Refund failed:", err);
      return res.status(500).json({ error: "Refund failed on server" });
    }
  }

  item.status = "COMPLETED";
  item.refundTx = sig;
  item.resolvedAt = new Date().toISOString();

  writeDB(db);
  res.json({ success: true, refundTx: sig });
});

/* ---------- REJECT ---------- */
app.post("/api/reject", (req, res) => {
  const { mintAddress, verifier } = req.body;
  const mint = normalize(mintAddress);

  const db = readDB();
  const item = db.find((x) => x.mintAddress === mint);

  if (!item) return res.status(404).json({ error: "Not found" });
  if (item.verifier !== verifier)
    return res.status(403).json({ error: "Unauthorized" });

  item.status = "FAILED";
  item.resolvedAt = new Date().toISOString();
  writeDB(db);

  res.json({ success: true });
});

/* ---------- REMINDER TRIGGER ---------- */
app.post("/api/run-reminders", async (req, res) => {
  await runReminderCheck(DB_FILE);
  res.json({ success: true });
});

/* ---------------- START ---------------- */
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);

  // Start Local Reminder Loop (Dev Mode)
  if (process.env.NODE_ENV !== "production") {
    console.log("⏱ Starting local background reminder loop...");
    setInterval(() => {
      runReminderCheck(DB_FILE).catch(err => console.error("Reminder Loop Error:", err));
    }, 60 * 1000); // Every minute
  }
});
