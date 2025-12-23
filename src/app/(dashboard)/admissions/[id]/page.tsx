'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Admission, Bill, BillItem } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'

export default function AdmissionDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [admission, setAdmission] = useState<Admission | null>(null)
  const [bill, setBill] = useState<Bill | null>(null)
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dischargeModal, setDischargeModal] = useState(false)
  const [discharging, setDischarging] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchAdmission()
    }
  }, [params.id])

  async function fetchAdmission() {
    const { data, error } = await supabase
      .from('admissions')
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(name, specialization)
      `)
      .eq('id', params.id)
      .single()

    if (!error && data) {
      setAdmission(data)
      fetchBill(data.id)
    }
    setLoading(false)
  }

  async function fetchBill(admissionId: string) {
    const { data: billData } = await supabase
      .from('bills')
      .select('*')
      .eq('admission_id', admissionId)
      .single()

    if (billData) {
      setBill(billData)

      const { data: itemsData } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', billData.id)
        .order('created_at', { ascending: true })

      setBillItems(itemsData || [])
    }
  }

  async function handleDischarge() {
    setDischarging(true)
    try {
      await supabase
        .from('admissions')
        .update({
          status: 'Discharged',
          discharge_date: new Date().toISOString(),
        })
        .eq('id', params.id)

      setDischargeModal(false)
      fetchAdmission()
    } catch (error) {
      console.error('Error discharging:', error)
    } finally {
      setDischarging(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading admission details...</div>
  }

  if (!admission) {
    return <div className="text-center py-8 text-red-600">Admission not found</div>
  }

  const daysAdmitted = Math.ceil(
    (new Date().getTime() - new Date(admission.admission_date).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admission Details</h1>
          <p className="text-gray-600">{admission.admission_number}</p>
        </div>
        <div className="flex gap-2">
          {admission.status === 'Active' && (
            <>
              <Link href={`/billing/${admission.id}`}>
                <Button size="lg" variant="success">Add Services</Button>
              </Link>
              <Button
                size="lg"
                variant="danger"
                onClick={() => setDischargeModal(true)}
              >
                Discharge
              </Button>
            </>
          )}
          <Link href="/admissions">
            <Button variant="outline">Back to List</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Patient Information">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-semibold">{admission.patient?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reg. No:</span>
              <span className="font-semibold">{admission.patient?.registration_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Age / Gender:</span>
              <span className="font-semibold">
                {admission.patient?.age} years / {admission.patient?.gender}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mobile:</span>
              <span className="font-semibold">{admission.patient?.mobile}</span>
            </div>
          </div>
        </Card>

        <Card title="Admission Details">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                admission.status === 'Active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {admission.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ward Type:</span>
              <span className="font-semibold">{admission.ward_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Doctor:</span>
              <span className="font-semibold">{admission.doctor?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Admission Date:</span>
              <span className="font-semibold">
                {new Date(admission.admission_date).toLocaleDateString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Days Admitted:</span>
              <span className="font-semibold">{daysAdmitted} days</span>
            </div>
            {admission.diagnosis && (
              <div className="flex justify-between">
                <span className="text-gray-600">Diagnosis:</span>
                <span className="font-semibold">{admission.diagnosis}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Caretaker Information">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-semibold">{admission.caretaker_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mobile:</span>
              <span className="font-semibold">{admission.caretaker_mobile}</span>
            </div>
            {admission.caretaker_relation && (
              <div className="flex justify-between">
                <span className="text-gray-600">Relation:</span>
                <span className="font-semibold">{admission.caretaker_relation}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Bill Summary">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Bill Number:</span>
              <span className="font-semibold">{bill?.bill_number || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold text-lg">
                ₹ {(bill?.total_amount || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Discount:</span>
              <span className="font-semibold">
                ₹ {(bill?.discount_amount || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-semibold">Net Amount:</span>
              <span className="font-bold text-xl text-blue-600">
                ₹ {(bill?.net_amount || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount Received:</span>
              <span className="font-semibold text-green-600">
                ₹ {(bill?.amount_received || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending:</span>
              <span className="font-semibold text-red-600">
                ₹ {((bill?.net_amount || 0) - (bill?.amount_received || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Bill Items">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {billItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No services added yet
                </TableCell>
              </TableRow>
            ) : (
              billItems.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{item.service_name}</TableCell>
                  <TableCell className="text-right">₹ {item.unit_price.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-medium">
                    ₹ {item.total_amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={dischargeModal}
        onClose={() => setDischargeModal(false)}
        title="Confirm Discharge"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to discharge this patient?
          <br />
          <strong>{admission.patient?.name}</strong> ({admission.admission_number})
        </p>
        {bill && (bill.net_amount - bill.amount_received) > 0 && (
          <div className="bg-yellow-50 p-4 rounded mb-4">
            <p className="text-yellow-800">
              <strong>Warning:</strong> There is a pending amount of ₹ {(bill.net_amount - bill.amount_received).toLocaleString()}
            </p>
          </div>
        )}
        <div className="flex gap-4">
          <Button
            variant="danger"
            onClick={handleDischarge}
            loading={discharging}
          >
            Confirm Discharge
          </Button>
          <Button variant="outline" onClick={() => setDischargeModal(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
