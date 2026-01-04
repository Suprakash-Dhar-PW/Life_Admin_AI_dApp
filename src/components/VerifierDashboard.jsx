import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, RefreshCw, ExternalLink, Check, X, FileText, User, Calendar, DollarSign } from "lucide-react";

export default function VerifierDashboard({ walletAddress }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/verifier/${walletAddress}`);
      const data = await res.json();
      setTasks(data || []);
    } catch (e) {
      console.error("Failed to load verifier tasks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      loadTasks();
    }
  }, [walletAddress]);

  /* 
   * APPROVED (REFUND) LOGIC - CLIENT SIDE
   */
  const handleApprove = async (task) => {
    if (!confirm(`Approve this proof? This will refund ${task.stakeAmount} SOL to the user.`)) return;
    
    if (!wallet.connected || !wallet.publicKey) {
      alert("Please connect the Admin Wallet (FBuJ...) first.");
      return;
    }

    setProcessing(task.mintAddress);

    try {
      console.log(`Sending ${task.stakeAmount} SOL to ${task.owner}`);

      // 1. Create Refund Transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(task.owner),
          lamports: Math.floor(task.stakeAmount * LAMPORTS_PER_SOL),
        })
      );

      const signature = await wallet.sendTransaction(transaction, connection);
      console.log("Refund Sent:", signature);
      
      await connection.confirmTransaction(signature, "confirmed");

      // 2. Notify Backend to Update Database Status
      const res = await fetch("http://localhost:3001/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress: task.mintAddress,
          verifier: walletAddress,
          txSignature: signature, // Inform backend we did it
          clientSide: true        // Flag to skip backend refund logic
        })
      });
      
      if (!res.ok) throw new Error("Backend update failed");

      alert(`✅ Proof Approved! Refunded: ${signature.slice(0,8)}...`);
      loadTasks();

    } catch (err) {
      console.error(err);
      alert("Approval Failed: " + (err.message || err));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (task) => {
    if (!confirm("Reject Proof? The stake will be forfeited (kept by admin).")) return;
    setProcessing(task.mintAddress);

    try {
      const res = await fetch("http://localhost:3001/api/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress: task.mintAddress,
          verifier: walletAddress
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed");

      alert("Proof Rejected. Stake Forfeited.");
      loadTasks();
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  /* 
   * PROOF VIEWING LOGIC
   */
  const [viewingProof, setViewingProof] = useState(null);
  const [fetchingProof, setFetchingProof] = useState(null);

  const fetchAndShowProof = async (cid) => {
    try {
      setFetchingProof(cid);
      const url = cid.replace("ipfs://", "https://ipfs.io/ipfs/");
      const res = await fetch(url);
      const data = await res.json();
      setViewingProof({ ...data, cid });
    } catch (e) {
      console.error("Failed to fetch proof", e);
      alert("Failed to load proof metadata. It might still be propagating.");
    } finally {
      setFetchingProof(null);
    }
  };

  return (
    <>
      <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-8 shadow-2xl shadow-emerald-500/10 relative">
        <div className="flex justify-between items-center mb-8 border-b border-emerald-500/20 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <ShieldCheck size={32} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Verifier Dashboard</h2>
              <p className="text-emerald-400/70 text-sm">Review Proofs & Release Funds</p>
            </div>
          </div>
          
          <button 
            onClick={loadTasks} 
            disabled={loading} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-medium text-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
            <RefreshCw size={48} className="animate-spin text-emerald-500" />
            <p>Scanning blockchain...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4 text-center">
            <ShieldCheck size={48} className="text-slate-600" />
            <p>All clear. No proofs pending verification.</p>
          </div>
        ) : (
          <motion.div layout className="grid gap-6">
            <AnimatePresence>
              {tasks.map((task) => {
                const isExpired = new Date(task.renewalDate) < new Date();
                const isPending = task.status === "PENDING";
                const canBurn = isPending && isExpired;

                return (
                <motion.div 
                  key={task.mintAddress}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`border rounded-2xl p-6 relative overflow-hidden group transition-colors ${
                     canBurn ? "bg-red-900/10 border-red-500/50 hover:border-red-500" : 
                     isPending ? "bg-slate-900/50 border-slate-700 hover:border-slate-600" :
                     "bg-emerald-900/10 border-emerald-500/30 hover:border-emerald-500/50"
                  }`}
                >
                  {/* Decoration */}
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none ${canBurn ? 'bg-red-500/10' : 'bg-emerald-500/5'}`} />

                  <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                    {/* Task Info */}
                    <div className="flex-1 space-y-4">
                       <div className="flex items-center justify-between md:justify-start gap-4">
                         <h3 className="text-xl font-bold text-white flex items-center gap-2">
                           {task.service}
                           {canBurn && <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded border border-red-500/30 uppercase">Expired</span>}
                           {isPending && !isExpired && <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded uppercase">Active</span>}
                         </h3>
                         <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20 flex items-center gap-1">
                           <DollarSign size={12} /> {task.stakeAmount} SOL
                         </span>
                       </div>

                       <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-slate-500" />
                            <span className="font-mono text-slate-300">
                              {task.owner?.slice(0,6)}...{task.owner?.slice(-4)}
                            </span>
                          </div>
                          <div className={`flex items-center gap-2 ${isExpired ? "text-red-400 font-bold" : ""}`}>
                            <Calendar size={14} className={isExpired ? "text-red-500" : "text-slate-500"} />
                            <span>
                              {new Date(task.renewalDate).toLocaleString()}
                            </span>
                          </div>
                       </div>

                       {task.proofCid ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => fetchAndShowProof(task.proofCid)}
                              disabled={fetchingProof === task.proofCid}
                              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20"
                            >
                              {fetchingProof === task.proofCid ? <RefreshCw className="animate-spin" size={16} /> : <FileText size={16} />}
                              View Proof Metadata
                            </button>
                          </div>
                       ) : (
                         <span className="text-slate-500 text-sm italic">
                           {isExpired ? "No proof submitted before deadline." : "Waiting for user submission..."}
                         </span>
                       )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row md:flex-col gap-3 justify-center min-w-[140px]">
                      {isPending ? (
                        canBurn ? (
                          <button 
                            disabled={processing === task.mintAddress}
                            onClick={() => handleReject(task)}
                            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 animate-pulse"
                          >
                             <X size={18} /> Burn Stake
                          </button>
                        ) : (
                          <div className="text-center p-3 bg-slate-800 rounded-xl border border-slate-700 text-slate-400 text-xs font-medium">
                            Actions Locked<br/>Until Proof
                          </div>
                        )
                      ) : (
                        <>
                          <button 
                            disabled={processing === task.mintAddress}
                            onClick={() => handleApprove(task)}
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                          >
                            {processing === task.mintAddress ? (
                               <RefreshCw className="animate-spin" size={18} />
                            ) : (
                               <>
                                 <Check size={18} /> Approve
                               </>
                            )}
                          </button>
                          
                          <button 
                            disabled={processing === task.mintAddress}
                            onClick={() => handleReject(task)}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-2 px-4 rounded-xl font-semibold transition-all hover:border-red-500/40 disabled:opacity-50"
                          >
                            <X size={18} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )})}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* PROOF MODAL */}
      <AnimatePresence>
        {viewingProof && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="text-purple-400" size={20} /> Proof Details
                </h3>
                <button 
                  onClick={() => setViewingProof(null)}
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Proof Description</label>
                  <p className="text-slate-200 mt-1 text-lg">{viewingProof.description || "No description provided."}</p>
                </div>

                {viewingProof.image && (
                   <div className="rounded-xl overflow-hidden border border-slate-700 mt-4">
                     <img 
                       src={viewingProof.image.replace("ipfs://", "https://ipfs.io/ipfs/")} 
                       alt="Proof Evidence" 
                       className="w-full h-auto object-cover"
                     />
                   </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted</label>
                    <p className="text-slate-300 font-mono text-sm mt-1">
                      {viewingProof.timestamp ? new Date(viewingProof.timestamp).toLocaleString() : "Unknown Date"}
                    </p>
                  </div>
                   <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">IPFS CID</label>
                    <a 
                      href={viewingProof.cid.replace("ipfs://", "https://ipfs.io/ipfs/")}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 font-mono text-sm mt-1 block truncate hover:underline"
                    >
                      {viewingProof.cid.replace("ipfs://", "").slice(0, 15)}...
                    </a>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex justify-end">
                <button 
                  onClick={() => setViewingProof(null)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
