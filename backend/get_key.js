import { Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const check = () => {
  const keypairPath = path.resolve(process.cwd(), "escrow.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(secret));

  console.log("ACTUAL_KEY:" + keypair.publicKey.toBase58());
};

check();
