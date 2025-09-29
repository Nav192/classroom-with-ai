import { useState, useEffect } from "react";
import UserManagementTab from "./UserManagementTab";
import ClassManagementTab from "./ClassManagementTab";

// Tabs Component
export default function AdminTabs({ setStats, defaultTab }) {
  console.log("AdminTabs: Component Rendered with defaultTab:", defaultTab);
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Update activeTab when defaultTab prop changes (e.g., from URL query param)
  useEffect(() => {
    console.log("AdminTabs: useEffect triggered. Updating activeTab from", activeTab, "to defaultTab:", defaultTab);
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button onClick={() => { console.log("AdminTabs: Clicking User Management. Setting activeTab to users."); setActiveTab("users"); }} className={`${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>User Management</button>
          <button onClick={() => { console.log("AdminTabs: Clicking Class Management. Setting activeTab to classes."); setActiveTab("classes"); }} className={`${activeTab === 'classes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Class Management</button>
        </nav>
      </div>
      <div className="py-6">
        {console.log("AdminTabs: Final activeTab for rendering:", activeTab)}
        {activeTab === "users" && <UserManagementTab setStats={setStats} />}
        {activeTab === "classes" && <ClassManagementTab setStats={setStats} />}
      </div>
    </div>
  );
}
