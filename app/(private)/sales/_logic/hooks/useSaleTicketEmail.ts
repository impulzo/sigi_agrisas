"use client";

import { useState, useCallback } from "react";
import { sendTicketEmail } from "../services";

interface UseSaleTicketEmailResult {
  isSendingEmail: boolean;
  sendEmail: (id: string, email?: string) => Promise<{ sentTo: string }>;
}

export function useSaleTicketEmail(): UseSaleTicketEmailResult {
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const sendEmail = useCallback(async (id: string, email?: string): Promise<{ sentTo: string }> => {
    setIsSendingEmail(true);
    try {
      return await sendTicketEmail(id, email);
    } finally {
      setIsSendingEmail(false);
    }
  }, []);

  return { isSendingEmail, sendEmail };
}
