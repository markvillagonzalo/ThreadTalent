/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Tenant } from '../domain/entities';
import { dbInstance } from './repositories';

export const SIMULATED_TENANTS: Tenant[] = [
  {
    id: 'tenant_1',
    name: 'Acme Core Solutions',
    domain: 'acmecore.com',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'tenant_2',
    name: 'TechFlow Development Inc',
    domain: 'techflowlabs.net',
    createdAt: new Date('2024-05-20')
  }
];

export class AuthController {
  /**
   * Retrieves all users registered on the simulated database for the current tenant
   */
  public static getSimulatedUsersForTenant(tenantId: string): User[] {
    return dbInstance.users.filter(u => u.tenantId === tenantId && u.isActive);
  }

  /**
   * Sanitizes simulated authentication outputs
   */
  public static maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.***';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name.substring(0, 2)}***` : '***';
    return `${maskedName}@${domain}`;
  }
}
