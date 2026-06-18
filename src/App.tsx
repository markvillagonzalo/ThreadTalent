/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Tenant, 
  User, 
  JobPosting, 
  CandidateProfile, 
  Application, 
  AuditLog, 
  ApplicationStage 
} from './domain/entities';
import { 
  JobRepository, 
  CandidateRepository, 
  ApplicationRepository, 
  AuditRepository, 
  UserRepository, 
  dbInstance 
} from './adapters/repositories';
import { 
  CreateJobPostingUseCase, 
  ApplyCandidateUseCase, 
  ChangeApplicationStageUseCase, 
  AssignHiringManagerUseCase, 
  SubmitReviewUseCase, 
  GetRecruitmentAnalyticsUseCase 
} from './domain/usecases';
import { AuthController, SIMULATED_TENANTS } from './adapters/authController';

// Components imports
import SecurityBanner from './components/SecurityBanner';
import AnalyticsView from './components/AnalyticsView';
import JobPostingsView from './components/JobPostingsView';
import CandidatePipelineView from './components/CandidatePipelineView';
import AuditTrailView from './components/AuditTrailView';

// Icons
import { Layers, Briefcase, Users, Clipboard, UserCheck, ShieldCheck, Database, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Instantiating Repository Ports
  const jobRepo = new JobRepository();
  const candRepo = new CandidateRepository();
  const appRepo = new ApplicationRepository();
  const auditRepo = new AuditRepository();
  const userRepo = new UserRepository();

  // Active Multi-Tenant and Auth States
  const [activeTenant, setActiveTenant] = useState<Tenant>(SIMULATED_TENANTS[0]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Core Entity States (Polled from Repositories on change)
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Dashboard Navigation State
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'JOBS' | 'CANDIDATES' | 'AUDIT'>('ANALYTICS');
  
  // State for tracking refresh triggers
  const [refreshCount, setRefreshCount] = useState(0);

  // Initialize data on boot and when tenant/refresh trigger changes
  useEffect(() => {
    const loadTenantData = async () => {
      // 1. Fetch available organizational users
      const usersList = await userRepo.list(activeTenant.id);
      setAvailableUsers(usersList);
      
      // Auto-assign first user on load or if previous selection belongs to another tenant
      if (usersList.length > 0) {
        const found = usersList.find(u => u.tenantId === activeTenant.id);
        setCurrentUser(found || usersList[0]);
      } else {
        setCurrentUser(null);
      }

      // 2. Fetch tenant-isolated entities
      const tenantJobs = await jobRepo.list(activeTenant.id);
      const tenantCands = await candRepo.list(activeTenant.id);
      const tenantApps = await appRepo.list(activeTenant.id);
      const tenantLogs = await auditRepo.list(activeTenant.id);

      setJobs(tenantJobs);
      setCandidates(tenantCands);
      setApplications(tenantApps);
      setAuditLogs(tenantLogs);

      // 3. Process presenter metrics
      const analyticsCalculator = new GetRecruitmentAnalyticsUseCase(jobRepo, appRepo, candRepo);
      const computedMetrics = await analyticsCalculator.execute(activeTenant.id);
      setAnalytics(computedMetrics);
    };

    loadTenantData();
  }, [activeTenant, refreshCount]);

  // Helper trigger to poll DB records to React states
  const forceStateReload = async () => {
    setRefreshCount(prev => prev + 1);
  };

  const handleResetFactoryDatabase = () => {
    localStorage.removeItem('thread_talent_jobs');
    localStorage.removeItem('thread_talent_candidates');
    localStorage.removeItem('thread_talent_applications');
    localStorage.removeItem('thread_talent_auditLogs');
    localStorage.removeItem('thread_talent_users');
    
    // Seed new instance
    dbInstance.jobs = [];
    dbInstance.candidates = [];
    dbInstance.applications = [];
    dbInstance.auditLogs = [];
    dbInstance.users = [];
    
    // @ts-ignore
    dbInstance.seedDefaultData();
    forceStateReload();
  };

  // ========================================================
  // CORE USE CASE ACTION DISPATCHERS
  // ========================================================

  /**
   * UC-1: Publish New Job Requisition
   */
  const handlePublishJobRequisition = async (jobData: {
    title: string;
    department: string;
    location: string;
    type: JobPosting['type'];
    description: string;
    requirements: string[];
    salaryMin?: number;
    salaryMax?: number;
  }) => {
    if (!currentUser) return { success: false, errors: ['Authentication identity resolved as NULL context.'] };

    const usecase = new CreateJobPostingUseCase(jobRepo, auditRepo);
    const result = await usecase.execute({
      tenantId: activeTenant.id,
      currentUser,
      ...jobData
    });

    if (result.success) {
      await forceStateReload();
    }
    return { success: result.success, errors: result.errors };
  };

  /**
   * UC-2: Public Simulated Application
   */
  const handleSimulatedCandidateProfileSubmission = async (candData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
    skills: string[];
    experienceYears: number;
    resumeText?: string;
    jobId: string;
  }) => {
    const usecase = new ApplyCandidateUseCase(candRepo, appRepo, jobRepo, auditRepo);
    const result = await usecase.execute({
      tenantId: activeTenant.id,
      ...candData
    });

    if (result.success) {
      await forceStateReload();
    }
    return { success: result.success, application: result.application, errors: result.errors };
  };

  /**
   * UC-3: Pipeline Workflow Stage Advancement
   */
  const handleModifyApplicationWorkflowStage = async (appId: string, newStage: ApplicationStage) => {
    if (!currentUser) return { success: false, errors: ['Authentication identity resolved as NULL context.'] };

    const usecase = new ChangeApplicationStageUseCase(appRepo, auditRepo, userRepo);
    const result = await usecase.execute({
      tenantId: activeTenant.id,
      currentUser,
      applicationId: appId,
      newStage
    });

    if (result.success) {
      await forceStateReload();
    }
    return result;
  };

  /**
   * UC-4: Route assigned reviews
   */
  const handleAddCollaboratorEvaluationReview = async (appId: string, score: number, comments: string) => {
    if (!currentUser) return { success: false, errors: ['Authentication identity resolved as NULL context.'] };

    const usecase = new SubmitReviewUseCase(appRepo, auditRepo);
    const result = await usecase.execute({
      tenantId: activeTenant.id,
      currentUser,
      applicationId: appId,
      score,
      comments
    });

    if (result.success) {
      await forceStateReload();
    }
    return result;
  };

  /**
   * UC-5: Allocate Hiring Liaison manager
   */
  const handleRouteLiaisonManager = async (appId: string, managerId: string) => {
    if (!currentUser) return { success: false, errors: ['Authentication identity resolved as NULL context.'] };

    const usecase = new AssignHiringManagerUseCase(appRepo, userRepo, auditRepo);
    const result = await usecase.execute({
      tenantId: activeTenant.id,
      currentUser,
      applicationId: appId,
      hiringManagerId: managerId
    });

    if (result.success) {
      await forceStateReload();
    }
    return result;
  };

  return (
    <div id="thread-talent-app-root" className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans">
      
      {/* 1. TOP INTERACTIVE SECURITY COCKPIT (Banner and Log Engine) */}
      <SecurityBanner 
        currentTenant={activeTenant} 
        currentUser={currentUser || { id: '0', tenantId: activeTenant.id, name: 'Guest', email: 'guest@org.com', role: 'EXECUTIVE', isActive: true }} 
        onResetDatabase={handleResetFactoryDatabase}
      />

      {/* 2. MAIN APPLICATION BRAND CONTROL RAIL (Tenant & User Session Selection Bar) */}
      <div className="bg-white border-b border-gray-200 shadow-xs block">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Thread Talent Core Brand Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded tracking-widest font-mono">
                  Thread Solutions Matrix
                </span>
              </div>
              <h1 className="text-lg font-bold font-sans text-gray-900 mt-1 flex items-center gap-1.5">
                Thread Talent
                <span className="text-xs text-gray-500 font-normal">| Recruitment Portal Hub (v2.4.0)</span>
              </h1>
            </div>

            {/* Simulated Session Management (For Demonstrating Access Controls & Data Isolation) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl bg-gray-55 border border-gray-200 rounded-lg p-2.5">
              
              {/* Target Tenant Selector */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-blue-600" />
                  Target Enterprise Tenant (SaaS Sandbox)
                </label>
                <select
                  id="tenant-switch-dropdown"
                  value={activeTenant.id}
                  onChange={(e) => {
                    const found = SIMULATED_TENANTS.find(t => t.id === e.target.value);
                    if (found) setActiveTenant(found);
                  }}
                  className="w-full text-xs font-semibold bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {SIMULATED_TENANTS.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.domain})</option>
                  ))}
                </select>
              </div>

              {/* Active User Session RBAC selector */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-blue-600" />
                  Simulated User Profile (RBAC Identity)
                </label>
                <select
                  id="rbac-user-switch-dropdown"
                  value={currentUser?.id || ''}
                  onChange={(e) => {
                    const u = availableUsers.find(item => item.id === e.target.value);
                    if (u) setCurrentUser(u);
                  }}
                  className="w-full text-xs font-semibold bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  disabled={availableUsers.length === 0}
                >
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} — {u.role.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* 3. RECRUITMENT OPERATIONS PANEL WORKSPACE */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-grow w-full space-y-4">
        
        {/* TAB CONTROLS NAVIGATION BAR */}
        <div className="flex border-b border-gray-250 gap-1 overflow-x-auto text-nowrap scrollbar-none font-semibold">
          {[
            { id: 'ANALYTICS', label: 'Suite Dashboard', icon: Layers },
            { id: 'JOBS', label: 'Requisition Posts', icon: Briefcase },
            { id: 'CANDIDATES', label: 'Talent Funnel Screen', icon: Users },
            { id: 'AUDIT', label: 'Immutable Audit Trail', icon: Clipboard },
          ].map((tab) => {
            const IsActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                id={`tab-ctrl-${tab.id.toLowerCase()}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase border-b-2 font-bold transition cursor-pointer -mb-px ${IsActive ? 'border-blue-600 text-blue-700 bg-white/70' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
              >
                <Icon className={`w-4 h-4 ${IsActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ACTIVE MODULE VIEW */}
        <div className="min-h-[450px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + '_' + activeTenant.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'ANALYTICS' && analytics && (
                <AnalyticsView analytics={analytics} />
              )}

              {activeTab === 'JOBS' && (
                <JobPostingsView 
                  jobs={jobs} 
                  currentUser={currentUser || { id: '0', tenantId: activeTenant.id, name: 'Guest', email: 'guest@org.com', role: 'EXECUTIVE', isActive: true }} 
                  onCreateJob={handlePublishJobRequisition} 
                />
              )}

              {activeTab === 'CANDIDATES' && (
                <CandidatePipelineView
                  candidates={candidates}
                  applications={applications}
                  jobs={jobs}
                  users={availableUsers}
                  currentUser={currentUser || { id: '0', tenantId: activeTenant.id, name: 'Guest', email: 'guest@org.com', role: 'EXECUTIVE', isActive: true }}
                  onApplyCandidate={handleSimulatedCandidateProfileSubmission}
                  onChangeStage={handleModifyApplicationWorkflowStage}
                  onAssignManager={handleRouteLiaisonManager}
                  onSubmitReview={handleAddCollaboratorEvaluationReview}
                />
              )}

              {activeTab === 'AUDIT' && (
                <AuditTrailView logs={auditLogs} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* 4. Humbler Footer credits */}
      <footer className="mt-auto bg-white border-t border-gray-200 py-3 text-center text-[10px] text-gray-400 font-medium">
        <div>Thread Solutions Recruitment Matrix Cluster System Admin node — Secured Under Compliance Directives</div>
      </footer>

    </div>
  );
}
