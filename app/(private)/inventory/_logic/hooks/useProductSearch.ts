import { useEffect, useState } from "react";
import { useDebounce } from "../../../../_hooks/useDebounce";
import { searchProducts, type ProductOption } from "../services/searchProducts";

export function useProductSearch(search: string) {
  const debouncedSearch = useDebounce(search, 300);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  useEffect(() => {
    searchProducts(debouncedSearch).then(setProductOptions);
  }, [debouncedSearch]);

  return { productOptions, setProductOptions };
}
