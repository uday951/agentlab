export const Footer = () => {
  return (
    <footer className="bg-ivory text-burgundy py-12 px-6 border-t border-copper/20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-2">
          <h3 className="font-display font-bold text-xl mb-2">AgentLab</h3>
          <p className="font-sans text-sm text-burgundy/70">What happens when your agent meets the unexpected?</p>
        </div>
        <div>
          <h4 className="font-display font-bold mb-4">Product</h4>
          <ul className="space-y-2 font-sans text-sm text-burgundy/70">
            <li><a href="#" className="hover:text-copper">Features</a></li>
            <li><a href="#" className="hover:text-copper">Integrations</a></li>
            <li><a href="#" className="hover:text-copper">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold mb-4">Company</h4>
          <ul className="space-y-2 font-sans text-sm text-burgundy/70">
            <li><a href="#" className="hover:text-copper">About Us</a></li>
            <li><a href="#" className="hover:text-copper">Careers</a></li>
            <li><a href="#" className="hover:text-copper">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-copper/20 text-center font-sans text-sm text-burgundy/50">
        &copy; {new Date().getFullYear()} AgentLab. All rights reserved.
      </div>
    </footer>
  );
};
