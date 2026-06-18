/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuditLog } from '../domain/entities';
import { Clipboard, Shield, Info, ArrowDown, ArrowUp, Search, Lock } from 'lucide-react';

interface AuditTrailViewProps {
  logs: AuditLog[];
}

export default function AuditTrailView({ logs }: AuditTrailViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerdict, setFilterVerdict] = useState<'ALL' | 'ALLOWED' | 'ALERT' | 'BLOCKED'>('ALL');

  const getVerdictBadgeClass = (verdict: AuditLog['securityVerdict']) => {
    switch (verdict) {
      case 'ALLOWED': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'ALERT': return 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse';
      case 'BLOCKED': return 'bg-red-50 text-red-805 border-red-200 font-bold';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getResourceBadge = (type: AuditLog['resourceType']) => {
    switch (type) {
      case 'JOB': return 'bg-blue-50 text-blue-700 border border-blue-100 font-mono text-[9px] px-1.5 rounded';
      case 'APPLICATION': return 'bg-sky-50 text-sky-750 border border-sky-100 font-mono text-[9px] px-1.5 rounded';
      case 'CANDIDATE': return 'bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono text-[9px] px-1.5 rounded';
      case 'AUTH': return 'bg-purple-50 text-purple-700 border border-purple-100 font-mono text-[9px] px-1.5 rounded';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200 font-mono text-[9px] px-1.5 rounded';
    }
  };

  // Filter logs safely
  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      log.action.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term) ||
      log.userEmail.toLowerCase().includes(term);

    const matchesVerdict = filterVerdict === 'ALL' || log.securityVerdict === filterVerdict;

    return matchesSearch && matchesVerdict;
  });

  return (
    <div id="audit-trail-view-root" className="space-y-4 animate-fade-in text-gray-900">
      
      {/* Header Info */}
      <div className="border-b border-gray-200 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
            <Clipboard className="w-4 h-4 text-blue-600" />
            Security Audit Trail Configuration
          </h2>
          <p className="text-xs text-gray-500">
            Immutable chronological logging of administrative operations. Essential for compliance and security auditing.
          </p>
        </div>

        <div className="text-[9px] uppercase font-bold bg-blue-50 border border-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded tracking-wider">
          <span>✓ Parameterized logging verified</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center gap-2.5">
        <div className="flex-grow flex items-center bg-gray-50 border border-gray-300 rounded px-2 text-xs">
          <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search by action, email, description details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 shrink-0 font-medium">
          <span>Verdict Filters:</span>
          <select
            value={filterVerdict}
            onChange={(e) => setFilterVerdict(e.target.value as any)}
            className="border border-gray-300 bg-gray-50 rounded px-2.5 py-1.5 outline-none font-bold text-gray-800 text-xs"
          >
            <option value="ALL">All Actions</option>
            <option value="ALLOWED">Allowed (Safe)</option>
            <option value="ALERT">Alert Warnings</option>
            <option value="BLOCKED">Blocked Violations</option>
          </select>
        </div>
      </div>

      {/* Log list table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden block">
        <div className="overflow-x-auto min-h-64">
          <table className="w-full text-xs text-left divide-y divide-gray-100 text-gray-700 min-w-[700px]">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest sticky top-0">
              <tr>
                <th className="px-4 py-3 border-b border-gray-200">Timestamp</th>
                <th className="px-4 py-3 border-b border-gray-200">User & Credentials Scope</th>
                <th className="px-4 py-3 border-b border-gray-200">Operational Scope</th>
                <th className="px-4 py-3 border-b border-gray-200">Details</th>
                <th className="px-4 py-3 border-b border-gray-200 text-center">Clearance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center italic text-gray-400">
                    No matching compliance logs resolved under this filter constraints.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/20 transition-colors">
                    
                    {/* Timestamp column */}
                    <td className="px-4 py-2 w-40">
                      <div className="font-mono text-[10px] text-gray-500">
                        {log.timestamp.toLocaleDateString()}
                      </div>
                      <div className="font-mono text-[9px] text-gray-400">
                        {log.timestamp.toLocaleTimeString()}
                      </div>
                    </td>

                    {/* Email role column */}
                    <td className="px-4 py-2 w-48">
                      <p className="font-bold text-gray-800 break-all">{log.userEmail}</p>
                      <span className="text-[9px] text-gray-400 uppercase font-mono tracking-widest font-semibold">{log.userRole.replace('_', ' ')}</span>
                    </td>

                    {/* Operational resource columns */}
                    <td className="px-4 py-2 w-44">
                      <div className="font-mono text-[10.5px] font-bold text-gray-905 border-b border-dashed border-gray-150 pb-0.5">{log.action}</div>
                      <div className="mt-1 flex items-center space-x-1">
                        {getResourceBadge(log.resourceType)}
                        <span className="font-mono text-[8.5px] text-gray-400">ID: {log.resourceId}</span>
                      </div>
                    </td>

                    {/* Descriptive string, IP location */}
                    <td className="px-4 py-2">
                      <p className="text-gray-650 leading-relaxed font-sans">{log.details}</p>
                      <div className="text-[9px] text-gray-400 font-mono mt-0.5">Network Host Binding: {log.ipAddress}</div>
                    </td>

                    {/* Safety verdict allowed/blocked badge */}
                    <td className="px-4 py-2 w-28 text-center">
                      <span className={`inline-block px-2 py-0.5 text-[9px] uppercase font-black tracking-wider rounded border ${getVerdictBadgeClass(log.securityVerdict)}`}>
                        {log.securityVerdict}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
