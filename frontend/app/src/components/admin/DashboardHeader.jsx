// Header Component
export default function DashboardHeader({ username, stats }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      <p className="text-gray-500">Welcome back, {username}!</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-center">
        <div className="bg-blue-50 p-4 rounded-lg"><p className="text-2xl font-bold text-blue-600">{stats.users}</p><p className="text-sm text-blue-500">Total Users</p></div>
        <div className="bg-green-50 p-4 rounded-lg"><p className="text-2xl font-bold text-green-600">{stats.classes}</p><p className="text-sm text-green-500">Total Classes</p></div>
        <div className="bg-yellow-50 p-4 rounded-lg"><p className="text-2xl font-bold text-yellow-600">{stats.materials}</p><p className="text-sm text-yellow-500">Total Materials</p></div>
      </div>
    </div>
  );
}
