'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { wardService, bedService } from '@/lib/database'
import { Ward, Bed } from '@/types/database'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import {
  Plus,
  BedDouble,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Wrench,
  Loader2,
  LayoutGrid
} from 'lucide-react'

const wardTypes = [
  'General',
  'Semi-Private',
  'Private',
  'ICU',
  'NICU',
  'PICU',
  'CCU',
  'Emergency',
  'Maternity',
  'Pediatric',
  'Surgical',
  'Isolation'
]

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  occupied: 'bg-red-100 text-red-800 border-red-200',
  maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  reserved: 'bg-blue-100 text-blue-800 border-blue-200',
}

const statusIcons: Record<string, React.ReactNode> = {
  available: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  occupied: <Users className="h-4 w-4 text-red-600" />,
  maintenance: <Wrench className="h-4 w-4 text-yellow-600" />,
  reserved: <BedDouble className="h-4 w-4 text-blue-600" />,
}

export default function WardsPage() {
  const [wards, setWards] = useState<Ward[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedWard, setSelectedWard] = useState<string>('all')
  const [showAddWard, setShowAddWard] = useState(false)
  const [showAddBed, setShowAddBed] = useState(false)
  const { toast } = useToast()

  // Form states
  const [newWard, setNewWard] = useState({
    name: '',
    type: 'General',
    floor: '',
    total_beds: 0,
    daily_rate: 0,
    nursing_charge: 0
  })
  const [newBed, setNewBed] = useState({
    ward_id: '',
    bed_number: '',
    status: 'available'
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [wardsData, bedsData] = await Promise.all([
        wardService.getAll(),
        bedService.getAll()
      ])
      setWards(wardsData)
      setBeds(bedsData)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load ward data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddWard() {
    try {
      await wardService.create({
        name: newWard.name,
        type: newWard.type as Ward['type'],
        floor: newWard.floor,
        total_beds: newWard.total_beds,
        daily_rate: newWard.daily_rate,
        nursing_charge: newWard.nursing_charge,
        is_active: true
      })
      toast({
        title: 'Success',
        description: 'Ward added successfully',
        variant: 'success'
      })
      setShowAddWard(false)
      setNewWard({
        name: '',
        type: 'General',
        floor: '',
        total_beds: 0,
        daily_rate: 0,
        nursing_charge: 0
      })
      loadData()
    } catch (error) {
      console.error('Failed to add ward:', error)
      toast({
        title: 'Error',
        description: 'Failed to add ward',
        variant: 'destructive'
      })
    }
  }

  async function handleAddBed() {
    try {
      await bedService.create({
        ward_id: newBed.ward_id,
        bed_number: newBed.bed_number,
        status: newBed.status as Bed['status']
      })
      toast({
        title: 'Success',
        description: 'Bed added successfully',
        variant: 'success'
      })
      setShowAddBed(false)
      setNewBed({ ward_id: '', bed_number: '', status: 'available' })
      loadData()
    } catch (error) {
      console.error('Failed to add bed:', error)
      toast({
        title: 'Error',
        description: 'Failed to add bed',
        variant: 'destructive'
      })
    }
  }

  const filteredBeds = selectedWard === 'all'
    ? beds
    : beds.filter(b => b.ward_id === selectedWard)

  const stats = {
    totalWards: wards.length,
    totalBeds: beds.length,
    availableBeds: beds.filter(b => b.status === 'available').length,
    occupiedBeds: beds.filter(b => b.status === 'occupied').length,
    maintenanceBeds: beds.filter(b => b.status === 'maintenance').length,
  }

  const occupancyRate = stats.totalBeds > 0
    ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100)
    : 0

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
          <h1 className="text-2xl font-bold text-gray-900">Wards & Beds Management</h1>
          <p className="text-gray-500">Manage hospital wards and bed allocation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddBed(true)}>
            <BedDouble className="h-4 w-4 mr-2" />
            Add Bed
          </Button>
          <Button onClick={() => setShowAddWard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Ward
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Wards</p>
                <p className="text-2xl font-bold">{stats.totalWards}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <BedDouble className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Beds</p>
                <p className="text-2xl font-bold">{stats.totalBeds}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Available</p>
                <p className="text-2xl font-bold">{stats.availableBeds}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Occupied</p>
                <p className="text-2xl font-bold">{stats.occupiedBeds}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <LayoutGrid className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Occupancy Rate</p>
                <p className="text-2xl font-bold">{occupancyRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Ward Overview</TabsTrigger>
          <TabsTrigger value="beds">Bed Layout</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ward Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Beds</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Occupied</TableHead>
                    <TableHead>Daily Rate</TableHead>
                    <TableHead>Nursing</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wards.map((ward) => (
                    <TableRow key={ward.id}>
                      <TableCell className="font-medium">{ward.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ward.type}</Badge>
                      </TableCell>
                      <TableCell>{ward.floor || '-'}</TableCell>
                      <TableCell>{ward.total_beds}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">{ward.available_beds || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600 font-medium">{ward.occupied_beds || 0}</span>
                      </TableCell>
                      <TableCell>{formatCurrency(ward.daily_rate)}</TableCell>
                      <TableCell>{formatCurrency(ward.nursing_charge)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beds" className="space-y-4">
          {/* Ward Filter */}
          <Card>
            <CardContent className="pt-6">
              <Select value={selectedWard} onValueChange={setSelectedWard}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {wards.map((ward) => (
                    <SelectItem key={ward.id} value={ward.id}>
                      {ward.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Bed Grid */}
          {wards.filter(w => selectedWard === 'all' || w.id === selectedWard).map((ward) => (
            <Card key={ward.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{ward.name}</span>
                  <Badge variant="secondary">{ward.type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {beds
                    .filter(b => b.ward_id === ward.id)
                    .sort((a, b) => a.bed_number.localeCompare(b.bed_number))
                    .map((bed) => (
                      <div
                        key={bed.id}
                        className={`border-2 rounded-lg p-3 text-center cursor-pointer transition-all hover:shadow-md ${statusColors[bed.status]}`}
                        title={`Bed ${bed.bed_number} - ${bed.status}`}
                      >
                        <div className="flex justify-center mb-2">
                          {statusIcons[bed.status]}
                        </div>
                        <p className="font-medium text-sm">{bed.bed_number}</p>
                        <p className="text-xs capitalize">{bed.status}</p>
                      </div>
                    ))}
                  {beds.filter(b => b.ward_id === ward.id).length === 0 && (
                    <p className="col-span-full text-center text-gray-500 py-4">
                      No beds configured for this ward
                    </p>
                  )}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-200"></div>
                    <span className="text-sm text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-200"></div>
                    <span className="text-sm text-gray-600">Occupied</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-200"></div>
                    <span className="text-sm text-gray-600">Maintenance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-200"></div>
                    <span className="text-sm text-gray-600">Reserved</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Add Ward Dialog */}
      <Dialog open={showAddWard} onOpenChange={setShowAddWard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Ward</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ward Name</label>
              <Input
                value={newWard.name}
                onChange={(e) => setNewWard({ ...newWard, name: e.target.value })}
                placeholder="e.g., General Ward A"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={newWard.type}
                  onValueChange={(value) => setNewWard({ ...newWard, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wardTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Floor</label>
                <Input
                  value={newWard.floor}
                  onChange={(e) => setNewWard({ ...newWard, floor: e.target.value })}
                  placeholder="e.g., Ground Floor"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Beds</label>
                <Input
                  type="number"
                  value={newWard.total_beds}
                  onChange={(e) => setNewWard({ ...newWard, total_beds: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Daily Rate</label>
                <Input
                  type="number"
                  value={newWard.daily_rate}
                  onChange={(e) => setNewWard({ ...newWard, daily_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nursing Charge</label>
                <Input
                  type="number"
                  value={newWard.nursing_charge}
                  onChange={(e) => setNewWard({ ...newWard, nursing_charge: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWard(false)}>Cancel</Button>
            <Button onClick={handleAddWard}>Add Ward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bed Dialog */}
      <Dialog open={showAddBed} onOpenChange={setShowAddBed}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ward</label>
              <Select
                value={newBed.ward_id}
                onValueChange={(value) => setNewBed({ ...newBed, ward_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((ward) => (
                    <SelectItem key={ward.id} value={ward.id}>{ward.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bed Number</label>
              <Input
                value={newBed.bed_number}
                onChange={(e) => setNewBed({ ...newBed, bed_number: e.target.value })}
                placeholder="e.g., B-01"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={newBed.status}
                onValueChange={(value) => setNewBed({ ...newBed, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBed(false)}>Cancel</Button>
            <Button onClick={handleAddBed}>Add Bed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
