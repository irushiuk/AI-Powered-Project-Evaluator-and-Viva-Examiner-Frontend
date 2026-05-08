import DashboardLayout from "@/components/dashboard/DashboardLayout"

export default function StudentDashboard() {
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Student Dashboard</h1>

      {/* Assigned Vivas */}
      <div className="mb-8">
        <h2 className="text-xl mb-4">Assigned Vivas</h2>

        <div className="space-y-4">
          <VivaCard title="AI Project Evaluation" status="Pending" />
          <VivaCard title="Database Systems Viva" status="Completed" />
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-xl mb-4">Performance</h2>

        <div className="grid grid-cols-3 gap-6">
          <Stat title="Avg Score" value="82%" />
          <Stat title="Completed" value="5" />
          <Stat title="Pending" value="2" />
        </div>
      </div>
    </DashboardLayout>
  )
}

/* Components */

function VivaCard({ title, status }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 flex justify-between items-center">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="opacity-60 text-sm">{status}</p>
      </div>

      <button className="btn-primary">
        {status === "Pending" ? "Start" : "View"}
      </button>
    </div>
  )
}

function Stat({ title, value }: any) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
      <p className="opacity-70">{title}</p>
      <h2 className="text-2xl font-bold mt-2">{value}</h2>
    </div>
  )
}