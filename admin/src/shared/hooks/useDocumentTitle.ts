import { useEffect } from "react";

const BASE_TITLE = "Content Company · Ops";

export function useDocumentTitle(pageTitle: string | undefined) {
  useEffect(() => {
    if (!pageTitle) {
      document.title = BASE_TITLE;
      return;
    }
    document.title = `${pageTitle} · ${BASE_TITLE}`;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [pageTitle]);
}
