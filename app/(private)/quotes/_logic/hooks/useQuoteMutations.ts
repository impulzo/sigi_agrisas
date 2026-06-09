"use client";

import { useState } from "react";
import { authorizeQuote } from "../services/authorizeQuote";
import { cancelQuote } from "../services/cancelQuote";
import { convertQuote } from "../services/convertQuote";
import { updateQuote } from "../services/updateQuote";
import type { AuthorizeQuoteBody, CancelQuoteBody, ConvertQuoteBody, UpdateQuoteBody } from "../types/api";
import type { QuoteDetail } from "../types/domain";
import type { SaleDetail } from "../../../sales/_logic/types/domain";

interface UseQuoteMutationsResult {
  isSaving: boolean;
  authorize: (id: string, body: AuthorizeQuoteBody, onChange?: (q: QuoteDetail) => void) => Promise<void>;
  cancel: (id: string, body: CancelQuoteBody, onChange?: (q: QuoteDetail) => void) => Promise<void>;
  convert: (id: string, body: ConvertQuoteBody, onChange?: (s: SaleDetail) => void) => Promise<void>;
  update: (id: string, body: UpdateQuoteBody, onChange?: (q: QuoteDetail) => void) => Promise<void>;
}

export function useQuoteMutations(): UseQuoteMutationsResult {
  const [isSaving, setIsSaving] = useState(false);

  const authorize = async (
    id: string,
    body: AuthorizeQuoteBody,
    onChange?: (q: QuoteDetail) => void,
  ) => {
    setIsSaving(true);
    try {
      const quote = await authorizeQuote(id, body);
      onChange?.(quote);
    } finally {
      setIsSaving(false);
    }
  };

  const cancel = async (
    id: string,
    body: CancelQuoteBody,
    onChange?: (q: QuoteDetail) => void,
  ) => {
    setIsSaving(true);
    try {
      const quote = await cancelQuote(id, body);
      onChange?.(quote);
    } finally {
      setIsSaving(false);
    }
  };

  const convert = async (
    id: string,
    body: ConvertQuoteBody,
    onChange?: (s: SaleDetail) => void,
  ) => {
    setIsSaving(true);
    try {
      const sale = await convertQuote(id, body);
      onChange?.(sale);
    } finally {
      setIsSaving(false);
    }
  };

  const update = async (
    id: string,
    body: UpdateQuoteBody,
    onChange?: (q: QuoteDetail) => void,
  ) => {
    setIsSaving(true);
    try {
      const quote = await updateQuote(id, body);
      onChange?.(quote);
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, authorize, cancel, convert, update };
}
