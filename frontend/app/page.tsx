export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Today's Arrivals</p>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Today's Departures</p>
          <p className="text-2xl font-bold">8</p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Occupancy</p>
          <p className="text-2xl font-bold">74%</p>
        </div>
      </div>
    </div>
  );
}
