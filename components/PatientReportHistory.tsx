import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';

export interface MedicalReport {
    _id: string;
    patientId: string;
    doctorId?: string;
    title: string;
    description: string;
    fileName: string;
    fileUrl: string;
    uploadedBy: 'patient' | 'doctor';
    reportType: string;
    extractionStatus: 'pending' | 'processing' | 'done' | 'failed';
    extractedSummary?: {
        patientName?: string;
        age?: number;
        gender?: string;
        doctorName?: string;
        reportDate?: string;
        diagnosis?: string[];
        medications?: string[];
        labValues?: {
            bloodPressure?: string;
            heartRate?: string;
            glucose?: string;
            hemoglobin?: string;
            height?: string;
            weight?: string;
        };
        confidence?: number;
    };
    createdAt: string;
}

interface PatientReportHistoryProps {
    user: User;
}

const PatientReportHistory: React.FC<PatientReportHistoryProps> = ({ user }) => {
    const [reports, setReports] = useState<MedicalReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

    const fetchReports = async () => {
        try {
            const res = await fetch('/api/reports/patient', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch reports');
            const data = await res.json();
            setReports(data.reports || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleUploadClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        formData.append('reportType', 'ai_intake');

        try {
            const res = await fetch('/api/reports/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');

            // Re-fetch reports to include the newly uploaded one (which will be 'processing')
            await fetchReports();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
        }
    };

    // Helper to beautifully format dates
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-[#3b5bfd] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Medical Report History</h3>
                    <p className="text-slate-500 text-sm mt-1">
                        View past reports or upload new ones. Data extracted here is for your records and will not overwrite your active intake profile.
                    </p>
                </div>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                    />
                    <button
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#3b5bfd]/10 text-[#3b5bfd] hover:bg-[#3b5bfd] hover:text-white rounded-2xl font-bold transition duration-300 disabled:opacity-50"
                    >
                        {isUploading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        )}
                        {isUploading ? 'Uploading...' : 'Upload New Report'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                    {error}
                </div>
            )}

            {reports.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                        📄
                    </div>
                    <h4 className="text-lg font-bold text-slate-700">No reports found</h4>
                    <p className="text-slate-500 text-sm mt-1 mb-4">You haven't uploaded any medical reports yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <div key={report._id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                            {/* Report Header (Always visible) */}
                            <div
                                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                                onClick={() => setExpandedReportId(expandedReportId === report._id ? null : report._id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${report.fileName.endsWith('.pdf') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                                        }`}>
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">{report.title}</h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span>{formatDate(report.createdAt)}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span>By {report.uploadedBy === 'patient' ? 'You' : 'Doctor'}</span>

                                            {/* Status Badge */}
                                            {report.extractionStatus === 'processing' && (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                                                    <div className="w-2 h-2 border-2 border-blue-600 border-t-transparent flex-shrink-0 rounded-full animate-spin" />
                                                    AI Extracting...
                                                </span>
                                            )}
                                            {report.extractionStatus === 'done' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                    ✓ Data Extracted
                                                </span>
                                            )}
                                            {report.extractionStatus === 'failed' && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                                    ✕ Extraction Failed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Action Buttons */}
                                    <button
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                                        title="Download Report"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Trigger download via data URI mapping
                                            const a = document.createElement('a');
                                            a.href = `/api/reports/download/${report._id}`; // Needs an endpoint or direct datauri download if small
                                            a.download = report.fileName;
                                            a.click();
                                        }}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>

                                    {/* Chevron */}
                                    <svg
                                        className={`w-5 h-5 text-slate-400 transition-transform ${expandedReportId === report._id ? 'rotate-180' : ''}`}
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Extracted Data Card (Collapsible) */}
                            {expandedReportId === report._id && (
                                <div className="px-5 pb-5 pt-0 bg-slate-50 border-t border-slate-100">
                                    <div className="pt-4">
                                        <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                                            <span className="bg-violet-100 text-violet-700 p-1 rounded-lg">🤖</span>
                                            AI Extracted Medical Data
                                            {report.extractedSummary?.confidence && (
                                                <span className="text-xs font-normal text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                                    {report.extractedSummary.confidence}% Confidence
                                                </span>
                                            )}
                                        </h5>

                                        {!report.extractedSummary || Object.keys(report.extractedSummary).length === 0 ? (
                                            <p className="text-sm text-slate-500 italic">No structured data was extracted from this report.</p>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {/* Vitals & Basics */}
                                                {report.extractedSummary.patientName && (
                                                    <div><span className="block text-xs text-slate-400 uppercase tracking-wider">Patient Name</span><span className="text-sm font-medium">{report.extractedSummary.patientName}</span></div>
                                                )}
                                                {report.extractedSummary.reportDate && (
                                                    <div><span className="block text-xs text-slate-400 uppercase tracking-wider">Report Date</span><span className="text-sm font-medium">{report.extractedSummary.reportDate}</span></div>
                                                )}

                                                {Object.entries(report.extractedSummary.labValues || {}).map(([key, value]) => {
                                                    if (!value) return null;
                                                    // Map key to label
                                                    const labels: Record<string, string> = {
                                                        bloodPressure: 'Blood Pressure',
                                                        heartRate: 'Heart Rate',
                                                        glucose: 'Glucose',
                                                        hemoglobin: 'Hemoglobin'
                                                    };
                                                    return (
                                                        <div key={key}>
                                                            <span className="block text-xs text-slate-400 uppercase tracking-wider">{labels[key] || key}</span>
                                                            <span className="text-sm font-medium">{value}</span>
                                                        </div>
                                                    )
                                                })}

                                                {/* Arrays */}
                                                {report.extractedSummary.diagnosis && report.extractedSummary.diagnosis.length > 0 && (
                                                    <div className="col-span-full">
                                                        <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Diagnoses / Conditions</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {report.extractedSummary.diagnosis.map((d, i) => (
                                                                <span key={i} className="bg-white border border-slate-200 text-slate-700 text-xs px-2 py-1 rounded-lg">{d}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {report.extractedSummary.medications && report.extractedSummary.medications.length > 0 && (
                                                    <div className="col-span-full">
                                                        <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Medications</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {report.extractedSummary.medications.map((m, i) => (
                                                                <span key={i} className="bg-white border border-slate-200 text-slate-700 text-xs px-2 py-1 rounded-lg">{m}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PatientReportHistory;
