"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { UploadCloud, File, Trash2, CheckCircle2, Clock, XCircle } from "lucide-react"

import { apiFetch } from "@/services/apiClient"

export default function ModuleContentTab({ projectId }: { projectId: string }) {
  const [materials, setMaterials] = useState<any[]>([])
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchMaterials = async () => {
    try {
      const res = await apiFetch(`/api/viva/projects/${projectId}/module-materials/`)
      if (res.ok) {
        const data = await res.json()
        setMaterials(data)
      }
    } catch (e) {
      toast.error("Failed to load module materials")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaterials()
  }, [projectId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setStagedFiles(prev => [...prev, ...newFiles])
    }
    // clear the input so the same files can be selected again if needed
    e.target.value = ''
  }

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadAll = async () => {
    if (stagedFiles.length === 0) return
    setUploading(true)
    
    let successCount = 0
    let failCount = 0

    for (const file of stagedFiles) {
      const formData = new FormData()
      formData.append("file", file)
      try {
        const res = await apiFetch(`/api/viva/projects/${projectId}/module-materials/upload/`, {
          method: 'POST',
          body: formData
        })
        if (res.ok) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        failCount++
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`)
      fetchMaterials()
    }
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} file(s)`)
    }
    
    setStagedFiles([])
    setUploading(false)
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDeleteMaterial = async (materialId: string) => {
    setIsDeleting(true)
    try {
      const res = await apiFetch(`/api/viva/projects/${projectId}/module-materials/${materialId}/`, {
        method: 'DELETE'
      })
      if (res.ok || res.status === 204) {
        toast.success("Material deleted successfully")
        setMaterials(prev => prev.filter(m => m.id !== materialId))
      } else {
        toast.error("Failed to delete material")
      }
    } catch (err) {
      toast.error("An error occurred while deleting")
    } finally {
      setIsDeleting(false)
      setMaterialToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Module Content</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload lecture notes, slides, or module outlines (PDF, PPTX, DOCX) to define the theoretical boundary for the AI Viva Examiner.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:bg-gray-50 transition cursor-pointer relative">
        <input 
          type="file" 
          accept=".pdf,.pptx,.docx"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        <div className="flex flex-col items-center justify-center">
          <UploadCloud className="h-10 w-10 text-gray-400 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">
            Click or drag to select files
          </h3>
          <p className="text-xs text-gray-500 mt-1">PDF, PPTX, DOCX up to 50MB</p>
        </div>
      </div>

      {/* Staging Area */}
      {stagedFiles.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-blue-900">Files ready to upload ({stagedFiles.length})</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {stagedFiles.map((file, i) => (
              <li key={i} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 text-gray-600 flex items-center justify-center">
                    <File className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeStagedFile(i)}
                  disabled={uploading}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition disabled:opacity-50"
                  title="Remove file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleUploadAll}
              disabled={uploading}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              {uploading ? 'Uploading...' : 'Upload All Files'}
            </button>
          </div>
        </div>
      )}

      {/* Uploaded List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No materials uploaded yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {materials.map((mat) => (
              <li key={mat.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <File className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{mat.original_filename}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Uploaded {new Date(mat.uploaded_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    {mat.processing_status === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Indexed
                      </span>
                    )}
                    {mat.processing_status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <Clock className="h-3.5 w-3.5" /> Processing...
                      </span>
                    )}
                    {mat.processing_status === 'failed' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                        <XCircle className="h-3.5 w-3.5" /> Failed
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setMaterialToDelete(mat.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition"
                    title="Delete material"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Delete Confirmation Modal */}
      {materialToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Material</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to permanently delete this material? The AI will no longer use it for evaluation. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setMaterialToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMaterial(materialToDelete)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition shadow-sm disabled:opacity-50 min-w-[120px]"
              >
                {isDeleting ? 'Deleting...' : 'Delete Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
