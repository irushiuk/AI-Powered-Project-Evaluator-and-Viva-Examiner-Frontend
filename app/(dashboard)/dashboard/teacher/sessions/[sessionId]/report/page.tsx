"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Clock, MapPin, CheckCircle, XCircle, HelpCircle, BrainCircuit, Activity, BarChart3, AlertTriangle, Users, Edit2, Check, X } from "lucide-react"
import { vivaSessionService } from "@/services/vivaSessionService"
import { formatColomboDateTime, formatColomboTime } from "@/utils/datetime"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function SessionDetailedReportPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({})
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null)
  const [editScoreValue, setEditScoreValue] = useState<string>("")
  const [approving, setApproving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId || sessionId === "undefined") return
    const load = async () => {
      try {
        const res = await vivaSessionService.getSessionDetailedReport(sessionId)
        if (!res) {
          toast.error("Failed to load detailed report")
          router.back()
          return
        }
        setData(res)
        if (res.reports && Object.keys(res.reports).length > 0) {
            setSelectedSpeaker(Object.keys(res.reports)[0])
        }
      } catch (err: any) {
        console.error("API Error when loading detailed report:", err)
        toast.error(`Error loading report: ${err?.message || "An error occurred"}`)
        router.back()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId, router])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-gray-400 font-medium animate-pulse">Loading detailed analysis...</div>
      </div>
    )
  }

  if (!data) return null

  const { session, reports, timeline } = data
  // Fallback to data.report if reports is empty
  const report = (reports && selectedSpeaker) ? reports[selectedSpeaker] : data.report

  const toggleAnswer = (id: string) => {
    setExpandedAnswers((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleApproveScores = async () => {
    setApproving(true);
    try {
      await vivaSessionService.approveSessionScores(sessionId);
      toast.success("Scores approved successfully!");
      setData((prev: any) => {
        const updatedReports = prev.reports ? { ...prev.reports } : {};
        for (const key in updatedReports) {
            updatedReports[key] = { ...updatedReports[key], scores_status: 'approved' };
        }
        return {
          ...prev,
          reports: updatedReports,
          report: prev.report ? { ...prev.report, scores_status: 'approved' } : { scores_status: 'approved' }
        };
      });
      // Optional: Since approval triggers a background report generation, we can reload the page data
      // after a few seconds to get the final grades.
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve scores");
    } finally {
      setApproving(false);
    }
  }

  const handleSaveScore = async (answerId: string) => {
    const scoreNum = parseFloat(editScoreValue);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      toast.error("Please enter a valid score between 0 and 10");
      return;
    }
    setIsSaving(true);
    try {
      await vivaSessionService.patchAnswerScore(sessionId, answerId, scoreNum, "");
      toast.success("Score updated");
      setData((prev: any) => ({
        ...prev,
        timeline: prev.timeline.map((item: any) => {
          if (item.answer?.answer_id === answerId) {
             return { 
               ...item, 
               answer: {
                 ...item.answer,
                 examiner_override_score: scoreNum
               }
             };
          }
          return item;
        })
      }));
      setEditingScoreId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update score");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-full mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition mb-5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Project
        </button>

        <div className="flex items-start justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              AI Analysis & Report
              {report?.scores_status === 'approved' ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Scores Approved
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                  Scores Draft
                </Badge>
              )}
            </h1>
            <p className="text-gray-500 mt-1">{session.project_name}</p>
            
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5 font-medium text-gray-900">
                <Users className="h-4 w-4 text-blue-500" />
                {session.group_name || session.student_name || "Unknown"}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                {formatColomboDateTime(session.scheduled_start)} - {formatColomboTime(session.scheduled_end)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gray-400" />
                {session.location_room}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {session.status === 'completed' && report?.scores_status !== 'approved' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={approving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {approving ? "Approving..." : "Approve Scores"}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve Scores?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to approve these scores? This action cannot be undone and will lock the scores for this session permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApproveScores} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      Confirm Approval
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {report && report.grade && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-center min-w-[120px]">
                <div className="text-sm font-medium text-blue-600 uppercase tracking-wide">Final Grade</div>
                <div className="text-3xl font-black text-blue-700 mt-1">{report.grade}</div>
                <div className="text-xs text-blue-500 mt-1">Score: {report.total_final_score}%</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Student / Group Tabs */}
      {reports && Object.keys(reports).length > 1 && (
        <div className="flex gap-2 mb-6 bg-gray-50/50 p-2 rounded-xl border border-gray-100 overflow-x-auto">
          {Object.entries(reports).map(([key, r]: [string, any]) => (
            <button
              key={key}
              onClick={() => setSelectedSpeaker(key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap flex-1 flex items-center justify-center gap-2 ${
                selectedSpeaker === key 
                  ? 'bg-white shadow-sm text-blue-600 border border-gray-200/60' 
                  : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-700'
              }`}
            >
              <Users className={`h-4 w-4 ${selectedSpeaker === key ? 'text-blue-500' : 'text-gray-400'}`} />
              {r.student_name || 'Group'}
            </button>
          ))}
        </div>
      )}

      {/* Summary Feedback */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-purple-500" /> Overall Feedback
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.overall_feedback || "No feedback generated."}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-orange-500" /> Emotional & Soft Skills
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.emotional_summary || "No data available."}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <BrainCircuit className="h-5 w-5 text-indigo-500" />
          Viva Timeline
        </h2>
        
        {timeline.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-500">No questions have been asked in this session yet.</p>
          </div>
        ) : (
          <div className="relative pl-4 md:pl-0">
            {/* Vertical line connecting timeline */}
            <div className="absolute left-[27px] md:left-[39px] top-4 bottom-4 w-0.5 bg-gray-100 rounded-full z-0"></div>
            
            <div className="space-y-8 relative z-10">
              {timeline.map((item: any, index: number) => {
                const isAnswered = !!item.answer;
                const ans = item.answer;
                const detailed = ans?.detailed_ai_analysis;
                const isExpanded = expandedAnswers[item.question_id];

                return (
                  <div key={item.question_id} className="flex gap-4 md:gap-6">
                    <div className="shrink-0 mt-1">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 
                        ${isAnswered ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                        Q{item.question_order}
                      </div>
                    </div>

                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                      {/* Question Header */}
                      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <h3 className="font-medium text-gray-900 text-base leading-snug">{item.question_text || <span className="italic text-gray-400">[Examiner asked question via voice]</span>}</h3>
                          {ans && ans.llm_score !== null && ans.llm_score !== undefined && (
                            <div className="shrink-0 flex flex-col items-center gap-2">
                              <div className="bg-white border border-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-lg shadow-sm text-sm flex items-center justify-center gap-1.5">
                                <span className="text-xs font-normal text-indigo-400 uppercase">Score:</span>
                                {Number(ans.examiner_override_score !== null ? ans.examiner_override_score : ans.llm_score).toFixed(1)}/10
                                {ans.examiner_override_score !== null && (
                                  <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded uppercase">Edited</span>
                                )}
                              </div>
                              
                              {report?.scores_status !== 'approved' && (
                                editingScoreId === ans.answer_id ? (
                                  <div className="flex flex-col items-center gap-2 bg-gray-50 border border-gray-200 p-2 rounded-lg shadow-sm">
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="text-[11px] font-bold text-gray-500 uppercase">New:</span>
                                      <input 
                                        type="number" 
                                        min="0" max="10" step="0.1"
                                        value={editScoreValue}
                                        onChange={(e) => setEditScoreValue(e.target.value)}
                                        className="w-24 text-sm px-2 py-1.5 border border-gray-300 rounded outline-none text-center font-bold focus:border-indigo-500"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => setEditingScoreId(null)} 
                                        disabled={isSaving}
                                        className="text-xs font-bold px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-100 transition disabled:opacity-50"
                                      >
                                        Discard
                                      </button>
                                      <button 
                                        onClick={() => handleSaveScore(ans.answer_id)} 
                                        disabled={isSaving}
                                        className="text-xs font-bold px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                                      >
                                        {isSaving ? "Saving..." : "Save"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => {
                                      setEditingScoreId(ans.answer_id);
                                      setEditScoreValue(String(ans.examiner_override_score !== null ? ans.examiner_override_score : ans.llm_score));
                                    }}
                                    className="text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded shadow-sm transition uppercase tracking-wide"
                                  >
                                    Edit Score
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.question_source === 'examiner' ? (
                            <Badge variant="outline" className="text-xs font-normal text-amber-600 bg-amber-50 border-amber-200">
                              Examiner Question
                            </Badge>
                          ) : (
                            <>
                              {item.criterion && (
                                <Badge variant="outline" className="text-xs font-normal text-gray-500 bg-white">
                                  Topic: {item.criterion}
                                </Badge>
                              )}
                              {item.blooms_level && (
                                <Badge variant="outline" className="text-xs font-normal text-gray-500 bg-white">
                                  Bloom's: <span className="capitalize ml-1">{item.blooms_level}</span>
                                </Badge>
                              )}
                              {item.difficulty && (
                                <Badge variant="outline" className="text-xs font-normal text-gray-500 bg-white">
                                  Diff: <span className="capitalize ml-1">{item.difficulty}</span>
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Answer Body */}
                      {isAnswered ? (
                        <div className="p-5">
                          <div className="mb-4">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Student Answer</span>
                            <p className="text-gray-700 text-sm italic border-l-2 border-indigo-200 pl-4 py-1">"{ans.transcribed_answer}"</p>
                          </div>

                          {detailed ? (
                            <div>
                              <button 
                                onClick={() => toggleAnswer(item.question_id)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
                              >
                                {isExpanded ? 'Hide AI Analysis' : 'Show AI Analysis'}
                              </button>

                              {isExpanded && (
                                <div className="mt-4 bg-indigo-50/30 rounded-xl p-5 border border-indigo-50 space-y-4">
                                  
                                  <div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Reasoning</span>
                                    <p className="text-sm text-gray-700">{detailed.rubric.reasoning || ans.llm_reasoning}</p>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    {detailed.rubric.gap_identified && (
                                      <div className="bg-white border border-red-100 rounded-lg p-3">
                                        <div className="flex items-center gap-1.5 text-red-600 font-medium text-xs uppercase mb-1">
                                          <AlertTriangle className="w-3.5 h-3.5" /> Gap Identified
                                        </div>
                                        <p className="text-sm text-gray-700">{detailed.rubric.gap_identified}</p>
                                      </div>
                                    )}

                                    {detailed.rubric.revealed_assumption && (
                                      <div className="bg-white border border-orange-100 rounded-lg p-3">
                                        <div className="flex items-center gap-1.5 text-orange-600 font-medium text-xs uppercase mb-1">
                                          <HelpCircle className="w-3.5 h-3.5" /> Assumption Revealed
                                        </div>
                                        <p className="text-sm text-gray-700">{detailed.rubric.revealed_assumption}</p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                    <div className="bg-white rounded-lg border border-gray-100 p-3">
                                      <div className="flex justify-between items-center mb-2">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Correctness</div>
                                        <div className="font-black text-indigo-600">
                                          {detailed.rubric.correctness?.score !== undefined 
                                            ? `${Math.round(detailed.rubric.correctness.score * 10)}/10` 
                                            : '-/10'}
                                        </div>
                                      </div>
                                      {detailed.rubric.correctness?.feedback && (
                                        <p className="text-xs text-gray-600 leading-relaxed">{detailed.rubric.correctness.feedback}</p>
                                      )}
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-100 p-3">
                                      <div className="flex justify-between items-center mb-2">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Depth</div>
                                        <div className="font-black text-indigo-600">
                                          {detailed.rubric.depth?.score !== undefined 
                                            ? `${Math.round(detailed.rubric.depth.score * 10)}/10` 
                                            : '-/10'}
                                        </div>
                                      </div>
                                      {detailed.rubric.depth?.feedback && (
                                        <p className="text-xs text-gray-600 leading-relaxed">{detailed.rubric.depth.feedback}</p>
                                      )}
                                    </div>
                                    <div className="bg-white rounded-lg border border-gray-100 p-3">
                                      <div className="flex justify-between items-center mb-2">
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Consistency</div>
                                        <div className="font-black text-indigo-600">
                                          {detailed.rubric.consistency?.score !== undefined 
                                            ? `${Math.round(detailed.rubric.consistency.score * 10)}/10` 
                                            : '-/10'}
                                        </div>
                                      </div>
                                      {detailed.rubric.consistency?.feedback && (
                                        <p className="text-xs text-gray-600 leading-relaxed">{detailed.rubric.consistency.feedback}</p>
                                      )}
                                    </div>
                                  </div>

                                  {detailed.strategy && Object.keys(detailed.strategy).length > 0 && (
                                    <div className="pt-2 border-t border-indigo-100 mt-4">
                                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Next Move Strategy</span>
                                      <div className="flex flex-wrap gap-2">
                                        {detailed.strategy.socratic_intent && (
                                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                                            Intent: {detailed.strategy.socratic_intent}
                                          </Badge>
                                        )}
                                        {detailed.strategy.bloom_level && (
                                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                                            Target Bloom's: {detailed.strategy.bloom_level}
                                          </Badge>
                                        )}
                                      </div>
                                      {detailed.strategy.rationale && (
                                        <p className="text-xs text-gray-500 mt-2 italic">{detailed.strategy.rationale}</p>
                                      )}
                                    </div>
                                  )}

                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No detailed AI analysis available for this answer.</p>
                          )}
                        </div>
                      ) : (
                        <div className="p-5">
                          <p className="text-sm text-gray-400 italic flex items-center gap-2">
                            {session?.status === 'completed' ? (
                              <><XCircle className="w-4 h-4 text-gray-400" /> Unanswered — session ended</>
                            ) : (
                              <><Clock className="w-4 h-4" /> Waiting for student to answer...</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
