"use client";

import { RefObject, useState } from "react";
import { SearchInput } from "../../../_components/molecules/SearchInput/SearchInput";
import { useDebounce } from "../../../_hooks/useDebounce";
import { useProductSearch } from "../_logic/hooks/useProductSearch";
import { ProductCatalogTable } from "./ProductCatalogTable";
import type { ProductDto } from "../_logic/types/api";

interface ProductCatalogPanelProps {
  branchId?: string;
  onAddProduct: (product: ProductDto) => void;
  searchInputRef?: RefObject<HTMLInputElement>;
}

export function ProductCatalogPanel({ branchId, onAddProduct, searchInputRef }: ProductCatalogPanelProps) {
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchInput, 300);

  const { items, total, isLoading, error } = useProductSearch({
    search: debouncedSearch,
    branchId,
    page,
    pageSize: 20,
  });

  function handleSearch(val: string) {
    setSearchInput(val);
    setPage(1);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-outline-variant">
        <SearchInput
          value={searchInput}
          onChange={handleSearch}
          placeholder="Buscar producto por código o nombre..."
          inputRef={searchInputRef}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        <ProductCatalogTable
          items={items}
          total={total}
          page={page}
          pageSize={20}
          isLoading={isLoading}
          error={error}
          onAddProduct={onAddProduct}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
