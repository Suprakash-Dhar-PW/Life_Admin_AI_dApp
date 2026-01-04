import { Connection, Keypair, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const airdrop = async () => {
  const connection = new Connection(clusterApiUrl("testnet"), "confirmed");
  const keypairPath = path.resolve(process.cwd(), "escrow.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secret));

  console.log("Requesting Airdrop for:", keypair.publicKey.toBase58());
  try {
    const signature = await connection.requestAirdrop(keypair.publicKey, 1 * LAMPORTS_PER_SOL); // 1 SOL
    await connection.confirmTransaction(signature);
    console.log("✅ Airdrop Successful! Tx:", signature);
  } catch (e) {
    console.error("❌ Airdrop Failed:", e.message);
  }
};

airdrop();
