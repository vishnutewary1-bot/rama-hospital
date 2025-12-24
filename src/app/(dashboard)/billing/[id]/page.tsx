'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { admissionService, billService, billItemService, paymentService, serviceService, serviceCategoryService } from '@/lib/database'
import { Admission, Bill, BillItem, Payment, Service, ServiceCategory, PaymentMode } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import {
  User,
  Phone,
  Calendar,
  BedDouble,
  Stethoscope,
  Receipt,
  CreditCard,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Percent,
  Tag,
  Printer,
  Download,
  Save
} from 'lucide-react'

const PAYMENT_MODES = [
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Card', label: 'Debit/Credit Card' },
  { value: 'NEFT', label: 'NEFT/IMPS' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Online', label: 'Online Transfer' },
]

export default function BillingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const showPaymentModal = searchParams.get('payment') === 'true'

  const [admission, setAdmission] = useState<Admission | null>(null)
  const [bill, setBill] = useState<Bill | null>(null)
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('services')

  // Modals
  const [addServiceModal, setAddServiceModal] = useState(false)
  const [paymentModal, setPaymentModal] = useState(showPaymentModal)
  const [discountModal, setDiscountModal] = useState(false)

  // Add Service Form
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [addingService, setAddingService] = useState(false)

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  // Discount Form
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [applyingDiscount, setApplyingDiscount] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isBilling = user?.role === 'billing'
  const isWorker = user?.role === 'worker'
  const canEdit = isAdmin || isBilling || isWorker

  const fetchData = useCallback(async () => {
    try {
      const admissionData = await admissionService.getById(params.id as string)
      if (admissionData) {
        setAdmission(admissionData)

        const billData = await billService.getByAdmissionId(params.id as string)
        if (billData) {
          setBill(billData)
          const [items, paymentsList] = await Promise.all([
            billItemService.getByBillId(billData.id),
            paymentService.getByBillId(billData.id)
          ])
          setBillItems(items)
          setPayments(paymentsList)
        }
      }

      const categoriesData = await serviceCategoryService.getAll()
      setCategories(categoriesData.filter(c => c.is_active))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (params.id) {
      fetchData()
    }
  }, [params.id, fetchData])

  async function fetchServices(categoryId: string) {
    const servicesData = await serviceService.getByCategoryId(categoryId)
    setServices(servicesData.filter(s => s.is_active))
  }

  async function handleAddService() {
    if (!selectedService || !bill) return

    setAddingService(true)
    const service = services.find(s => s.id === selectedService)
    if (!service) return

    const qty = parseFloat(quantity) || 1

    try {
      await billItemService.create({
        bill_id: bill.id,
        service_id: service.id,
        service_name: service.name,
        unit_price: service.price,
        quantity: qty,
      })

      // Refresh bill and items
      const [updatedBill, items] = await Promise.all([
        billService.getById(bill.id),
        billItemService.getByBillId(bill.id)
      ])

      setBill(updatedBill)
      setBillItems(items)

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

  async function handleDeleteItem(itemId: string) {
    if (!bill || !confirm('Are you sure you want to remove this item?')) return

    try {
      await billItemService.delete(itemId)

      // Refresh bill and items
      const [updatedBill, items] = await Promise.all([
        billService.getById(bill.id),
        billItemService.getByBillId(bill.id)
      ])

      setBill(updatedBill)
      setBillItems(items)
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  async function handlePayment() {
    if (!paymentAmount || !bill) return

    setProcessingPayment(true)
    const amount = parseFloat(paymentAmount)

    try {
      await paymentService.create({
        bill_id: bill.id,
        amount: amount,
        payment_mode: paymentMode,
        transaction_reference: paymentReference || undefined,
        received_by: user?.id
      })

      // Refresh bill and payments
      const [updatedBill, paymentsList] = await Promise.all([
        billService.getById(bill.id),
        paymentService.getByBillId(bill.id)
      ])

      setBill(updatedBill)
      setPayments(paymentsList)

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

  async function handleApplyDiscount() {
    if (!discountValue || !bill) return

    setApplyingDiscount(true)
    let discountAmount = 0

    if (discountType === 'percentage') {
      discountAmount = (bill.total_amount * parseFloat(discountValue)) / 100
    } else {
      discountAmount = parseFloat(discountValue)
    }

    try {
      await billService.update(bill.id, {
        discount_amount: discountAmount,
        discount_reason: discountReason || undefined
      })

      // Refresh bill
      const updatedBill = await billService.getById(bill.id)
      setBill(updatedBill)

      // Reset form
      setDiscountValue('')
      setDiscountReason('')
      setDiscountModal(false)
    } catch (error) {
      console.error('Error applying discount:', error)
    } finally {
      setApplyingDiscount(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!admission || !bill) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-lg">Bill not found</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  const pending = (bill.net_amount || 0) - (bill.amount_received || 0)
  const selectedServiceData = services.find(s => s.id === selectedService)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{bill.bill_number}</h1>
              <Badge variant={
                bill.status === 'Paid' ? 'default' :
                bill.status === 'Partial' ? 'secondary' :
                bill.status === 'Cancelled' ? 'destructive' :
                'outline'
              }>
                {bill.status === 'Paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                {bill.status === 'Partial' && <Clock className="h-3 w-3 mr-1" />}
                {bill.status === 'Draft' && <AlertCircle className="h-3 w-3 mr-1" />}
                {bill.status}
              </Badge>
            </div>
            <p className="text-gray-500">
              Bill Date: {formatDate(bill.bill_date)} • Type: {bill.bill_type}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {admission.status === 'Active' && canEdit && (
            <Button onClick={() => setAddServiceModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          )}
          {pending > 0 && canEdit && (
            <Button variant="success" onClick={() => setPaymentModal(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Receive Payment
            </Button>
          )}
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Patient & Bill Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                {getInitials(admission.patient?.name || 'P')}
              </div>
              <div>
                <Link href={`/patients/${admission.patient_id}`} className="font-semibold hover:text-blue-600">
                  {admission.patient?.name}
                </Link>
                <p className="text-sm text-gray-500">{admission.patient?.registration_number}</p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Age / Gender</dt>
                <dd>{admission.patient?.age} / {admission.patient?.gender}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Mobile</dt>
                <dd>{admission.patient?.mobile}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Admission Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BedDouble className="h-4 w-4" />
              Admission Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Admission No.</dt>
                <dd className="font-medium">{admission.admission_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Ward</dt>
                <dd>{admission.ward?.name || admission.ward_type}</dd>
              </div>
              {admission.bed && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Bed</dt>
                  <dd>{admission.bed.bed_number}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <Badge variant={admission.status === 'Active' ? 'default' : 'secondary'}>
                    {admission.status}
                  </Badge>
                </dd>
              </div>
              {admission.doctor && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Doctor</dt>
                  <dd>Dr. {admission.doctor.name}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Bill Summary */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Bill Summary
              </span>
              {isAdmin && bill.status !== 'Paid' && (
                <Button variant="ghost" size="sm" onClick={() => setDiscountModal(true)}>
                  <Percent className="h-4 w-4 mr-1" />
                  Discount
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Subtotal</dt>
                <dd className="font-medium">{formatCurrency(bill.total_amount)}</dd>
              </div>
              {bill.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    Discount
                  </dt>
                  <dd>-{formatCurrency(bill.discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <dt>Net Amount</dt>
                <dd className="text-blue-600">{formatCurrency(bill.net_amount)}</dd>
              </div>
              <div className="flex justify-between text-green-600">
                <dt>Received</dt>
                <dd>{formatCurrency(bill.amount_received)}</dd>
              </div>
              <div className="flex justify-between text-red-600 font-bold text-lg border-t pt-2">
                <dt>Pending</dt>
                <dd>{formatCurrency(pending)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="services">Bill Items ({billItems.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {admission.status === 'Active' && canEdit && (
                      <TableHead></TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No services added yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    billItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.service_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total_amount)}</TableCell>
                        {admission.status === 'Active' && canEdit && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No payments received yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.payment_number}</TableCell>
                        <TableCell>{formatDate(payment.payment_date, 'long')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.payment_mode}</Badge>
                        </TableCell>
                        <TableCell>{payment.transaction_reference || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Service Modal */}
      <Dialog open={addServiceModal} onOpenChange={setAddServiceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  setSelectedCategory(value)
                  setSelectedService('')
                  if (value) {
                    fetchServices(value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium mb-2">Service</label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {formatCurrency(service.price)} / {service.unit_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedServiceData && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-medium">{selectedServiceData.name}</p>
                  <p className="text-blue-600">{formatCurrency(selectedServiceData.price)} / {selectedServiceData.unit_type}</p>
                </div>

                <Input
                  label={selectedServiceData.unit_type === 'per_day' ? 'Days' : 'Quantity'}
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />

                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(selectedServiceData.price * (parseFloat(quantity) || 1))}
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddServiceModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddService} disabled={!selectedService || addingService}>
              {addingService ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to Bill'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModal} onOpenChange={setPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Amount</span>
                <span className="text-xl font-bold text-red-600">{formatCurrency(pending)}</span>
              </div>
            </div>

            <Input
              label="Amount Receiving"
              type="number"
              max={pending}
              placeholder="Enter amount"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount(Math.min(pending, 500).toString())}
              >
                +500
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount(Math.min(pending, 1000).toString())}
              >
                +1000
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount(Math.min(pending, 5000).toString())}
              >
                +5000
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount(pending.toString())}
              >
                Full
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Payment Mode</label>
              <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paymentMode !== 'Cash' && (
              <Input
                label="Reference / Transaction ID"
                placeholder="Enter reference number"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handlePayment}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || processingPayment}
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Receive {paymentAmount ? formatCurrency(parseFloat(paymentAmount)) : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Modal */}
      <Dialog open={discountModal} onOpenChange={setDiscountModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">Bill Total</span>
                <span className="text-xl font-bold">{formatCurrency(bill.total_amount)}</span>
              </div>
              {bill.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600 mt-1">
                  <span>Current Discount</span>
                  <span>-{formatCurrency(bill.discount_amount)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Discount Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDiscountType('percentage')}
                  className={`p-3 rounded-lg border-2 text-center ${
                    discountType === 'percentage'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <Percent className="h-5 w-5 mx-auto mb-1" />
                  Percentage
                </button>
                <button
                  onClick={() => setDiscountType('fixed')}
                  className={`p-3 rounded-lg border-2 text-center ${
                    discountType === 'fixed'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <Tag className="h-5 w-5 mx-auto mb-1" />
                  Fixed Amount
                </button>
              </div>
            </div>

            <Input
              label={discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount'}
              type="number"
              min="0"
              max={discountType === 'percentage' ? '100' : bill.total_amount.toString()}
              placeholder={discountType === 'percentage' ? 'e.g., 10' : 'e.g., 500'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />

            {discountValue && (
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500">New Net Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    bill.total_amount - (
                      discountType === 'percentage'
                        ? (bill.total_amount * parseFloat(discountValue || '0')) / 100
                        : parseFloat(discountValue || '0')
                    )
                  )}
                </p>
              </div>
            )}

            <Input
              label="Reason (Optional)"
              placeholder="Reason for discount..."
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyDiscount} disabled={!discountValue || applyingDiscount}>
              {applyingDiscount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Discount'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
