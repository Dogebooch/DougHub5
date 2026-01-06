import { useState, useEffect } from "react";
import {
  Calendar,
  Inbox,
  List,
  Play,
  Plus,
  BookOpen,
  Tag,
  BarChart3,
  Settings,
  // AlertTriangle, // TODO: Uncomment when weak topics section is implemented
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AppView } from "@/types";

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ElementType;
  badge?: number;
  implemented: boolean;
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const currentView = useAppStore((state) => state.currentView);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const getCardsDueToday = useAppStore((state) => state.getCardsDueToday);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const inboxCount = useAppStore((state) => state.inboxCount);
  const queueCount = useAppStore((state) => state.queueCount);

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  const dueCount = isHydrated ? getCardsDueToday().length : 0;

  const mainNavItems: NavItem[] = [
    { id: "capture", label: "Capture", icon: Plus, implemented: true },
    {
      id: "review",
      label: "Review",
      icon: Play,
      badge: dueCount,
      implemented: true,
    },
    {
      id: "today",
      label: "Today",
      icon: Calendar,
      badge: dueCount,
      implemented: false,
    },
    {
      id: "inbox",
      label: "Inbox",
      icon: Inbox,
      badge: inboxCount,
      implemented: true,
    },
    {
      id: "queue",
      label: "Queue",
      icon: List,
      badge: queueCount,
      implemented: false,
    },
  ];

  const secondaryNavItems: NavItem[] = [
    { id: "notebook", label: "Notebook", icon: BookOpen, implemented: true },
    { id: "topics", label: "Topics", icon: Tag, implemented: false },
    { id: "stats", label: "Stats", icon: BarChart3, implemented: false },
  ];

  // TODO: Implement weak topics section
  // const weakTopics = []; // Topics with low-ease cards

  const handleNavClick = (item: NavItem) => {
    if (item.implemented) {
      setCurrentView(item.id);
    }
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = currentView === item.id;
    const Icon = item.icon;

    const button = (
      <button
        onClick={() => handleNavClick(item)}
        disabled={!item.implemented}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          "hover:bg-white/5 active:scale-[0.98]",
          isActive &&
            "bg-white/10 text-primary border-l-2 border-primary -ml-px pl-[11px]",
          !isActive && "text-muted-foreground hover:text-foreground",
          !item.implemented &&
            "opacity-40 cursor-not-allowed hover:bg-transparent",
          collapsed && "justify-center px-0"
        )}
      >
        <Icon
          className={cn("h-4 w-4 flex-shrink-0", isActive && "text-primary")}
        />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 min-w-[20px] px-1.5 text-[10px] font-bold",
                  isActive ? "bg-primary/20 text-primary" : "bg-white/10"
                )}
              >
                {item.badge}
              </Badge>
            )}
            {!item.implemented && (
              <span className="text-[9px] uppercase tracking-wider opacity-50">
                Soon
              </span>
            )}
          </>
        )}
      </button>
    );

    if (collapsed && item.label) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <Badge variant="secondary" className="h-4 text-[10px]">
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex flex-col h-[calc(100vh-80px)] m-3 bg-muted/80 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl transition-all duration-200 z-20",
          collapsed ? "w-14" : "w-52",
          className
        )}
      >
        {/* Nav sections */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {/* Main navigation */}
          <div className="space-y-0.5">
            <div
              className={cn(
                "flex items-center px-3 py-2",
                collapsed ? "justify-center" : "justify-between"
              )}
            >
              {!collapsed && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Main
                </p>
              )}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  "flex items-center justify-center rounded-md transition-all duration-200",
                  "text-muted-foreground/20 hover:text-muted-foreground/100 hover:bg-white/5",
                  collapsed ? "h-8 w-8" : "h-5 w-5"
                )}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            </div>
            {mainNavItems.map((item) => (
              <NavButton key={item.id} item={item} />
            ))}
          </div>

          {/* Divider */}
          <div className="my-3 mx-3 border-t border-white/5" />

          {/* Secondary navigation */}
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Library
              </p>
            )}
            {secondaryNavItems.map((item) => (
              <NavButton key={item.id} item={item} />
            ))}
          </div>

          {/* TODO: Weak Topics Section */}
          {/* Uncomment when weak topics feature is implemented
          {weakTopics.length > 0 && (
            <>
              <div className="my-3 mx-3 border-t border-white/5" />
              <div className="space-y-0.5">
                {!collapsed && (
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-amber-500/70 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Weak Topics
                  </p>
                )}
                {weakTopics.map((topic) => (
                  <NavButton key={topic.id} item={topic} />
                ))}
              </div>
            </>
          )}
          */}
        </nav>

        {/* Footer with settings */}
        <div className="p-2 border-t border-white/5">
          <NavButton
            item={{
              id: "settings",
              label: "Settings",
              icon: Settings,
              implemented: true,
            }}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}
