export interface TicketConditionsInput {
  isCredit: boolean;
  customerCreditDays?: number | null;
}

export function resolveTicketConditionsLine(sale: TicketConditionsInput): string {
  if (sale.isCredit) return `Crédito a ${sale.customerCreditDays ?? 30} días`;
  return "CONTADO";
}
