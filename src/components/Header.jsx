import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { BrainCircuit, Sparkles } from "lucide-react";

export default function Header() {
  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 px-6 py-4 mb-8"
    >
      <div className="absolute inset-0 bg-[#02040a]/80 backdrop-blur-xl border-b border-white/5 shadow-lg" />
      
      <div className="relative max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative group p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20 transition-transform group-hover:scale-105">
            <BrainCircuit className="text-white w-6 h-6" />
            <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Life Admin AI
            </h1>
            <span className="text-[10px] font-bold text-purple-400/80 tracking-widest uppercase flex items-center gap-1">
               Protocol v1 <Sparkles size={8} />
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            Testnet Live
          </div>
          
          <div className="transform hover:scale-105 transition-transform duration-200">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </motion.header>
  );
}