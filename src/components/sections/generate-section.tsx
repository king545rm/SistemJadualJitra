'use client'

import * as React from 'react'
import {
  Sparkles,
  Wand2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ListChecks,
  Eye,
  RotateCcw,
  Lock,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api-client'
import {
  HARI_LABELS,
  type SessionUser,
  type Kursus,
} from '@/lib/types'

import {
  PageHeader,
  StatCard,
  EmptyState,
  Badge,
  GlassPanel,
  useApi,
} from '@/components/sections/shared'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

interface GenerateResponse {
  success: boolean
  aiRationale: string
  generated: number
  clashesAvoided: string[]
  sample: Array<{
    modulId: string
    pensyarahId: string
    bilikId: string | null
    hari: string
    masaMula: string
    masaTamat: string
    modulNama: string
  }>
}

function renderRationale(text: string) {
  if (!text) return null
  // Split by newlines, treat lines starting with - or * as bullets
  const lines = text.split(/\r?\n/)
  const blocks: React.ReactNode[] = []
  let bulletGroup: string[] = []
  let key = 0

  const flushBullets = () => {
    if (bulletGroup.length === 0) return
    const items = bulletGroup.slice()
    blocks.push(
      <ul key={`b-${key++}`} className="list-disc pl-5 space-y-1 my-2 text-sm">
        {items.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>,
    )
    bulletGroup = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushBullets()
      continue
    }
    if (/^[-*•]/.test(line)) {
      bulletGroup.push(line.replace(/^[-*•]\s*/, ''))
    } else if (/^\d+\./.test(line)) {
      bulletGroup.push(line.replace(/^\d+\.\s*/, ''))
    } else {
      flushBullets()
      blocks.push(
        <p key={`p-${key++}`} className="text-sm my-1.5 leading-relaxed">
          {line}
        </p>,
      )
    }
  }
  flushBullets()
  return blocks
}

export function GenerateSection({ user }: { user: SessionUser }) {
  const canGenerate = ['TIMBALAN_PENGARAH', 'HEA', 'KETUA_KURSUS'].includes(user.role)
  const [kursusId, setKursusId] = React.useState<string>('all')
  const [clearExisting, setClearExisting] = React.useState(false)
  const [generating, setGenerating] = React.useState(false)
  const [result, setResult] = React.useState<GenerateResponse | null>(null)

  const { data: kursusData } = useApi<{ kursus: Kursus[] }>(() => api.get('/api/kursus'), [])

  async function handleGenerate() {
    setGenerating(true)
    setResult(null)
    try {
      const body: Record<string, unknown> = { clearExisting }
      if (kursusId !== 'all') body.kursusId = kursusId
      const res = await api.post<GenerateResponse>('/api/jadual/generate', body)
      setResult(res)
      toast.success(`Jadual dijana: ${res.generated} slot ditambah.`)
    } catch (e) {
      const err = e as ApiError
      toast.error(err?.message || 'Ralat semasa menjana jadual.')
    } finally {
      setGenerating(false)
    }
  }

  if (!canGenerate) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Jana Jadual AI"
          description="Enjin AI GLM menjana jadual optimum bebas pertindihan."
          icon={Sparkles}
        />
        <GlassPanel>
          <CardContent className="p-4">
            <EmptyState
              title="Akses Ditolak"
              description="Anda tidak mempunyai kebenaran untuk menjana jadual."
              icon={Lock}
            />
          </CardContent>
        </GlassPanel>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Jana Jadual AI"
        description="Enjin AI GLM menjana jadual optimum bebas pertindihan."
        icon={Sparkles}
      />

      {/* Intro */}
      <GlassPanel>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div className="text-sm leading-relaxed">
              <p className="font-semibold mb-1">Enjin Penjadualan AI</p>
              <p className="text-muted-foreground">
                Sistem menggunakan enjin penjadualan berasaskan kekangan dibantu AI
                untuk menjana jadual bebas pertindihan (zero-clash) berdasarkan modul,
                pensyarah, bilik dan had beban tugas. Enjin AI GLM menyediakan
                strategi pengoptimuman manakala enjin deterministik menjamin output
                bebas konflik.
              </p>
            </div>
          </div>
        </CardContent>
      </GlassPanel>

      {/* Options form */}
      <GlassPanel>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="kursus" className="text-sm">Skop Kursus</Label>
              <Select value={kursusId} onValueChange={setKursusId}>
                <SelectTrigger id="kursus" className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kursus</SelectItem>
                  {kursusData?.kursus.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.kodKursus} — {k.namaKursus}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Pilih kursus tertentu atau jana untuk semua kursus.
              </p>
            </div>

            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/30 p-3">
                <div>
                  <Label htmlFor="clear" className="text-sm cursor-pointer">
                    Padam jadual sedia ada
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hapus semua slot untuk skop dipilih sebelum jana semula.
                  </p>
                </div>
                <Switch
                  id="clear"
                  checked={clearExisting}
                  onCheckedChange={setClearExisting}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="lg"
              className="gap-2 w-full sm:w-auto"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {generating ? 'Menjana...' : 'Jana Jadual'}
            </Button>
            {generating && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sedang menjana jadual... mungkin mengambil masa sehingga 30 saat.
              </p>
            )}
          </div>
        </CardContent>
      </GlassPanel>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Slot Dijana"
              value={result.generated}
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              label="Konflik Dielakkan"
              value={result.clashesAvoided.length}
              icon={AlertTriangle}
              variant={result.clashesAvoided.length > 0 ? 'warning' : 'success'}
            />
            <StatCard
              label="Status"
              value={result.success ? 'Berjaya' : 'Gagal'}
              icon={Sparkles}
              variant={result.success ? 'success' : 'danger'}
            />
            <StatCard
              label="Sampel Dipaparkan"
              value={result.sample.length}
              icon={ListChecks}
            />
          </div>

          {/* AI Rationale */}
          <Card className="glass-strong border-0">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Rasional AI</h3>
                  <p className="text-xs text-muted-foreground">
                    Strategi pengoptimuman daripada GLM
                  </p>
                </div>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {renderRationale(result.aiRationale)}
              </div>
            </CardContent>
          </Card>

          {/* Clashes avoided */}
          {result.clashesAvoided.length > 0 && (
            <GlassPanel>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold text-sm">
                    Konflik Dielakkan ({result.clashesAvoided.length})
                  </h3>
                </div>
                <ScrollArea className="max-h-72">
                  <div className="space-y-1.5 pr-2">
                    {result.clashesAvoided.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs"
                      >
                        <Badge variant="warning" className="shrink-0">
                          {i + 1}
                        </Badge>
                        <span className="text-amber-900 dark:text-amber-200">{c}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </GlassPanel>
          )}

          {/* Sample slots */}
          {result.sample.length > 0 && (
            <GlassPanel>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">
                    Contoh Slot Dijana (maksimum 20)
                  </h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Hari</TableHead>
                        <TableHead>Masa</TableHead>
                        <TableHead>Modul</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.sample.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground text-xs">
                            {i + 1}
                          </TableCell>
                          <TableCell className="text-sm">
                            {HARI_LABELS[s.hari] || s.hari}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {s.masaMula}-{s.masaTamat}
                          </TableCell>
                          <TableCell className="text-sm">{s.modulNama}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </GlassPanel>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                toast.success('Jadual dijana. Sila lihat seksyen Jadual Kelas.')
              }
              className="gap-1.5"
            >
              <Eye className="h-4 w-4" /> Lihat Jadual
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="gap-1.5"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Jana Semula
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
