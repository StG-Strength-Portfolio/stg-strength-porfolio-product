import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ScreenSubPageContextValue = {
  page: number;
  total: number;

  register: (total: number) => void;
  setPage: (page: number) => void;

  goNext: () => boolean;
  goPrevious: () => boolean;

  hasNext: boolean;
  hasPrevious: boolean;
};

const ScreenSubPageContext =
  createContext<ScreenSubPageContextValue | null>(null);

const FALLBACK: ScreenSubPageContextValue = {
  page: 0,
  total: 1,

  register: () => {},
  setPage: () => {},

  goNext: () => false,
  goPrevious: () => false,

  hasNext: false,
  hasPrevious: false,
};

export function ScreenSubPageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [page, setPageState] = useState(0);
  const [total, setTotal] = useState(1);

  const register = useCallback((nextTotal: number) => {
    const safeTotal = Math.max(1, nextTotal);

    setTotal(safeTotal);

    setPageState((currentPage) =>
      Math.min(currentPage, safeTotal - 1),
    );
  }, []);

  const setPage = useCallback(
    (nextPage: number) => {
      setPageState(
        Math.max(0, Math.min(nextPage, total - 1)),
      );
    },
    [total],
  );

  const goNext = useCallback(() => {
    if (page >= total - 1) return false;

    setPageState(page + 1);
    return true;
  }, [page, total]);

  const goPrevious = useCallback(() => {
    if (page <= 0) return false;

    setPageState(page - 1);
    return true;
  }, [page]);

  const value = useMemo<ScreenSubPageContextValue>(
    () => ({
      page,
      total,

      register,
      setPage,

      goNext,
      goPrevious,

      hasNext: page < total - 1,
      hasPrevious: page > 0,
    }),
    [
      page,
      total,
      register,
      setPage,
      goNext,
      goPrevious,
    ],
  );

  return (
    <ScreenSubPageContext.Provider value={value}>
      {children}
    </ScreenSubPageContext.Provider>
  );
}


export function useScreenSubPages(total: number) {
  const context = useContext(ScreenSubPageContext);

  useEffect(() => {
    context?.register(total);
  }, [context, total]);

  const page = Math.min(
    context?.page ?? 0,
    Math.max(0, total - 1),
  );

  const setPage =
    context?.setPage ?? (() => {});

  return [page, setPage] as const;
}


export function useScreenSubPageNav() {
  return useContext(ScreenSubPageContext) ?? FALLBACK;
}
