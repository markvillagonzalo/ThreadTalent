/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { JobPosting, User, DomainValidator } from '../domain/entities';
import { Plus, Briefcase, MapPin, DollarSign, Calendar, Lock, ShieldCheck, AlertCircle } from 'lucide-react';

interface JobPostingsViewProps {
  jobs: JobPosting[];
  currentUser: User;
  onCreateJob: (jobData: {
    title: string;
    department: string;
    location: string;
    type: JobPosting['type'];
    description: string;
    requirements: string[];
    salaryMin?: number;
    salaryMax?: number;
  }) => Promise<{ success: boolean; errors: string[] }>;
}

export default function JobPostingsView({ jobs, currentUser, onCreateJob }: JobPostingsViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    type: 'FULL_TIME' as JobPosting['type'],
    description: '',
    requirementsString: '', // comma-separated
    salaryMin: '',
    salaryMax: ''
  });

  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // RBAC checks
  const canPublish = currentUser.role === 'HR_ADMIN' || currentUser.role === 'RECRUITER';

  const resetForm = () => {
    setFormData({
      title: '',
      department: '',
      location: '',
      type: 'FULL_TIME',
      description: '',
      requirementsString: '',
      salaryMin: '',
      salaryMax: ''
    });
    setFormErrors([]);
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setInfoMessage(null);

    // Initial basic client validations
    const errors: string[] = [];
    if (!formData.title.trim()) errors.push('Title must not be empty.');
    if (!formData.department.trim()) errors.push('Department specification is required.');
    if (!formData.requirementsString.trim()) errors.push('At least one requirement keyword is required.');
    
    const minVal = formData.salaryMin ? Number(formData.salaryMin) : undefined;
    const maxVal = formData.salaryMax ? Number(formData.salaryMax) : undefined;
    
    if (minVal !== undefined && isNaN(minVal)) errors.push('Minimum salary must be numeric.');
    if (maxVal !== undefined && isNaN(maxVal)) errors.push('Maximum salary must be numeric.');
    if (minVal && maxVal && minVal > maxVal) errors.push('Minimum salary cannot exceed maximum salary limits.');

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    const reqs = formData.requirementsString
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    const callResult = await onCreateJob({
      title: formData.title,
      department: formData.department,
      location: formData.location,
      type: formData.type,
      description: formData.description,
      requirements: reqs,
      salaryMin: minVal,
      salaryMax: maxVal
    });

    if (callResult.success) {
      setInfoMessage('Job posting created and archived securely into tenant schema.');
      resetForm();
      setIsFormOpen(false);
      setTimeout(() => setInfoMessage(null), 4000);
    } else {
      setFormErrors(callResult.errors);
    }
  };

  const getJobTypeDisplay = (type: JobPosting['type']) => {
    switch (type) {
      case 'FULL_TIME': return 'Full Time';
      case 'PART_TIME': return 'Part Time';
      case 'CONTRACT': return 'Contract';
      case 'INTERN': return 'Internship';
      default: return type;
    }
  };

  return (
    <div id="job-postings-view-root" className="space-y-4 animate-fade-in text-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
            <Briefcase className="w-4 h-4 text-blue-600" />
            Tenant Job Postings
          </h2>
          <p className="text-xs text-gray-500">Manage, edit, and post active job requisitions securely isolated within your database.</p>
        </div>

        {canPublish ? (
          <button
            id="open-vulner-posting-form-btn"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="self-start text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3.5 rounded transition cursor-pointer active:scale-95 text-nowrap shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" />
            <span>{isFormOpen ? 'Cancel Job Requisition' : 'Add New Job Post'}</span>
          </button>
        ) : (
          <div className="text-xs bg-gray-100 border border-gray-200 text-gray-500 px-2.5 py-1.5 rounded flex items-center gap-1.5 font-medium max-w-sm">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            <span>Posting restricted (HR Admins & Recruiters only).</span>
          </div>
        )}
      </div>

      {infoMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded flex items-center space-x-2 animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{infoMessage}</span>
        </div>
      )}

      {/* Create New Job Posting Section */}
      {isFormOpen && canPublish && (
        <div id="posting-form-card" className="bg-white p-4 rounded-lg border border-blue-200 bg-blue-50/5 shadow-xs">
          <div className="border-b border-gray-250 pb-2 mb-3">
            <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5 text-blue-650" />
              Secure Job Requisition Creator
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Data input fields automatically undergo XSS escaping and parameter bindings inside our Interface Adapter.
            </p>
          </div>

          <form onSubmit={handlePublishSubmit} className="space-y-3">
            {formErrors.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-2.5 rounded text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  POST VIOLATED ENTERPRISE POLICY:
                </div>
                {formErrors.map((err, idx) => <div key={idx} className="font-mono text-[10px]">• {err}</div>)}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Backend Architect"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Department *</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Product"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Office Location *</label>
                <input
                  type="text"
                  placeholder="e.g. Remote (APAC), Pasig City"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Job Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as JobPosting['type'] })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Est. Minimum Salary (Annual USD)</label>
                <input
                  type="number"
                  placeholder="90000"
                  value={formData.salaryMin}
                  onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Est. Maximum Salary (Annual USD)</label>
                <input
                  type="number"
                  placeholder="140000"
                  value={formData.salaryMax}
                  onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Requirements Checklist (Comma Separated) *</label>
              <input
                type="text"
                placeholder="e.g. Typescript, React, AWS, Docker"
                value={formData.requirementsString}
                onChange={(e) => setFormData({ ...formData, requirementsString: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                required
              />
              <p className="text-[9px] text-gray-400 mt-0.5">Applicants will be structurally matched against these key tech stack tokens.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Description *</label>
              <textarea
                rows={3}
                placeholder="Detail core operational objectives, stack requirements, and corporate culture fit..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white leading-relaxed"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="text-xs bg-gray-150 hover:bg-gray-200 text-gray-700 font-semibold py-1.5 px-3 rounded transition"
              >
                Clear Entry
              </button>
              <button
                type="submit"
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded shadow-xs hover:shadow-sm transition active:scale-95 cursor-pointer"
              >
                Commit Requisition ID
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Job Postings Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.length === 0 ? (
          <div className="col-span-full bg-white border border-gray-200 p-6 rounded-lg text-center text-gray-400 italic text-xs">
            No active postings published. Toggle the requisition button to register a new job listing.
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg border border-gray-200 shadow-xs p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider bg-gray-100 text-gray-650 font-bold px-1.5 py-0.5 rounded border border-gray-200">
                    {job.department}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 mt-1.5 mb-1 leading-snug">{job.title}</h3>
                </div>
                <span className="text-[9px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
                  {getJobTypeDisplay(job.type)}
                </span>
              </div>

              <div className="flex flex-col gap-1 text-xs text-gray-500 mt-2 font-medium">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{job.location}</span>
                </div>
                {(job.salaryMin || job.salaryMax) && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {job.salaryMin ? `$${job.salaryMin.toLocaleString()}` : 'Unspecified'} - 
                      {job.salaryMax ? ` $${job.salaryMax.toLocaleString()}` : ' Unspecified'}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Published: {job.createdAt.toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-3 border-t border-gray-100 pt-2.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Requirement Stacks</span>
                <div className="flex flex-wrap gap-1">
                  {job.requirements.map((req, i) => (
                    <span key={i} className="bg-blue-50 text-blue-700 border border-blue-150 text-[9.5px] px-1.5 py-0.5 rounded font-mono font-bold lowercase">
                      #{req.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="block mt-3 text-[11px] text-gray-650 bg-gray-50 p-2.5 rounded border border-gray-150 italic line-clamp-3 leading-relaxed">
                {job.description}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
