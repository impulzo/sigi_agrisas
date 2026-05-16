import Link from "next/link";
import { Icon } from "../../../_components/atoms/Icon/Icon";

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
      <div>
        <p className="text-label-lg text-primary uppercase tracking-wider">
          Operational Overview
        </p>
        <h2 className="text-headline-lg text-on-surface">
          Welcome back, {userName}
        </h2>
      </div>
      <Link
        href="/pos"
        className="inline-flex items-center justify-center gap-sm px-6 py-3 bg-primary text-on-primary rounded-xl text-title-md hover:shadow-lg transition-all"
      >
        <Icon name="add" />
        Nueva venta
      </Link>
    </div>
  );
}
