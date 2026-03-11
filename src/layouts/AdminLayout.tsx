import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";

const AdminLayout = () => {
    return (
        <div className="min-h-screen bg-slate-50/50 font-nunito flex">
            <Sidebar />
            <div className="flex-1 lg:pl-64 transition-all duration-300 flex flex-col min-w-0">
                <Header />
                <main className="p-4 lg:p-6 overflow-x-hidden">
                    <h2 className="text-xs text-slate-300">Admin Layout Loaded</h2>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
