// Print utility functions
import { formatCurrency, formatDate } from '../utils'
import { Bill, BillItem, Payment, Patient, Admission, PatientTest, PatientTestResult } from '@/types/database'

export interface PrintOptions {
  title?: string
  hospitalName?: string
  hospitalAddress?: string
  hospitalPhone?: string
  hospitalEmail?: string
  hospitalLogo?: string
  showHeader?: boolean
  showFooter?: boolean
  orientation?: 'portrait' | 'landscape'
}

const DEFAULT_OPTIONS: PrintOptions = {
  hospitalName: 'Rama Hospital',
  hospitalAddress: 'Main Road, City',
  hospitalPhone: '+91 1234567890',
  hospitalEmail: 'info@ramahospital.com',
  showHeader: true,
  showFooter: true,
  orientation: 'portrait'
}

// Generate print styles
function getPrintStyles(options: PrintOptions): string {
  return `
    @media print {
      @page {
        size: A4 ${options.orientation};
        margin: 10mm;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
    }
    .print-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .header p {
      font-size: 11px;
      color: #666;
    }
    .document-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin: 15px 0;
      text-transform: uppercase;
      background: #f5f5f5;
      padding: 8px;
      border-radius: 4px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-box {
      background: #f9f9f9;
      padding: 10px;
      border-radius: 4px;
    }
    .info-box h3 {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #555;
      text-transform: uppercase;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .info-label {
      color: #666;
    }
    .info-value {
      font-weight: 500;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f5f5f5;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11px;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .summary-box {
      margin-top: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      overflow: hidden;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 15px;
      border-bottom: 1px solid #eee;
    }
    .summary-row:last-child {
      border-bottom: none;
    }
    .summary-row.total {
      background: #f5f5f5;
      font-weight: bold;
      font-size: 14px;
    }
    .summary-row.highlight {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .summary-row.warning {
      background: #fff3e0;
      color: #ef6c00;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    .signature-area {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 50px;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 40px;
      padding-top: 5px;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      color: rgba(0,0,0,0.05);
      z-index: -1;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    .badge-success {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .badge-warning {
      background: #fff3e0;
      color: #ef6c00;
    }
    .badge-danger {
      background: #ffebee;
      color: #c62828;
    }
    .test-result {
      margin-bottom: 15px;
    }
    .test-header {
      background: #f5f5f5;
      padding: 10px;
      font-weight: bold;
    }
    .abnormal {
      color: #c62828;
      font-weight: bold;
    }
    .critical {
      color: #c62828;
      font-weight: bold;
      background: #ffebee;
    }
  `
}

// Generate header HTML
function getHeaderHTML(options: PrintOptions): string {
  if (!options.showHeader) return ''
  return `
    <div class="header">
      <h1>${options.hospitalName}</h1>
      <p>${options.hospitalAddress}</p>
      <p>Phone: ${options.hospitalPhone} | Email: ${options.hospitalEmail}</p>
    </div>
  `
}

// Generate footer HTML
function getFooterHTML(options: PrintOptions): string {
  if (!options.showFooter) return ''
  return `
    <div class="footer">
      <p>This is a computer-generated document. No signature required.</p>
      <p>Printed on: ${formatDate(new Date().toISOString(), 'long')}</p>
    </div>
  `
}

// Print Bill
export function printBill(
  bill: Bill,
  items: BillItem[],
  payments: Payment[],
  options: Partial<PrintOptions> = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const patient = bill.patient
  const admission = bill.admission

  const pending = bill.net_amount - bill.amount_received
  const statusClass = bill.status === 'Paid' ? 'badge-success' : bill.status === 'Partial' ? 'badge-warning' : 'badge-danger'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bill - ${bill.bill_number}</title>
      <style>${getPrintStyles(opts)}</style>
    </head>
    <body>
      <div class="print-container">
        ${getHeaderHTML(opts)}

        <div class="document-title">
          Hospital Bill
          <span class="badge ${statusClass}" style="margin-left: 10px;">${bill.status}</span>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Patient Information</h3>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${patient?.name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Reg. No:</span>
              <span class="info-value">${patient?.registration_number || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Age/Gender:</span>
              <span class="info-value">${patient?.age || '-'} / ${patient?.gender || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mobile:</span>
              <span class="info-value">${patient?.mobile || '-'}</span>
            </div>
          </div>

          <div class="info-box">
            <h3>Bill Information</h3>
            <div class="info-row">
              <span class="info-label">Bill No:</span>
              <span class="info-value">${bill.bill_number}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">${formatDate(bill.bill_date, 'long')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Type:</span>
              <span class="info-value">${bill.bill_type}</span>
            </div>
            ${admission ? `
            <div class="info-row">
              <span class="info-label">Admission:</span>
              <span class="info-value">${admission.admission_number}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Service</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.service_name}</td>
                <td class="text-right">${formatCurrency(item.unit_price)}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.total_amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>${formatCurrency(bill.total_amount)}</span>
          </div>
          ${bill.discount_amount > 0 ? `
          <div class="summary-row">
            <span>Discount${bill.discount_reason ? ` (${bill.discount_reason})` : ''}</span>
            <span>-${formatCurrency(bill.discount_amount)}</span>
          </div>
          ` : ''}
          <div class="summary-row total">
            <span>Net Amount</span>
            <span>${formatCurrency(bill.net_amount)}</span>
          </div>
          <div class="summary-row highlight">
            <span>Amount Received</span>
            <span>${formatCurrency(bill.amount_received)}</span>
          </div>
          ${pending > 0 ? `
          <div class="summary-row warning">
            <span>Pending Amount</span>
            <span>${formatCurrency(pending)}</span>
          </div>
          ` : ''}
        </div>

        ${payments.length > 0 ? `
        <h3 style="margin-top: 20px; margin-bottom: 10px;">Payment History</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Receipt No</th>
              <th>Mode</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map(payment => `
              <tr>
                <td>${formatDate(payment.payment_date)}</td>
                <td>${payment.payment_number}</td>
                <td>${payment.payment_mode}</td>
                <td class="text-right">${formatCurrency(payment.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        ${getFooterHTML(opts)}
      </div>
    </body>
    </html>
  `

  openPrintWindow(html)
}

// Print Payment Receipt
export function printPaymentReceipt(
  payment: Payment,
  bill: Bill,
  options: Partial<PrintOptions> = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const patient = bill.patient

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${payment.payment_number}</title>
      <style>${getPrintStyles(opts)}</style>
    </head>
    <body>
      <div class="print-container">
        ${getHeaderHTML(opts)}

        <div class="document-title">Payment Receipt</div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Patient Information</h3>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${patient?.name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Reg. No:</span>
              <span class="info-value">${patient?.registration_number || '-'}</span>
            </div>
          </div>

          <div class="info-box">
            <h3>Receipt Information</h3>
            <div class="info-row">
              <span class="info-label">Receipt No:</span>
              <span class="info-value">${payment.payment_number}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">${formatDate(payment.payment_date, 'long')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Bill No:</span>
              <span class="info-value">${bill.bill_number}</span>
            </div>
          </div>
        </div>

        <div class="summary-box">
          <div class="summary-row">
            <span>Payment Mode</span>
            <span>${payment.payment_mode}</span>
          </div>
          ${payment.transaction_reference ? `
          <div class="summary-row">
            <span>Reference</span>
            <span>${payment.transaction_reference}</span>
          </div>
          ` : ''}
          <div class="summary-row total">
            <span>Amount Received</span>
            <span>${formatCurrency(payment.amount)}</span>
          </div>
        </div>

        <div class="signature-area">
          <div class="signature-box">
            <div class="signature-line">Received By</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Patient/Caretaker</div>
          </div>
        </div>

        ${getFooterHTML(opts)}
      </div>
    </body>
    </html>
  `

  openPrintWindow(html)
}

// Print Lab Report
export function printLabReport(
  test: PatientTest,
  results: PatientTestResult[],
  options: Partial<PrintOptions> = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const patient = test.patient
  const testInfo = test.test

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lab Report - ${test.order_number}</title>
      <style>${getPrintStyles(opts)}</style>
    </head>
    <body>
      <div class="print-container">
        ${getHeaderHTML(opts)}

        <div class="document-title">Laboratory Report</div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Patient Information</h3>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${patient?.name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Reg. No:</span>
              <span class="info-value">${patient?.registration_number || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Age/Gender:</span>
              <span class="info-value">${patient?.age || '-'} / ${patient?.gender || '-'}</span>
            </div>
          </div>

          <div class="info-box">
            <h3>Test Information</h3>
            <div class="info-row">
              <span class="info-label">Order No:</span>
              <span class="info-value">${test.order_number}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Test Name:</span>
              <span class="info-value">${testInfo?.name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Order Date:</span>
              <span class="info-value">${formatDate(test.order_date, 'long')}</span>
            </div>
            ${(test as any).completed_date ? `
            <div class="info-row">
              <span class="info-label">Report Date:</span>
              <span class="info-value">${formatDate((test as any).completed_date, 'long')}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th class="text-center">Result</th>
              <th class="text-center">Unit</th>
              <th class="text-center">Reference Range</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(result => {
              const param = result.parameter
              let valueClass = ''
              if (result.is_critical) {
                valueClass = 'critical'
              } else if (result.is_abnormal) {
                valueClass = 'abnormal'
              }
              return `
                <tr>
                  <td>${param?.name || '-'}</td>
                  <td class="text-center ${valueClass}">${result.value || '-'}</td>
                  <td class="text-center">${param?.unit || '-'}</td>
                  <td class="text-center">${(param as any).normal_range_min || (param?.normal_range_male || '')} - ${(param as any).normal_range_max || (param?.normal_range_female || '')}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>

        ${test.notes ? `
        <div style="margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 4px;">
          <strong>Notes:</strong> ${test.notes}
        </div>
        ` : ''}

        <div class="signature-area" style="margin-top: 40px;">
          <div class="signature-box">
            <div class="signature-line">Technician</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Pathologist</div>
          </div>
        </div>

        ${getFooterHTML(opts)}
      </div>
    </body>
    </html>
  `

  openPrintWindow(html)
}

// Print Admission Summary
export function printAdmissionSummary(
  admission: Admission,
  bill?: Bill,
  options: Partial<PrintOptions> = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const patient = admission.patient

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admission - ${admission.admission_number}</title>
      <style>${getPrintStyles(opts)}</style>
    </head>
    <body>
      <div class="print-container">
        ${getHeaderHTML(opts)}

        <div class="document-title">
          ${admission.status === 'Discharged' ? 'Discharge Summary' : 'Admission Summary'}
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Patient Information</h3>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${patient?.name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Reg. No:</span>
              <span class="info-value">${patient?.registration_number || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Age/Gender:</span>
              <span class="info-value">${patient?.age || '-'} / ${patient?.gender || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Mobile:</span>
              <span class="info-value">${patient?.mobile || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Blood Group:</span>
              <span class="info-value">${patient?.blood_group || '-'}</span>
            </div>
          </div>

          <div class="info-box">
            <h3>Admission Details</h3>
            <div class="info-row">
              <span class="info-label">Admission No:</span>
              <span class="info-value">${admission.admission_number}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Admission Date:</span>
              <span class="info-value">${formatDate(admission.admission_date, 'long')}</span>
            </div>
            ${admission.discharge_date ? `
            <div class="info-row">
              <span class="info-label">Discharge Date:</span>
              <span class="info-value">${formatDate(admission.discharge_date, 'long')}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Ward/Bed:</span>
              <span class="info-value">${admission.ward?.name || admission.ward_type}${admission.bed ? ` - ${admission.bed.bed_number}` : ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Doctor:</span>
              <span class="info-value">Dr. ${admission.doctor?.name || '-'}</span>
            </div>
          </div>
        </div>

        ${admission.diagnosis ? `
        <div class="info-box" style="margin-top: 15px;">
          <h3>Diagnosis</h3>
          <p>${admission.diagnosis}</p>
        </div>
        ` : ''}

        ${admission.chief_complaints ? `
        <div class="info-box" style="margin-top: 15px;">
          <h3>Chief Complaints</h3>
          <p>${admission.chief_complaints}</p>
        </div>
        ` : ''}

        <div class="info-box" style="margin-top: 15px;">
          <h3>Caretaker Information</h3>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${admission.caretaker_name || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mobile:</span>
            <span class="info-value">${admission.caretaker_mobile || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Relation:</span>
            <span class="info-value">${admission.caretaker_relation || '-'}</span>
          </div>
        </div>

        ${bill ? `
        <div class="summary-box" style="margin-top: 20px;">
          <div class="summary-row">
            <span>Bill Number</span>
            <span>${bill.bill_number}</span>
          </div>
          <div class="summary-row">
            <span>Total Amount</span>
            <span>${formatCurrency(bill.net_amount)}</span>
          </div>
          <div class="summary-row highlight">
            <span>Amount Paid</span>
            <span>${formatCurrency(bill.amount_received)}</span>
          </div>
          ${(bill.net_amount - bill.amount_received) > 0 ? `
          <div class="summary-row warning">
            <span>Pending</span>
            <span>${formatCurrency(bill.net_amount - bill.amount_received)}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <div class="signature-area">
          <div class="signature-box">
            <div class="signature-line">Doctor Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Patient/Caretaker</div>
          </div>
        </div>

        ${getFooterHTML(opts)}
      </div>
    </body>
    </html>
  `

  openPrintWindow(html)
}

// Open print window
function openPrintWindow(html: string): void {
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

// Export to CSV
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        let value = row[header]
        if (typeof value === 'string') {
          value = `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')

  downloadFile(csvContent, `${filename}.csv`, 'text/csv')
}

// Download file
function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
