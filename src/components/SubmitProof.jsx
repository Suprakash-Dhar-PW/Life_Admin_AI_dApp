import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { uploadMetadataToIPFS } from "../ipfs/uploadMetadata";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";

export default function SubmitProof({ mintAddress, commitment, onSubmitted }) {
  const { publicKey } = useWallet();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const submitProof = async () => {
    if (!publicKey) return alert("Connect wallet");
    if (!text) return alert("Add proof description");

    setLoading(true);
    try {
      // Upload proof metadata to IPFS
      const proofMetadata = {
        type: "commitment_proof",
        mintAddress,
        description: text,
        submittedAt: new Date().toISOString(),
      };

      const proofCid = await uploadMetadataToIPFS(proofMetadata);

      // Notify backend (Include recovery data for Unsynced items)
      const res = await fetch("http://localhost:3001/api/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress,
          proofCid,
          submittedBy: publicKey.toBase58(),
          // Recovery Data if DB is missing this item
          recovery: {
            service: commitment?.service,
            stake: commitment?.stake,
            deadline: commitment?.deadline
          }
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Proof submission failed");
      }

      alert("Proof submitted successfully!");
      setText("");
      onSubmitted?.();
    } catch (e) {
      console.error(e);
      alert("Submission Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 space-y-3">
      <motion.textarea
        whileFocus={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)", borderColor: "#3b82f6" }}
        placeholder="Paste proof link or describe completion..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-all resize-none"
      />
      
      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={submitProof} 
        disabled={loading} 
        className="w-full py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={16} /> Submitting...
          </>
        ) : (
          <>
            <Send size={16} /> Submit Proof
          </>
        )}
      </motion.button>
    </div>
  );
}
