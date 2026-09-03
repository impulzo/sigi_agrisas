import { useEffect, useState } from "react";
import { useDebounce } from "../../../../_hooks/useDebounce";
import { searchSales, type SaleOption } from "../services/searchSales";

export function useSaleSearch(query: string) {
  const [results, setResults] = useState<SaleOption[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setIsLoading(true);
    searchSales(debouncedQuery)
      .then((items) => {
        setResults(items);
        setOpen(items.length > 0);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [debouncedQuery]);

  return { results, open, setOpen, isLoading };
}
