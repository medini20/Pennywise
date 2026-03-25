import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react'; 
import '../App.css'; 
import logoImg from './images/logo.png';

// Custom Icon component to handle the specific SVG paths you provided
const Icon = ({ type }) => {
  const paths = {
    'credit-card': <path d="M2 10h20M2 5a2 2 0 012-2h16a2 2 0 012 2v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />,
    'pie-chart': <path d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z" />,
    'bar-chart': <path d="M12 20V10M18 20V4M6 20v-4" />,
    'bell': <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />,
    'user': <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 100-8 4 4 0 000 8z" />
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      style={{ width: '22px', height: '22px', flexShrink: 0 }}
    >
      {paths[type]}
    </svg>
  );
};

export function Sidebar({ isCollapsed, setIsCollapsed }) {
  const location = useLocation();
  
  const menuItems = [
    { name: 'Records', path: '/', type: 'credit-card' },
    { name: 'Charts', path: '/analytics', type: 'pie-chart' },
    { name: 'Budget', path: '/budget', type: 'bar-chart' },
    { name: 'Alerts', path: '/alerts', type: 'bell' },
    { name: 'Profile', path: '/profile', type: 'user' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="logo-section">
        <button className="sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
          <Menu size={24} />
        </button>
        {!isCollapsed && (
          <div className="logo-content">
            <div className="logo-glow-box">
              <img src={logoImg} alt="Logo" className="logo-img" />
            </div>
            <span className="logo-text">PENNYWISE</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <Icon type={item.type} />
            {!isCollapsed && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;