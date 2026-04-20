import { useState } from 'react'
import { Sparkles, Wand2, Loader2, Check, X, AlertCircle } from 'lucide-react'
import DraggableModal from '../ui/DraggableModal'
import { generateVisualization } from '../../lib/hooks'
import type { VisualizationResponse } from '../../lib/hooks'
import { saveNLWidget, newNLWidgetId, type NLWidgetConfig } from '../../lib/dashboardStore'

const EXAMPLES = [
  'Son 7 günde tamamlanan görevleri bar grafik olarak göster',
  'Departmanlara göre kritik öncelikli görevlerin pasta dağılımı',
  'Bu ay açılmış ama hâlâ beklemede olan görevlerin sayısı',
  'Geciken görevlerin departmanlara göre dağılımı',
  'Görev önceliklerinin yüzdesel dağılımı',
]

interface Props {
  onClose: () => void
  onCreated: (widgetId: string) => void
}

export default function NLWidgetGenerator({ onClose, onCreated }: Props) {
  const [prompt, setPrompt]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [preview, setPreview]     = useState<VisualizationResponse | null>(null)

  const BLOCKED_KEYWORDS = [
    'siir', 'sarkı', 'hikaye', 'fıkra', 'tarif', 'yemek', 'hava durumu',
    'poem', 'story', 'joke', 'recipe', 'weather', 'translate', 'cevir',
    'oyun', 'game', 'film', 'dizi', 'muzik', 'music',
  ]

  const isOffTopic = (text: string) => {
    const lower = text.toLowerCase()
    // Check for blocked keywords
    if (BLOCKED_KEYWORDS.some(kw => lower.includes(kw))) return true
    // Must contain at least one data/chart/platform related term
    const DATA_TERMS = [
      'gorev', 'görev', 'task', 'departman', 'department', 'rapor', 'report',
      'grafik', 'chart', 'tablo', 'table', 'goster', 'göster', 'show', 'listele', 'list',
      'dagilim', 'dagılım', 'dağılım', 'distribution', 'oran', 'rate', 'sayi', 'sayı', 'count', 'toplam', 'total',
      'kpi', 'performans', 'performance', 'trend', 'analiz', 'analysis',
      'kullanici', 'kullanıcı', 'user', 'personel', 'staff', 'envanter', 'inventory',
      'bar', 'pie', 'line', 'pasta', 'cizgi', 'çizgi',
      'stok', 'stock', 'gecik', 'overdue', 'tamamla', 'complete', 'bekle', 'pending',
      'öncelik', 'öncelik', 'priority', 'durum', 'status', 'hafta', 'week', 'ay', 'month', 'gun', 'gün', 'day',
    ]
    return !DATA_TERMS.some(term => lower.includes(term))
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    if (isOffTopic(prompt)) {
      setError('Bu platform yalnizca operasyonel veri görsellestirme için kullanilabilir. Lutfen gorev, departman, KPI veya rapor ile ilgili bir istek girin.')
      return
    }
    setLoading(true)
    setError(null)
    setPreview(null)
    try {
      const result = await generateVisualization(prompt.trim())
      setPreview(result)
    } catch (e: any) {
      setError(e.message ?? 'Yapay zeka yanit veremedi')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!preview) return
    const id = newNLWidgetId()
    const config: NLWidgetConfig = {
      id,
      title:        preview.title,
      description:  preview.description,
      chartType:    preview.chartType,
      dataSource:   preview.dataSource,
      filters:      preview.filters ?? {},
      groupBy:      preview.groupBy,
      metric:       preview.metric ?? 'count',
      sortBy:       preview.sortBy,
      limit:        preview.limit,
      sourcePrompt: prompt.trim(),
      createdAt:    new Date().toISOString(),
    }
    saveNLWidget(config)
    onCreated(id)
  }

  return (
    <DraggableModal
      title="OperIQ Dogal Dil ile Gorsellestirme"
      icon={<Sparkles size={13} />}
      onClose={onClose}
      width={560}
    >
      <div className="p-5 space-y-4">
        {/* Prompt input */}
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Operasyonel veri görsellestirme isteginizi yazin
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="ör. Son 30 gün içinde tamamlanmış kritik öncelikli görevleri departmanlara göre bar grafik olarak göster"
            rows={3}
            className="input resize-none text-[12px] leading-relaxed"
            disabled={loading}
          />
        </div>

        {/* Examples */}
        {!preview && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Örnekler</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  disabled={loading}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-zinc-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-zinc-600 transition-colors disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generate button */}
        {!preview && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || prompt.trim().length < 3}
            className="btn-primary w-full justify-center"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Üretiliyor…</>
              : <><Wand2 size={14} /> Görselleştirme Üret</>}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded border border-red-200 bg-red-50 text-[11px] text-red-700">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Üretim başarısız</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Sparkles size={13} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-zinc-900">{preview.title}</p>
                {preview.description && (
                  <p className="text-[11px] text-zinc-500 mt-0.5">{preview.description}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Grafik tipi" value={preview.chartType} />
              <Field label="Veri kaynağı" value={preview.dataSource} />
              {preview.groupBy && <Field label="Gruplama" value={preview.groupBy} />}
              {preview.filters?.datePreset && <Field label="Tarih" value={preview.filters.datePreset} />}
              {preview.filters?.status && <Field label="Durum" value={preview.filters.status} />}
              {preview.filters?.priority && <Field label="Öncelik" value={preview.filters.priority} />}
              {preview.filters?.type && <Field label="Tip" value={preview.filters.type} />}
            </div>

            <div className="flex gap-2 pt-2 border-t border-indigo-200/50">
              <button
                type="button"
                onClick={() => { setPreview(null); setError(null) }}
                className="btn-secondary flex-1 justify-center text-[12px]"
              >
                <X size={12} /> Tekrar dene
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn-primary flex-1 justify-center text-[12px]"
              >
                <Check size={12} /> Panele Ekle
              </button>
            </div>
          </div>
        )}
      </div>
    </DraggableModal>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-1.5 rounded-md bg-white border border-indigo-100">
      <p className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-[11px] font-medium text-zinc-800 mt-0.5">{value}</p>
    </div>
  )
}
