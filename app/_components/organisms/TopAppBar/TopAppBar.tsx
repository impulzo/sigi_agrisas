import { Avatar } from "../../atoms/Avatar/Avatar";
import { IconButton } from "../../atoms/IconButton/IconButton";
import { SearchInput } from "../../molecules/SearchInput/SearchInput";

interface TopAppBarProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string;
}

export function TopAppBar({ userName, userEmail, avatarUrl }: TopAppBarProps) {
  const initials = (userName || userEmail || "?").charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant flex items-center justify-between h-16 w-full pl-24 pr-8">
      <div className="flex items-center gap-md">
        <h1 className="text-headline-lg font-bold text-primary">Agrisas</h1>
        <SearchInput placeholder="Search data..." className="hidden md:flex" />
      </div>
      <div className="flex items-center gap-sm">
        <IconButton icon="notifications" ariaLabel="Notificaciones" />
        <IconButton icon="help_outline" ariaLabel="Ayuda" />
        <IconButton icon="settings" ariaLabel="Ajustes" />
        <Avatar
          src={avatarUrl}
          alt={userName || userEmail}
          size="md"
          fallbackInitials={initials}
          className="ml-sm"
        />
      </div>
    </header>
  );
}
