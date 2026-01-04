import { Connection, Keypair, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const checkWallet = async () => {
  try {
    const keypairPath = path.resolve(process.cwd(), "escrow.json");
    if (!fs.existsSync(keypairPath)) {
      console.log("❌ escrow.json not found in root");
      return;
    }

    const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    const keypair = Keypair.fromSecretKey(new Uint8Array(secret));
    const pubkey = keypair.publicKey.toBase58();

    console.log("🔑 Loaded Keypair Public Key:", pubkey);
    console.log("🎯 Expected Admin Address:   FBuJ9xHqG4tATW5wKJAn1uRKpM4WujNtKfA25CzXNBhy");

    if (pubkey !== "FBuJ9xHqG4tATW5wKJAn1uRKpM4WujNtKfA25CzXNBhy") {
      console.error("❌ KEY MISMATCH! The file escrow.json does not match the Admin Wallet in the code.");
    } else {
      console.log("✅ Key matches Admin Wallet.");
    }

    const connection = new Connection(clusterApiUrl("testnet"), "confirmed");
    const balance = await connection.getBalance(keypair.publicKey);

    console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    if (balance < 0.11 * LAMPORTS_PER_SOL) {
      console.warn("⚠️ LOW BALANCE! Refund requires stake + fees. Please fund this wallet.");
    } else {
      console.log("✅ Sufficient funds for refund (assuming single refund).");
    }

  } catch (e) {
    console.error("Generic Error:", e);
  }
};

checkWallet();
