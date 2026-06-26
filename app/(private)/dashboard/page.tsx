import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardHeader } from "./_blocks/DashboardHeader";
import { SalesCard } from "./_blocks/SalesCard";
import { InventoryCard } from "./_blocks/InventoryCard";
import { LowStockAlerts } from "./_blocks/LowStockAlerts";
import { ActivityFeed } from "./_blocks/ActivityFeed";
import { LogisticsMap } from "./_blocks/LogisticsMap";
import { getDashboardKpis } from "./_logic/services/getDashboardKpis";
import { getLowStockAlerts } from "./_logic/services/getLowStockAlerts";
import { getRecentActivity } from "./_logic/services/getRecentActivity";

export const metadata: Metadata = {
  title: "Dashboard | Agrisas",
};

export default async function DashboardPage() {
  const hdrs = headers();
  const userEmail = hdrs.get("x-user-email") ?? "";
  const roles = hdrs.get("x-user-roles") ?? "";
  if (!roles.split(",").includes("admin")) redirect("/pos");
  const userName = userEmail ? userEmail.split("@")[0] : "Admin";

  const [kpis, alerts, activity] = await Promise.all([
    getDashboardKpis(),
    getLowStockAlerts(),
    getRecentActivity(),
  ]);

  return (
    <div className="max-w-7xl mx-auto p-gutter space-y-gutter">
      <DashboardHeader userName={userName} />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <div className="md:col-span-8">
          <SalesCard data={kpis.salesToday} />
        </div>
        <div className="md:col-span-4">
          <InventoryCard data={kpis.inventory} />
        </div>
        <div className="md:col-span-12 lg:col-span-5">
          <LowStockAlerts alerts={alerts} />
        </div>
        <div className="md:col-span-12 lg:col-span-7">
          <ActivityFeed items={activity} />
        </div>
        <div className="md:col-span-12">
          <LogisticsMap
            data={{
              hubName: "Main Logistics Hub",
              status: "operational",
              mapImageSrc: "/dashboard/logistics-map.svg",
            }}
          />
        </div>
      </div>
    </div>
  );
}
