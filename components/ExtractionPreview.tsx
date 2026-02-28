import React, { useState } from 'react';
import { EXTRACTION_CONFIDENCE_THRESHOLD, EXTRACTION_FIELD_LABELS } from '../constants';

export interface ExtractedFieldEntry {
    value: string | number | string[] | null;
    confidence: number | null;
}

export interface ExtractionResult {
    extractedFields: Record<string, ExtractedFieldEntry>;
    overallConfidence: number;
    validationWarnings: string[];
}

interface CurrentFormValues {
    height: string;
    weight: string;
    bloodPressure: string;
    heartRate: string;
    bloodType: string;
    allergies: string[];
    conditions: string[];
    medications: string[];
    medicalHistory: string;
    symptoms: string;
}

interface ExtractionPreviewProps {
    result: ExtractionResult;
    currentValues: CurrentFormValues;
    onAccept: (accepted: Record<string, ExtractedFieldEntry>) => void;
    onSkip: () => void;
}

const formatValue = (v: string | number | string[] | null): string => {
    if (v === null || v === undefined) return '—';
    if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : '—';
    return String(v);
};

const getCurrentDisplay = (key: string, cur: CurrentFormValues): string => {
    switch (key) {
        case 'height': return cur.height || '—';
        case 'weight': return cur.weight || '—';
        case 'bloodPressure': return cur.bloodPressure || '—';
        case 'heartRate': return cur.heartRate || '—';
        case 'bloodType': return cur.bloodType || '—';
        case 'allergies': return cur.allergies.length > 0 ? cur.allergies.join(', ') : '—';
        case 'conditions': return cur.conditions.length > 0 ? cur.conditions.join(', ') : '—';
        case 'medications': return cur.medications.length > 0 ? cur.medications.join(', ') : '—';
        case 'medicalHistory': return cur.medicalHistory || '—';
        case 'symptoms': return cur.symptoms || '—';
        default: return '—';
    }
};

const ConfidenceBadge: React.FC<{ confidence: number | null }> = ({ confidence }) => {
    if (confidence === null) return null;
    const pct = Math.round(confidence * 100);
    const color = pct >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : pct >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200'
            : 'bg-red-100 text-red-700 border-red-200';
    return (
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
            {pct >= 80 ? '✓' : pct >= 50 ? '~' : '!'} {pct}%
        </span>
    );
};

const ExtractionPreview: React.FC<ExtractionPreviewProps> = ({ result, currentValues, onAccept, onSkip }) => {
    const { extractedFields, overallConfidence, validationWarnings } = result;

    // Only show fields that were actually extracted
    const extractableKeys = Object.keys(EXTRACTION_FIELD_LABELS).filter(
        key => extractedFields[key] && extractedFields[key].value !== null
    );

    // Default selections: auto-check fields meeting the confidence threshold
    const defaultSelected: Record<string, boolean> = {};
    for (const key of extractableKeys) {
        const conf = extractedFields[key]?.confidence ?? 0;
        defaultSelected[key] = conf >= EXTRACTION_CONFIDENCE_THRESHOLD;
    }
    const [selected, setSelected] = useState<Record<string, boolean>>(defaultSelected);

    const toggleAll = (val: boolean) => {
        const next: Record<string, boolean> = {};
        extractableKeys.forEach(k => (next[k] = val));
        setSelected(next);
    };

    const handleApply = () => {
        const accepted: Record<string, ExtractedFieldEntry> = {};
        for (const key of extractableKeys) {
            if (selected[key]) accepted[key] = extractedFields[key];
        }
        onAccept(accepted);
    };

    const selectedCount = Object.values(selected).filter(Boolean).length;
    const overallPct = Math.round(overallConfidence * 100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#3b5bfd] to-[#4c6ef5] px-6 py-5 flex-shrink-0">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-white text-xl font-black tracking-tight flex items-center gap-2">
                                🔍 PDF Extraction Preview
                            </h2>
                            <p className="text-blue-200 text-sm mt-0.5">
                                Groq AI extracted the following medical data. Select fields to auto-fill.
                            </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className={`text-2xl font-black ${overallPct >= 80 ? 'text-emerald-300' : overallPct >= 50 ? 'text-amber-300' : 'text-red-300'}`}>
                                {overallPct}%
                            </div>
                            <div className="text-blue-200 text-xs">overall confidence</div>
                        </div>
                    </div>
                </div>

                {/* Validation warnings */}
                {validationWarnings.length > 0 && (
                    <div className="px-6 pt-4 flex-shrink-0">
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-1">
                            <p className="text-amber-800 text-xs font-bold flex items-center gap-1.5">⚠️ Out-of-range values detected</p>
                            {validationWarnings.map((w, i) => (
                                <p key={i} className="text-amber-700 text-xs pl-4">• {w}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Field table */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {extractableKeys.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <p className="text-4xl mb-3">📄</p>
                            <p className="font-semibold">No medical data could be extracted from this PDF.</p>
                            <p className="text-sm mt-1">The document may be scanned or contain non-standard formatting.</p>
                        </div>
                    ) : (
                        <>
                            {/* Select all / none */}
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    {extractableKeys.length} field{extractableKeys.length !== 1 ? 's' : ''} found
                                </span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => toggleAll(true)} className="text-xs text-blue-600 hover:underline font-semibold">Select all</button>
                                    <span className="text-slate-300">|</span>
                                    <button onClick={() => toggleAll(false)} className="text-xs text-slate-500 hover:underline font-semibold">None</button>
                                </div>
                            </div>

                            {/* Column headers */}
                            <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-x-3 gap-y-0 mb-1 px-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Field</span>
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Extracted</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-3">Current</span>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Use?</span>
                            </div>

                            <div className="space-y-2">
                                {extractableKeys.map(key => {
                                    const entry = extractedFields[key];
                                    const isChecked = !!selected[key];
                                    const currentDisplay = getCurrentDisplay(key, currentValues);
                                    const hasConflict = currentDisplay !== '—' && currentDisplay !== formatValue(entry.value);
                                    return (
                                        <div
                                            key={key}
                                            onClick={() => setSelected(s => ({ ...s, [key]: !s[key] }))}
                                            className={`grid grid-cols-[1fr_auto_1fr_auto] gap-x-3 items-center px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${isChecked
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : 'bg-slate-50 border-slate-200 hover:border-blue-200'
                                                }`}
                                        >
                                            {/* Field name */}
                                            <div>
                                                <span className="text-xs font-semibold text-slate-700">
                                                    {EXTRACTION_FIELD_LABELS[key]}
                                                </span>
                                                {hasConflict && (
                                                    <span className="ml-1.5 text-[10px] text-amber-600 font-bold">conflict</span>
                                                )}
                                            </div>

                                            {/* Extracted value + confidence */}
                                            <div className="flex flex-col items-end gap-1 min-w-0">
                                                <span className="text-xs font-bold text-emerald-700 truncate max-w-[120px]" title={formatValue(entry.value)}>
                                                    {formatValue(entry.value)}
                                                </span>
                                                <ConfidenceBadge confidence={entry.confidence} />
                                            </div>

                                            {/* Current value */}
                                            <div className="pl-3 border-l border-slate-200">
                                                <span className="text-xs text-slate-400 truncate max-w-[120px] block" title={currentDisplay}>
                                                    {currentDisplay}
                                                </span>
                                            </div>

                                            {/* Toggle */}
                                            <div
                                                onClick={e => { e.stopPropagation(); setSelected(s => ({ ...s, [key]: !s[key] })); }}
                                                className={`w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${isChecked ? 'bg-[#3b5bfd]' : 'bg-slate-300'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow m-0.5 transition-transform ${isChecked ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer actions */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
                    <button onClick={onSkip} className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-2xl transition">
                        Skip — fill manually
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={selectedCount === 0}
                        className="px-6 py-2.5 bg-[#3b5bfd] text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Apply {selectedCount > 0 ? `${selectedCount} field${selectedCount !== 1 ? 's' : ''}` : ''}  →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExtractionPreview;
