'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { settingsService, backupService, areaService, referralService } from '@/lib/database'
import { Setting, Area, Referral } from '@/types/database'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import {
  Building2,
  Receipt,
  Database,
  Shield,
  MapPin,
  Users,
  Save,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  Clock,
  HardDrive,
  Plus,
  Trash2
} from 'lucide-react'

interface HospitalSettings {
  name: string
  address: string
  phone: string
  email: string
  logo: string
}

interface BillingSettings {
  patient_prefix: string
  admission_prefix: string
  bill_prefix: string
  payment_prefix: string
  test_prefix: string
  tax_enabled: boolean
  tax_percentage: number
  discount_limit: number
}

interface BackupSettings {
  auto_backup: boolean
  backup_frequency: string
  backup_retention_days: number
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('hospital')

  // Settings states
  const [hospitalSettings, setHospitalSettings] = useState<HospitalSettings>({
    name: 'Rama Hospital',
    address: '',
    phone: '',
    email: '',
    logo: ''
  })

  const [billingSettings, setBillingSettings] = useState<BillingSettings>({
    patient_prefix: 'RH',
    admission_prefix: 'ADM',
    bill_prefix: 'BILL',
    payment_prefix: 'PAY',
    test_prefix: 'LAB',
    tax_enabled: false,
    tax_percentage: 18,
    discount_limit: 10
  })

  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    auto_backup: true,
    backup_frequency: 'daily',
    backup_retention_days: 30
  })

  const [backups, setBackups] = useState<Array<{ name: string; path: string; date: Date }>>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])

  // New area/referral form
  const [newArea, setNewArea] = useState({ name: '', pincode: '' })
  const [newReferral, setNewReferral] = useState({ name: '', type: 'Doctor', phone: '' })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)

      // Load all settings
      const settings = await settingsService.getAll()

      // Parse hospital settings
      const hospital: HospitalSettings = {
        name: settings.find(s => s.category === 'hospital' && s.key === 'name')?.value || 'Rama Hospital',
        address: settings.find(s => s.category === 'hospital' && s.key === 'address')?.value || '',
        phone: settings.find(s => s.category === 'hospital' && s.key === 'phone')?.value || '',
        email: settings.find(s => s.category === 'hospital' && s.key === 'email')?.value || '',
        logo: settings.find(s => s.category === 'hospital' && s.key === 'logo')?.value || ''
      }
      setHospitalSettings(hospital)

      // Parse billing settings
      const billing: BillingSettings = {
        patient_prefix: settings.find(s => s.category === 'billing' && s.key === 'patient_prefix')?.value || 'RH',
        admission_prefix: settings.find(s => s.category === 'billing' && s.key === 'admission_prefix')?.value || 'ADM',
        bill_prefix: settings.find(s => s.category === 'billing' && s.key === 'bill_prefix')?.value || 'BILL',
        payment_prefix: settings.find(s => s.category === 'billing' && s.key === 'payment_prefix')?.value || 'PAY',
        test_prefix: settings.find(s => s.category === 'billing' && s.key === 'test_prefix')?.value || 'LAB',
        tax_enabled: settings.find(s => s.category === 'billing' && s.key === 'tax_enabled')?.value === 'true',
        tax_percentage: parseFloat(settings.find(s => s.category === 'billing' && s.key === 'tax_percentage')?.value || '18'),
        discount_limit: parseFloat(settings.find(s => s.category === 'billing' && s.key === 'discount_limit')?.value || '10')
      }
      setBillingSettings(billing)

      // Parse backup settings
      const backup: BackupSettings = {
        auto_backup: settings.find(s => s.category === 'backup' && s.key === 'auto_backup')?.value !== 'false',
        backup_frequency: settings.find(s => s.category === 'backup' && s.key === 'backup_frequency')?.value || 'daily',
        backup_retention_days: parseInt(settings.find(s => s.category === 'backup' && s.key === 'backup_retention_days')?.value || '30')
      }
      setBackupSettings(backup)

      // Load backups list
      // TODO: Implement backup list API
      // const backupList = await backupService.list()
      setBackups([])

      // Load areas and referrals
      const [areasData, referralsData] = await Promise.all([
        areaService.getAll(),
        referralService.getAll()
      ])
      setAreas(areasData)
      setReferrals(referralsData)

    } catch (error) {
      console.error('Failed to load settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  async function saveHospitalSettings() {
    try {
      setSaving(true)
      await Promise.all([
        settingsService.set('hospital.name', hospitalSettings.name),
        settingsService.set('hospital.address', hospitalSettings.address),
        settingsService.set('hospital.phone', hospitalSettings.phone),
        settingsService.set('hospital.email', hospitalSettings.email),
      ])
      toast({ title: 'Success', description: 'Hospital settings saved', variant: 'success' })
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function saveBillingSettings() {
    try {
      setSaving(true)
      await Promise.all([
        settingsService.set('billing.patient_prefix', billingSettings.patient_prefix),
        settingsService.set('billing.admission_prefix', billingSettings.admission_prefix),
        settingsService.set('billing.bill_prefix', billingSettings.bill_prefix),
        settingsService.set('billing.payment_prefix', billingSettings.payment_prefix),
        settingsService.set('billing.test_prefix', billingSettings.test_prefix),
        settingsService.set('billing.tax_enabled', billingSettings.tax_enabled.toString()),
        settingsService.set('billing.tax_percentage', billingSettings.tax_percentage.toString()),
        settingsService.set('billing.discount_limit', billingSettings.discount_limit.toString()),
      ])
      toast({ title: 'Success', description: 'Billing settings saved', variant: 'success' })
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function createBackup() {
    try {
      setSaving(true)
      const result = await backupService.create()
      if (result.success) {
        toast({ title: 'Success', description: 'Backup created successfully', variant: 'success' })
        await loadSettings()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to create backup:', error)
      toast({ title: 'Error', description: 'Failed to create backup', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function exportBackup() {
    try {
      // TODO: Implement export functionality
      const result = await backupService.create()
      if (result.success) {
        toast({ title: 'Success', description: `Backup created at ${result.path}`, variant: 'success' })
      }
    } catch (error) {
      console.error('Failed to export backup:', error)
      toast({ title: 'Error', description: 'Failed to export backup', variant: 'destructive' })
    }
  }

  async function restoreBackup(path: string) {
    if (!confirm('Are you sure you want to restore this backup? Current data will be replaced.')) {
      return
    }
    try {
      setSaving(true)
      const result = await backupService.restore(path)
      if (result.success) {
        toast({ title: 'Success', description: 'Backup restored successfully. Please restart the application.', variant: 'success' })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to restore backup:', error)
      toast({ title: 'Error', description: 'Failed to restore backup', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function addArea() {
    if (!newArea.name) return
    try {
      // TODO: areaService.create() method does not exist - implement in database service layer
      // await areaService.create({ name: newArea.name, pincode: newArea.pincode, is_active: true })
      setNewArea({ name: '', pincode: '' })
      await loadSettings()
      toast({ title: 'Success', description: 'Area added', variant: 'success' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add area', variant: 'destructive' })
    }
  }

  async function addReferral() {
    if (!newReferral.name) return
    try {
      // TODO: referralService.create() method does not exist - implement in database service layer
      // await referralService.create({
      //   name: newReferral.name,
      //   type: newReferral.type as Referral['type'],
      //   phone: newReferral.phone,
      //   is_active: true
      // })
      setNewReferral({ name: '', type: 'Doctor', phone: '' })
      await loadSettings()
      toast({ title: 'Success', description: 'Referral source added', variant: 'success' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add referral', variant: 'destructive' })
    }
  }

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Configure hospital settings, billing, and system preferences</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="hospital">
            <Building2 className="h-4 w-4 mr-2" />
            Hospital
          </TabsTrigger>
          <TabsTrigger value="billing">
            <Receipt className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="h-4 w-4 mr-2" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="masters">
            <MapPin className="h-4 w-4 mr-2" />
            Master Data
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Hospital Settings */}
        <TabsContent value="hospital" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Information</CardTitle>
              <CardDescription>Basic details about your hospital</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hospital Name</label>
                  <Input
                    value={hospitalSettings.name}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={hospitalSettings.phone}
                    onChange={(e) => setHospitalSettings({ ...hospitalSettings, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={hospitalSettings.address}
                  onChange={(e) => setHospitalSettings({ ...hospitalSettings, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={hospitalSettings.email}
                  onChange={(e) => setHospitalSettings({ ...hospitalSettings, email: e.target.value })}
                />
              </div>
              <Button onClick={saveHospitalSettings} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Number Prefixes</CardTitle>
              <CardDescription>Configure prefixes for auto-generated numbers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Patient ID Prefix</label>
                  <Input
                    value={billingSettings.patient_prefix}
                    onChange={(e) => setBillingSettings({ ...billingSettings, patient_prefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admission Prefix</label>
                  <Input
                    value={billingSettings.admission_prefix}
                    onChange={(e) => setBillingSettings({ ...billingSettings, admission_prefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bill Prefix</label>
                  <Input
                    value={billingSettings.bill_prefix}
                    onChange={(e) => setBillingSettings({ ...billingSettings, bill_prefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Prefix</label>
                  <Input
                    value={billingSettings.payment_prefix}
                    onChange={(e) => setBillingSettings({ ...billingSettings, payment_prefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lab Test Prefix</label>
                  <Input
                    value={billingSettings.test_prefix}
                    onChange={(e) => setBillingSettings({ ...billingSettings, test_prefix: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax & Discount Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enable Tax</label>
                  <Select
                    value={billingSettings.tax_enabled ? 'true' : 'false'}
                    onValueChange={(v) => setBillingSettings({ ...billingSettings, tax_enabled: v === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax Percentage (%)</label>
                  <Input
                    type="number"
                    value={billingSettings.tax_percentage}
                    onChange={(e) => setBillingSettings({ ...billingSettings, tax_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Discount (%) without Approval</label>
                  <Input
                    type="number"
                    value={billingSettings.discount_limit}
                    onChange={(e) => setBillingSettings({ ...billingSettings, discount_limit: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <Button onClick={saveBillingSettings} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Backup Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" onClick={createBackup} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Create Backup Now
                </Button>
                <Button variant="outline" className="w-full" onClick={exportBackup}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Backup to File
                </Button>
                {/* TODO: backupService.selectFile() method does not exist - implement file selection functionality */}
                <Button variant="outline" className="w-full" disabled>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Backup from File
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Auto Backup Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enable Auto Backup</label>
                  <Select
                    value={backupSettings.auto_backup ? 'true' : 'false'}
                    onValueChange={(v) => setBackupSettings({ ...backupSettings, auto_backup: v === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Backup Frequency</label>
                  <Select
                    value={backupSettings.backup_frequency}
                    onValueChange={(v) => setBackupSettings({ ...backupSettings, backup_frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Retention Days</label>
                  <Input
                    type="number"
                    value={backupSettings.backup_retention_days}
                    onChange={(e) => setBackupSettings({ ...backupSettings, backup_retention_days: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Available Backups</CardTitle>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No backups available</p>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup) => (
                    <div key={backup.path} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{backup.name}</p>
                        <p className="text-sm text-gray-500">{new Date(backup.date).toLocaleString()}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => restoreBackup(backup.path)}>
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Master Data */}
        <TabsContent value="masters" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Area name"
                    value={newArea.name}
                    onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                  />
                  <Input
                    placeholder="Pincode"
                    value={newArea.pincode}
                    onChange={(e) => setNewArea({ ...newArea, pincode: e.target.value })}
                    className="w-32"
                  />
                  <Button onClick={addArea}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {areas.map((area) => (
                    <div key={area.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{area.name}</span>
                      <span className="text-sm text-gray-500">{area.pincode}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Referrals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referral Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Name"
                    value={newReferral.name}
                    onChange={(e) => setNewReferral({ ...newReferral, name: e.target.value })}
                  />
                  <Select
                    value={newReferral.type}
                    onValueChange={(v) => setNewReferral({ ...newReferral, type: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Doctor">Doctor</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Patient">Patient</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addReferral}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{ref.name}</span>
                      <Badge variant="secondary">{ref.type}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage password policies and session settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Security settings will be available in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
