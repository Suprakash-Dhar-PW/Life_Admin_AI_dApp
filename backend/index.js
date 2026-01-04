import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { startReminderJob, sendEmail, generateICal } from "./reminderJob.js";
import { refundStake } from "./refundStake.js";

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, "db.json");

// Initialize DB
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// Helper: Normalize Mint Address (trim, lowercase check if needed)
const normalize = (addr) => addr ? addr.trim() : "";

// Routes

app.get("/", (req, res) => {
  res.send("Life Admin AI Backend (Testnet) 🤖");
});

// GET /api/commitments - Source of Truth
app.get("/api/commitments", (req, res) => {
  try {
    const db = readDB();
    res.json(db);
  } catch (e) {
    res.status(500).json({ error: "Failed to read database" });
  }
});

// POST /api/track - Register new commitment
app.post("/api/track", async (req, res) => {
  try {
    const {
      mintAddress,
      owner,
      verifier,
      email,
      metadataUri,
      renewalDate, // Frontend might send 'deadline'
      deadline,
      service, // Frontend might send 'goal'
      goal,
      stakeAmount, // Frontend might send 'stake'
      stake
    } = req.body;

    const mint = normalize(mintAddress);
    if (!mint || !owner || !metadataUri) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = readDB();
    if (db.find(r => r.mintAddress === mint)) {
      return res.json({ message: "Already tracked" });
    }

    const finalDeadline = renewalDate || deadline;
    const finalService = service || goal || "Unknown Goal";
    const finalStake = parseFloat(stakeAmount || stake || "0");

    const commitment = {
      mintAddress: mint,
      owner,
      verifier: verifier || "FBuJ9xHqG4tATW5wKJAn1uRKpM4WujNtKfA25CzXNBhy", // Default to Admin
      email: email || null,
      metadataUri,
      service: finalService,
      renewalDate: finalDeadline,
      stakeAmount: finalStake,
      status: "PENDING",
      proofCid: null,
      proofSubmittedAt: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      refundTx: null,
      lastNotified: null
    };

    db.push(commitment);
    writeDB(db);

    console.log(`[TRACK] ${commitment.service} (${commitment.stakeAmount} SOL)`);

    // --- SEND CALENDAR INVITE ---
    if (email) {
      console.log(`[EMAIL] Sending Calendar Invite to ${email}...`);

      const eventStart = new Date(finalDeadline);
      const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 Hour duration

      const icalContent = generateICal({
        service: finalService,
        start: eventStart,
        end: eventEnd,
        description: `Commitment: ${finalStake} SOL Staked.\nProof Verification Required by this time.\nVerify at: http://localhost:5173`,
        url: "http://localhost:5173"
      });

      await sendEmail({
        to: email,
        subject: `LOCKED: ${finalService} (Add to Calendar)`,
        text: `You have staked ${finalStake} SOL. Deadline: ${new Date(finalDeadline).toLocaleString()}. Check attached invite.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #fff; border-radius: 10px;">
            <h1 style="color: #4ade80;">Commitment Locked 🔒</h1>
            <p>You have successfully staked <strong>${finalStake} SOL</strong> on:</p>
            <h2 style="background: #1e293b; padding: 10px; border-radius: 5px;">${finalService}</h2>
            <p><strong>Deadline:</strong> ${new Date(finalDeadline).toLocaleString()}</p>
            <p>We've attached a Calendar Invite. Add it now to ensure you don't miss the deadline!</p>
            <hr style="border-color: #334155; margin: 20px 0;">
            <p style="font-size: small; color: #94a3b8;">Protocol.Commit | Solana Testnet</p>
          </div>
        `,
        icalEvent: icalContent
      });
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/proof - Submit Proof
app.post("/api/proof", (req, res) => {
  try {
    const { mintAddress, proofCid, submittedBy, recovery } = req.body;
    console.log("[PROOF] Body:", JSON.stringify(req.body, null, 2));
    const mint = normalize(mintAddress);

    if (!mint || !proofCid) return res.status(400).json({ error: "Missing data" });

    const db = readDB();
    let item = db.find(r => r.mintAddress === mint);

    // AUTO-RECOVERY for "Unsynced" NFTs
    if (!item) {
      // 1. First, check if we have a "Pending" item with the SAME Service Name (Ghost Record)
      // This handles cases where the DB has a record (maybe different mint due to retry) but matches the user's intent.
      if (recovery && recovery.service) {
        const existingGhost = db.find(r =>
          r.owner === submittedBy &&
          r.service === recovery.service &&
          r.status === "PENDING"
        );

        if (existingGhost) {
          console.log(`[RECOVERY] Merging with existing pending task: ${existingGhost.mintAddress} -> ${mint}`);
          item = existingGhost;
          item.mintAddress = mint; // Update to the REAL mint on chain
          // We don't push to DB because 'item' is a reference to the object inside 'db' array
        } else {
          // 2. No matching ghost found, create fresh
          console.log(`[RECOVERY] Restoring missing commitment: ${mint}`);
          item = {
            mintAddress: mint,
            owner: submittedBy,
            verifier: "FBuJ9xHqG4tATW5wKJAn1uRKpM4WujNtKfA25CzXNBhy", // Default
            email: "recovered@example.com", // Fallback
            metadataUri: "recovered-from-chain",
            service: recovery.service || "Recovered Goal",
            renewalDate: recovery.deadline,
            stakeAmount: normalizeStake(recovery.stake),
            status: "PENDING",
            createdAt: new Date().toISOString(),
            lastNotified: null
          };
          db.push(item);
        }
      } else {
        return res.status(404).json({ error: "Commitment not found in DB" });
      }
    }

    if (item.owner !== submittedBy) return res.status(403).json({ error: "Not owner" });

    // Correction: Allow re-submission if not yet completed/failed? Or strict? 
    // Strict: if (item.status !== "PENDING") ...
    // User flow: PENDING -> PROOF_SUBMITTED

    item.proofCid = proofCid;
    item.proofSubmittedAt = new Date().toISOString();
    item.status = "PROOF_SUBMITTED";

    writeDB(db);
    console.log(`[PROOF] Submitted for ${mint}`);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server Error" });
  }
});

function normalizeStake(val) {
  if (!val) return 0;
  const clean = String(val).replace(" SOL", "").trim();
  return parseFloat(clean) || 0;
}

// GET /api/verifier/:wallet - Get tasks for admin
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

// POST /api/approve - Refund & Complete
app.post("/api/approve", async (req, res) => {
  try {
    const { mintAddress, verifier, clientSide, txSignature } = req.body;
    const mint = normalize(mintAddress);
    const db = readDB();
    const item = db.find(r => r.mintAddress === mint);

    if (!item) return res.status(404).json({ error: "Not found" });
    if (item.verifier !== verifier) return res.status(403).json({ error: "Unauthorized" });

    let signature = txSignature;

    if (!clientSide) {
      console.log(`[APPROVE] Attempting SERVER refund for ${mint}...`);
      signature = await refundStake({
        toWallet: item.owner,
        amountSol: item.stakeAmount
      });
    } else {
      console.log(`[APPROVE] Client-side refund confirmed: ${signature}`);
    }

    item.status = "COMPLETED";
    item.resolvedAt = new Date().toISOString();
    item.refundTx = signature;

    writeDB(db);
    console.log(`[SUCCESS] Completed: ${mint}`);
    res.json({ success: true, refundTx: signature });

  } catch (e) {
    console.error(`[REFUND FAILED]`, e);
    res.status(500).json({ error: "Refund failed on chain. Check logs." });
  }
});

// POST /api/reject - Forfeit & Fail
app.post("/api/reject", (req, res) => {
  try {
    const { mintAddress, verifier } = req.body;
    const mint = normalize(mintAddress);
    const db = readDB();
    const item = db.find(r => r.mintAddress === mint);

    if (!item) return res.status(404).json({ error: "Not found" });
    if (item.verifier !== verifier) return res.status(403).json({ error: "Unauthorized" });

    // No refund (or maybe partial? User requirement said: "Stake remains with admin")
    // Note: User prompt says "Stake remains with admin".
    // Previous code had 0.01 SOL partial refund logic on frontend. 
    // Backend Implementation: Just mark FAILED. Admin keeps funds.

    item.status = "FAILED";
    item.resolvedAt = new Date().toISOString();

    writeDB(db);
    console.log(`[REJECT] Stake forfeited for ${mint}`);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server Error" });
  }
});

// Start Cron
startReminderJob(DB_FILE);

app.listen(PORT, () => {
  console.log(`🚀 Service running on port ${PORT}`);
});
