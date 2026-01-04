import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Canvas } from "@react-three/fiber";
import { MeshDistortMaterial, Float, Stars } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Wallet, CheckCircle2 } from "lucide-react";

// Logic Imports (Ensure these files exist in your project)
import { uploadMetadataToIPFS } from "./ipfs/uploadMetadata";
import { createCommitment } from "./solana/createCommitment";
import { fetchMyReminderNFTs } from "./solana/fetchMyNFTs";

// Component Imports
import Header from "./components/Header";
import CommitmentForm from "./components/CommitmentForm";
import ReminderList from "./components/ReminderList";
import VerifierDashboard from "./components/VerifierDashboard";

// --- 3D Background Component ---
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#9945FF" />
        
        {/* Floating Abstract Shape */}
        <Float speed={1.5} rotationIntensity={1} floatIntensity={1}>
          <mesh position={[2, 0, -2]} scale={1.5}>
            <torusKnotGeometry args={[1, 0.35, 128, 16]} />
            <MeshDistortMaterial
              color="#4c1d95" 
              distort={0.3}
              speed={2}
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>
        </Float>
        
        <Stars radius={100} depth={50} count={3000} factor={4} fade speed={1} />
      </Canvas>
      {/* Dark Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-[#02040a]/80" /> 
    </div>
  );
};

// --- Main App Component ---
function App() {
  const walletContext = useWallet();
  const { publicKey, connected } = walletContext;

  // 🔐 VERIFIER / ESCROW WALLET ADDRESS
  const VERIFIER_WALLET = "FBuJ9xHqG4tATW5wKJAn1uRKpM4WujNtKfA25CzXNBhy";

  // UI State
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Data State
  const [commitments, setCommitments] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  // --- 1. Handle Create Commitment ---
  const handleCommit = async (formData) => {
    const { goal, deadline, stake, email } = formData;
    if (!publicKey) return;

    try {
      setLoading(true);
      setStatus("Uploading agreement to IPFS...");

      // 1. Upload Metadata
      const metadata = {
        type: "commitment_v1",
        goal,
        deadline,
        stake,
        owner: publicKey.toBase58(),
        verifier: VERIFIER_WALLET,
        status: "PENDING",
      };

      const ipfsUri = await uploadMetadataToIPFS(metadata);

      // 2. Mint NFT on Solana
      setStatus(`Staking ${stake} SOL & Minting Contract...`);

      const { mintAddress } = await createCommitment(
        walletContext,
        ipfsUri,
        stake
      );

      // 3. Register with Backend
      setStatus("Registering commitment...");
      await fetch("http://localhost:3001/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress,
          owner: publicKey.toBase58(),
          email,
          metadataUri: ipfsUri,
          service: goal,
          renewalDate: deadline,
          verifier: VERIFIER_WALLET,
          status: "PENDING",
          stakeAmount: stake 
        }),
      });

      setStatus("✅ Commitment locked on-chain");
      
      // Delay slightly to let indexing catch up
      setTimeout(() => {
        setStatus("");
        setFormResetKey(prev => prev + 1);
        loadMyCommitments();
      }, 2000);

    } catch (err) {
      console.error(err);
      setStatus("❌ " + err.message);
      setTimeout(() => setStatus(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Load Data (Hybrid: DB + Chain) ---
  const loadMyCommitments = async () => {
    if (!publicKey) return;
    setLoadingData(true);

    try {
      // A. Fetch DB Status (Local Source of Truth)
      let dbCommitments = [];
      try {
        const res = await fetch("http://localhost:3001/api/commitments");
        if (res.ok) dbCommitments = await res.json();
      } catch (e) {
        console.warn("Backend offline?", e);
      }

      // B. Fetch User's NFTs (Blockchain Truth)
      const nfts = await fetchMyReminderNFTs(publicKey.toBase58());
      const onChainMints = new Set(nfts.map(n => n.address.toBase58()));

      // C. Hydrate On-Chain Items
      const enriched = await Promise.all(
        nfts.map(async (nft) => {
          const mint = nft.address.toBase58();
          const dbItem = dbCommitments.find(d => d.mintAddress === mint);

          // Case 1: We have DB record
          if (dbItem) {
            let derivedStatus = dbItem.status;
            
            // Auto-Fail if Expired and still Pending
            // This reflects the "Burned" state to the user immediately upon expiry
            if (derivedStatus === "PENDING" && new Date(dbItem.renewalDate) < new Date()) {
               derivedStatus = "FAILED";
            }

            return {
              mint,
              service: dbItem.service,
              deadline: dbItem.renewalDate,
              stake: dbItem.stakeAmount,
              status: derivedStatus,
              proofCid: dbItem.proofCid,
              isTracked: true
            };
          }

          // Case 2: Fallback to IPFS
          try {
            // Use generic gateway to avoid rate limits
            const uri = nft.uri.replace("ipfs://", "https://ipfs.io/ipfs/");
            const metaRes = await fetch(uri);
            const meta = await metaRes.json();
            
            const deadline = meta.deadline || meta.renewalDate;
            let status = "ON_CHAIN_ONLY";

            // Check expiry for on-chain items too
            if (deadline && new Date(deadline) < new Date()) {
              status = "FAILED";
            }

            return {
              mint,
              service: meta.goal || meta.service || "Unknown Goal",
              deadline: deadline,
              stake: meta.stake || meta.stakeAmount,
              status: status,
              isTracked: false,
              proofCid: null
            };
          } catch (err) {
            console.error("Failed to hydrate NFT", mint, err);
            return {
              mint,
              service: "Corrupted Data",
              status: "ERROR",
              isTracked: false
            };
          }
        })
      );

      // D. Find DB-Only Items (Recently minted / Indexer lag)
      // These exist in our DB but Metaplex hasn't found them on-chain yet.
      // We trust the DB for these.
      const dbOnlyItems = dbCommitments.filter(d => 
        d.owner === publicKey.toBase58() &&  // Belongs to current user
        !onChainMints.has(d.mintAddress)     // Not found in on-chain list
      ).map(d => {
         let status = d.status;
         if (status === "PENDING" && new Date(d.renewalDate) < new Date()) {
            status = "FAILED";
         }
         return {
            mint: d.mintAddress,
            service: d.service,
            deadline: d.renewalDate,
            stake: d.stakeAmount,
            status: status, 
            proofCid: d.proofCid,
            isTracked: true,
            isDbOnly: true
         };
      });

      // E. Merge & Set
      const mergedList = [
        ...enriched.filter(c => c && c.service !== "Corrupted Data"),
        ...dbOnlyItems
      ];

      // F. Deduplicate by Service Name for PENDING/UNSYNCED items
      // If we have a DB-tracked item and an "ON_CHAIN_ONLY" item with the same name,
      // assume the ON_CHAIN_ONLY one is a ghost/duplicate and hide it.
      const uniqueCommitments = mergedList.filter((item, index, self) => {
        if (item.status === "ON_CHAIN_ONLY" || item.status === "PENDING") {
           // Check if there's a "better" version of this task (e.g., tracked in DB)
           const betterVersionExists = self.some(other => 
             other.mint !== item.mint && 
             other.service === item.service && 
             other.isTracked // Prefer the DB-tracked one
           );
           if (betterVersionExists && !item.isTracked) return false;
        }
        return true;
      });

      // Sort: Completed/Failed at bottom, pending at top, then by Deadline
      uniqueCommitments.sort((a, b) => {
         if (a.status === "PENDING" && b.status !== "PENDING") return -1;
         if (a.status !== "PENDING" && b.status === "PENDING") return 1;
         return new Date(b.deadline) - new Date(a.deadline);
      });

      setCommitments(uniqueCommitments);
    } catch (e) {
      console.error("Load Error:", e);
    } finally {
      setLoadingData(false);
    }
  };

  // Load data on connect
  useEffect(() => {
    if (connected) loadMyCommitments();
    else setCommitments([]);
  }, [connected]);

  // --- Render ---
  return (
    <>
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen text-slate-200">
        <Header />

        <div className="max-w-7xl mx-auto px-6 pb-20">
          
          {/* Floating Status Notification */}
          <AnimatePresence>
            {status && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-10 right-10 z-50 bg-[#0f172a] border border-slate-700/50 text-slate-200 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 shadow-purple-500/10"
              >
                {loading ? (
                  <Loader2 className="animate-spin text-purple-400" size={20} />
                ) : (
                  <CheckCircle2 className="text-green-400" size={20} />
                )}
                <span className="font-medium text-sm tracking-wide">{status}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!connected ? (
            /* --- DISCONNECTED HERO STATE --- */
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="p-10 bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 shadow-2xl"
              >
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-500/30 blur-3xl rounded-full" />
                    <Wallet size={64} className="text-white relative z-10" />
                </div>
              </motion.div>
              
              <div className="space-y-4 max-w-lg">
                <h1 className="text-5xl font-bold text-white tracking-tight">
                  Connect to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Begin</span>
                </h1>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Turn your goals into on-chain commitments. Stake assets, verify progress, and build your decentralized reputation.
                </p>
              </div>
            </div>
          ) : (
            /* --- CONNECTED STATE --- */
            <>
              {publicKey && publicKey.toBase58() === VERIFIER_WALLET ? (
                 /* VERIFIER DASHBOARD VIEW */
                 <motion.div 
                   initial={{ opacity: 0 }} 
                   animate={{ opacity: 1 }}
                   className="max-w-5xl mx-auto"
                 >
                   <VerifierDashboard walletAddress={publicKey.toBase58()} />
                 </motion.div>
              ) : (
                  /* STANDARD USER VIEW */
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
                  >
                    {/* Left Column: Form (Sticky with internal scroll) */}
                    <div className="lg:col-span-5 lg:sticky lg:top-32 max-h-[calc(100vh-120px)] overflow-y-auto pr-1 no-scrollbar">
                      <CommitmentForm
                        key={formResetKey}
                        onCommit={handleCommit}
                        loading={loading}
                        status={status}
                      />
                    </div>

                    {/* Right Column: Commitment List */}
                    <div className="lg:col-span-7 w-full">
                      <ReminderList
                        reminders={commitments}
                        loading={loadingData}
                        onRefresh={loadMyCommitments}
                      />
                    </div>
                  </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default App;