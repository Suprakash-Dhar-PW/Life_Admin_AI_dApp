export async function uploadMetadataToIPFS(metadata) {
  const res = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }

  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}
