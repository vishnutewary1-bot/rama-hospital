// PDF Generation Utilities for Hospital Management System
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatCurrency, formatDate } from './utils'
import type { Bill, Patient, Admission, Doctor, MedicalRecord } from '@/types/database'

// Hospital Details (should come from settings)
const HOSPITAL_INFO = {
  name: 'Rama Hospital',
  address: 'Your Hospital Address',
  phone: '+91-XXXXXXXXXX',
  email: 'info@ramahospital.com',
  website: 'www.ramahospital.com',
}

export class PDFGenerator {
  private doc: jsPDF

  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    })
  }

  // Generate Bill/Invoice PDF
  async generateBill(bill: Bill & { patient?: Patient; items?: any[] }): Promise<void> {
    const doc = this.doc

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(HOSPITAL_INFO.name, 105, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(HOSPITAL_INFO.address, 105, 27, { align: 'center' })
    doc.text(`Phone: ${HOSPITAL_INFO.phone} | Email: ${HOSPITAL_INFO.email}`, 105, 32, { align: 'center' })

    // Line
    doc.setLineWidth(0.5)
    doc.line(20, 35, 190, 35)

    // Bill Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('TAX INVOICE', 105, 45, { align: 'center' })

    // Bill Info - Left Side
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', 20, 55)

    doc.setFont('helvetica', 'normal')
    doc.text(bill.patient?.name || 'N/A', 20, 60)
    doc.text(`Reg No: ${bill.patient?.registration_number || 'N/A'}`, 20, 65)
    doc.text(`Phone: ${bill.patient?.mobile || 'N/A'}`, 20, 70)

    // Bill Info - Right Side
    doc.setFont('helvetica', 'bold')
    doc.text(`Bill No: ${bill.bill_number}`, 140, 55)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${formatDate(bill.bill_date)}`, 140, 60)
    doc.text(`Type: ${(bill as any).type || 'Bill'}`, 140, 65)

    // Table Header
    const startY = 80
    doc.setFillColor(59, 130, 246) // Blue
    doc.rect(20, startY, 170, 8, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('S.No', 25, startY + 5.5)
    doc.text('Description', 45, startY + 5.5)
    doc.text('Qty', 130, startY + 5.5)
    doc.text('Rate', 150, startY + 5.5)
    doc.text('Amount', 170, startY + 5.5)

    // Table Body
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    let yPos = startY + 12
    bill.items?.forEach((item, index) => {
      doc.text(`${index + 1}`, 25, yPos)
      doc.text((item as any).description || (item as any).service?.name || 'N/A', 45, yPos)
      doc.text((item as any).quantity?.toString() || '1', 130, yPos)
      doc.text(formatCurrency((item as any).rate || 0), 150, yPos)
      doc.text(formatCurrency((item as any).amount || 0), 170, yPos)
      yPos += 6
    })

    // Line above totals
    yPos += 2
    doc.line(20, yPos, 190, yPos)

    // Totals
    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Subtotal:', 140, yPos)
    doc.text(formatCurrency((bill as any).subtotal || 0), 175, yPos, { align: 'right' })

    if ((bill as any).discount && (bill as any).discount > 0) {
      yPos += 6
      doc.text(`Discount (${bill.discount_percentage || 0}%):`, 140, yPos)
      doc.text(`- ${formatCurrency((bill as any).discount)}`, 175, yPos, { align: 'right' })
    }

    if ((bill as any).tax && (bill as any).tax > 0) {
      yPos += 6
      doc.text(`Tax (${(bill as any).tax_percentage || 0}%):`, 140, yPos)
      doc.text(formatCurrency((bill as any).tax), 175, yPos, { align: 'right' })
    }

    yPos += 8
    doc.setFontSize(12)
    doc.setFillColor(240, 240, 240)
    doc.rect(130, yPos - 5, 60, 8, 'F')
    doc.text('TOTAL:', 140, yPos)
    doc.text(formatCurrency((bill as any).total), 175, yPos, { align: 'right' })

    yPos += 8
    doc.setFontSize(10)
    doc.text('Paid:', 140, yPos)
    doc.text(formatCurrency((bill as any).paid_amount || 0), 175, yPos, { align: 'right' })

    yPos += 6
    doc.setTextColor(220, 38, 38) // Red for due
    doc.text('Due:', 140, yPos)
    doc.text(formatCurrency((bill as any).due_amount || 0), 175, yPos, { align: 'right' })

    // Footer
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Thank you for choosing our services!', 105, 270, { align: 'center' })
    doc.text('This is a computer-generated document and does not require a signature.', 105, 275, { align: 'center' })

    // Save
    doc.save(`Bill_${bill.bill_number}.pdf`)
  }

  // Generate Admission Slip PDF
  async generateAdmissionSlip(admission: Admission & { patient?: Patient; doctor?: Doctor }): Promise<void> {
    const doc = this.doc

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(HOSPITAL_INFO.name, 105, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(HOSPITAL_INFO.address, 105, 27, { align: 'center' })

    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ADMISSION SLIP', 105, 40, { align: 'center' })

    // Admission Details
    let y = 55
    const leftX = 30
    const rightX = 120

    doc.setFontSize(11)

    // Left Column
    doc.setFont('helvetica', 'bold')
    doc.text('Admission No:', leftX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(admission.admission_number, leftX + 35, y)

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Patient Name:', leftX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(admission.patient?.name || 'N/A', leftX + 35, y)

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Age/Gender:', leftX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`${admission.patient?.age} years / ${admission.patient?.gender}`, leftX + 35, y)

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Contact:', leftX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(admission.patient?.mobile || 'N/A', leftX + 35, y)

    // Right Column
    y = 55
    doc.setFont('helvetica', 'bold')
    doc.text('Date:', rightX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(admission.admission_date), rightX + 25, y)

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Ward:', rightX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(admission.ward?.name || 'N/A', rightX + 25, y)

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Bed:', rightX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(admission.bed?.bed_number || 'N/A', rightX + 25, y)

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Doctor:', rightX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(admission.doctor?.name || 'N/A', rightX + 25, y)

    // Diagnosis
    y += 15
    doc.setFont('helvetica', 'bold')
    doc.text('Diagnosis:', leftX, y)
    doc.setFont('helvetica', 'normal')
    const diagnosisLines = doc.splitTextToSize(admission.diagnosis || 'Not specified', 140)
    doc.text(diagnosisLines, leftX, y + 6)

    // Vitals if present
    if ((admission as any).bp_systolic || admission.vitals_pulse || admission.vitals_temperature) {
      y += 25
      doc.setFont('helvetica', 'bold')
      doc.text('Vitals at Admission:', leftX, y)
      y += 7
      doc.setFont('helvetica', 'normal')

      if ((admission as any).bp_systolic && (admission as any).bp_diastolic) {
        doc.text(`BP: ${(admission as any).bp_systolic}/${(admission as any).bp_diastolic} mmHg`, leftX, y)
        y += 6
      }
      if (admission.vitals_pulse) {
        doc.text(`Pulse: ${admission.vitals_pulse} bpm`, leftX, y)
        y += 6
      }
      if (admission.vitals_temperature) {
        doc.text(`Temperature: ${admission.vitals_temperature}°F`, leftX, y)
        y += 6
      }
      if (admission.vitals_spo2) {
        doc.text(`SpO2: ${admission.vitals_spo2}%`, leftX, y)
      }
    }

    // Instructions
    y += 20
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bolditalic')
    doc.text('Instructions:', leftX, y)
    y += 6
    doc.setFont('helvetica', 'italic')
    doc.text('• Please follow all hospital rules and regulations', leftX, y)
    y += 5
    doc.text('• Visiting hours: 4:00 PM - 6:00 PM daily', leftX, y)
    y += 5
    doc.text('• In case of emergency, contact the nursing station immediately', leftX, y)

    // Footer
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated on: ${formatDate(new Date().toISOString())}`, 105, 280, { align: 'center' })

    doc.save(`Admission_${admission.admission_number}.pdf`)
  }

  // Generate Discharge Summary PDF
  async generateDischargeSummary(
    admission: Admission & { patient?: Patient; doctor?: Doctor },
    records: MedicalRecord[],
    finalBill?: Bill
  ): Promise<void> {
    const doc = this.doc

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(HOSPITAL_INFO.name, 105, 20, { align: 'center' })

    doc.setFontSize(16)
    doc.text('DISCHARGE SUMMARY', 105, 35, { align: 'center' })

    // Patient Details
    let y = 50
    doc.setFontSize(11)
    doc.text(`Patient: ${admission.patient?.name}`, 20, y)
    doc.text(`Admission No: ${admission.admission_number}`, 140, y)

    y += 7
    doc.text(`Age/Gender: ${admission.patient?.age}Y / ${admission.patient?.gender}`, 20, y)
    doc.text(`Admission Date: ${formatDate(admission.admission_date)}`, 140, y)

    y += 7
    doc.text(`Reg No: ${admission.patient?.registration_number}`, 20, y)
    doc.text(`Discharge Date: ${formatDate(admission.discharge_date || new Date().toISOString())}`, 140, y)

    y += 10
    doc.line(20, y, 190, y)

    // Diagnosis
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.text('DIAGNOSIS:', 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text(admission.diagnosis || 'Not specified', 20, y)

    // Treatment Summary
    y += 15
    doc.setFont('helvetica', 'bold')
    doc.text('TREATMENT SUMMARY:', 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    const treatmentLines = doc.splitTextToSize((admission as any).treatment_plan || 'Standard care provided', 160)
    doc.text(treatmentLines, 20, y)

    // Discharge Advice
    y += 30
    doc.setFont('helvetica', 'bold')
    doc.text('DISCHARGE ADVICE:', 20, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.text('• Continue prescribed medications', 20, y)
    y += 5
    doc.text('• Follow-up after 1 week', 20, y)
    y += 5
    doc.text('• Avoid strenuous activities', 20, y)

    // Doctor Signature
    y += 20
    doc.text('_____________________', 140, y)
    y += 5
    doc.text(admission.doctor?.name || 'Doctor Name', 140, y)
    doc.text(`(${admission.doctor?.specialization || 'Specialist'})`, 140, y + 5)

    doc.save(`Discharge_Summary_${admission.admission_number}.pdf`)
  }

  // Generate Lab Report PDF
  async generateLabReport(test: any): Promise<void> {
    const doc = this.doc

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(HOSPITAL_INFO.name, 105, 20, { align: 'center' })

    doc.setFontSize(14)
    doc.text('LABORATORY REPORT', 105, 32, { align: 'center' })

    // Patient & Test Info
    let y = 45
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Patient Details:', 20, y)
    doc.setFont('helvetica', 'normal')
    doc.text(test.patient?.name || 'N/A', 60, y)

    doc.setFont('helvetica', 'bold')
    doc.text('Test Name:', 140, y)
    doc.setFont('helvetica', 'normal')
    doc.text(test.test?.name || 'N/A', 170, y)

    // Test Results Table
    y += 15
    doc.setFillColor(59, 130, 246)
    doc.rect(20, y, 170, 8, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('Parameter', 25, y + 5.5)
    doc.text('Value', 100, y + 5.5)
    doc.text('Normal Range', 130, y + 5.5)
    doc.text('Status', 170, y + 5.5)

    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')

    y += 12
    test.results?.forEach((result: any) => {
      doc.text(result.parameter?.name || 'N/A', 25, y)
      doc.text(result.value || 'N/A', 100, y)
      doc.text(result.parameter?.normal_range || 'N/A', 130, y)

      if (result.is_abnormal) {
        doc.setTextColor(220, 38, 38)
        doc.text('Abnormal', 170, y)
        doc.setTextColor(0, 0, 0)
      } else {
        doc.text('Normal', 170, y)
      }

      y += 7
    })

    doc.save(`Lab_Report_${test.order_number}.pdf`)
  }

  // Capture HTML element and convert to PDF
  async captureElement(elementId: string, filename: string): Promise<void> {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`Element with id '${elementId}' not found`)
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 190
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    this.doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
    this.doc.save(filename)
  }
}

// Export convenience functions
export const generateBillPDF = (bill: any) => {
  const generator = new PDFGenerator()
  return generator.generateBill(bill)
}

export const generateAdmissionSlipPDF = (admission: any) => {
  const generator = new PDFGenerator()
  return generator.generateAdmissionSlip(admission)
}

export const generateDischargeSummaryPDF = (admission: any, records: any[], bill?: any) => {
  const generator = new PDFGenerator()
  return generator.generateDischargeSummary(admission, records, bill)
}

export const generateLabReportPDF = (test: any) => {
  const generator = new PDFGenerator()
  return generator.generateLabReport(test)
}
