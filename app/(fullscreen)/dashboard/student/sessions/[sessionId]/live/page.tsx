import { LiveVivaRoom } from '@/components/studentDashboard/liveViva'
import { LiveSessionFaceGuard } from '@/components/studentDashboard/LiveSessionFaceGuard'

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const resolvedParams = await params

  return (
    <div className="h-full w-full">
      <LiveSessionFaceGuard>
        <LiveVivaRoom sessionId={resolvedParams.sessionId} />
      </LiveSessionFaceGuard>
    </div>
  )
}
