import { useState } from 'react'
import { Palette, Check, RotateCcw, Globe, LayoutDashboard } from 'lucide-react'
import clsx from 'clsx'
import DraggableModal from '../ui/DraggableModal'
import {
  DEFAULT_FORMAT, ACCENT_COLORS,
  DENSITY_LABELS, RADIUS_LABELS, SHADOW_LABELS, BG_LABELS, FONT_LABELS,
  loadGlobalFormat, saveGlobalFormat,
  loadBoardFormat, saveBoardFormat, clearBoardFormat,
  type DossierFormat, type FormatDensity, type FormatRadius,
  type FormatShadow, type FormatBg, type FormatFont, type FormatAccent,
} from '../../lib/dossierFormat'

const DENSITY_OPTIONS: FormatDensity[] = ['compact', 'comfortable', 'spacious']
const RADIUS_OPTIONS:  FormatRadius[]  = ['sharp', 'rounded', 'pill']
const SHADOW_OPTIONS:  FormatShadow[]  = ['none', 'soft', 'strong']
const BG_OPTIONS:      FormatBg[]      = ['clean', 'pattern', 'gradient']
const FONT_OPTIONS:    FormatFont[]    = ['small', 'normal', 'large']
const ACCENT_OPTIONS:  FormatAccent[]  = ['indigo', 'blue', 'teal', 'amber', 'rose', 'slate']

interface Props {
  dashboardId: string
  dashboardName: string
  onClose: () => void
  /** Called when the format changes (live preview + save) */
  onChange: () => void
}

export default function DossierFormatEditor({ dashboardId, dashboardName, onClose, onChange }: Props) {
  const [scope, setScope] = useState<'board' | 'global'>(() =>
    loadBoardFormat(dashboardId) ? 'board' : 'global'
  )
  const [draft, setDraft] = useState<DossierFormat>(() =>
    loadBoardFormat(dashboardId) ?? loadGlobalFormat()
  )

  const update = (patch: Partial<DossierFormat>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    // Live preview - write to the appropriate store
    if (scope === 'board') saveBoardFormat(dashboardId, next)
    else                   saveGlobalFormat(next)
    onChange()
  }

  const handleScopeChange = (next: 'board' | 'global') => {
    setScope(next)
    if (next === 'board') {
      // Initialize per-board with current draft
      saveBoardFormat(dashboardId, draft)
    } else {
      // Remove board-specific override → fall back to global
      clearBoardFormat(dashboardId)
      const global = loadGlobalFormat()
      setDraft(global)
    }
    onChange()
  }

  const handleReset = () => {
    setDraft(DEFAULT_FORMAT)
    if (scope === 'board') saveBoardFormat(dashboardId, DEFAULT_FORMAT)
    else                   saveGlobalFormat(DEFAULT_FORMAT)
    onChange()
  }

  return (
    <DraggableModal
      title="Format Editörü"
      icon={<Palette size={13} />}
      onClose={onClose}
      width={520}
    >
      <div className="p-5 space-y-5">
        {/* Scope selector */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Kapsam</p>
          <div className="flex gap-1 p-1 rounded-lg bg-zinc-100">
            <button
              type="button"
              onClick={() => handleScopeChange('global')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-semibold transition-all',
                scope === 'global' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Globe size={11} />
              Tüm Dashboard'lar
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('board')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-semibold transition-all',
                scope === 'board' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              <LayoutDashboard size={11} />
              Sadece "{dashboardName}"
            </button>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1.5">
            {scope === 'global'
              ? 'Değişiklikler tüm dashboardlara uygulanır.'
              : 'Bu dashboard için özel format. Global ayarları geçersiz kılar.'}
          </p>
        </div>

        {/* Density */}
        <ControlGroup label="Yoğunluk" hint="Kart içi boşluk ve grid aralığı">
          <SegmentedControl
            options={DENSITY_OPTIONS}
            labels={DENSITY_LABELS}
            value={draft.density}
            onChange={v => update({ density: v as FormatDensity })}
          />
        </ControlGroup>

        {/* Radius */}
        <ControlGroup label="Köşe Yuvarlaklığı">
          <SegmentedControl
            options={RADIUS_OPTIONS}
            labels={RADIUS_LABELS}
            value={draft.radius}
            onChange={v => update({ radius: v as FormatRadius })}
          />
        </ControlGroup>

        {/* Shadow */}
        <ControlGroup label="Gölge Derinliği">
          <SegmentedControl
            options={SHADOW_OPTIONS}
            labels={SHADOW_LABELS}
            value={draft.shadow}
            onChange={v => update({ shadow: v as FormatShadow })}
          />
        </ControlGroup>

        {/* Background */}
        <ControlGroup label="Arka Plan Stili">
          <SegmentedControl
            options={BG_OPTIONS}
            labels={BG_LABELS}
            value={draft.bg}
            onChange={v => update({ bg: v as FormatBg })}
          />
        </ControlGroup>

        {/* Font scale */}
        <ControlGroup label="Yazı Boyutu">
          <SegmentedControl
            options={FONT_OPTIONS}
            labels={FONT_LABELS}
            value={draft.font}
            onChange={v => update({ font: v as FormatFont })}
          />
        </ControlGroup>

        {/* Accent color */}
        <ControlGroup label="Vurgu Rengi">
          <div className="flex items-center gap-2 flex-wrap">
            {ACCENT_OPTIONS.map(a => {
              const active = draft.accent === a
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => update({ accent: a })}
                  className={clsx(
                    'flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border transition-all',
                    active ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'
                  )}
                  title={ACCENT_COLORS[a].name}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-white shadow-sm"
                    style={{ background: ACCENT_COLORS[a].hex }}
                  />
                  <span className="text-[10px] font-semibold text-zinc-700">{ACCENT_COLORS[a].name}</span>
                </button>
              )
            })}
          </div>
        </ControlGroup>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary flex-1 justify-center text-[12px]"
            title="Varsayılan ayarlara dön"
          >
            <RotateCcw size={12} /> Sıfırla
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary flex-1 justify-center text-[12px]"
          >
            <Check size={12} /> Tamam
          </button>
        </div>

        <p className="text-[10px] text-zinc-400 text-center">
          Değişiklikler otomatik olarak kaydedilir ve canlı uygulanır.
        </p>
      </div>
    </DraggableModal>
  )
}

function ControlGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
        {hint && <p className="text-[9px] text-zinc-400">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function SegmentedControl<T extends string>({
  options, labels, value, onChange,
}: {
  options: T[]
  labels: Record<T, string>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-zinc-100">
      {options.map(opt => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={clsx(
              'flex-1 py-1.5 rounded text-[11px] font-semibold transition-all',
              active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            {labels[opt]}
          </button>
        )
      })}
    </div>
  )
}
