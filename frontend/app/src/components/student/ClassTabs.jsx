import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import OverviewTab from "./OverviewTab";
import MaterialsTab from "./MaterialsTab";
import QuizzesTab from "./QuizzesTab";
import StudentClassResults from "../../pages/StudentClassResults.jsx";
import ChatTab from "./ChatTab";

// Tabs Component
export default function ClassTabs({ selectedClass, onBackToClassSelection, initialActiveTab }) {
  const [activeTab, setActiveTab] = useState(initialActiveTab || "overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "materials", label: "Materials" },
    { id: "quizzes", label: "Quizzes" },
    { id: "results", label: "Results" },
    { id: "chat", label: "AI Assistant" },
  ];

  return (
    <div>
      <div className="border-b border-gray-200 flex justify-between items-center">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <button
          onClick={onBackToClassSelection}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Back to Classes
        </button>
      </div>
      <div className="py-6">
        {activeTab === "overview" && <OverviewTab classId={selectedClass.id} />}
        {activeTab === "materials" && <MaterialsTab classId={selectedClass.id} />}
        {activeTab === "quizzes" && <QuizzesTab classId={selectedClass.id} />}
        {activeTab === "results" && <StudentClassResults classId={selectedClass.id} />}
        {activeTab === "chat" && <ChatTab classId={selectedClass.id} />} {/* Pass classId here */}
      </div>
    </div>
  );
}
