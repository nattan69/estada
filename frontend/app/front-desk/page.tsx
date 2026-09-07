export default function FrontDeskPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Front Desk</h1>
      <div className="flex gap-4 mb-4">
        <a href="/front-desk/tape-chart" className="px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-dark">Tape Chart</a>
        <a href="/front-desk/arrivals" className="px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-dark">Arrivals</a>
        <a href="/front-desk/departures" className="px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-dark">Departures</a>
      </div>
      <div className="p-8 bg-white rounded-xl border-2 border-dashed border-gray-300 text-center text-gray-400">
        Front Desk Overview Content
      </div>
    </div>
  );
}
