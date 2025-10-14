import { requestLeaveClass } from "../../services/api";

export default function ClassGridDisplay({ myClasses, onSelectClass, onClassLeft }) {
  const handleLeaveClass = async (classId, event) => {
    event.stopPropagation(); // Prevent triggering onSelectClass
    if (window.confirm("Are you sure you want to request to leave this class? Your teacher must approve this action.")) {
      try {
        const response = await requestLeaveClass(classId);
        alert(response.data.message || "Your request to leave the class has been sent for approval.");
        // Do not call onClassLeft() anymore, as the class should remain visible
        // until the teacher approves the request.
      } catch (error) {
        console.error("Failed to request leave class:", error);
        alert(error.response?.data?.detail || "Failed to send leave request. Please try again.");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {myClasses.length > 0 ? myClasses.map(c => (
        <div
          key={c.id}
          className={`p-6 rounded-lg shadow-sm border border-gray-200 transition-all cursor-pointer hover:shadow-md ${
            c.is_archived ? 'bg-gray-100 opacity-75' : 'bg-gray-50'
          }`}
          onClick={() => onSelectClass(c)}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{c.class_name}</h3>
            {c.is_archived && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">Archived</span>}
          </div>
          <p className="text-gray-600 mb-1">Grade: {c.grade}</p>
          <p className="text-gray-600 mb-1">Teacher: {c.teacher_name || 'N/A'}</p>
          <p className="text-gray-500 text-sm">Created: {new Date(c.created_at).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          {!c.is_archived && (
            <button
              onClick={(event) => handleLeaveClass(c.id, event)}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Leave Class
            </button>
          )}
        </div>
      )) : (
        <p className="text-gray-500 col-span-full text-center">No classes to display in this view.</p>
      )}
    </div>
  );
}
