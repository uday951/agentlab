import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-ivory/95 backdrop-blur-md border-b border-copper/20 py-4 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="font-display font-bold text-xl text-burgundy tracking-tight">
            AgentLab
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-6 font-sans text-sm text-burgundy">
          <a href="#product" className="hover:text-copper transition-colors">Product</a>
          <a href="#docs" className="hover:text-copper transition-colors">Docs</a>
          <a href="#use-cases" className="hover:text-copper transition-colors">Use Cases</a>
          <a href="#pricing" className="hover:text-copper transition-colors">Pricing</a>
        </div>

        {/* Action Button & Mobile Hamburger */}
        <div className="flex items-center space-x-3">
          <Link
            to="/app"
            className="cursor-pointer bg-burgundy text-ivory px-4 py-2 text-xs sm:text-sm font-sans font-medium hover:bg-burgundy-light transition-colors"
          >
            Get Access
          </Link>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden text-burgundy p-1.5 hover:text-copper transition-colors"
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
              href="#docs"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1.5 text-burgundy hover:text-copper transition-colors"
            >
              Docs
            </a>
            <a
              href="#use-cases"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1.5 text-burgundy hover:text-copper transition-colors"
            >
              Use Cases
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1.5 text-burgundy hover:text-copper transition-colors"
            >
              Pricing
            </a>
            <div className="pt-2 border-t border-copper/10">
              <Link
                to="/app"
                onClick={() => setMobileNavOpen(false)}
                className="block text-center bg-burgundy text-ivory py-2 font-medium"
              >
                Launch Sandbox
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
