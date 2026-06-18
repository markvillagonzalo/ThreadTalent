/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  JobPosting, 
  CandidateProfile, 
  Application, 
  User, 
  AuditLog
} from '../domain/entities';
import { 
  IJobRepository, 
  ICandidateRepository, 
  IApplicationRepository, 
  IAuditRepository, 
  IUserRepository 
} from '../domain/usecases';

// TYPE FOR SIMULATION OF SECURE PARAMETERIZED LOGS
export interface SqlLogEntry {
  id: string;
  query: string;
  parameters: any[];
  timestamp: Date;
}

// ==========================================
// 1. Mock DB In-Memory Store with LocalStorage Fallback
// ==========================================
class MockDatabase {
  public jobs: JobPosting[] = [];
  public candidates: CandidateProfile[] = [];
  public applications: Application[] = [];
  public auditLogs: AuditLog[] = [];
  public users: User[] = [];
  
  // Parameterized Query Action Logging (for OWASP demonstration panel)
  public sqlLogs: SqlLogEntry[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private saveToStorage() {
    localStorage.setItem('thread_talent_jobs', JSON.stringify(this.jobs));
    localStorage.setItem('thread_talent_candidates', JSON.stringify(this.candidates));
    localStorage.setItem('thread_talent_applications', JSON.stringify(this.applications));
    localStorage.setItem('thread_talent_auditLogs', JSON.stringify(this.auditLogs));
    localStorage.setItem('thread_talent_users', JSON.stringify(this.users));
  }

  private loadFromStorage() {
    try {
      const savedJobs = localStorage.getItem('thread_talent_jobs');
      const savedCandidates = localStorage.getItem('thread_talent_candidates');
      const savedApplications = localStorage.getItem('thread_talent_applications');
      const savedAudit = localStorage.getItem('thread_talent_auditLogs');
      const savedUsers = localStorage.getItem('thread_talent_users');

      // Initialize default seeded records if empty
      if (!savedUsers || !savedJobs || !savedCandidates || !savedApplications) {
        this.seedDefaultData();
        return;
      }

      this.jobs = JSON.parse(savedJobs).map((j: any) => ({ ...j, createdAt: new Date(j.createdAt), updatedAt: new Date(j.updatedAt) }));
      this.candidates = JSON.parse(savedCandidates).map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) }));
      this.applications = JSON.parse(savedApplications).map((a: any) => ({ ...a, createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt) }));
      this.auditLogs = savedAudit ? JSON.parse(savedAudit).map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) })) : [];
      this.users = JSON.parse(savedUsers);
    } catch (e) {
      console.error('Failed to parse cached database, seating fallback data defaults.', e);
      this.seedDefaultData();
    }
  }

  public persist() {
    this.saveToStorage();
  }

  public logSql(query: string, parameters: any[]) {
    const entry: SqlLogEntry = {
      id: `sql_${Math.random().toString(36).substr(2, 9)}`,
      query,
      parameters,
      timestamp: new Date()
    };
    this.sqlLogs = [entry, ...this.sqlLogs].slice(0, 50); // Keep last 50 queries
  }

  private seedDefaultData() {
    // ----------------- TENANT 1: ACME CORE -----------------
    const t1 = 'tenant_1';
    
    const u1: User = { id: 'u_acme_admin', tenantId: t1, name: 'Elena Rostova', email: 'e.rostova@acmecore.com', role: 'HR_ADMIN', isActive: true };
    const u2: User = { id: 'u_acme_rec', tenantId: t1, name: 'Arthur Pendelton', email: 'a.pendelton@acmecore.com', role: 'RECRUITER', isActive: true };
    const u3: User = { id: 'u_acme_hm', tenantId: t1, name: 'Sanjay Kumar', email: 's.kumar@acmecore.com', role: 'HIRING_MANAGER', isActive: true };
    const u4: User = { id: 'u_acme_exec', tenantId: t1, name: 'Diane Vance', email: 'd.vance@acmecore.com', role: 'EXECUTIVE', isActive: true };

    const job1: JobPosting = {
      id: 'job_acme_01',
      tenantId: t1,
      title: 'Senior Full Stack Engineer (React/TypeScript)',
      department: 'Technology',
      location: 'Remote (APAC/Europe)',
      type: 'FULL_TIME',
      description: 'We are seeking a Senior Full Stack Engineer specializing in TypeScript, modern state management, and Node.js backend pipelines. You will lead client-architected projects and drive developer standards.',
      requirements: ['TYPESCRIPT', 'REACT', 'NODE.JS', 'TAILWIND CSS', 'REST APIS'],
      salaryMin: 95000,
      salaryMax: 130000,
      status: 'ACTIVE',
      createdById: u1.id,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    };

    const job2: JobPosting = {
      id: 'job_acme_02',
      tenantId: t1,
      title: 'Global Talent Acquisition Director',
      department: 'Human Resources',
      location: 'Manila HQ (Hybrid)',
      type: 'FULL_TIME',
      description: 'Lead the executive and standard recruiting divisions at ACME. Maintain global recruitment policies, deploy software systems, and foster regional employer branding campaigns.',
      requirements: ['TALENT ACQUISITION', 'RECRUITMENT MATRIX', 'GLOBAL SCALE', 'COMPENSATION DESIGN'],
      salaryMin: 110000,
      salaryMax: 145000,
      status: 'ACTIVE',
      createdById: u1.id,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    };

    const cand1: CandidateProfile = {
      id: 'cand_acme_01',
      tenantId: t1,
      firstName: 'Janice',
      lastName: 'Montenegro',
      email: 'janice.m@codefellow.org',
      phone: '+63 917 888 1234',
      location: 'Cebu City, PH',
      summary: 'Passionate frontend leader with 6 years writing pure JavaScript, React, and single page applications. Proficient in UI optimization and clean styles.',
      skills: ['TYPESCRIPT', 'REACT', 'TAILWIND CSS', 'CSS3', 'JEST'],
      experienceYears: 6,
      resumeText: '6 Years experience at CodeFellow Corp. Managed React modular redesigns. Expert skills include modern state design, responsive viewport layouts, CSS, and Tailwind CSS. Bachelor of Computer Science honors.',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    };

    const cand2: CandidateProfile = {
      id: 'cand_acme_02',
      tenantId: t1,
      firstName: 'Dmitri',
      lastName: 'Vasiliev',
      email: 'dmitriv@devgrid.io',
      phone: '+44 20 7946 0192',
      location: 'London, UK',
      summary: 'Backend focused engineer skilled at writing database drivers, Node.js routers, and scalable cloud functions.',
      skills: ['NODE.JS', 'REST APIS', 'TYPESCRIPT', 'POSTGRESQL', 'AWS'],
      experienceYears: 4,
      resumeText: 'DevGrid Ltd Software Developer. Maintained Node.js microservices serving millions of monthly requests. Configured REST API adapters. Strong understanding of system security and SQL query optimizations.',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    };

    const app1: Application = {
      id: 'app_acme_01',
      tenantId: t1,
      jobId: job1.id,
      candidateId: cand1.id,
      stage: 'TECHNICAL_INTERVIEW',
      reviews: [
        { id: 'rev_1', reviewerId: u2.id, reviewerName: u2.name, score: 5, comments: 'Extremely polite candidate, exceptional score in React, and has direct experience in all target frameworks.', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
      ],
      assignedHiringManagerId: u3.id,
      suitabilityScore: 86, // (4/5 skills overlap => 48pts + 6yrs exp => 30pts + resume match bonus => 8pts)
      matchingExplanation: 'Skill match ratio of 4/5 matching required proficiencies. Aligned technical stacks verified: [TYPESCRIPT, REACT, TAILWIND CSS]. Experience assessment adds +30/30 weight based on 6 active years. Resume parsing identified supplemental match phrases, resulting in +8 bonus marks.',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    };

    const app2: Application = {
      id: 'app_acme_02',
      tenantId: t1,
      jobId: job1.id,
      candidateId: cand2.id,
      stage: 'APPLIED',
      reviews: [],
      suitabilityScore: 68, // (3/5 skills => 36pts + 4yrs exp => 24pts + resume match => 8)
      matchingExplanation: 'Skill match ratio of 3/5 matching required proficiencies. Aligned technical stacks verified: [NODE.JS, REST APIS, TYPESCRIPT]. Experience assessment adds +24/30 weight based on 4 active years.',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    };

    const audit1: AuditLog = {
      id: 'aud_1',
      tenantId: t1,
      userId: u1.id,
      userEmail: u1.email,
      userRole: u1.role,
      action: 'SYSTEM_BOOTSTRAP',
      resourceType: 'TENANT',
      resourceId: t1,
      timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      ipAddress: '192.168.1.10',
      details: 'Secure Tenant "Acme Core" context bootloaded.',
      securityVerdict: 'ALLOWED'
    };

    const audit2: AuditLog = {
      id: 'aud_2',
      tenantId: t1,
      userId: u1.id,
      userEmail: u1.email,
      userRole: u1.role,
      action: 'CREATE_JOB_SUCCESS',
      resourceType: 'JOB',
      resourceId: job1.id,
      timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      ipAddress: '192.168.1.10',
      details: `Successfully published job: "${job1.title}".`,
      securityVerdict: 'ALLOWED'
    };


    // ----------------- TENANT 2: TECHFLOW LABS -----------------
    const t2 = 'tenant_2';

    const u5: User = { id: 'u_flow_admin', tenantId: t2, name: 'Marcus Sterling', email: 'm.sterling@techflowlabs.net', role: 'HR_ADMIN', isActive: true };
    const u6: User = { id: 'u_flow_rec', tenantId: t2, name: 'Sasha Greywood', email: 'sasha.g@techflowlabs.net', role: 'RECRUITER', isActive: true };
    const u7: User = { id: 'u_flow_hm', tenantId: t2, name: 'Vikram Chawla', email: 'v.chawla@techflowlabs.net', role: 'HIRING_MANAGER', isActive: true };

    const job3: JobPosting = {
      id: 'job_flow_01',
      tenantId: t2,
      title: 'Staff UI Designer (Figma Systems)',
      department: 'Product & Design',
      location: 'Fully Remote (US/UTC)',
      type: 'FULL_TIME',
      description: 'Craft beautiful interface frameworks and robust design libraries inside TechFlow Labs. Deep experience building component systems, usability protocols, and tokens is desired.',
      requirements: ['FIGMA SYSTEMS', 'UX PROTOCOLS', 'COMPONENT LIBRARIES', 'USABILITY', 'ACCESSIBILITY'],
      salaryMin: 105000,
      salaryMax: 140000,
      status: 'ACTIVE',
      createdById: u5.id,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    };

    const cand3: CandidateProfile = {
      id: 'cand_flow_01',
      tenantId: t2,
      firstName: 'Emily',
      lastName: 'Zucker',
      email: 'emily.zucker@pixelgroup.info',
      phone: '+1 415 555 2649',
      location: 'San Francisco, CA',
      summary: 'Product design architect with a dedication to accessibility (WCAG 2.1) and complex layout systems.',
      skills: ['FIGMA SYSTEMS', 'UX PROTOCOLS', 'COMPONENT LIBRARIES', 'ACCESSIBILITY'],
      experienceYears: 5,
      resumeText: 'PixelGroup Lead UX Designer. Designed adaptive token libraries. Expert in figma systems, accessibility (WCAG standard compliance), responsive layouts, and user flows.',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    };

    const app3: Application = {
      id: 'app_flow_01',
      tenantId: t2,
      jobId: job3.id,
      candidateId: cand3.id,
      stage: 'PHONE_SCREEN',
      reviews: [],
      assignedHiringManagerId: u7.id,
      suitabilityScore: 84, // (4/5 skills => 48pts + 5yrs exp => 30pts + resume key => 6pts)
      matchingExplanation: 'Skill match ratio of 4/5 matching required proficiencies. Aligned technical stacks verified: [FIGMA SYSTEMS, UX PROTOCOLS, COMPONENT LIBRARIES, ACCESSIBILITY]. Experience assessment adds +30/30 weight based on 5 active years.',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    };

    const audit3: AuditLog = {
      id: 'aud_3',
      tenantId: t2,
      userId: u5.id,
      userEmail: u5.email,
      userRole: u5.role,
      action: 'SYSTEM_BOOTSTRAP',
      resourceType: 'TENANT',
      resourceId: t2,
      timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      ipAddress: '10.0.4.15',
      details: 'Secure Tenant "TechFlow Labs" context bootloaded.',
      securityVerdict: 'ALLOWED'
    };

    // Combine
    this.jobs = [job1, job2, job3];
    this.candidates = [cand1, cand2, cand3];
    this.applications = [app1, app2, app3];
    this.users = [u1, u2, u3, u4, u5, u6, u7];
    this.auditLogs = [audit1, audit2, audit3];
    this.saveToStorage();
  }
}

export const dbInstance = new MockDatabase();

// ==========================================
// 2. Repository Implementations (Security Param Logs Embedded)
// ==========================================

export class JobRepository implements IJobRepository {
  async getById(id: string, tenantId: string): Promise<JobPosting | null> {
    // Audit-Defensive parameterized logging simulation
    dbInstance.logSql(
      'SELECT * FROM job_postings WHERE tenant_id = $1 AND id = $2 LIMIT 1;',
      [tenantId, id]
    );
    const item = dbInstance.jobs.find(j => j.id === id && j.tenantId === tenantId);
    return item ? { ...item } : null;
  }

  async list(tenantId: string): Promise<JobPosting[]> {
    dbInstance.logSql(
      'SELECT * FROM job_postings WHERE tenant_id = $1 ORDER BY created_at DESC;',
      [tenantId]
    );
    return dbInstance.jobs
      .filter(j => j.tenantId === tenantId)
      .map(j => ({ ...j }));
  }

  async save(job: JobPosting): Promise<void> {
    const existingIndex = dbInstance.jobs.findIndex(j => j.id === job.id && j.tenantId === job.tenantId);
    
    if (existingIndex >= 0) {
      dbInstance.logSql(
        'UPDATE job_postings SET title=$1, department=$2, location=$3, type=$4, description=$5, requirements=$6, salary_min=$7, salary_max=$8, status=$9, updated_at=$10 WHERE tenant_id=$11 AND id=$12;',
        [job.title, job.department, job.location, job.type, job.description, job.requirements, job.salaryMin, job.salaryMax, job.status, job.updatedAt, job.tenantId, job.id]
      );
      dbInstance.jobs[existingIndex] = { ...job };
    } else {
      dbInstance.logSql(
        'INSERT INTO job_postings (id, tenant_id, title, department, location, type, description, requirements, salary_min, salary_max, status, created_by_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);',
        [job.id, job.tenantId, job.title, job.department, job.location, job.type, job.description, job.requirements, job.salaryMin, job.salaryMax, job.status, job.createdById, job.createdAt, job.updatedAt]
      );
      dbInstance.jobs.push({ ...job });
    }
    dbInstance.persist();
  }
}

export class CandidateRepository implements ICandidateRepository {
  async getById(id: string, tenantId: string): Promise<CandidateProfile | null> {
    dbInstance.logSql(
      'SELECT * FROM candidates WHERE tenant_id = $1 AND id = $2 LIMIT 1;',
      [tenantId, id]
    );
    const item = dbInstance.candidates.find(c => c.id === id && c.tenantId === tenantId);
    return item ? { ...item } : null;
  }

  async list(tenantId: string): Promise<CandidateProfile[]> {
    dbInstance.logSql(
      'SELECT * FROM candidates WHERE tenant_id = $1 ORDER BY created_at DESC;',
      [tenantId]
    );
    return dbInstance.candidates
      .filter(c => c.tenantId === tenantId)
      .map(c => ({ ...c }));
  }

  async save(candidate: CandidateProfile): Promise<void> {
    const existingIndex = dbInstance.candidates.findIndex(c => c.id === candidate.id && c.tenantId === candidate.tenantId);
    
    if (existingIndex >= 0) {
      dbInstance.logSql(
        'UPDATE candidates SET first_name=$1, last_name=$2, email=$3, phone=$4, location=$5, summary=$6, skills=$7, experience_years=$8, resume_text=$9 WHERE tenant_id=$10 AND id=$11;',
        [candidate.firstName, candidate.lastName, candidate.email, candidate.phone, candidate.location, candidate.summary, candidate.skills, candidate.experienceYears, candidate.resumeText, candidate.tenantId, candidate.id]
      );
      dbInstance.candidates[existingIndex] = { ...candidate };
    } else {
      dbInstance.logSql(
        'INSERT INTO candidates (id, tenant_id, first_name, last_name, email, phone, location, summary, skills, experience_years, resume_text, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);',
        [candidate.id, candidate.tenantId, candidate.firstName, candidate.lastName, candidate.email, candidate.phone, candidate.location, candidate.summary, candidate.skills, candidate.experienceYears, candidate.resumeText, candidate.createdAt]
      );
      dbInstance.candidates.push({ ...candidate });
    }
    dbInstance.persist();
  }
}

export class ApplicationRepository implements IApplicationRepository {
  async getById(id: string, tenantId: string): Promise<Application | null> {
    dbInstance.logSql(
      'SELECT * FROM candidate_applications WHERE tenant_id = $1 AND id = $2 LIMIT 1;',
      [tenantId, id]
    );
    const item = dbInstance.applications.find(a => a.id === id && a.tenantId === tenantId);
    return item ? { ...item } : null;
  }

  async list(tenantId: string): Promise<Application[]> {
    dbInstance.logSql(
      'SELECT * FROM candidate_applications WHERE tenant_id = $1 ORDER BY updated_at DESC;',
      [tenantId]
    );
    return dbInstance.applications
      .filter(a => a.tenantId === tenantId)
      .map(a => ({ ...a }));
  }

  async getByJob(jobId: string, tenantId: string): Promise<Application[]> {
    dbInstance.logSql(
      'SELECT * FROM candidate_applications WHERE tenant_id = $1 AND job_id = $2 ORDER BY suitability_score DESC;',
      [tenantId, jobId]
    );
    return dbInstance.applications
      .filter(a => a.jobId === jobId && a.tenantId === tenantId)
      .map(a => ({ ...a }));
  }

  async save(application: Application): Promise<void> {
    const existingIndex = dbInstance.applications.findIndex(a => a.id === application.id && a.tenantId === application.tenantId);
    
    if (existingIndex >= 0) {
      dbInstance.logSql(
        'UPDATE candidate_applications SET stage=$1, reviews=$2, assigned_hiring_manager_id=$3, suitability_score=$4, matching_explanation=$5, updated_at=$6 WHERE tenant_id=$7 AND id=$8;',
        [application.stage, JSON.stringify(application.reviews), application.assignedHiringManagerId, application.suitabilityScore, application.matchingExplanation, application.updatedAt, application.tenantId, application.id]
      );
      dbInstance.applications[existingIndex] = { ...application };
    } else {
      dbInstance.logSql(
        'INSERT INTO candidate_applications (id, tenant_id, job_id, candidate_id, stage, reviews, assigned_hiring_manager_id, suitability_score, matching_explanation, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);',
        [application.id, application.tenantId, application.jobId, application.candidateId, application.stage, JSON.stringify(application.reviews), application.assignedHiringManagerId, application.suitabilityScore, application.matchingExplanation, application.createdAt, application.updatedAt]
      );
      dbInstance.applications.push({ ...application });
    }
    dbInstance.persist();
  }
}

export class AuditRepository implements IAuditRepository {
  async list(tenantId: string): Promise<AuditLog[]> {
    dbInstance.logSql(
      'SELECT * FROM security_audit_logs WHERE tenant_id = $1 ORDER BY timestamp DESC;',
      [tenantId]
    );
    return dbInstance.auditLogs
      .filter(l => l.tenantId === tenantId)
      .map(l => ({ ...l }));
  }

  async log(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const record: AuditLog = {
      ...entry,
      id: `aud_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    dbInstance.logSql(
      'INSERT INTO security_audit_logs (id, tenant_id, user_id, user_email, user_role, action, resource_type, resource_id, timestamp, ip_address, details, security_verdict) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);',
      [record.id, record.tenantId, record.userId, record.userEmail, record.userRole, record.action, record.resourceType, record.resourceId, record.timestamp, record.ipAddress, record.details, record.securityVerdict]
    );
    dbInstance.auditLogs.unshift(record);
    dbInstance.persist();
  }
}

export class UserRepository implements IUserRepository {
  async list(tenantId: string): Promise<User[]> {
    dbInstance.logSql(
      'SELECT * FROM corporate_users WHERE tenant_id = $1 AND is_active = true;',
      [tenantId]
    );
    return dbInstance.users
      .filter(u => u.tenantId === tenantId && u.isActive)
      .map(u => ({ ...u }));
  }

  async getById(id: string, tenantId: string): Promise<User | null> {
    dbInstance.logSql(
      'SELECT * FROM corporate_users WHERE tenant_id = $1 AND id = $2 LIMIT 1;',
      [tenantId, id]
    );
    const user = dbInstance.users.find(u => u.id === id && u.tenantId === tenantId);
    return user ? { ...user } : null;
  }
}
