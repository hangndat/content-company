import { useState, useCallback } from "react";

/** Bọc submit ModalForm: một chỗ quản lý `loading` cho nút OK. */
export function useOpsModalSubmit() {
  const [submitting, setSubmitting] = useState(false);

  const guard = useCallback(async (fn: () => Promise<boolean>) => {
    try {
      setSubmitting(true);
      return await fn();
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, guard };
}
