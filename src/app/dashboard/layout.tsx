import DashboardNav from "@/components/DashboardNav";
import MeProvider from "@/components/MeProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        {children}
      </div>
    </MeProvider>
  );
}