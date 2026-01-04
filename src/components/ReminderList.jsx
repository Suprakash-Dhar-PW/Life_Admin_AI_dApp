import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Clock, Wallet, CheckCircle, AlertTriangle, Shield, ExternalLink, Filter, CalendarDays } from "lucide-react";
import SubmitProof from "./SubmitProof";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const StatusBadge = ({ status }) => {
  const displayStatus = status === "ON_CHAIN_ONLY" ? "PENDING" : status;
  const configs = {
    PENDING: { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", label: "Pending" },
    PROOF_SUBMITTED: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "In Review" },
    COMPLETED: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", label: "Completed" },
    FAILED: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Failed" },
  };
  const config = configs[displayStatus] || configs.PENDING;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${config.bg} ${config.color} ${config.border}`}>
      {config.label}
    </span>
  );
};

export default function ReminderList({ reminders, loading, onRefresh }) {
  const [activeTab, setActiveTab] = useState("ALL");

  const tabs = [
    { id: "ALL", label: "All" },
    { id: "PENDING", label: "Pending" },
    { id: "PROOF_SUBMITTED", label: "Review" },
    { id: "COMPLETED", label: "Completed" },
    { id: "FAILED", label: "Burned" },
  ];

  // Logic: 
  // 1. Filter based on Tab
  // 2. If Tab is "ALL", apply "active-first, closest-deadline" sort
  const filteredReminders = reminders.filter(r => {
    if (activeTab === "ALL") return true;
    if (activeTab === "PENDING") return r.status === "PENDING" || r.status === "ON_CHAIN_ONLY";
    return r.status === activeTab;
  }).sort((a, b) => {
    // Helper to determine if item is "Active" (Pending/Review)
    const isActive = (s) => s === "PENDING" || s === "ON_CHAIN_ONLY" || s === "PROOF_SUBMITTED";
    
    const aActive = isActive(a.status);
    const bActive = isActive(b.status);

    // 1. Active items go to TOP
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;

    // 2. If both Active: Sort by Deadline ASC (Closest/Soonest first)
    if (aActive && bActive) {
      return new Date(a.deadline) - new Date(b.deadline);
    }

    // 3. If both Inactive: Sort by Deadline DESC (Most recent history first)
    return new Date(b.deadline) - new Date(a.deadline);
  });

  const getTabCount = (tabId) => {
    if (tabId === "ALL") return reminders.length;
    if (tabId === "PENDING") return reminders.filter(r => r.status === "PENDING" || r.status === "ON_CHAIN_ONLY").length;
    return reminders.filter(r => r.status === tabId).length;
  };

  if (loading && reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <RefreshCw className="animate-spin mb-3" size={32} />
        <p className="text-sm font-medium">Syncing blockchain data...</p>
      </div>
    );
  }

  if (!loading && reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
           <Shield className="text-slate-600" size={32} />
        </div>
        <p className="text-slate-400 font-medium">No commitments found.</p>
        <p className="text-xs text-slate-500 mt-1">Create your first goal to start staking.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CalendarDays className="text-emerald-400" size={18} /> 
          Commitments
        </h3>
        <button 
          onClick={onRefresh}
          className="group flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" /> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <AnimatePresence initial={false}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-2 rounded-xl text-xs font-bold transition-all outline-none"
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-slate-700 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className={`relative z-10 ${activeTab === tab.id ? "text-white" : "text-slate-500 hover:text-slate-300"}`}>
                {tab.label} <span className="opacity-50 ml-0.5 text-[10px] align-top">
                  {getTabCount(tab.id)}
                </span>
              </span>
            </button>
          ))}
        </AnimatePresence>
      </div>

      {/* Animated Grid */}
      <motion.div 
        layout 
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredReminders.length > 0 ? (
            filteredReminders.map((r) => (
              <motion.div 
                layout
                key={r.mint} 
                variants={itemVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="group relative bg-[#13161f] border border-slate-800 hover:border-slate-600 rounded-2xl p-5 transition-colors shadow-lg hover:shadow-xl"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                   <div className="max-w-[70%]">
                      <h4 className="font-semibold text-white leading-tight mb-1 truncate">{r.service}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                         <span className="flex items-center gap-1">
                           <Clock size={12} />
                           {r.deadline ? new Date(r.deadline).toLocaleDateString() : "N/A"}
                         </span>
                         <a 
                           href={`https://solscan.io/token/${r.mint}?cluster=testnet`} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="flex items-center gap-1 text-purple-400 hover:text-purple-300 hover:underline transition-colors"
                         >
                           <ExternalLink size={10} /> Explorer
                         </a>
                      </div>
                   </div>
                   <StatusBadge status={r.status} />
                </div>

                {/* Stake Info */}
                <div className="flex items-center gap-3 mb-6 p-3 bg-black/30 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                   <div className="p-2 bg-emerald-500/10 rounded-lg">
                     <Wallet className="text-emerald-400" size={18} />
                   </div>
                   <div>
                     <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Staked Value</p>
                     <p className="text-sm font-mono font-bold text-white tracking-wide">{r.stake} SOL</p>
                   </div>
                </div>

                {/* Action Area */}
                <div className="mt-auto">
                  {r.status === "COMPLETED" ? (
                    <div className="flex items-center gap-2 text-green-400 text-sm font-bold bg-green-500/5 p-2 rounded-lg justify-center">
                      <CheckCircle size={16} /> Funds Released
                    </div>
                  ) : r.status === "FAILED" ? (
                    <div className="flex items-center gap-2 text-red-400 text-sm font-bold bg-red-500/5 p-2 rounded-lg justify-center">
                      <AlertTriangle size={16} /> Stake Burned
                    </div>
                  ) : (
                    <div className="pt-2">
                       <SubmitProof
                         mintAddress={r.mint}
                         commitment={r}
                         onSubmitted={onRefresh}
                       />
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="col-span-1 md:col-span-2 text-center py-16 text-slate-500 border border-dashed border-slate-800/50 rounded-2xl bg-black/20"
            >
              <Filter className="mx-auto mb-3 opacity-30" size={32} />
              <p className="text-sm font-medium">No commitments found in this category.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}