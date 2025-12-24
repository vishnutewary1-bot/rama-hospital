'use client'

import { useEffect, useState } from 'react'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  TrendingDown,
  Clock,
  Loader2,
  Edit,
  Trash2,
  Calendar
} from 'lucide-react'

interface Medicine {
  id: string
  name: string
  generic_name?: string
}

interface Stock {
  id: string
  medicine_id: string
  batch_number: string
  purchase_date: string
  expiry_date: string
  quantity: number
  purchase_price: number
  selling_price: number
  mrp: number
  supplier_id?: string
  rack_location?: string
  notes?: string
  created_at: string
  medicine?: Medicine
  supplier?: { id: string; name: string }
}

interface StockFormData {
  medicine_id: string
  batch_number: string
  purchase_date: string
  expiry_date: string
  quantity: string
  purchase_price: string
  selling_price: string
  mrp: string
  supplier_id: string
  rack_location: string
  notes: string
}

export default function StockPage() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<StockFormData>({
    medicine_id: '',
    batch_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    quantity: '',
    purchase_price: '',
    selling_price: '',
    mrp: '',
    supplier_id: '',
    rack_location: '',
    notes: ''
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchStocks(),
      fetchMedicines(),
      fetchSuppliers()
    ])
  }, [])

  async function fetchStocks() {
    try {
      const response = await fetch('/api/pharmacy/stock')
      if (!response.ok) throw new Error('Failed to fetch stock')
      const data = await response.json()
      setStocks(data)
    } catch (error) {
      console.error('Error fetching stock:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMedicines() {
    try {
      const response = await fetch('/api/pharmacy/medicines')
      if (!response.ok) throw new Error('Failed to fetch medicines')
      const data = await response.json()
      setMedicines(data.filter((m: Medicine & { is_active: boolean }) => m.is_active))
    } catch (error) {
      console.error('Error fetching medicines:', error)
    }
  }

  async function fetchSuppliers() {
    try {
      const response = await fetch('/api/pharmacy/suppliers')
      if (!response.ok) throw new Error('Failed to fetch suppliers')
      const data = await response.json()
      setSuppliers(data.filter((s: { is_active: boolean }) => s.is_active))
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      const url = editingId
        ? `/api/pharmacy/stock?id=${editingId}`
        : '/api/pharmacy/stock'

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          purchase_price: parseFloat(formData.purchase_price),
          selling_price: parseFloat(formData.selling_price),
          mrp: parseFloat(formData.mrp),
          supplier_id: formData.supplier_id || null,
          rack_location: formData.rack_location || null,
          notes: formData.notes || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save stock')
      }

      await fetchStocks()
      resetForm()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save stock')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this stock entry?')) return

    try {
      const response = await fetch(`/api/pharmacy/stock?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete stock')
      await fetchStocks()
    } catch (error) {
      console.error('Error deleting stock:', error)
      alert('Failed to delete stock')
    }
  }

  function resetForm() {
    setFormData({
      medicine_id: '',
      batch_number: '',
      purchase_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      quantity: '',
      purchase_price: '',
      selling_price: '',
      mrp: '',
      supplier_id: '',
      rack_location: '',
      notes: ''
    })
    setEditingId(null)
    setShowForm(false)
    setFormError('')
  }

  function handleEdit(stock: Stock) {
    setFormData({
      medicine_id: stock.medicine_id,
      batch_number: stock.batch_number,
      purchase_date: stock.purchase_date.split('T')[0],
      expiry_date: stock.expiry_date.split('T')[0],
      quantity: stock.quantity.toString(),
      purchase_price: stock.purchase_price.toString(),
      selling_price: stock.selling_price.toString(),
      mrp: stock.mrp.toString(),
      supplier_id: stock.supplier_id || '',
      rack_location: stock.rack_location || '',
      notes: stock.notes || ''
    })
    setEditingId(stock.id)
    setShowForm(true)
  }

  // Check if stock is low or expiring
  function getStockAlert(stock: Stock) {
    const expiryDate = new Date(stock.expiry_date)
    const today = new Date()
    const daysToExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysToExpiry < 0) return { type: 'expired', label: 'Expired', variant: 'destructive' as const }
    if (daysToExpiry <= 30) return { type: 'expiring', label: 'Expiring Soon', variant: 'warning' as const }
    if (stock.quantity <= 10) return { type: 'low', label: 'Low Stock', variant: 'warning' as const }
    return null
  }

  // Filter stocks
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = searchQuery === '' ||
      stock.medicine?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.batch_number.toLowerCase().includes(searchQuery.toLowerCase())

    const alert = getStockAlert(stock)
    const matchesFilter = filterType === 'all' ||
      (filterType === 'low' && alert?.type === 'low') ||
      (filterType === 'expiring' && alert?.type === 'expiring') ||
      (filterType === 'expired' && alert?.type === 'expired') ||
      (filterType === 'available' && stock.quantity > 10 && alert?.type !== 'expiring' && alert?.type !== 'expired')

    return matchesSearch && matchesFilter
  })

  // Calculate stats
  const totalValue = stocks.reduce((sum, s) => sum + (s.quantity * s.purchase_price), 0)
  const lowStockCount = stocks.filter(s => s.quantity <= 10).length
  const expiringCount = stocks.filter(s => {
    const alert = getStockAlert(s)
    return alert?.type === 'expiring' || alert?.type === 'expired'
  }).length
  const totalItems = stocks.reduce((sum, s) => sum + s.quantity, 0)

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-500">Monitor inventory levels and expiry dates</p>
        </div>
        <Button size="lg" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stock
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Items</p>
                <p className="text-xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Stock Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Low Stock</p>
                <p className="text-xl font-bold text-yellow-600">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-xl font-bold text-red-600">{expiringCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Edit Stock' : 'Add New Stock'}
              </h2>
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Medicine *</label>
                  <Select
                    value={formData.medicine_id}
                    onValueChange={(value) => setFormData({ ...formData, medicine_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select medicine..." />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map(med => (
                        <SelectItem key={med.id} value={med.id}>
                          {med.name} {med.generic_name && `(${med.generic_name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  label="Batch Number *"
                  placeholder="Enter batch number"
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                  required
                />
                <Input
                  label="Purchase Date *"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  required
                />
                <Input
                  label="Expiry Date *"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  required
                />
                <Input
                  label="Quantity *"
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
                <Input
                  label="Purchase Price *"
                  type="number"
                  step="0.01"
                  placeholder="Enter purchase price"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  required
                />
                <Input
                  label="Selling Price *"
                  type="number"
                  step="0.01"
                  placeholder="Enter selling price"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  required
                />
                <Input
                  label="MRP *"
                  type="number"
                  step="0.01"
                  placeholder="Enter MRP"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Supplier</label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {suppliers.map(sup => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  label="Rack Location"
                  placeholder="e.g., A-1, B-3"
                  value={formData.rack_location}
                  onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })}
                />
              </div>
              <Input
                label="Notes"
                placeholder="Additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                  {formError}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" loading={formLoading}>
                  {editingId ? 'Update Stock' : 'Add Stock'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by medicine or batch..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch No.</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Purchase Price</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead>Alert</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No stock found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStocks.map((stock) => {
                  const alert = getStockAlert(stock)
                  return (
                    <TableRow key={stock.id}>
                      <TableCell className="font-medium">
                        {stock.medicine?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{stock.batch_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(stock.expiry_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{stock.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stock.purchase_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stock.selling_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stock.mrp)}</TableCell>
                      <TableCell>
                        {alert && (
                          <Badge variant={alert.variant}>
                            {alert.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(stock)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(stock.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
