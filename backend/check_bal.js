import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";

const checkBalance = async () => {
  const connection = new Connection(clusterApiUrl("testnet"), "confirmed");
  const pubkey = new PublicKey("DrnJgUHGBNey4vRkefTQXvCbVLYTuGwz3955yzSoWnNS");
  const balance = await connection.getBalance(pubkey);
  console.log(`BALANCE:${balance / LAMPORTS_PER_SOL}`);
};

checkBalance();
