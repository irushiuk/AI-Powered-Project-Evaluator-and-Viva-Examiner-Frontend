import { LiveVivaRoom } from '@/components/studentDashboard/LiveVivaRoom'

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const resolvedParams = await params

  return (
    <div className="h-full w-full">
      <LiveVivaRoom sessionId={resolvedParams.sessionId} />
    </div>
  )
}
