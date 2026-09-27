export const MemoryVisualization = () => {
  return (
    <section className="bg-ivory text-burgundy py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display text-4xl font-bold mb-12 text-center">Agent Memory</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-2 border-copper pl-4">
            <h3 className="font-mono text-sm font-bold text-copper mb-4">SHORT-TERM MEMORY</h3>
            <div className="bg-ivory-dark p-4 rounded text-xs font-mono space-y-2 text-burgundy/80 h-48 overflow-y-auto">
              <div><span className="font-bold text-burgundy">[Customer]:</span> I need to return order #ORD-8847</div>
              <div><span className="font-bold text-burgundy">[Agent]:</span> I can help. Let me look up your order.</div>
              <div><span className="font-bold text-burgundy">[Customer]:</span> The item was defective.</div>
            </div>
          </div>
          <div className="border-l-2 border-copper pl-4">
            <h3 className="font-mono text-sm font-bold text-copper mb-4">LONG-TERM MEMORY</h3>
            <div className="bg-ivory-dark p-4 rounded text-xs font-mono space-y-2 text-burgundy/80 h-48">
              <div>Previous issue: Delivery delay complaint (resolved)</div>
              <div>Customer satisfaction: 4/5</div>
              <div>Preferred channel: Chat</div>
            </div>
          </div>
          <div className="border-l-2 border-copper pl-4">
            <h3 className="font-mono text-sm font-bold text-copper mb-4">ENVIRONMENT STATE</h3>
            <div className="bg-ivory-dark p-4 rounded text-xs font-mono space-y-2 text-burgundy/80 h-48">
              <div>Order #ORD-8847: Delivered 14 days ago</div>
              <div>Refund window: 30 days (ELIGIBLE)</div>
              <div>Policy #24: Standard Return</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
