'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ServiceCategory, Service } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'

export default function ServicesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      fetchServices(selectedCategory)
    }
  }, [selectedCategory])

  async function fetchCategories() {
    const { data } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    setCategories(data || [])
    if (data && data.length > 0) {
      setSelectedCategory(data[0].id)
    }
    setLoading(false)
  }

  async function fetchServices(categoryId: string) {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('category_id', categoryId)
      .order('name')

    setServices(data || [])
  }

  function openEditModal(service: Service) {
    setEditingService(service)
    setNewPrice(service.price.toString())
    setEditModal(true)
  }

  async function handleUpdatePrice() {
    if (!editingService) return

    setSaving(true)
    await supabase
      .from('services')
      .update({ price: parseFloat(newPrice) })
      .eq('id', editingService.id)

    setEditModal(false)
    fetchServices(selectedCategory)
    setSaving(false)
  }

  async function toggleServiceStatus(serviceId: string, currentStatus: boolean) {
    await supabase
      .from('services')
      .update({ is_active: !currentStatus })
      .eq('id', serviceId)

    fetchServices(selectedCategory)
  }

  const unitTypeLabels: Record<string, string> = {
    fixed: 'Fixed',
    per_day: 'Per Day',
    per_hour: 'Per Hour',
    per_unit: 'Per Unit',
  }

  if (loading) {
    return <div className="text-center py-8">Loading services...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Services & Pricing</h1>
      </div>

      <Card>
        <div className="mb-4">
          <label htmlFor="category" className="block text-sm font-medium mb-2">Select Category</label>
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service Name</TableHead>
              <TableHead>Unit Type</TableHead>
              <TableHead className="text-right">Price (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No services in this category
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{unitTypeLabels[service.unit_type]}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹ {service.price.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-sm ${
                      service.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(service)}
                      >
                        Edit Price
                      </Button>
                      <Button
                        size="sm"
                        variant={service.is_active ? 'destructive' : 'default'}
                        onClick={() => toggleServiceStatus(service.id, service.is_active)}
                      >
                        {service.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Service Price"
        size="sm"
      >
        {editingService && (
          <>
            <div className="mb-4">
              <p className="font-semibold text-lg">{editingService.name}</p>
              <p className="text-gray-600">Current Price: ₹ {editingService.price.toLocaleString()}</p>
            </div>

            <Input
              id="price"
              type="number"
              label="New Price (₹)"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />

            <div className="flex gap-4">
              <Button onClick={handleUpdatePrice} loading={saving}>
                Update Price
              </Button>
              <Button variant="outline" onClick={() => setEditModal(false)}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
