import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Info, Brain, Database, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/dataset", icon: Database, label: "Dataset", urdu: "ڈیٹا سیٹ", activeColor: "bg-secondary text-black shadow-[0_0_20px_rgba(112,0,255,0.4)]" },
  { to: "/about", icon: Info, label: "About", urdu: "بارے میں", activeColor: "bg-primary text-black shadow-[0_0_20px_rgba(0,243,255,0.4)]" },
];

const Navigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-black/20 shadow-lg">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo */}
          <NavLink to="/" className="flex items-center space-x-2 sm:space-x-3 group" onClick={() => setMobileOpen(false)}>
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all duration-300">
              <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent group-hover:text-primary transition-colors">
                StutterNet+
              </h1>
              <p className="text-[10px] sm:text-xs text-primary/80 font-urdu tracking-wider">اردو تقریر تجزیہ</p>
            </div>
          </NavLink>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center space-x-2">
            {navLinks.map(({ to, icon: Icon, label, activeColor }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 border border-transparent text-sm font-medium",
                    isActive
                      ? `${activeColor} font-bold`
                      : "text-muted-foreground hover:text-white hover:bg-white/5 hover:border-white/10"
                  )
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-white/5 py-3 space-y-1 animate-fade-in">
            {navLinks.map(({ to, icon: Icon, label, urdu }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-sm font-urdu text-muted-foreground">{urdu}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
