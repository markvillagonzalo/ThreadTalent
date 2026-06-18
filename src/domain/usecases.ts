/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  JobPosting, 
  CandidateProfile, 
  Application, 
  User, 
  DomainValidator, 
  ApplicationStage, 
  RecruiterReview,
  AuditLog
} from './entities';

// ==========================================
// 1. Repository Gateways Interfaces (Inward Coupling)
// ==========================================

export interface IJobRepository {
  getById(id: string, tenantId: string): Promise<JobPosting | null>;
  list(tenantId: string): Promise<JobPosting[]>;
  save(job: JobPosting): Promise<void>;
}

export interface ICandidateRepository {
  getById(id: string, tenantId: string): Promise<CandidateProfile | null>;
  list(tenantId: string): Promise<CandidateProfile[]>;
  save(candidate: CandidateProfile): Promise<void>;
}

export interface IApplicationRepository {
  getById(id: string, tenantId: string): Promise<Application | null>;
  list(tenantId: string): Promise<Application[]>;
  getByJob(jobId: string, tenantId: string): Promise<Application[]>;
  save(application: Application): Promise<void>;
}

export interface IAuditRepository {
  list(tenantId: string): Promise<AuditLog[]>;
  log(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;
}

export interface IUserRepository {
  list(tenantId: string): Promise<User[]>;
  getById(id: string, tenantId: string): Promise<User | null>;
}

// ==========================================
// 2. Use Case Interactors
// ==========================================

/**
 * UC-1: Create Job Posting
 */
export class CreateJobPostingUseCase {
  constructor(
    private jobRepo: IJobRepository,
    private auditRepo: IAuditRepository
  ) {}

  async execute(params: {
    tenantId: string;
    currentUser: User;
    title: string;
    department: string;
    location: string;
    type: JobPosting['type'];
    description: string;
    requirements: string[];
    salaryMin?: number;
    salaryMax?: number;
  }): Promise<{ success: boolean; job?: JobPosting; errors: string[] }> {
    const { tenantId, currentUser, title, department, location, type, description, requirements, salaryMin, salaryMax } = params;

    // RBAC: Check authorization
    if (currentUser.role !== 'HR_ADMIN' && currentUser.role !== 'RECRUITER') {
      await this.auditRepo.log({
        tenantId,
        userId: currentUser.id,
        userEmail: currentUser.email,
        userRole: currentUser.role,
        action: 'CREATE_JOB_ATTEMPT',
        resourceType: 'JOB',
        resourceId: 'N/A',
        ipAddress: '127.0.0.1',
        details: 'Unauthorized attempt to create a job posting (deficient role privileges).',
        securityVerdict: 'BLOCKED'
      });
      return { success: false, errors: ['Unauthorized: Only HR Administrators and Recruiters can create job postings.'] };
    }

    // Input Sanitization
    const sanitizedTitle = DomainValidator.sanitizeInput(title);
    const sanitizedDepartment = DomainValidator.sanitizeInput(department);
    const sanitizedLocation = DomainValidator.sanitizeInput(location);
    const sanitizedDesc = DomainValidator.sanitizeInput(description);
    const sanitizedReqs = requirements.map(r => DomainValidator.sanitizeInput(r).trim()).filter(Boolean);

    // Business Invariants Checks
    const newJob: Partial<JobPosting> = {
      id: `job_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      title: sanitizedTitle,
      department: sanitizedDepartment,
      location: sanitizedLocation,
      type,
      description: sanitizedDesc,
      requirements: sanitizedReqs,
      salaryMin: salaryMin || undefined,
      salaryMax: salaryMax || undefined,
      status: 'ACTIVE',
      createdById: currentUser.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const validationResult = DomainValidator.validateJobPosting(newJob);
    if (!validationResult.isValid) {
      return { success: false, errors: validationResult.errors };
    }

    await this.jobRepo.save(newJob as JobPosting);

    // Secure Audit Trail
    await this.auditRepo.log({
      tenantId,
      userId: currentUser.id,
      userEmail: currentUser.email,
      userRole: currentUser.role,
      action: 'CREATE_JOB_SUCCESS',
      resourceType: 'JOB',
      resourceId: newJob.id!,
      ipAddress: '127.0.0.1',
      details: `Successfully published job: "${sanitizedTitle}" in department: ${sanitizedDepartment}.`,
      securityVerdict: 'ALLOWED'
    });

    return { success: true, job: newJob as JobPosting, errors: [] };
  }
}

/**
 * UC-2: Apply Candidate & Automated Skill Matching Engine
 */
export class ApplyCandidateUseCase {
  constructor(
    private candidateRepo: ICandidateRepository,
    private applicationRepo: IApplicationRepository,
    private jobRepo: IJobRepository,
    private auditRepo: IAuditRepository
  ) {}

  async execute(params: {
    tenantId: string;
    jobId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
    skills: string[];
    experienceYears: number;
    resumeText?: string;
  }): Promise<{ success: boolean; application?: Application; errors: string[] }> {
    const { tenantId, jobId, firstName, lastName, email, phone, location, summary, skills, experienceYears, resumeText } = params;

    // Validate Job Existence in same tenant (Tenant Isolation Sandbox Protection)
    const targetJob = await this.jobRepo.getById(jobId, tenantId);
    if (!targetJob) {
      return { success: false, errors: ['Target job posting could not be found or belongs to a different tenant context.'] };
    }

    // Sanitize and Validate applicant profile
    const sanitizedFirstName = DomainValidator.sanitizeInput(firstName).trim();
    const sanitizedLastName = DomainValidator.sanitizeInput(lastName).trim();
    const sanitizedEmail = DomainValidator.sanitizeInput(email).trim().toLowerCase();
    const sanitizedPhone = DomainValidator.sanitizeInput(phone).trim();
    const sanitizedLoc = DomainValidator.sanitizeInput(location).trim();
    const sanitizedSummary = DomainValidator.sanitizeInput(summary).trim();
    const sanitizedSkills = skills.map(s => DomainValidator.sanitizeInput(s).trim().toUpperCase()).filter(Boolean);
    const sanitizedResumeText = resumeText ? DomainValidator.sanitizeInput(resumeText) : '';

    const newCandidate: CandidateProfile = {
      id: `cand_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      firstName: sanitizedFirstName,
      lastName: sanitizedLastName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      location: sanitizedLoc,
      summary: sanitizedSummary,
      skills: sanitizedSkills,
      experienceYears,
      resumeText: sanitizedResumeText,
      createdAt: new Date()
    };

    const cValidation = DomainValidator.validateCandidate(newCandidate);
    if (!cValidation.isValid) {
      return { success: false, errors: cValidation.errors };
    }

    // Save Candidate
    await this.candidateRepo.save(newCandidate);

    // --- Automated Multi-Factor Skill Matching Engine ---
    // Rule 1: Key Skill Overlap Rating (Base 60 Percentage Points)
    const jobReqsUpper = targetJob.requirements.map(r => r.toUpperCase());
    const matchedSkills = sanitizedSkills.filter(skill => 
      jobReqsUpper.some(req => req.includes(skill) || skill.includes(req))
    );
    const skillMatchRatio = jobReqsUpper.length > 0 ? (matchedSkills.length / jobReqsUpper.length) : 1;
    const skillScoreFactor = skillMatchRatio * 60;

    // Rule 2: Technical Professional Experience Weight (Max 30 Percentage Points)
    // Target normal range: 1 year is 10pts, 3 years is 20pts, 5+ years is 30pts
    const experienceScoreFactor = Math.min(experienceYears * 6, 30);

    // Rule 3: Content Resume Keyword Parsing Bonus (Max 10 Points)
    let keywordBonus = 0;
    if (sanitizedResumeText) {
      const resumeContentUpper = sanitizedResumeText.toUpperCase();
      const keywordFrequencies = jobReqsUpper.filter(req => resumeContentUpper.includes(req));
      keywordBonus = Math.min(keywordFrequencies.length * 2, 10);
    }

    // Overall Score (0 - 100 limit check)
    const computedScore = Math.round(Math.min(skillScoreFactor + experienceScoreFactor + keywordBonus, 100));

    // Formulate comprehensive analytical outcome points
    const alignmentPoints: string[] = [];
    alignmentPoints.push(`Skill match ratio of ${matchedSkills.length}/${jobReqsUpper.length} matching required proficiencies.`);
    if (matchedSkills.length > 0) {
      alignmentPoints.push(`Aligned technical stacks verified: [${matchedSkills.join(', ')}].`);
    } else {
      alignmentPoints.push('Warning: No direct technical stack overlapping keywords found.');
    }
    alignmentPoints.push(`Experience assessment adds +${experienceScoreFactor}/30 weight based on ${experienceYears} active years.`);
    if (keywordBonus > 0) {
      alignmentPoints.push(`Resume parsing identified supplemental match phrases, resulting in +${keywordBonus} bonus marks.`);
    }

    const matchingExplanation = alignmentPoints.join(' ');

    const newApp: Application = {
      id: `app_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      jobId,
      candidateId: newCandidate.id,
      stage: 'APPLIED',
      reviews: [],
      suitabilityScore: computedScore,
      matchingExplanation,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save Application
    await this.applicationRepo.save(newApp);

    // Log transaction
    await this.auditRepo.log({
      tenantId,
      userId: 'APPLICANT_PUBLIC',
      userEmail: sanitizedEmail,
      userRole: 'EXECUTIVE', // Applicant operates on custom self service
      action: 'CANDIDATE_APPLY_SUCCESS',
      resourceType: 'APPLICATION',
      resourceId: newApp.id,
      ipAddress: '127.0.0.1',
      details: `Applicant ${sanitizedFirstName} ${sanitizedLastName} completed application to [Job: ${targetJob.title}]. Automated match computed suitability score: ${computedScore}%.`,
      securityVerdict: 'ALLOWED'
    });

    return { success: true, application: newApp, errors: [] };
  }
}

/**
 * UC-3: Modify Application Core Pipeline Stage
 */
export class ChangeApplicationStageUseCase {
  constructor(
    private applicationRepo: IApplicationRepository,
    private auditRepo: IAuditRepository,
    private userRepo: IUserRepository
  ) {}

  async execute(params: {
    tenantId: string;
    currentUser: User;
    applicationId: string;
    newStage: ApplicationStage;
  }): Promise<{ success: boolean; errors: string[] }> {
    const { tenantId, currentUser, applicationId, newStage } = params;

    // Verify application context securely
    const app = await this.applicationRepo.getById(applicationId, tenantId);
    if (!app) {
      return { success: false, errors: ['Application not found or tenant sandbox violation detected.'] };
    }

    // Role-based flow restrictions
    if (currentUser.role === 'EXECUTIVE') {
      return { success: false, errors: ['Viewer executives cannot modify application recruitment pipeline stages.'] };
    }

    // Hiring Managers can only update stage if they are explicitly assigned to this candidate
    if (currentUser.role === 'HIRING_MANAGER' && app.assignedHiringManagerId !== currentUser.id) {
      await this.auditRepo.log({
        tenantId,
        userId: currentUser.id,
        userEmail: currentUser.email,
        userRole: currentUser.role,
        action: 'STAGE_CHANGE_BLOCKED',
        resourceType: 'APPLICATION',
        resourceId: applicationId,
        ipAddress: '127.0.0.1',
        details: `Access Blocked: Hiring Manager "${currentUser.name}" attempted to advance application "${applicationId}" without explicit Assignment routing.`,
        securityVerdict: 'BLOCKED'
      });
      return { success: false, errors: ['Access Denied: As a Hiring Manager, you must be explicitly assigned to this application to update its workflow stage.'] };
    }

    const previousStage = app.stage;
    app.stage = newStage;
    app.updatedAt = new Date();

    await this.applicationRepo.save(app);

    // Logging Secure transition audit trail
    await this.auditRepo.log({
      tenantId,
      userId: currentUser.id,
      userEmail: currentUser.email,
      userRole: currentUser.role,
      action: 'CHANGE_STAGE_SUCCESS',
      resourceType: 'APPLICATION',
      resourceId: applicationId,
      ipAddress: '127.0.0.1',
      details: `Advanced pipeline status of application ${applicationId} from [${previousStage}] to [${newStage}].`,
      securityVerdict: 'ALLOWED'
    });

    return { success: true, errors: [] };
  }
}

/**
 * UC-4: Submit Collaborative Candidate Review rating
 */
export class SubmitReviewUseCase {
  constructor(
    private applicationRepo: IApplicationRepository,
    private auditRepo: IAuditRepository
  ) {}

  async execute(params: {
    tenantId: string;
    currentUser: User;
    applicationId: string;
    score: number;
    comments: string;
  }): Promise<{ success: boolean; errors: string[] }> {
    const { tenantId, currentUser, applicationId, score, comments } = params;

    const app = await this.applicationRepo.getById(applicationId, tenantId);
    if (!app) {
      return { success: false, errors: ['Application not found or unauthorized cross-tenant attempt.'] };
    }

    const sanitizedComments = DomainValidator.sanitizeInput(comments).trim();

    const newReview: RecruiterReview = {
      id: `rev_${Math.random().toString(36).substr(2, 9)}`,
      reviewerId: currentUser.id,
      reviewerName: currentUser.name,
      score,
      comments: sanitizedComments,
      createdAt: new Date()
    };

    const reviewValidation = DomainValidator.validateReview(newReview);
    if (!reviewValidation.isValid) {
      return { success: false, errors: reviewValidation.errors };
    }

    // Append and save
    app.reviews = [...app.reviews, newReview];
    app.updatedAt = new Date();
    await this.applicationRepo.save(app);

    // Add Audit record
    await this.auditRepo.log({
      tenantId,
      userId: currentUser.id,
      userEmail: currentUser.email,
      userRole: currentUser.role,
      action: 'SUBMIT_COLLABORATIVE_REVIEW',
      resourceType: 'APPLICATION',
      resourceId: applicationId,
      ipAddress: '127.0.0.1',
      details: `Collaborative score rating submitted: [${score}/5 Stars] with comments: "${sanitizedComments.slice(0, 30)}...".`,
      securityVerdict: 'ALLOWED'
    });

    return { success: true, errors: [] };
  }
}

/**
 * UC-5: Route Application / Assign Hiring Manager context
 */
export class AssignHiringManagerUseCase {
  constructor(
    private applicationRepo: IApplicationRepository,
    private userRepo: IUserRepository,
    private auditRepo: IAuditRepository
  ) {}

  async execute(params: {
    tenantId: string;
    currentUser: User;
    applicationId: string;
    hiringManagerId: string;
  }): Promise<{ success: boolean; errors: string[] }> {
    const { tenantId, currentUser, applicationId, hiringManagerId } = params;

    const app = await this.applicationRepo.getById(applicationId, tenantId);
    if (!app) {
      return { success: false, errors: ['Application context not found.'] };
    }

    // Verification check for permissions
    if (currentUser.role !== 'HR_ADMIN' && currentUser.role !== 'RECRUITER') {
      return { success: false, errors: ['Only HR Administrators and Recruiters can allocate hiring managers.'] };
    }

    const targetManager = await this.userRepo.getById(hiringManagerId, tenantId);
    if (!targetManager || targetManager.role !== 'HIRING_MANAGER') {
      return { success: false, errors: ['Target user must possess the "HIRING_MANAGER" role to obtain delegation routing.'] };
    }

    app.assignedHiringManagerId = hiringManagerId;
    app.updatedAt = new Date();
    await this.applicationRepo.save(app);

    await this.auditRepo.log({
      tenantId,
      userId: currentUser.id,
      userEmail: currentUser.email,
      userRole: currentUser.role,
      action: 'ASSIGN_HIRING_MANAGER',
      resourceType: 'APPLICATION',
      resourceId: applicationId,
      ipAddress: '127.0.0.1',
      details: `Delegated application review of ${applicationId} to Hiring Manager: "${targetManager.name}".`,
      securityVerdict: 'ALLOWED'
    });

    return { success: true, errors: [] };
  }
}

/**
 * UC-6: Tenant-Isolated Analytics Dashboard Fetcher
 */
export class GetRecruitmentAnalyticsUseCase {
  constructor(
    private jobRepo: IJobRepository,
    private applicationRepo: IApplicationRepository,
    private candidateRepo: ICandidateRepository
  ) {}

  async execute(tenantId: string): Promise<{
    activePostings: number;
    totalApplications: number;
    averageSuitability: number;
    stageAggregation: Record<ApplicationStage, number>;
    departmentAggregation: Record<string, number>;
  }> {
    const jobs = await this.jobRepo.list(tenantId);
    const applications = await this.applicationRepo.list(tenantId);
    const candidates = await this.candidateRepo.list(tenantId);

    const activePostingsCount = jobs.filter(j => j.status === 'ACTIVE').length;
    const totalApplicationsCount = applications.length;

    // Suitability calculations
    let scoreSum = 0;
    let scoresCount = 0;
    applications.forEach(app => {
      if (app.suitabilityScore !== undefined) {
        scoreSum += app.suitabilityScore;
        scoresCount++;
      }
    });
    const avgSuitability = scoresCount > 0 ? Math.round(scoreSum / scoresCount) : 0;

    // Aggregate by Stage
    const stages: Record<ApplicationStage, number> = {
      APPLIED: 0,
      PHONE_SCREEN: 0,
      TECHNICAL_INTERVIEW: 0,
      HIRING_MANAGER_INTERVIEW: 0,
      OFFER: 0,
      HIRED: 0,
      REJECTED: 0
    };
    applications.forEach(app => {
      if (app.stage in stages) {
        stages[app.stage]++;
      }
    });

    // Aggregate by Departments from corresponding Job
    const deptMap: Record<string, number> = {};
    for (const app of applications) {
      const matchJob = jobs.find(j => j.id === app.jobId);
      if (matchJob) {
        const dept = matchJob.department;
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      }
    }

    return {
      activePostings: activePostingsCount,
      totalApplications: totalApplicationsCount,
      averageSuitability: avgSuitability,
      stageAggregation: stages,
      departmentAggregation: deptMap
    };
  }
}
