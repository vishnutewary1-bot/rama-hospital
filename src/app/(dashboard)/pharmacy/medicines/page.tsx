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
import { formatCurrency } from '@/lib/utils'
import {
  Pill,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  Loader2,
  XCircle
} from 'lucide-react'

interface Medicine {
  id: string
  name: string
  generic_name?: string
  category?: string
  manufacturer?: string
  unit?: string
  reorder_level?: number
  rack_location?: string
  hsn_code?: string
  is_active: boolean
  created_at: string
}

interface MedicineFormData {
  name: string
  generic_name: string
  category: string
  manufacturer: string
  unit: string
  reorder_level: string
  rack_location: string
  hsn_code: string
  is_active: boolean
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<MedicineFormData>({
    name: '',
    generic_name: '',
    category: '',
    manufacturer: '',
    unit: 'Tablet',
    reorder_level: '10',
    rack_location: '',
    hsn_code: '',
    is_active: true
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchMedicines()
  }, [])

  async function fetchMedicines() {
    try {
      const response = await fetch('/api/pharmacy/medicines')
      if (!response.ok) throw new Error('Failed to fetch medicines')
      const data = await response.json()
      setMedicines(data)
    } catch (error) {
      console.error('Error fetching medicines:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      const url = editingId
        ? `/api/pharmacy/medicines?id=${editingId}`
        : '/api/pharmacy/medicines'

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          reorder_level: formData.reorder_level ? parseInt(formData.reorder_level) : null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save medicine')
      }

      await fetchMedicines()
      resetForm()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save medicine')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this medicine?')) return

    try {
      const response = await fetch(`/api/pharmacy/medicines?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete medicine')
      await fetchMedicines()
    } catch (error) {
      console.error('Error deleting medicine:', error)
      alert('Failed to delete medicine')
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      generic_name: '',
      category: '',
      manufacturer: '',
      unit: 'Tablet',
      reorder_level: '10',
      rack_location: '',
      hsn_code: '',
      is_active: true
    })
    setEditingId(null)
    setShowForm(false)
    setFormError('')
  }

  function handleEdit(medicine: Medicine) {
    setFormData({
      name: medicine.name,
      generic_name: medicine.generic_name || '',
      category: medicine.category || '',
      manufacturer: medicine.manufacturer || '',
      unit: medicine.unit || 'Tablet',
      reorder_level: medicine.reorder_level?.toString() || '10',
      rack_location: medicine.rack_location || '',
      hsn_code: medicine.hsn_code || '',
      is_active: medicine.is_active
    })
    setEditingId(medicine.id)
    setShowForm(true)
  }

  // Get unique categories for filter
  const categories = Array.from(new Set(medicines.map(m => m.category).filter(Boolean)))

  // Filter medicines
  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = searchQuery === '' ||
      medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medicine.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medicine.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || medicine.category === categoryFilter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && medicine.is_active) ||
      (statusFilter === 'inactive' && !medicine.is_active)

    return matchesSearch && matchesCategory && matchesStatus
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Medicine Management</h1>
          <p className="text-gray-500">Manage medicine master data</p>
        </div>
        <Button size="lg" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Medicine
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Pill className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Medicines</p>
                <p className="text-xl font-bold">{medicines.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-xl font-bold">{medicines.filter(m => m.is_active).length}</p>
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
                <p className="text-sm text-gray-500">Categories</p>
                <p className="text-xl font-bold">{categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inactive</p>
                <p className="text-xl font-bold">{medicines.filter(m => !m.is_active).length}</p>
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
                {editingId ? 'Edit Medicine' : 'Add New Medicine'}
              </h2>
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Medicine Name *"
                  placeholder="Enter medicine name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Generic Name"
                  placeholder="Enter generic name"
                  value={formData.generic_name}
                  onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                />
                <Input
                  label="Category"
                  placeholder="e.g., Antibiotics, Analgesics"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <Input
                  label="Manufacturer"
                  placeholder="Enter manufacturer name"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Unit *</label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Capsule">Capsule</SelectItem>
                      <SelectItem value="Syrup">Syrup</SelectItem>
                      <SelectItem value="Injection">Injection</SelectItem>
                      <SelectItem value="Cream">Cream</SelectItem>
                      <SelectItem value="Ointment">Ointment</SelectItem>
                      <SelectItem value="Drops">Drops</SelectItem>
                      <SelectItem value="Inhaler">Inhaler</SelectItem>
                      <SelectItem value="Sachet">Sachet</SelectItem>
                      <SelectItem value="Vial">Vial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  label="Reorder Level"
                  type="number"
                  placeholder="Minimum stock alert"
                  value={formData.reorder_level}
                  onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                />
                <Input
                  label="Rack Location"
                  placeholder="e.g., A-1, B-3"
                  value={formData.rack_location}
                  onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })}
                />
                <Input
                  label="HSN Code"
                  placeholder="Enter HSN code"
                  value={formData.hsn_code}
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm font-medium">Active</label>
              </div>
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                  {formError}
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" loading={formLoading}>
                  {editingId ? 'Update Medicine' : 'Add Medicine'}
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
                placeholder="Search medicines..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Medicines Table */}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Generic Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No medicines found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMedicines.map((medicine) => (
                  <TableRow key={medicine.id}>
                    <TableCell className="font-medium">{medicine.name}</TableCell>
                    <TableCell className="text-gray-500">{medicine.generic_name || '-'}</TableCell>
                    <TableCell>
                      {medicine.category ? (
                        <Badge variant="outline">{medicine.category}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-gray-500">{medicine.manufacturer || '-'}</TableCell>
                    <TableCell>{medicine.unit || '-'}</TableCell>
                    <TableCell>{medicine.reorder_level || '-'}</TableCell>
                    <TableCell className="text-gray-500">{medicine.rack_location || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={medicine.is_active ? 'success' : 'secondary'}>
                        {medicine.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(medicine)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(medicine.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
