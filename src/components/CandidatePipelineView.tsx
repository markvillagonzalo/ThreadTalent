/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CandidateProfile, 
  Application, 
  JobPosting, 
  User, 
  ApplicationStage,
  RecruiterReview
} from '../domain/entities';
import { 
  Users, Check, Lock, Star, ChevronRight, MapPin, Phone, Mail, 
  Calendar, FileText, AlertCircle, ShieldAlert, Award, Send, Sliders, MessageSquare, Clipboard
} from 'lucide-react';

interface CandidatePipelineViewProps {
  candidates: CandidateProfile[];
  applications: Application[];
  jobs: JobPosting[];
  users: User[];
  currentUser: User;
  onApplyCandidate: (candData: any) => Promise<{ success: boolean; application?: Application; errors: string[] }>;
  onChangeStage: (appId: string, stage: ApplicationStage) => Promise<{ success: boolean; errors: string[] }>;
  onAssignManager: (appId: string, mId: string) => Promise<{ success: boolean; errors: string[] }>;
  onSubmitReview: (appId: string, score: number, comments: string) => Promise<{ success: boolean; errors: string[] }>;
}

export default function CandidatePipelineView({
  candidates,
  applications,
  jobs,
  users,
  currentUser,
  onApplyCandidate,
  onChangeStage,
  onAssignManager,
  onSubmitReview
}: CandidatePipelineViewProps) {
  
  // Selection States
  const [selectedAppId, setSelectedAppId] = useState<string | null>(applications[0]?.id || null);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [filterStage, setFilterStage] = useState<string>('ALL');
  
  // Feedback States
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Review Form state
  const [reviewScore, setReviewScore] = useState<number>(5);
  const [reviewComments, setReviewComments] = useState<string>('');

  // Simulation form state
  const [simFormData, setSimFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    skillsString: '',
    experienceYears: '3',
    resumeText: '',
    jobId: jobs[0]?.id || ''
  });

  // Calculate active selected elements safely
  const selectedApp = applications.find(a => a.id === selectedAppId) || applications[0];
  const selectedCand = selectedApp ? candidates.find(c => c.id === selectedApp.candidateId) : null;
  const selectedJob = selectedApp ? jobs.find(j => j.id === selectedApp.jobId) : null;

  // Hiring managers list for assignments
  const hiringManagers = users.filter(u => u.role === 'HIRING_MANAGER');

  const handleSimulatedSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);

    const matchJob = jobs.find(j => j.id === simFormData.jobId);
    if (!matchJob) {
      setFeedbackError('Invalid simulation job selection.');
      return;
    }

    const res = await onApplyCandidate({
      ...simFormData,
      jobId: simFormData.jobId,
      experienceYears: Number(simFormData.experienceYears),
      skills: simFormData.skillsString.split(',').map(s => s.trim()).filter(Boolean),
    });

    if (res.success) {
      setFeedbackSuccess(`Successfully registered Candidate simulation for: "${simFormData.firstName}".`);
      setIsSimulateOpen(false);
      setSimFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        location: '',
        skillsString: '',
        experienceYears: '3',
        resumeText: '',
        jobId: jobs[0]?.id || ''
      });
      if (res.application) {
        setSelectedAppId(res.application.id);
      }
    } else {
      setFeedbackError(res.errors.join(' '));
    }
  };

  const handleStageAdjustment = async (stage: ApplicationStage) => {
    setFeedbackError(null);
    setFeedbackSuccess(null);

    if (!selectedApp) return;

    const res = await onChangeStage(selectedApp.id, stage);
    if (res.success) {
      setFeedbackSuccess(`Stage updated to ${stage} successfully.`);
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } else {
      setFeedbackError(res.errors.join(' '));
    }
  };

  const handleHiringManagerAllocation = async (managerId: string) => {
    setFeedbackError(null);
    setFeedbackSuccess(null);

    if (!selectedApp || !managerId) return;

    const res = await onAssignManager(selectedApp.id, managerId);
    if (res.success) {
      setFeedbackSuccess('Assigned Hiring Manager successfully routed.');
      setTimeout(() => setFeedbackSuccess(null), 3500);
    } else {
      setFeedbackError(res.errors.join(' '));
    }
  };

  const handleReviewSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);

    if (!selectedApp) return;

    const res = await onSubmitReview(selectedApp.id, reviewScore, reviewComments);
    if (res.success) {
      setFeedbackSuccess('Review and score successfully written into application.');
      setReviewComments('');
      setReviewScore(5);
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } else {
      setFeedbackError(res.errors.join(' '));
    }
  };

  // Status stage badge renderer
  const getStageBadgeClass = (stage: ApplicationStage) => {
    switch (stage) {
      case 'APPLIED': return 'bg-blue-100/80 text-blue-850 border-blue-200';
      case 'PHONE_SCREEN': return 'bg-indigo-100/80 text-indigo-850 border-indigo-200';
      case 'TECHNICAL_INTERVIEW': return 'bg-violet-100/80 text-violet-850 border-violet-200';
      case 'HIRING_MANAGER_INTERVIEW': return 'bg-amber-100/80 text-amber-850 border-amber-200';
      case 'OFFER': return 'bg-cyan-100/80 text-cyan-850 border-cyan-200';
      case 'HIRED': return 'bg-emerald-150 text-emerald-950 border-emerald-300 font-bold';
      case 'REJECTED': return 'bg-slate-100 text-slate-650 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Color ratings computed suitability indicator
  const getSuitabilityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-indigo-650 bg-indigo-50 border-indigo-200';
    return 'text-amber-650 bg-amber-50 border-amber-100';
  };

  // Role checks for interface actions
  const isHRTeam = currentUser.role === 'HR_ADMIN' || currentUser.role === 'RECRUITER';
  
  // Filter core list
  const filteredApps = applications.filter(a => {
    if (filterStage === 'ALL') return true;
    return a.stage === filterStage;
  });

  return (
    <div id="pipeline-view-root" className="space-y-4 animate-fade-in text-gray-900">
      
      {/* Title & Action Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
            <Users className="w-4 h-4 text-blue-600" />
            Recruitment Funnel & Candidate Portal
          </h2>
          <p className="text-xs text-gray-500">
            View profiles, review score aligning computations, change workflow stages, and allocate assignments.
          </p>
        </div>

        <button
          id="toggle-simulator-btn"
          onClick={() => setIsSimulateOpen(!isSimulateOpen)}
          className="self-start text-xs bg-emerald-600 hover:bg-emerald-700 hover:shadow-xs text-white font-bold py-1.5 px-3 rounded flex items-center gap-1.5 transition cursor-pointer active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Simulate Public Applicant</span>
        </button>
      </div>

      {/* Global alert feedback messages */}
      {feedbackSuccess && (
        <div className="bg-emerald-50 border border-emerald-205 text-emerald-800 text-xs px-3 py-2 rounded flex items-center space-x-2 shrink-0 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold">{feedbackSuccess}</span>
        </div>
      )}

      {feedbackError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-3 py-2 rounded flex items-center space-x-2 font-mono animate-fade-in">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-bold">SECURITY/RBAC DENIED: {feedbackError}</span>
        </div>
      )}

      {/* Simulator Modal Form (Dropdown Overlay style) */}
      {isSimulateOpen && (
        <div id="simulation-modal-container" className="bg-emerald-50/30 p-4 rounded-lg border border-emerald-200 shadow-xs">
          <div className="border-b border-emerald-200 pb-1.5 mb-3">
            <h3 className="text-xs font-bold text-emerald-900 flex items-center gap-1.2 uppercase tracking-wider">
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              Simulate Public Resume Submission
            </h3>
            <p className="text-[10px] text-emerald-800 mt-0.5">
              Test skill indexing: Submit an applicant. The internal Interactor instantly tracks skill match ratios against job targets.
            </p>
          </div>

          <form onSubmit={handleSimulatedSubmission} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">First Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Liam"
                  value={simFormData.firstName}
                  onChange={(e) => setSimFormData({ ...simFormData, firstName: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white outline-none focus:ring-1 focus:ring-emerald-505 focus:border-emerald-505"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Last Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Vance"
                  value={simFormData.lastName}
                  onChange={(e) => setSimFormData({ ...simFormData, lastName: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white outline-none focus:ring-1 focus:ring-emerald-505 focus:border-emerald-505"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Target Requisition Post *</label>
                <select
                  value={simFormData.jobId}
                  onChange={(e) => setSimFormData({ ...simFormData, jobId: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white outline-none"
                  required
                >
                  <option value="">-- Choose Job Posting --</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="liam.vance@gmail.com"
                  value={simFormData.email}
                  onChange={(e) => setSimFormData({ ...simFormData, email: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Contact Phone *</label>
                <input
                  type="text"
                  placeholder="+63 945 929 0101"
                  value={simFormData.phone}
                  onChange={(e) => setSimFormData({ ...simFormData, phone: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Office Location *</label>
                <input
                  type="text"
                  placeholder="e.g. Pasig, Metro Manila"
                  value={simFormData.location}
                  onChange={(e) => setSimFormData({ ...simFormData, location: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Competency Skills Tokens (Comma Separated) *</label>
                <input
                  type="text"
                  placeholder="e.g. TYPESCRIPT, REACT, FIGMA SYSTEMS, ACCESSIBILITY"
                  value={simFormData.skillsString}
                  onChange={(e) => setSimFormData({ ...simFormData, skillsString: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white"
                  required
                />
                <span className="text-[9px] text-blue-700 block mt-0.5">Provide tech matches to trigger higher score weights on target requisitions.</span>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Experience Years *</label>
                <input
                  type="number"
                  placeholder="5"
                  value={simFormData.experienceYears}
                  onChange={(e) => setSimFormData({ ...simFormData, experienceYears: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Full Resume Text Document (Simulated upload text)</label>
              <textarea
                rows={2}
                placeholder="Include descriptive career details. The parser searches matching keywords inside this bio."
                value={simFormData.resumeText}
                onChange={(e) => setSimFormData({ ...simFormData, resumeText: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded p-2 bg-white font-mono leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-emerald-200">
              <button
                type="button"
                onClick={() => setIsSimulateOpen(false)}
                className="text-xs text-gray-700 bg-gray-150 hover:bg-gray-200 font-semibold px-3 py-1.5 rounded transition"
              >
                Close Simulator
              </button>
              <button
                type="submit"
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded shadow-xs hover:shadow-sm transition active:scale-95 cursor-pointer"
              >
                Trigger Ingestion Pipeline
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Dual Grid Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left pane: Candidate pipeline list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white rounded-lg border border-gray-200 shadow-xs p-3">
            <div className="flex items-center justify-between mb-2.5 border-b border-gray-150 pb-1.5">
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                Pipeline Filter
              </span>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-0.5 outline-none bg-gray-50 focus:ring-1 focus:ring-blue-500 font-bold"
              >
                <option value="ALL">All Stages</option>
                <option value="APPLIED">Applied</option>
                <option value="PHONE_SCREEN">Phone Screen</option>
                <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                <option value="HIRING_MANAGER_INTERVIEW">Hiring Manager</option>
                <option value="OFFER">Offer</option>
                <option value="HIRED">Hired</option>
                <option value="REJECTED">Archived</option>
              </select>
            </div>

            {filteredApps.length === 0 ? (
              <div className="text-center py-6 text-gray-450 italic text-xs">
                No pipeline applications match this stage.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-0.5">
                {filteredApps.map((app) => {
                  const cand = candidates.find(c => c.id === app.candidateId);
                  const job = jobs.find(j => j.id === app.jobId);
                  if (!cand || !job) return null;

                  const isSelected = selectedAppId === app.id;

                  return (
                    <button
                      id={`app-select-btn-${app.id}`}
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      className={`w-full text-left p-2.5 rounded border transition-all text-xs flex flex-col justify-between hover:border-gray-450 ${isSelected ? 'bg-blue-600 text-white border-blue-650 shadow-xs' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                      <div className="flex justify-between items-start w-full gap-1.5">
                        <div>
                          <p className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                            {cand.firstName} {cand.lastName}
                          </p>
                          <p className={`text-[10px] mt-0.5 line-clamp-1 truncate ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                            {job.title}
                          </p>
                        </div>
                        <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded ml-auto font-mono ${isSelected ? 'bg-white text-blue-700' : 'text-gray-800 bg-gray-200 border border-gray-350'}`}>
                          {app.suitabilityScore}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between w-full mt-2 pt-1.5 border-t border-dotted border-gray-200/20">
                        <span className={`text-[9px] uppercase tracking-wider font-bold py-0.5 px-1.5 rounded-full border ${isSelected ? 'bg-blue-700 text-white border-transparent' : getStageBadgeClass(app.stage)}`}>
                          {app.stage.replace('_', ' ')}
                        </span>
                        <span className={`text-[9px] truncate ${isSelected ? 'text-blue-200' : 'text-gray-450'}`}>
                          {app.assignedHiringManagerId ? '✓ Assigned' : 'Unrouted'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Detailed Profile deck */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedApp || !selectedCand ? (
            <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-400 text-xs italic shadow-xs">
              Select or generate a candidate applicant to render candidate logs.
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
               
              {/* Profile Main Header */}
              <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider font-mono">Dossier ID: {selectedCand.id}</span>
                  <h3 className="text-base font-extrabold text-gray-900 leading-tight">
                    {selectedCand.firstName} {selectedCand.lastName}
                  </h3>
                  <p className="text-xs text-blue-700 font-bold">
                    Target: <span className="underline">{selectedJob?.title || 'Unknown Post'}</span>
                  </p>
                </div>

                <div className="flex flex-col items-end shrink-0 text-right">
                  <div className={`px-2.5 py-1 rounded border flex items-center space-x-1 font-extrabold ${getSuitabilityColor(selectedApp.suitabilityScore || 0)}`}>
                    <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-mono">{selectedApp.suitabilityScore || 0}% Match Score</span>
                  </div>
                  <span className="text-[8.5px] text-gray-400 block mt-0.5 font-mono tracking-wider uppercase">Ingested: {selectedCand.createdAt.toLocaleDateString()}</span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                
                {/* Contact grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-3 border-b border-gray-150 text-[11px] text-gray-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{selectedCand.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{selectedCand.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{selectedCand.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Experience Factor: {selectedCand.experienceYears} Years</span>
                  </div>
                </div>

                {/* Candidate bio summary */}
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    Applicant Bio Summary
                  </h4>
                  <p className="text-xs text-gray-700 bg-gray-50 px-3 py-2 border border-gray-200 rounded italic leading-relaxed">
                    "{selectedCand.summary}"
                  </p>
                </div>

                {/* Algorithmic matching breakdown */}
                <div className="bg-blue-50/10 border border-blue-200 rounded p-3.5 space-y-2 block">
                  <h4 className="text-[10px] font-bold text-blue-950 uppercase tracking-widest flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-blue-600" />
                    Interactive Alignment & Suitability Analysis
                  </h4>
                  
                  <p className="text-xs text-gray-700 leading-relaxed font-mono">
                    {selectedApp.matchingExplanation}
                  </p>

                  <div className="pt-2 border-t border-blue-200/50">
                    <span className="text-[9.5px] font-bold text-blue-900 uppercase tracking-wider block mb-1">Technical Competency Assessment Tag Alignment</span>
                    
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {selectedJob?.requirements.map((req, i) => {
                        const isMatch = selectedCand.skills.includes(req.toUpperCase());
                        return (
                          <span 
                            key={i} 
                            className={`px-2 py-0.5 rounded border flex items-center gap-1 ${isMatch ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' : 'bg-red-50/70 text-red-700 border-red-200 opacity-75'}`}
                          >
                            <span>{isMatch ? '✓' : '×'}</span>
                            <span className="lowercase">#{req}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 1. PIPELINE STAGE RE-ROUTING ACTIONS */}
                <div className="bg-gray-50 border border-gray-205 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
                    <h4 className="text-[10.5px] font-bold text-gray-700 uppercase tracking-wider">Workflow routing controls</h4>
                    <span className="text-[8px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Active: {selectedApp.stage.replace('_', ' ')}</span>
                  </div>

                  <p className="text-[10.5px] text-gray-500 leading-tight">
                    Modify active candidate stage. Access validation protects pipeline transitions against unauthorized roles.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 pt-1 text-[10px]">
                    {[
                      { stage: 'APPLIED', label: '1. Applied' },
                      { stage: 'PHONE_SCREEN', label: '2. Screen' },
                      { stage: 'TECHNICAL_INTERVIEW', label: '3. Technical' },
                      { stage: 'HIRING_MANAGER_INTERVIEW', label: '4. Manager' },
                      { stage: 'OFFER', label: '5. Offer' },
                      { stage: 'HIRED', label: '6. Hire' },
                      { stage: 'REJECTED', label: 'Reject/Archive' }
                    ].map((step) => {
                      const isActive = selectedApp.stage === step.stage;
                      return (
                        <button
                          id={`stage-set-${step.stage}`}
                          key={step.stage}
                          onClick={() => handleStageAdjustment(step.stage as ApplicationStage)}
                          className={`px-2 py-1.5 rounded font-bold transition active:scale-95 cursor-pointer border text-center ${isActive ? 'bg-blue-600 text-white border-blue-650' : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300 shadow-xs'}`}
                        >
                          {step.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. COLLABORATION: ASSIGN HIRING MANAGER */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-1.5">
                    <h4 className="text-[10.5px] font-bold text-gray-800 uppercase tracking-widest flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      Appoint Collaborator
                    </h4>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      Assign a Hiring Manager. Assigned managers immediately receive specific triage rules on candidate logs.
                    </p>

                    {isHRTeam ? (
                      <div className="pt-1.5">
                        <select
                          value={selectedApp.assignedHiringManagerId || ''}
                          onChange={(e) => handleHiringManagerAllocation(e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded p-1.5 outline-none bg-white font-bold"
                        >
                          <option value="">-- Assign Manager Liaison --</option>
                          {hiringManagers.map((mgr) => (
                            <option key={mgr.id} value={mgr.id}>{mgr.name} ({mgr.email})</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="text-[10px] bg-orange-50 border border-orange-100 text-orange-850 p-2 rounded flex items-center gap-1 font-medium italic mt-1 pb-1">
                        <Lock className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                        <span>Hiring Manager allotment restricted to HR personnel.</span>
                      </div>
                    )}
                  </div>

                  {/* Present Active Assigned Manager */}
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10.5px] font-bold text-gray-800 uppercase tracking-widest">Assigned Liaison</h4>
                      <p className="text-[9.5px] text-gray-400 mt-0.5 uppercase tracking-wide">Hiring manager escalation tier</p>
                    </div>

                    <div className="pt-2">
                      {selectedApp.assignedHiringManagerId ? (() => {
                        const liaison = users.find(u => u.id === selectedApp.assignedHiringManagerId);
                        return liaison ? (
                          <div className="bg-white border border-gray-200 p-2 rounded text-xs shadow-xs">
                            <span className="font-bold text-gray-900 block">{liaison.name}</span>
                            <span className="text-gray-500 font-mono text-[9px] block">{liaison.email}</span>
                          </div>
                        ) : <span className="text-xs text-red-500 italic font-bold">Assignee file unresolved.</span>;
                      })() : (
                        <div className="text-xs text-gray-400 italic">
                          No Hiring Manager assigned.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. REVIEW LOGS & ADD NEW COLLABORATIVE REVIEW */}
                <div id="collaboration-reviews-tier" className="border-t border-gray-2 00 pt-4 space-y-3">
                  <h4 className="text-[10.5px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    Review Logs ({selectedApp.reviews.length})
                  </h4>

                  {/* Reviews lists inside */}
                  {selectedApp.reviews.length === 0 ? (
                    <div className="text-xs text-gray-400 italic bg-gray-50 p-4 border border-gray-200 rounded text-center">
                      No reviews logged of this applicant yet. Add score rating below.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedApp.reviews.map((rev) => (
                        <div key={rev.id} className="bg-gray-50 border border-gray-200 rounded p-2.5 text-xs">
                          <div className="flex items-center justify-between font-bold text-gray-800 mb-1 border-b border-gray-200 pb-1 flex-wrap gap-1.5">
                            <span className="text-[11px]">{rev.reviewerName} ({rev.reviewerId})</span>
                            <div className="flex items-center space-x-0.5 font-bold text-[9.5px] bg-amber-50 text-amber-700 px-1 border border-amber-200 rounded">
                              <Star className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500" />
                              <span>{rev.score} / 5 Stars</span>
                            </div>
                          </div>
                          <p className="text-gray-700 italic leading-snug pt-1">"{rev.comments}"</p>
                          <span className="text-[8.5px] text-gray-400 block text-right mt-1 font-mono">{new Date(rev.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Write comment review form */}
                  {currentUser.role !== 'EXECUTIVE' ? (
                    <form onSubmit={handleReviewSubmission} className="bg-blue-50/5 border border-blue-200 p-3 rounded-lg space-y-2.5 block">
                      <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block border-b border-blue-100 pb-1">
                        Submit Score & Collaborative Commentary
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <div className="md:col-span-1">
                          <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Score Rating *</label>
                          <select
                            value={reviewScore}
                            onChange={(e) => setReviewScore(Number(e.target.value))}
                            className="w-full text-xs border border-gray-300 rounded p-1.5 bg-white font-bold"
                          >
                            <option value={5}>5 (Exceptional)</option>
                            <option value={4}>4 (Above Standard)</option>
                            <option value={3}>3 (Satisfactory)</option>
                            <option value={2}>2 (Deficient)</option>
                            <option value={1}>1 (Do Not Hire)</option>
                          </select>
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1">Collaborator Comments *</label>
                          <input
                            type="text"
                            placeholder="Add clear feedback about theoretical and technical suitability..."
                            value={reviewComments}
                            onChange={(e) => setReviewComments(e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded p-1.5 bg-white cursor-text"
                            required
                          />
                        </div>
                      </div>

                      <div className="text-right">
                        <button
                          type="submit"
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3.5 rounded shadow-xs hover:shadow-sm active:scale-95 cursor-pointer transition-all"
                        >
                          Append Official Review File
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 p-2 rounded flex items-center gap-1 font-medium italic">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>Review submission blocked: executive viewers operate under read-only clearances.</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
