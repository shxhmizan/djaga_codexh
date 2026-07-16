import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Image, MessageSquare, Globe, User } from 'lucide-react';
import { useState } from 'react';

const tabs = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/image', label: 'Image', icon: Image },
  { path: '/text', label: 'Text', icon: MessageSquare },
  { path: '/feed', label: 'Feed', icon: Globe },
  { path: '/profile', label: 'Profile', icon: User },
];

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tappedTab, setTappedTab] = useState(null);

  const handleTap = (path) => {
    setTappedTab(path);
    navigate(path);
    setTimeout(() => setTappedTab(null), 250);
  };

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around"
      style={{
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'rgba(10,10,15,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid var(--border)',
        borderRadius: '20px 20px 0 0',
      }}
    >
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;
        const isTapped = tappedTab === tab.path;

        return (
          <button
            key={tab.path}
            onClick={() => handleTap(tab.path)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-[10px] min-w-[56px] min-h-[44px] transition-all duration-200"
            style={{
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              transform: isTapped ? 'scale(0.9)' : isActive ? 'scale(1)' : 'scale(1)',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <Icon
              size={20}
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
                transition: 'color 0.2s',
              }}
            />
            <span
              className="text-[10px] font-medium"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
                fontFamily: 'var(--font-body)',
                transition: 'color 0.2s',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
