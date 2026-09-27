import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-ivory border-b border-copper/20 py-4 px-6 flex items-center justify-between">
      <div className="flex items-center">
        <Link to="/" className="font-display font-bold text-xl text-burgundy tracking-tight">AgentLab</Link>
      </div>
      <div className="hidden md:flex items-center space-x-6 font-sans text-sm text-burgundy">
        <a href="#product" className="hover:text-copper transition-colors">Product</a>
        <a href="#docs" className="hover:text-copper transition-colors">Docs</a>
        <a href="#use-cases" className="hover:text-copper transition-colors">Use Cases</a>
        <a href="#pricing" className="hover:text-copper transition-colors">Pricing</a>
      </div>
      <div className="flex items-center space-x-4">
        <Link to="/app" className="bg-burgundy text-ivory px-4 py-2 rounded-md font-sans text-sm font-medium hover:bg-burgundy-light transition-colors">
          Get Access
        </Link>
        <button className="md:hidden text-burgundy">
          <Menu size={24} />
        </button>
      </div>
    </nav>
  );
};
