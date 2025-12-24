'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import {
  ShoppingCart,
  Plus,
  Trash2,
  User,
  Search,
  AlertCircle,
  ArrowLeft,
  Loader2
} from 'lucide-react'

interface Patient {
  id: string
  name: string
  registration_number: string
  mobile: string
  age: number
  gender: string
}

interface Doctor {
  id: string
  name: string
  specialization: string
}

interface Stock {
  id: string
  medicine_id: string
  batch_number: string
  expiry_date: string
  quantity: number
  selling_price: number
  mrp: number
  medicine?: {
    id: string
    name: string
    generic_name?: string
    unit?: string
  }
}

interface SaleItem {
  stockId: string
  medicineName: string
  genericName?: string
  batchNumber: string
  expiryDate: string
  availableQty: number
  quantity: number
  unitPrice: number
  mrp: number
  discount: number
  total: number
}

export default function NewSalePage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form data
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [walkInName, setWalkInName] = useState('')
  const [walkInMobile, setWalkInMobile] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [notes, setNotes] = useState('')

  // Medicine selection
  const [medicineSearch, setMedicineSearch] = useState('')
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [itemQuantity, setItemQuantity] = useState('1')
  const [itemDiscount, setItemDiscount] = useState('0')

  // Cart
  const [cartItems, setCartItems] = useState<SaleItem[]>([])

  useEffect(() => {
    Promise.all([
      fetchPatients(),
      fetchDoctors(),
      fetchStocks()
    ]).finally(() => setLoading(false))
  }, [])

  async function fetchPatients() {
    try {
      const response = await fetch('/api/patients')
      if (response.ok) {
        const data = await response.json()
        setPatients(data.slice(0, 100)) // Limit for performance
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
    }
  }

  async function fetchDoctors() {
    try {
      const response = await fetch('/api/doctors')
      if (response.ok) {
        const data = await response.json()
        setDoctors(data.filter((d: Doctor & { is_active: boolean }) => d.is_active))
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
    }
  }

  async function fetchStocks() {
    try {
      const response = await fetch('/api/pharmacy/stock')
      if (response.ok) {
        const data = await response.json()
        // Only show stock with quantity > 0 and not expired
        const available = data.filter((s: Stock) => {
          const expiryDate = new Date(s.expiry_date)
          const today = new Date()
          return s.quantity > 0 && expiryDate > today
        })
        setStocks(available)
      }
    } catch (error) {
      console.error('Error fetching stocks:', error)
    }
  }

  function handleAddToCart() {
    if (!selectedStock) {
      alert('Please select a medicine')
      return
    }

    const quantity = parseInt(itemQuantity)
    if (quantity <= 0 || quantity > selectedStock.quantity) {
      alert('Invalid quantity')
      return
    }

    const discount = parseFloat(itemDiscount) || 0
    const subtotal = quantity * selectedStock.selling_price
    const total = subtotal - discount

    const newItem: SaleItem = {
      stockId: selectedStock.id,
      medicineName: selectedStock.medicine?.name || 'Unknown',
      genericName: selectedStock.medicine?.generic_name,
      batchNumber: selectedStock.batch_number,
      expiryDate: selectedStock.expiry_date,
      availableQty: selectedStock.quantity,
      quantity,
      unitPrice: selectedStock.selling_price,
      mrp: selectedStock.mrp,
      discount,
      total
    }

    setCartItems([...cartItems, newItem])
    setSelectedStock(null)
    setMedicineSearch('')
    setItemQuantity('1')
    setItemDiscount('0')
  }

  function handleRemoveItem(index: number) {
    setCartItems(cartItems.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (cartItems.length === 0) {
      setError('Please add at least one item to the cart')
      return
    }

    if (!selectedPatient && !walkInName) {
      setError('Please select a patient or enter walk-in customer details')
      return
    }

    setSaving(true)

    try {
      const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      const totalDiscount = cartItems.reduce((sum, item) => sum + item.discount, 0)
      const total = subtotal - totalDiscount

      const saleData = {
        patient_id: selectedPatient?.id || null,
        patient_name: selectedPatient ? null : walkInName,
        patient_mobile: selectedPatient ? null : walkInMobile,
        doctor_id: selectedDoctor || null,
        payment_mode: paymentMode,
        notes: notes || null,
        items: cartItems.map(item => ({
          stock_id: item.stockId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: item.discount
        }))
      }

      const response = await fetch('/api/pharmacy/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create sale')
      }

      router.push('/pharmacy/sales')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create sale')
    } finally {
      setSaving(false)
    }
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const totalDiscount = cartItems.reduce((sum, item) => sum + item.discount, 0)
  const grandTotal = subtotal - totalDiscount

  // Filter patients for search
  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.registration_number.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mobile.includes(patientSearch)
  ).slice(0, 10)

  // Filter stocks for medicine search
  const filteredStocks = stocks.filter(s =>
    s.medicine?.name.toLowerCase().includes(medicineSearch.toLowerCase()) ||
    s.medicine?.generic_name?.toLowerCase().includes(medicineSearch.toLowerCase()) ||
    s.batch_number.toLowerCase().includes(medicineSearch.toLowerCase())
  ).slice(0, 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Pharmacy Sale</h1>
          <p className="text-gray-500">Dispense medicines and create invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient & Medicine Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <Card>
            <CardContent className="pt-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </h2>

              <div className="space-y-4">
                {!selectedPatient ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search patient by name, registration number, or mobile..."
                        className="pl-10"
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                      />
                    </div>

                    {patientSearch && filteredPatients.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                        {filteredPatients.map(patient => (
                          <div
                            key={patient.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedPatient(patient)
                              setPatientSearch('')
                            }}
                          >
                            <p className="font-medium">{patient.name}</p>
                            <p className="text-sm text-gray-500">
                              {patient.registration_number} | {patient.mobile} | {patient.age} {patient.gender}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Or enter walk-in customer details:</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Customer Name"
                          value={walkInName}
                          onChange={(e) => setWalkInName(e.target.value)}
                        />
                        <Input
                          placeholder="Mobile Number"
                          value={walkInMobile}
                          onChange={(e) => setWalkInMobile(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
                    <div>
                      <p className="font-medium">{selectedPatient.name}</p>
                      <p className="text-sm text-gray-500">
                        {selectedPatient.registration_number} | {selectedPatient.mobile}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPatient(null)}
                    >
                      Change
                    </Button>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Prescribed By (Optional)</label>
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {doctors.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.name} - {doc.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medicine Selection */}
          <Card>
            <CardContent className="pt-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Add Medicines
              </h2>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search medicine by name, generic name, or batch..."
                    className="pl-10"
                    value={medicineSearch}
                    onChange={(e) => setMedicineSearch(e.target.value)}
                  />
                </div>

                {medicineSearch && filteredStocks.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {filteredStocks.map(stock => (
                      <div
                        key={stock.id}
                        className={`p-3 hover:bg-gray-50 cursor-pointer ${
                          selectedStock?.id === stock.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedStock(stock)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{stock.medicine?.name}</p>
                            {stock.medicine?.generic_name && (
                              <p className="text-sm text-gray-500">{stock.medicine.generic_name}</p>
                            )}
                            <p className="text-sm text-gray-500">
                              Batch: {stock.batch_number} | Available: {stock.quantity} | Price: {formatCurrency(stock.selling_price)}
                            </p>
                          </div>
                          <Badge variant="outline">{stock.medicine?.unit || 'Unit'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedStock && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{selectedStock.medicine?.name}</p>
                        <p className="text-sm text-gray-500">
                          Batch: {selectedStock.batch_number} | Available: {selectedStock.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(selectedStock.selling_price)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        type="number"
                        label="Quantity"
                        min="1"
                        max={selectedStock.quantity}
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value)}
                      />
                      <Input
                        type="number"
                        label="Discount"
                        step="0.01"
                        min="0"
                        value={itemDiscount}
                        onChange={(e) => setItemDiscount(e.target.value)}
                      />
                      <div>
                        <label className="block text-sm font-medium mb-2">Total</label>
                        <p className="text-lg font-semibold text-green-600">
                          {formatCurrency(
                            (parseInt(itemQuantity) || 0) * selectedStock.selling_price - (parseFloat(itemDiscount) || 0)
                          )}
                        </p>
                      </div>
                    </div>
                    <Button type="button" onClick={handleAddToCart} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cart Items */}
          <Card>
            <CardContent className="pt-4">
              <h2 className="text-lg font-semibold mb-4">Cart Items</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        Cart is empty. Add medicines to continue.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cartItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <p className="font-medium">{item.medicineName}</p>
                          {item.genericName && (
                            <p className="text-sm text-gray-500">{item.genericName}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{item.batchNumber}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {item.discount > 0 ? formatCurrency(item.discount) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary & Payment */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="sticky top-6">
            <CardContent className="pt-4">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              <div className="space-y-3 border-b pb-4 mb-4">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-red-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(totalDiscount)}</span>
                </div>
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Grand Total</span>
                  <span className="text-green-600">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Mode *</label>
                  <Select value={paymentMode} onValueChange={setPaymentMode} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  label="Notes (Optional)"
                  placeholder="Add any notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={saving}
                  disabled={cartItems.length === 0}
                >
                  Complete Sale - {formatCurrency(grandTotal)}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
