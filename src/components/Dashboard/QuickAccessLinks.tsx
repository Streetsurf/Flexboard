import React from 'react';
import QuickLinksHorizontal from './QuickLinksHorizontal';
import { Link } from 'lucide-react';

interface QuickAccessLinksProps {
  globalData?: any[];
}

const QuickAccessLinks: React.FC<QuickAccessLinksProps> = ({ globalData = [] }) => {
  return (
    <div className="card animate-fadeIn">
      {/* Header */}
      <div className="card-header">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Link className="w-4 h-4 text-white" />
          </div>
          <h2 className="card-title">Quick Links</h2>
        </div>
      </div>

      {/* Quick Links Display */}
      <QuickLinksHorizontal globalData={globalData} />
    </div>
  );
};

export default QuickAccessLinks;