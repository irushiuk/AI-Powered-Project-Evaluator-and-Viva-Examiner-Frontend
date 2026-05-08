"use client"

import { useState } from "react"
import { Viva } from "@/lib/vivaService"
import { Button } from "../ui/button"

type Props = {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: Omit<Viva, "id">) => Promise<void>
}

export default function CreateVivaModal({ isOpen, onClose, onCreate }: Props) {
  const [module, setModule] = useState("")
  const [duration, setDuration] = useState("")

  if (!isOpen) return null

  const handleSubmit = async () => {
    await onCreate({
      module,
      duration
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-[400px] shadow-lg">
        
        <h2 className="text-xl font-semibold mb-4">
          Create Viva Session
        </h2>

        <input
          type="text"
          placeholder="Module Name / Code"
          value={module}
          onChange={(e) => setModule(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 mb-4"
        />

        <input
          type="number"
          placeholder="Duration per student (minutes)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 mb-6"
        />

        <div className="flex justify-end gap-3">
          < Button onClick={onClose} >
            Cancel
          </Button>

          <Button onClick={handleSubmit} >
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}