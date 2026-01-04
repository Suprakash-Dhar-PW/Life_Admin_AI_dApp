import {
  Connection,
  clusterApiUrl,
  SystemProgram,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";

/**
 * IMPORTANT:
 * This is a TESTNET escrow wallet.
 * Funds are "locked" here for MVP.
 * Later this becomes a PDA owned by a smart contract.
 */
const ESCROW_PUBLIC_KEY = new PublicKey(
  "FBuJ9xHqG4tATW5wKJAn1uRKpM4WujNtKfA25CzXNBhy"
);

export async function createCommitment(wallet, metadataUri, stakeAmount) {
  if (!wallet?.publicKey) {
    throw new Error("Wallet not connected");
  }

  // FORCE TESTNET (As requested by user)
  const connection = new Connection(
    clusterApiUrl("testnet"),
    "confirmed"
  );

  console.log("---- CLAIM COMMITMENT ----");
  console.log("Network: testnet");
  console.log("Escrow Target:", ESCROW_PUBLIC_KEY.toBase58());

  const metaplex = Metaplex.make(connection).use(
    walletAdapterIdentity(wallet)
  );

  /* ------------------------------------------------------------------
     STEP 1: TRANSFER STAKE (SOL → ESCROW)
  ------------------------------------------------------------------ */

  const lamports = Math.floor(
    parseFloat(stakeAmount) * LAMPORTS_PER_SOL
  );

  if (lamports <= 0) {
    throw new Error("Invalid stake amount");
  }

  console.log("🔒 Locking stake:", stakeAmount, "SOL");

  const transferTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: ESCROW_PUBLIC_KEY,
      lamports,
    })
  );

  // Always fetch fresh blockhash (avoids Blockhash not found)
  const latestBlockhash = await connection.getLatestBlockhash(
    "confirmed"
  );

  transferTx.feePayer = wallet.publicKey;
  transferTx.recentBlockhash = latestBlockhash.blockhash;

  let stakeSignature;
  try {
    stakeSignature = await wallet.sendTransaction(
      transferTx,
      connection
    );

    await connection.confirmTransaction(
      {
        signature: stakeSignature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight:
          latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    console.log("✅ Stake locked:", stakeSignature);
  } catch (err) {
    console.error("❌ Stake transfer failed:", err);
    throw new Error(
      "Stake transfer failed. Transaction was not approved."
    );
  }

  /* ------------------------------------------------------------------
     STEP 2: MINT COMMITMENT NFT (PROOF)
  ------------------------------------------------------------------ */

  console.log("🪙 Minting Commitment NFT...");

  let nft, response;
  try {
    ({ nft, response } = await metaplex.nfts().create(
      {
        uri: metadataUri,
        name: "Commitment Protocol Task",
        symbol: "COMMIT",
        sellerFeeBasisPoints: 0,
        isMutable: true,
      },
      { commitment: "finalized" }
    ));
  } catch (err) {
    console.error("❌ NFT mint failed:", err);
    throw new Error("NFT minting failed");
  }
  console.log("Escrow Wallet:", ESCROW_PUBLIC_KEY.toBase58());

  console.log("✅ Commitment NFT minted:", nft.address.toBase58());

  /* ------------------------------------------------------------------
     RETURN RESULT
  ------------------------------------------------------------------ */

  return {
    mintAddress: nft.address.toBase58(),
    nftSignature: response.signature,
    stakeSignature,
    escrow: ESCROW_PUBLIC_KEY.toBase58(),
  };
}
