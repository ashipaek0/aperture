import { useCallback } from "react";
import { useAtom } from "jotai";
import { globalAuthErrorAtom } from "../lib/atoms";

export function useAuthError() {
  const [authError, setAuthError] = useAtom(globalAuthErrorAtom);

  const handleAuthError = useCallback((error: any) => {
    if (error?.isAuthError) {
      setAuthError(error);
      return true;
    }
    return false;
  }, [setAuthError]);

  return {
    authError,
    setAuthError,
    handleAuthError,
  };
}
