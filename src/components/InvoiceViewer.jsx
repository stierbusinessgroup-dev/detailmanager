import React, { useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Invoice from './Invoice'
import './InvoiceViewer.css'

function InvoiceViewer({ invoiceData, businessInfo, onClose }) {
  const invoiceRef = useRef()
  const [isGenerating, setIsGenerating] = useState(false)

  // Handle print using browser's native print dialog
  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${invoiceData.invoiceNumber || 'draft'}`,
    pageStyle: `
      @page {
        size: letter;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `
  })

  // Handle PDF download
  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true)
      const element = invoiceRef.current
      
      // Create canvas from the invoice element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      })

      const imgWidth = 215.9 // Letter width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      
      // Download the PDF
      pdf.save(`Invoice-${invoiceData.invoiceNumber || 'draft'}.pdf`)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try using the Print option instead.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="invoice-viewer-overlay">
      <div className="invoice-viewer-container">
        <div className="invoice-viewer-header">
          <h2>Invoice Preview</h2>
          <div className="invoice-actions">
            <button 
              className="btn btn-secondary"
              onClick={handlePrint}
              disabled={isGenerating}
            >
              <span className="btn-icon">🖨️</span>
              Print
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
            >
              <span className="btn-icon">📄</span>
              {isGenerating ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button 
              className="btn btn-close"
              onClick={onClose}
              disabled={isGenerating}
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="invoice-viewer-content">
          <Invoice 
            ref={invoiceRef}
            invoiceData={invoiceData}
            businessInfo={businessInfo}
          />
        </div>
      </div>
    </div>
  )
}

export default InvoiceViewer
