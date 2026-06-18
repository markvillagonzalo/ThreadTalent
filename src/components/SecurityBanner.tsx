/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Tenant } from '../domain/entities';
import { dbInstance, SqlLogEntry } from '../adapters/repositories';
import { Shield, Database, Lock, AlertTriangle, Play, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SecurityBannerProps {
  currentTenant: Tenant;
  currentUser: User;
  onResetDatabase: () => void;
}

export default function SecurityBanner({ currentTenant, currentUser, onResetDatabase }: SecurityBannerProps) {
  const [showSqlLogs, setShowSqlLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'SANDBOX' | 'SQL_LOGGER' | 'OWASP' | 'ARCH_RULES'>('SANDBOX');
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'HR_ADMIN': return 'bg-red-50 text-red-700 border border-red-200';
      case 'RECRUITER': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'HIRING_MANAGER': return 'bg-amber-50 text-amber-700 border border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'ALLOWED': return 'bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded text-xs';
      case 'ALERT': return 'bg-yellow-100 text-yellow-800 font-medium px-2 py-0.5 rounded text-xs';
      case 'BLOCKED': return 'bg-red-100 text-red-800 font-medium px-2 py-0.5 rounded text-xs';
      default: return 'bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs';
    }
  };

  return (
    <div id="security-banner-root" className="bg-slate-900 text-slate-100 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Identity Cockpit */}
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/30">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Tenant Isolation Boundary</span>
                <span className="text-[10px] bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                  ID: {currentTenant.id}
                </span>
              </div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                {currentTenant.name}
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </h1>
            </div>
          </div>

          {/* User RBAC Cockpit */}
          <div className="flex items-center flex-wrap gap-2 md:gap-4 text-xs">
            <div className="bg-slate-800/80 p-2 rounded-md border border-slate-700 flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-300 font-medium">Session Identity:</span>
              <span className="text-slate-100 font-mono text-[11px] bg-slate-950 px-1.5 py-0.5 rounded">
                {currentUser.name}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${getRoleBadgeColor(currentUser.role)}`}>
                {currentUser.role}
              </span>
            </div>

            <button
              id="toggle-security-cockpit-btn"
              onClick={() => setShowSqlLogs(!showSqlLogs)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3.5 py-2 rounded-md transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{showSqlLogs ? 'Hide Threat Defense Grid' : 'Review Threat Defense Grid'}</span>
            </button>
          </div>
        </div>

        {/* Security Diagnostics Overlay Panel */}
        <AnimatePresence>
          {showSqlLogs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-4 border-t border-slate-800 pt-4 overflow-hidden"
            >
              {/* Internal Tab Toggles */}
              <div className="flex border-b border-slate-800 text-xs mb-3 font-mono">
                <button
                  onClick={() => setActiveTab('SANDBOX')}
                  className={`px-3 py-2 -mb-px font-medium transition-colors ${activeTab === 'SANDBOX' ? 'border-b-2 border-indigo-400 text-white bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Layers className="w-3.5 h-3.5 inline mr-1.5" />
                  Isolation Check
                </button>
                <button
                  onClick={() => setActiveTab('SQL_LOGGER')}
                  className={`px-3 py-2 -mb-px font-medium transition-colors ${activeTab === 'SQL_LOGGER' ? 'border-b-2 border-indigo-400 text-white bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Database className="w-3.5 h-3.5 inline mr-1.5" />
                  Live SQL Log ({dbInstance.sqlLogs.length})
                </button>
                <button
                  onClick={() => setActiveTab('OWASP')}
                  className={`px-3 py-2 -mb-px font-medium transition-colors ${activeTab === 'OWASP' ? 'border-b-2 border-indigo-400 text-white bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Shield className="w-3.5 h-3.5 inline mr-1.5" />
                  OWASP Defensive Shield
                </button>
                <button
                  onClick={() => setActiveTab('ARCH_RULES')}
                  className={`px-3 py-2 -mb-px font-medium transition-colors ${activeTab === 'ARCH_RULES' ? 'border-b-2 border-indigo-400 text-white bg-slate-800/40' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Lock className="w-3.5 h-3.5 inline mr-1.5" />
                  Clean Architecture Blueprint
                </button>
              </div>

              {/* Tab Case 1: Sandbox Isolation Verify */}
              {activeTab === 'SANDBOX' && (
                <div className="space-y-3 font-sans text-xs text-slate-300 bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-white text-sm mb-1">Strict Multi-Tenant Inverted Sandbox Policy</h3>
                      <p className="leading-relaxed">
                        To guarantee complete digital isolation, all database adapters verify the inbound <code className="bg-slate-800 px-1 py-0.5 font-mono rounded text-indigo-300">tenantId</code> argument on every transaction.
                        No database transaction can query across boundaries. Data belonging to Tenant B is structurally invisible and structurally inaccessible from any context associated with Tenant A.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 font-mono text-[11px]">
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded">
                      <div className="text-gray-400 font-bold mb-1">BOUND STATE FOR INCOMING REQUESTS:</div>
                      <div className="text-emerald-400">✓ Security Policy: tenant_id == {currentTenant.id}</div>
                      <div className="text-emerald-400">✓ In-Memory Allocation: Filtered heap lookup strictly locked</div>
                      <div className="text-indigo-300">✓ Current Scope Org: {currentTenant.name}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded flex flex-col justify-between">
                      <div>
                        <div className="text-gray-400 font-bold mb-1">SIMULATED RE-SEED HANDLER:</div>
                        <div className="text-slate-400">Wipe client changes to restore standard enterprise benchmarks.</div>
                      </div>
                      <button 
                        onClick={onResetDatabase}
                        className="mt-2 self-start bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-mono text-[10px] py-1 px-2.5 rounded flex items-center space-x-1 hover:text-indigo-400 transition"
                      >
                        <RefreshCw className="w-3 h-3 text-indigo-400" />
                        <span>Perform Factory Seed Clean</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Case 2: Live parameterized queries list */}
              {activeTab === 'SQL_LOGGER' && (
                <div className="space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800 max-h-64 overflow-y-auto font-mono text-[11px]">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      Live Parametric SQL Statement Logger
                    </span>
                    <span className="text-xs text-slate-500">Parameterized queries mitigate OWLASP SQL injection risks</span>
                  </div>

                  {dbInstance.sqlLogs.length === 0 ? (
                    <div className="text-slate-500 py-3 text-center">No SQL logs emitted yet. Interact with the panels to trigger repository queries!</div>
                  ) : (
                    <div className="divide-y divide-slate-900">
                      {dbInstance.sqlLogs.map((log) => (
                        <div key={log.id} className="py-2 hover:bg-slate-900/50 px-1 rounded transition-colors">
                          <div className="flex items-center justify-between text-slate-500 text-[9px] mb-1">
                            <span className="text-indigo-400 flex items-center">
                              <Play className="w-2.5 h-2.5 mr-1" />
                              QUERY LOG: {log.id}
                            </span>
                            <span>{log.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <div className="text-emerald-400 break-words font-medium">{log.query}</div>
                          <div className="mt-1 text-yellow-400 flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Bound params:</span>
                            {log.parameters.map((p, i) => (
                              <span key={i} className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10.5px]">
                                ${i + 1} = <span className="text-white">{p === null ? 'NULL' : typeof p === 'object' ? `[JSON: ${JSON.stringify(p).slice(0,25)}...]` : `"${p}"`}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Case 3: OWASP Top 10 defense details */}
              {activeTab === 'OWASP' && (
                <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-800 font-sans text-xs">
                  <h4 className="text-white font-semibold flex items-center text-sm gap-1.5 border-b border-slate-800 pb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    OWASP Top 10 Defenses Implemented in Thread Talent
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="font-bold text-indigo-300">A03:2021-Injection (SQL & XSS)</div>
                      <p className="text-slate-400 leading-relaxed">
                        Data input is sanitized at the <strong>Interface Adapter</strong> layer (using exact RFC regex check and HTML dynamic entity replacement) before evaluation. Under the hood, repository drivers route SQL strictly via parameterized placeholders (e.g. <code className="bg-slate-900 px-1 text-emerald-400 font-mono text-[10px]">$1, $2</code> bindings) so that malicious user string fields can never alter compiled query structures.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-indigo-300">A01:2021-Broken Access Control</div>
                      <p className="text-slate-400 leading-relaxed">
                        RBAC guidelines are rigorously enforced. A user bound as <code className="bg-slate-900 px-1 text-white font-mono text-[10.5px]">HIRING_MANAGER</code> cannot edit recruitment pipeline states of an applicant unless that application has been allocated to their desk. Viewers bound as <code className="bg-slate-900 px-1 text-white font-mono text-[10.5px]">EXECUTIVE</code> hold read-only dashboard permissions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Case 4: Clean Architecture rules */}
              {activeTab === 'ARCH_RULES' && (
                <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-800 font-sans text-xs">
                  <h4 className="text-white font-semibold flex items-center text-sm gap-1.5 border-b border-slate-800 pb-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Clean Architecture Design Matrix
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center text-[11px] font-mono">
                    <div className="bg-indigo-950/40 border border-indigo-500/35 p-2 rounded">
                      <div className="text-indigo-400 font-bold mb-1">Entities (Inner Core)</div>
                      <div className="text-slate-400">Pure Enterprise Rules</div>
                      <div className="text-slate-500 mt-1">src/domain/entities.ts</div>
                    </div>
                    <div className="bg-indigo-950/20 border border-indigo-500/20 p-2 rounded">
                      <div className="text-indigo-300 font-bold mb-1">Use Cases</div>
                      <div className="text-slate-400">Applicational Rules</div>
                      <div className="text-slate-500 mt-1">src/domain/usecases.ts</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2 rounded">
                      <div className="text-slate-300 font-bold mb-1">Interface Adapters</div>
                      <div className="text-slate-400">Gateways & Presenters</div>
                      <div className="text-slate-500 mt-1">src/adapters/*</div>
                    </div>
                    <div className="bg-slate-950 border border-slate-900 p-2 rounded opacity-80">
                      <div className="text-slate-400 font-bold mb-1">Frameworks (Outer)</div>
                      <div className="text-slate-400">React UI / CSS / Vite</div>
                      <div className="text-slate-500 mt-1">src/components/*</div>
                    </div>
                  </div>
                  <p className="text-slate-500 text-[10.5px] italic text-center mt-2 font-mono">
                    "The Dependency Rule: Source code dependencies must point only inward, toward higher-level policies."
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
