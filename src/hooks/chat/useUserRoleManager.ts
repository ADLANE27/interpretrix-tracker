
import { useCallback } from 'react';
import { useRoleIdentification } from '../useRoleIdentification';

export const useUserRoleManager = (userRole: React.MutableRefObject<string>) => {
  const { identifyUserRole } = useRoleIdentification();

  // Check user role
  const checkUserRole = useCallback(async () => {
    const role = await identifyUserRole();
    userRole.current = role || 'unknown';
    console.log(`[useUserRoleManager] User role identified as: ${userRole.current}`);
    return userRole.current;
  }, [identifyUserRole, userRole]);

  return { checkUserRole };
};
