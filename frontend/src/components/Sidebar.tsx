import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  {
    section: 'LEARN',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/explore',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 2v4m0 12v4m-7.07-2.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-2.93 7.07l-2.83-2.83M6.76 6.76L3.93 3.93" />
          </svg>
        ),
      },
      {
        id: 'courses',
        label: 'My Courses',
        path: '/explore',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} />
            <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} />
            <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} />
            <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2} />
          </svg>
        ),
        badge: null as number | null, // will be set dynamically
      },
      {
        id: 'quiz',
        label: 'Quiz',
        path: '/explore',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        id: 'flashcards',
        label: 'Flashcards',
        path: '/explore',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={2} />
            <path strokeLinecap="round" strokeWidth={2} d="M3 10h18" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'PROGRESS',
    items: [
      {
        id: 'analytics',
        label: 'Analytics',
        path: '/explore',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={2} />
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
          </svg>
        ),
      },
      {
        id: 'study-plan',
        label: 'Study Plan',
        path: '/explore',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
          </svg>
        ),
      },
    ],
  },
];

interface SidebarProps {
  sessionCount?: number;
}

export default function Sidebar({ sessionCount }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className="hidden lg:flex flex-col w-[240px] min-w-[240px] h-screen sticky top-0 py-6 px-4"
      style={{
        background: 'linear-gradient(180deg, #1e3a2f 0%, #2d4a3e 100%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(200,150,62,0.25)' }}
        >
          <span className="text-lg">💎</span>
        </div>
        <span
          className="text-xl font-bold"
          style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)' }}
        >
          Lumina
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6">
        {NAV_ITEMS.map((group) => (
          <div key={group.section}>
            <p
              className="text-[10px] uppercase tracking-[0.2em] font-semibold px-3 mb-2"
              style={{ color: 'rgba(200,150,62,0.6)' }}
            >
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  item.id === 'dashboard'
                    ? location.pathname === '/explore'
                    : item.id === 'courses'
                    ? location.pathname.startsWith('/learn')
                    : false;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={
                      isActive
                        ? {
                            background: 'rgba(200,150,62,0.15)',
                            color: 'var(--gold)',
                          }
                        : {
                            color: 'rgba(253,248,240,0.55)',
                          }
                    }
                  >
                    <span style={{ color: isActive ? 'var(--gold)' : 'rgba(253,248,240,0.4)' }}>
                      {item.icon}
                    </span>
                    {item.label}
                    {item.id === 'courses' && sessionCount != null && sessionCount > 0 && (
                      <span
                        className="ml-auto text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--gold)', color: '#1e3a2f' }}
                      >
                        {sessionCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
