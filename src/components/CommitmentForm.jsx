import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Calendar, Coins, Mail, Lock, Rocket, Sparkles, ChevronRight } from "lucide-react";

export default function CommitmentForm({ onCommit, loading, status }) {
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [stake, setStake] = useState("0.1");
  const [email, setEmail] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  // Quick select presets
  const presets = ["0.1", "0.5", "1.0", "2.0"];

  const handleSubmit = () => {
    if (!goal || !deadline || !stake) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    onCommit({ goal, deadline, stake, email });
  };

  const usdValue = (parseFloat(stake || 0) * 150).toFixed(2);

  return (
    <div className="relative w-full">
      {/* Background Decor */}
      {/* Background Decor */}
      {/* Removed per user request */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isShaking ? { x: [0, -10, 10, -10, 10, 0] } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-[#0f1219]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden ring-1 ring-white/5"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              New Commitment
              <Sparkles className="text-purple-400 w-4 h-4 animate-pulse" />
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Stake SOL to lock your promise on-chain.
            </p>
          </div>
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
            <span className="text-[10px] font-bold text-purple-300 tracking-widest uppercase">Step 01</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="space-y-6">
          
          {/* Goal Input */}
          <div className="space-y-2 group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 group-focus-within:text-purple-400 transition-colors">
              <Target size={14} /> I Promise To...
            </label>
            <div className="relative">
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Wake up at 6AM, Ship the MVP, Run 5km..."
                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-base text-white placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500/50 focus:border-transparent outline-none transition-all resize-none h-28 hover:bg-slate-900/80"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Deadline */}
            <div className="space-y-2 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 group-focus-within:text-blue-400 transition-colors">
                <Calendar size={14} /> Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all [color-scheme:dark] hover:bg-slate-900/80"
              />
            </div>

            {/* Stake */}
            <div className="space-y-2 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 group-focus-within:text-green-400 transition-colors">
                <Coins size={14} /> Stake (SOL)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-bold text-xs">SOL</span>
                <input
                  type="number"
                  step="0.05"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white font-mono font-bold focus:ring-2 focus:ring-green-500/50 focus:border-transparent outline-none transition-all hover:bg-slate-900/80"
                />
              </div>
            </div>
          </div>

          {/* Quick Select Chips */}
          <div className="flex gap-2">
             {presets.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setStake(amt)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    stake === amt 
                    ? "bg-green-500/10 border-green-500/50 text-green-400" 
                    : "bg-slate-800/30 border-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                  }`}
                >
                  {amt} SOL
                </button>
             ))}
          </div>

          {/* Email */}
          <div className="space-y-2 group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 group-focus-within:text-pink-400 transition-colors">
                <Mail size={14} /> Email Proof (Optional)
              </label>
            <input
              type="email"
              placeholder="receipts@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-pink-500/50 focus:border-transparent outline-none transition-all hover:bg-slate-900/80"
            />
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-r from-green-500/5 to-transparent border border-green-500/10 rounded-xl p-4 flex items-center justify-between group hover:border-green-500/20 transition-colors">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-green-500/10 rounded-lg text-green-400 group-hover:scale-110 transition-transform">
                 <Lock size={18} />
               </div>
               <div>
                 <p className="text-[10px] text-green-400/80 font-bold uppercase tracking-wider">Total Value Locked</p>
                 <p className="text-white font-bold">{stake || 0} SOL <span className="text-slate-500 font-normal text-sm">(~${usdValue})</span></p>
               </div>
            </div>
          </div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSubmit}
            disabled={loading}
            className="group relative w-full py-4 rounded-xl font-bold text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 transition-all group-hover:scale-105"></div>
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-shine"></div>
            
            <div className="relative flex items-center justify-center gap-2">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Rocket size={18} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                    <span>Lock Funds & Commit</span>
                    <ChevronRight size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.button>

        </div>
      </motion.div>
    </div>
  );
}