import {
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { walletAdapterIdentity } from "@metaplex-foundation/js";

export async function mintReminderNFT(wallet, metadataUri) {
  const connection = new Connection(
    clusterApiUrl("testnet"),
    "confirmed"
  );

  const metaplex = Metaplex.make(connection)
    .use(walletAdapterIdentity(wallet));

  // 👇 ALWAYS get a fresh blockhash
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const { nft, response } = await metaplex.nfts().create({
    uri: metadataUri,
    name: "Life Admin Reminder",
    sellerFeeBasisPoints: 0,
  }, { commitment: "finalized" });

  console.log("Mint Signature:", response.signature);

  return nft.address.toBase58();
}
