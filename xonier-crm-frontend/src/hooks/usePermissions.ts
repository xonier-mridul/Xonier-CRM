import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import checkRole from "@/src/app/utils/roleCheck.utils";

export const usePermissions = () => {
  const roles = useSelector(
    (state: RootState) => state.auth?.user?.userRole || []
  );

  const hasPermission = useMemo(() => {
    return (permission: string) =>
      checkRole(permission, roles);
  }, [roles]);

  return { hasPermission };
};
