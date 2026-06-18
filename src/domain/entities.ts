/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// 1. Core Domain Types & Disjoint Entities
// ==========================================

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  createdAt: Date;
}

export type UserRole = 'HR_ADMIN' | 'RECRUITER' | 'HIRING_MANAGER' | 'EXECUTIVE';

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export type JobStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface JobPosting {
  id: string;
  tenantId: string;
  title: string;
  department: string;
  location: string; // e.g. "Remote", "Manila", "New York"
  type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  description: string;
  requirements: string[]; // List of critical skills/requirements
  salaryMin?: number;
  salaryMax?: number;
  status: JobStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ApplicationStage = 
  | 'APPLIED' 
  | 'PHONE_SCREEN' 
  | 'TECHNICAL_INTERVIEW' 
  | 'HIRING_MANAGER_INTERVIEW' 
  | 'OFFER' 
  | 'HIRED' 
  | 'REJECTED';

export interface CandidateProfile {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experienceYears: number;
  resumeText?: string;
  createdAt: Date;
}

export interface RecruiterReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  score: number; // 1 to 5 scale
  comments: string;
  createdAt: Date;
}

export interface Application {
  id: string;
  tenantId: string;
  jobId: string;
  candidateId: string;
  stage: ApplicationStage;
  reviews: RecruiterReview[];
  assignedHiringManagerId?: string; // Collaboration
  suitabilityScore?: number; // 0 to 100, populated by Matcher (AI or logic)
  matchingExplanation?: string; // Summary of skill alignment
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: string; // e.g., "CREATE_JOB", "CHANGE_APPLICATION_STAGE", "VIEW_CANDIDATE"
  resourceType: 'JOB' | 'CANDIDATE' | 'APPLICATION' | 'AUTH' | 'TENANT';
  resourceId: string;
  timestamp: Date;
  ipAddress: string;
  details: string;
  securityVerdict: 'ALLOWED' | 'ALERT' | 'BLOCKED';
}

// ==========================================
// 2. Pure Enterprise Validation Rules
// ==========================================

export class DomainValidator {
  /**
   * Sanitizes basic HTML / scripts to prevent XSS (OWASP Top 10)
   */
  public static sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validates email structures with standard RFC 5322 regex
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Domain rules for creating a Job Posting
   */
  public static validateJobPosting(job: Partial<JobPosting>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!job.title || job.title.trim().length === 0) {
      errors.push('Job title must not be empty.');
    }
    if (!job.department || job.department.trim().length === 0) {
      errors.push('Department specification is required.');
    }
    if (!job.requirements || job.requirements.length === 0) {
      errors.push('At least one requirement skill is required.');
    }
    if (job.salaryMin !== undefined && job.salaryMax !== undefined && job.salaryMin > job.salaryMax) {
      errors.push('Minimum salary cannot exceed maximum salary.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Domain rules for applicant profiles
   */
  public static validateCandidate(cand: Partial<CandidateProfile>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!cand.firstName || cand.firstName.trim().length === 0) {
      errors.push('First name is required.');
    }
    if (!cand.lastName || cand.lastName.trim().length === 0) {
      errors.push('Last name is required.');
    }
    if (!cand.email || !this.isValidEmail(cand.email)) {
      errors.push('A valid email address is required.');
    }
    if (cand.experienceYears !== undefined && cand.experienceYears < 0) {
      errors.push('Experience years cannot be negative.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Review rating scale invariants (1-5 limit)
   */
  public static validateReview(review: Partial<RecruiterReview>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!review.score || review.score < 1 || review.score > 5) {
      errors.push('Review rating score must be an integer between 1 and 5.');
    }
    if (!review.comments || review.comments.trim().length < 5) {
      errors.push('Review comment feedback must contain at least 5 characters.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
