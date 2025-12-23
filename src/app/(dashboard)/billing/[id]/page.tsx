'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Admission, Bill, BillItem, ServiceCategory, Service, Payment } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'

export default function BillingDetailsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { profile } = useAuth()
  const showPaymentModal = searchParams.get('payment') === 'true'

  const [admission, setAdmission] = useState<Admission | null>(null)
  const [bill, setBill] = useState<Bill | null>(null)
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const [addServiceModal, setAddServiceModal] = useState(false)
  const [paymentModal, setPaymentModal] = useState(showPaymentModal)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [addingService, setAddingService] = useState(false)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchData()
    }
  }, [params.id])

  async function fetchData() {
    const { data: admissionData } = await supabase
      .from('admissions')
      .select(`
        *,
        patient:patients(*)
      `)
      .eq('id', params.id)
      .single()

    if (admissionData) {
      setAdmission(admissionData)

      const { data: billData } = await supabase
        .from('bills')
        .select('*')
        .eq('admission_id', params.id)
        .single()

      if (billData) {
        setBill(billData)
        fetchBillItems(billData.id)
        fetchPayments(billData.id)
      }
    }

    // Fetch categories and services
    const { data: categoriesData } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    setCategories(categoriesData || [])
    setLoading(false)
  }

  async function fetchBillItems(billId: string) {
    const { data } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', billId)
      .order('created_at', { ascending: true })

    setBillItems(data || [])
  }

  async function fetchPayments(billId: string) {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('bill_id', billId)
      .order('payment_date', { ascending: false })

    setPayments(data || [])
  }

  async function fetchServices(categoryId: string) {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name')

    setServices(data || [])
  }

  async function handleAddService() {
    if (!selectedService || !bill) return

    setAddingService(true)
    const service = services.find(s => s.id === selectedService)
    if (!service) return

    const qty = parseFloat(quantity) || 1
    const total = service.price * qty

    try {
      await supabase.from('bill_items').insert({
        bill_id: bill.id,
        service_id: service.id,
        service_name: service.name,
        unit_price: service.price,
        quantity: qty,
        total_amount: total,
      })

      // Refresh bill and items
      const { data: updatedBill } = await supabase
        .from('bills')
        .select('*')
        .eq('id', bill.id)
        .single()

      setBill(updatedBill)
      fetchBillItems(bill.id)

      // Reset form
      setSelectedService('')
      setQuantity('1')
      setAddServiceModal(false)
    } catch (error) {
      console.error('Error adding service:', error)
    } finally {
      setAddingService(false)
    }
  }

  async function handlePayment() {
    if (!paymentAmount || !bill) return

    setProcessingPayment(true)
    const amount = parseFloat(paymentAmount)

    try {
      await supabase.from('payments').insert({
        bill_id: bill.id,
        amount: amount,
        payment_mode: paymentMode,
        payment_reference: paymentReference || null,
      })

      // Refresh bill and payments
      const { data: updatedBill } = await supabase
        .from('bills')
        .select('*')
        .eq('id', bill.id)
        .single()

      setBill(updatedBill)
      fetchPayments(bill.id)

      // Reset form
      setPaymentAmount('')
      setPaymentReference('')
      setPaymentModal(false)
    } catch (error) {
      console.error('Error processing payment:', error)
    } finally {
      setProcessingPayment(false)
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!bill || !confirm('Are you sure you want to remove this item?')) return

    await supabase.from('bill_items').delete().eq('id', itemId)

    // Refresh bill and items
    const { data: updatedBill } = await supabase
      .from('bills')
      .select('*')
      .eq('id', bill.id)
      .single()

    setBill(updatedBill)
    fetchBillItems(bill.id)
  }

  if (loading) {
    return <div className="text-center py-8">Loading billing details...</div>
  }

  if (!admission || !bill) {
    return <div className="text-center py-8 text-red-600">Bill not found</div>
  }

  const pending = (bill.net_amount || 0) - (bill.amount_received || 0)
  const selectedServiceData = services.find(s => s.id === selectedService)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Billing</h1>
          <p className="text-gray-600">{bill.bill_number}</p>
        </div>
        <div className="flex gap-2">
          {admission.status === 'Active' && (
            <Button size="lg" onClick={() => setAddServiceModal(true)}>
              + Add Service
            </Button>
          )}
          {pending > 0 && (
            <Button size="lg" variant="success" onClick={() => setPaymentModal(true)}>
              Receive Payment
            </Button>
          )}
          <Link href="/billing">
            <Button variant="outline">Back to Bills</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="Patient">
          <div className="space-y-2">
            <p className="font-semibold text-lg">{admission.patient?.name}</p>
            <p className="text-gray-600">{admission.patient?.registration_number}</p>
            <p className="text-gray-600">
              {admission.patient?.age} years / {admission.patient?.gender}
            </p>
          </div>
        </Card>

        <Card title="Admission">
          <div className="space-y-2">
            <p className="font-semibold">{admission.admission_number}</p>
            <p className="text-gray-600">Ward: {admission.ward_type}</p>
            <span className={`inline-block px-2 py-1 rounded text-sm ${
              admission.status === 'Active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {admission.status}
            </span>
          </div>
        </Card>

        <Card title="Bill Summary">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-semibold">₹ {(bill.total_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>₹ {(bill.discount_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Net Amount:</span>
              <span className="font-bold text-blue-600">₹ {(bill.net_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Received:</span>
              <span className="text-green-600">₹ {(bill.amount_received || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Pending:</span>
              <span className="font-bold text-red-600">₹ {pending.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Bill Items">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {admission.status === 'Active' && profile?.role === 'admin' && (
                  <TableHead></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {billItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                    No services added
                  </TableCell>
                </TableRow>
              ) : (
                billItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.service_name}</TableCell>
                    <TableCell className="text-right">₹ {item.unit_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹ {item.total_amount.toLocaleString()}
                    </TableCell>
                    {admission.status === 'Active' && profile?.role === 'admin' && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          X
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Card title="Payment History">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                    No payments received
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>{payment.payment_mode}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      ₹ {payment.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Add Service Modal */}
      <Modal
        isOpen={addServiceModal}
        onClose={() => setAddServiceModal(false)}
        title="Add Service"
        size="md"
      >
        <Select
          id="category"
          label="Category"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
            setSelectedService('')
            if (e.target.value) {
              fetchServices(e.target.value)
            }
          }}
          options={categories.map(c => ({ value: c.id, label: c.name }))}
        />

        {selectedCategory && (
          <Select
            id="service"
            label="Service"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            options={services.map(s => ({
              value: s.id,
              label: `${s.name} - ₹${s.price} (${s.unit_type})`,
            }))}
          />
        )}

        {selectedServiceData && (
          <>
            <div className="bg-blue-50 p-4 rounded mb-4">
              <p className="font-medium">{selectedServiceData.name}</p>
              <p className="text-blue-600">₹ {selectedServiceData.price} / {selectedServiceData.unit_type}</p>
            </div>

            <Input
              id="quantity"
              type="number"
              label={selectedServiceData.unit_type === 'per_day' ? 'Days' : 'Quantity'}
              min="0.5"
              step="0.5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />

            <div className="bg-gray-50 p-4 rounded mb-4">
              <p className="text-lg font-semibold">
                Total: ₹ {(selectedServiceData.price * (parseFloat(quantity) || 1)).toLocaleString()}
              </p>
            </div>
          </>
        )}

        <div className="flex gap-4">
          <Button
            onClick={handleAddService}
            loading={addingService}
            disabled={!selectedService}
          >
            Add to Bill
          </Button>
          <Button variant="outline" onClick={() => setAddServiceModal(false)}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
        title="Receive Payment"
        size="md"
      >
        <div className="bg-gray-50 p-4 rounded mb-4">
          <div className="flex justify-between">
            <span>Pending Amount:</span>
            <span className="font-bold text-red-600">₹ {pending.toLocaleString()}</span>
          </div>
        </div>

        <Input
          id="amount"
          type="number"
          label="Amount Receiving"
          placeholder="Enter amount"
          max={pending}
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
        />

        <Select
          id="mode"
          label="Payment Mode"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          options={[
            { value: 'Cash', label: 'Cash' },
            { value: 'UPI', label: 'UPI' },
            { value: 'Card', label: 'Card' },
            { value: 'NEFT', label: 'NEFT/Bank Transfer' },
            { value: 'Cheque', label: 'Cheque' },
          ]}
        />

        {paymentMode !== 'Cash' && (
          <Input
            id="reference"
            label="Reference (UPI ID / Card Last 4 / Cheque No)"
            placeholder="Enter reference"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
          />
        )}

        <div className="flex gap-4">
          <Button
            variant="success"
            onClick={handlePayment}
            loading={processingPayment}
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
          >
            Receive Payment
          </Button>
          <Button variant="outline" onClick={() => setPaymentModal(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
