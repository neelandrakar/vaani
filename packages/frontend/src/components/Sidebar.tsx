import React from 'react';
import {
  LayoutDashboard,
  Users,
  Bot,
  MessageSquare,
  CalendarClock,
  Settings,
} from 'lucide-react';

export type TabId = 'dashboard' | 'leads' | 'studio' | 'conversations' | 'callbacks' | 'settings';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  pendingCallbacksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, pendingCallbacksCount }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads & CRM', icon: Users },
    { id: 'studio', label: 'Voice Agent Studio', icon: Bot },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    {
      id: 'callbacks',
      label: 'Callbacks',
      icon: CalendarClock,
      badge: pendingCallbacksCount > 0 ? pendingCallbacksCount : undefined,
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as TabId)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="text-xs text-slate-500">
          <p className="font-medium text-slate-700">Vaani ERP v1.0</p>
          <p>Real-Estate Inbound MVP</p>
        </div>
      </div>
    </aside>
  );
};
