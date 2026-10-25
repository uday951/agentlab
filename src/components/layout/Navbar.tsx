import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-ivory/95 backdrop-blur-md border-b border-copper/20 py-4 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-display font-bold text-xl text-burgundy tracking-tight">
            AgentLab
          </Link>
          <span className="text-[9px] font-mono bg-copper/20 text-copper px-2 py-0.5 rounded tracking-wider hidden sm:inline">
            SIMULATION PLATFORM
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-6 font-sans text-sm text-burgundy">
          <a href="#product" className="hover:text-copper transition-colors">Product</a>
          <a href="#how-it-works" className="hover:text-copper transition-colors">How It Works</a>
          <a href="#live-simulation" className="hover:text-copper transition-colors">Experiments</a>
          <a href="#architecture" className="hover:text-copper transition-colors">Documentation</a>
        </div>

        {/* Action Button & Mobile Hamburger */}
        <div className="flex items-center space-x-3">
          <Link
            to="/app"
            className="cursor-pointer bg-burgundy text-ivory px-4 py-2 text-xs sm:text-sm font-sans font-medium hover:bg-burgundy-light transition-colors rounded shadow-sm"
          >
            Open Lab
          </Link>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden text-burgundy p-1.5 hover:text-copper transition-colors cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-copper/15 mt-3 pt-3 pb-2 space-y-2 font-sans text-sm"
          >
            <a
              href="#product"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1.5 text-burgundy hover:text-copper transition-colors"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1.5 text-burgundy hover:text-copper transition-colors"
            >
              How It Works
            </a>
            <a
              href="#live-simulation"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1.5 text-burgundy hover:text-copper transition-colors"
            >
              Experiments
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1.5 text-burgundy hover:text-copper transition-colors"
            >
              Documentation
            </a>
            <div className="pt-2 border-t border-copper/10">
              <Link
                to="/app"
                onClick={() => setMobileNavOpen(false)}
                className="block text-center bg-burgundy text-ivory py-2 font-medium rounded"
              >
                Enter AgentLab
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
