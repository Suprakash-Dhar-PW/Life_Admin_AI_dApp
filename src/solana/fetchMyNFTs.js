import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";

export async function fetchMyReminderNFTs(walletAddress) {
  const connection = new Connection(clusterApiUrl("testnet"));
  const metaplex = Metaplex.make(connection);

  const owner = new PublicKey(walletAddress);

  const nfts = await metaplex.nfts().findAllByOwner({ owner });

  // 🔴 REQUIRED DEBUG LOG
  console.log("Fetched NFTs (raw):", nfts);

  // ✅ Map into the exact shape your UI expects
  const reminders = nfts
    .filter(nft => nft.uri) // keep only NFTs with metadata
    .map(nft => ({
      address: nft.address,
      uri: nft.uri,
    }));

  // 🔴 REQUIRED DEBUG LOG
  console.log("Fetched Reminder NFTs (mapped):", reminders);

  return reminders;
}
