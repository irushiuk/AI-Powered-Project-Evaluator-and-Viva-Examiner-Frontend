"use client"

import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SessionResults } from './sessionTypes'

type DownloadEvaluationButtonProps = {
  results: SessionResults
}

export function DownloadEvaluationButton({ results }: DownloadEvaluationButtonProps) {
  const handleDirectPdfDownload = async () => {
    // 1. Dynamically load html2pdf.js if not already loaded
    if (!(window as any).html2pdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load html2pdf library'))
        document.head.appendChild(script)
      })
    }

    // 2. Build the HTML content
    const container = document.createElement('div')
    container.style.padding = '30px'
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif'
    container.style.color = '#333'
    
    let htmlContent = `
      <h1 style="color: #111; border-bottom: 2px solid #eee; padding-bottom: 10px;">AI Evaluation Report</h1>
      
      <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <div>
          <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 5px;">Weighted Final Score</div>
          <div style="font-size: 28px; font-weight: bold; color: #2563eb;">${results.score} / ${results.scoreMaximum}</div>
        </div>
      </div>
      
      <h2 style="color: #222; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 5px;">Overall Feedback</h2>
      <p style="line-height: 1.6;">${results.feedback}</p>
      
      <h2 style="color: #222; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 5px;">Detailed Transcript</h2>
    `

    if (results.transcript && results.transcript.length > 0) {
      results.transcript.forEach((t, idx) => {
        htmlContent += `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 10px;">Q${idx + 1}. ${t.question_text}</div>
              ${t.ai_answer_score !== null ? `<div style="background: #2563eb; padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.8rem;">${t.ai_answer_score}/10</div>` : ''}
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px; font-size: 0.8rem;">
              <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; color: #475569;">Criterion: ${t.criterion}</span>
              <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; color: #475569;">Difficulty: ${t.difficulty}</span>
            </div>
            
            <div style="margin-top: 15px;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 5px;">Student Answer</div>
              <div style="background: #f8fafc; padding: 12px; border-left: 4px solid #cbd5e1; font-style: italic; line-height: 1.6;">${t.answer_text || 'No answer provided.'}</div>
            </div>
            
            <div style="margin-top: 15px;">
              <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 5px;">AI Reasoning</div>
              <div style="background: #eff6ff; padding: 12px; border: 1px solid #bfdbfe; border-radius: 4px; line-height: 1.6;">${t.reasoning}</div>
            </div>
          </div>
        `
      })
    } else {
      htmlContent += `<p>No transcript available for this session.</p>`
    }

    container.innerHTML = htmlContent

    // 3. Generate and download PDF
    const opt = {
      margin:       10,
      filename:     'viva_evaluation_report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).html2pdf().set(opt).from(container).save()
  }

  return (
    <Button onClick={handleDirectPdfDownload} className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
      <FileDown className="mr-2 h-4 w-4" />
      Download Evaluation Report
    </Button>
  )
}
