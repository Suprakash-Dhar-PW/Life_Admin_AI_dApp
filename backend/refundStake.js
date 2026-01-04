import {
  Connection,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  PublicKey,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import fs from "fs";
import path from "path";

export const refundStake = async ({ toWallet, amountSol }) => {
  console.log(`Init Refund: ${amountSol} SOL -> ${toWallet}`);

  // 1. Connect to Cluster
  const connection = new Connection(clusterApiUrl("testnet"), "confirmed");

  // 2. Load Escrow Keypair (Sender)
  // 2. Load Escrow Keypair (Sender)
  console.log("Loading Escrow Keypair...");

  // Try Root first, then Env
  let keypairPath = path.resolve(process.cwd(), "escrow.json");
  if (!fs.existsSync(keypairPath) && process.env.ESCROW_KEYPAIR_PATH) {
    keypairPath = path.resolve(process.env.ESCROW_KEYPAIR_PATH);
  }

  if (!fs.existsSync(keypairPath)) {
    console.error("FAILED to find keypair at:", keypairPath);
    throw new Error(`Keypair file not found at ${keypairPath}`);
  }

  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const escrowKeypair = Keypair.fromSecretKey(new Uint8Array(secret));

  console.log("Escrow Loaded:", escrowKeypair.publicKey.toBase58());

  // 3. Create Transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: escrowKeypair.publicKey,
      toPubkey: new PublicKey(toWallet),
      lamports: Math.floor(amountSol * LAMPORTS_PER_SOL),
    })
  );

  // 4. Send & Confirm
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [escrowKeypair]
  );

  console.log("Refund Confirmed:", signature);
  return signature;
};
