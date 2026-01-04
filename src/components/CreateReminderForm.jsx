import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Calendar, DollarSign, Mail, Plus, Sparkles } from "lucide-react";

export default function CreateReminderForm({ onMint, loading, status }) {
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = () => {
    if (!service || !date || !amount || !email) {
      // Trigger shake animation on error
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    onMint({ service, date, amount, email });
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Background Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 animate-pulse"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={isShaking ? { x: [0, -10, 10, -10, 10, 0] } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
            <Layers size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">New Obligation</h3>
            <p className="text-sm text-gray-400">Mint a verified reminder</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Service Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
              Service Name
            </label>
            <div className="relative group">
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Netflix, Spotify, Rent..."
                value={service}
                onChange={(e) => setService(e.target.value)}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                Renewal Date
              </label>
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={loading}
                  // [color-scheme:dark] forces the calendar picker to be dark mode
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-2 text-white/90 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                Cost
              </label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-400 transition-colors" size={18} />
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
              Notification Email
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={loading}
            className="group relative w-full mt-4 py-4 rounded-xl font-bold text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-transform group-hover:scale-105"></div>
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-shine"></div>
            
            <div className="relative flex items-center justify-center gap-2">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-sm">{status || "Minting NFT..."}</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Plus size={20} />
                    <span>Mint Reminder NFT</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.button>

        </div>
      </motion.div>
    </div>
  );
}