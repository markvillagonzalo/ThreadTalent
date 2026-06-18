/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Briefcase, Users, Star, PieChart, CheckSquare, Layers } from 'lucide-react';

interface AnalyticsViewProps {
  analytics: {
    activePostings: number;
    totalApplications: number;
    averageSuitability: number;
    stageAggregation: Record<string, number>;
    departmentAggregation: Record<string, number>;
  };
}

export default function AnalyticsView({ analytics }: AnalyticsViewProps) {
  // Safe math bounds
  const activePostings = analytics?.activePostings || 0;
  const totalApplications = analytics?.totalApplications || 0;
  const avgSuitability = analytics?.averageSuitability || 0;
  const stages = analytics?.stageAggregation || {};
  const departments = analytics?.departmentAggregation || {};

  // Formulate total hired
  const hiredCount = stages['HIRED'] || 0;
  const rejectCount = stages['REJECTED'] || 0;
  
  // Custom pipeline percentage ratio for progress graphics
  const computeRatio = (val: number) => {
    if (totalApplications === 0) return 0;
    return Math.round((val / totalApplications) * 100);
  };

  return (
    <div id="analytics-view-root" className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in text-gray-900">
      
      {/* KPI Card 1: Active Postings */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Active Jobs</span>
          <h2 className="text-2xl font-black text-gray-900 font-mono leading-none">{activePostings}</h2>
          <span className="text-[9px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-2 inline-block">
            Tenant Isolated Postings
          </span>
        </div>
        <div className="bg-blue-50/70 p-2.5 rounded-md border border-blue-100">
          <Briefcase className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {/* KPI Card 2: Total Applications */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Talent Pipeline</span>
          <h2 className="text-2xl font-black text-gray-900 font-mono leading-none">{totalApplications}</h2>
          <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mt-2 inline-block">
            {hiredCount} Candidates Hired
          </span>
        </div>
        <div className="bg-emerald-50 p-2.5 rounded-md border border-emerald-100">
          <Users className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      {/* KPI Card 3: Suitability Score */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Avg Alignment</span>
          <h2 className="text-2xl font-black text-gray-900 font-mono leading-none">
            {avgSuitability}%
          </h2>
          <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2.5 border border-gray-200">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${avgSuitability}%`, backgroundColor: avgSuitability > 80 ? '#10b981' : '#2563eb' }}
            />
          </div>
        </div>
        <div className={`p-2.5 rounded-md border ${avgSuitability > 75 ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}>
          <Star className={`w-5 h-5 ${avgSuitability > 75 ? 'text-emerald-600' : 'text-blue-600'}`} />
        </div>
      </div>

      {/* KPI Card 4: Quick Summary Percentage */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Tenant Health</span>
          <h2 className="text-2xl font-black text-gray-900 font-mono leading-none">
            {totalApplications > 0 ? Math.round((hiredCount / (totalApplications - rejectCount || 1)) * 100) : 0}%
          </h2>
          <span className="text-[9px] text-gray-550 block mt-2.5 font-semibold uppercase tracking-wider">
            Hired vs Rejected Ratio
          </span>
        </div>
        <div className="bg-gray-50 p-2.5 rounded-md border border-gray-200">
          <PieChart className="w-5 h-5 text-gray-500" />
        </div>
      </div>

      {/* Deep-dive pipeline bar graph visual summary */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs md:col-span-3">
        <h3 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <Layers className="w-4 h-4 text-blue-600" />
          Recruitment Workflow Funnel Distribution
        </h3>
        
        {totalApplications === 0 ? (
          <div className="text-center py-5 text-gray-400 text-xs italic">
            No applicant records active in this pipeline. Toggle user accounts to apply simulation data.
          </div>
        ) : (
          <div className="space-y-2.5 text-xs text-gray-750">
            {[
              { id: 'APPLIED', name: 'New Applications', color: 'bg-blue-500' },
              { id: 'PHONE_SCREEN', name: 'Phone Screening', color: 'bg-indigo-400' },
              { id: 'TECHNICAL_INTERVIEW', name: 'Technical Interviews', color: 'bg-purple-500' },
              { id: 'HIRING_MANAGER_INTERVIEW', name: 'Hiring Manager Loop', color: 'bg-amber-500' },
              { id: 'OFFER', name: 'Contracts Offered', color: 'bg-cyan-500' },
              { id: 'HIRED', name: 'Hired & Seated', color: 'bg-emerald-500' },
              { id: 'REJECTED', name: 'Archived/Rejected', color: 'bg-gray-400' }
            ].map((stage) => {
              const count = stages[stage.id] || 0;
              const ratio = computeRatio(count);
              return (
                <div key={stage.id} className="flex items-center text-xs">
                  <div className="w-1/4 font-semibold text-gray-600 truncate">{stage.name}</div>
                  <div className="w-3/4 flex items-center space-x-2">
                    <div className="flex-grow bg-gray-100 h-3 rounded overflow-hidden border border-gray-200">
                      <div 
                        className={`${stage.color} h-full rounded transition-all duration-300`} 
                        style={{ width: `${Math.max(ratio, 2)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono font-bold text-gray-800 pl-2">
                      {count} <span className="text-gray-400 text-[10px] font-normal">({ratio}%)</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Department Breakdown */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
        <h3 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <CheckSquare className="w-4 h-4 text-blue-600" />
          Active Departments
        </h3>
        
        {Object.keys(departments).length === 0 ? (
          <div className="text-center py-5 text-gray-400 text-xs italic">
            No active departments logged.
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(departments).map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between text-xs border-b border-gray-100 pb-1.5 last:border-b-0">
                <div>
                  <div className="font-bold text-gray-700">{dept}</div>
                  <div className="text-gray-400 text-[9px] uppercase tracking-wide">Resource Department</div>
                </div>
                <div className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded font-mono text-[10px] border border-gray-200">
                  {count} {count === 1 ? 'applicant' : 'applicants'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
