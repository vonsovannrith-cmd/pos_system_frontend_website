import MeProvider from "@/components/MeProvider";
import DashboardNav from "@/components/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MeProvider>
      {/* បន្ថែម Navbar ត្រង់នេះ ដើម្បីឱ្យវាបង្ហាញរាល់ពេលចូល Dashboard */}
      <DashboardNav />
      
      {/* Main Content */}
      <main>{children}</main>
    </MeProvider>
  );
}