import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import StatisticsTab from "./StatisticsTab";
import StudentsTab from "./StudentsTab";
import MaterialsTab from "./MaterialsTab";
import QuizzesTab from "./QuizzesTab";
import ClassAverageScores from "../../pages/ClassAverageScores";
import TeacherClassManagementTab from "./TeacherClassManagementTab";
import SettingsTab from "./SettingsTab";

function ClassTabs({
  selectedClass,
  onDataChange,
  username,
  onBackToClassSelection,
}) {
  const [activeTab, setActiveTab] = useState("statistics");

  const tabs = [
    { id: "statistics", label: "Statistics" },
    { id: "students", label: "Students" },
    { id: "materials", label: "Materials" },
    { id: "quizzes", label: "Quizzes" },
    { id: "overall_averages", label: "Overall Averages" },
  ];

  return (
    <div>
      <div className="border-b border-gray-200 flex justify-between items-center">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
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
        {activeTab === "statistics" && (
          <StatisticsTab classId={selectedClass.id} />
        )}
        {activeTab === "students" && (
          <StudentsTab
            classId={selectedClass.id}
            className={selectedClass.class_name}
          />
        )}
        {activeTab === "materials" && (
          <MaterialsTab
            classId={selectedClass.id}
            onDataChange={onDataChange}
          />
        )}
        {activeTab === "quizzes" && <QuizzesTab classId={selectedClass.id} />}
        {activeTab === "overall_averages" && (
          <>
            {console.log("ClassTabs: selectedClass object:", selectedClass)}
            {selectedClass && selectedClass.id ? (
              <ClassAverageScores classId={selectedClass.id} />
            ) : (
              <p>Please select a class to view overall averages.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ClassTabs;
