"use client"

import { useState, useEffect } from "react"
import CreateVivaModal from "@/components/dashboard/CreateVivaModal"
import DashboardLayout from "@/components/dashboard/DashboardLayout"
import { Viva } from "@/types/viva"
import { vivaService } from "@/services/vivaService"
import { Button } from "@/components/ui/button"
import VivaTeacherCard from "@/components/dashboard/VivaTeacherCard"

export default function ProjectsPage() {
  const [open, setOpen] = useState(false)
  const [editingViva, setEditingViva] = useState<Viva | null>(null)
  const [vivas, setVivas] = useState<Viva[]>([])

  const refresh = async () => {
    const data = await vivaService.getVivas()
    setVivas(data)
  }

  useEffect(() => { refresh() }, [])

  const handleCreateViva = async (data: Omit<Viva, "id">) => {
    await vivaService.createViva(data)
    await refresh()
  }

  const handleEditViva = async (data: Omit<Viva, "id">) => {
    if (!editingViva) return
    await vivaService.updateViva(editingViva.id, data)
    await refresh()
  }

  const handleDeleteViva = async (vivaId: string) => {
    await vivaService.deleteViva(vivaId)
    await refresh()
  }

  return (
    <DashboardLayout>
      <CreateVivaModal isOpen={open} onClose={() => setOpen(false)} onCreate={handleCreateViva} />
      <CreateVivaModal
        isOpen={!!editingViva}
        onClose={() => setEditingViva(null)}
        onCreate={handleEditViva}
        initialData={editingViva ?? undefined}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button onClick={() => setOpen(true)}>+ Create Viva</Button>
      </div>

      {vivas.length === 0 ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-gray-500">
          No vivas created yet
        </div>
      ) : (
        <div className="grid gap-4">
          {vivas.map((viva) => (
            <VivaTeacherCard
              key={viva.id}
              viva={viva}
              onEdit={() => setEditingViva(viva)}
              onDelete={() => handleDeleteViva(viva.id)}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}