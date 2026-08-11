/**
 * @jest-environment node
 */
import {
  getPaymentsHistory,
  downloadPaymentsHistoryPdf,
  downloadPaymentsHistoryXlsx,
} from "../../../../../../app/(private)/payments/_logic/services/getPaymentsHistory";

function mockJsonFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

function mockBlobFetch(status: number, blobBody?: Blob, jsonBody?: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    blob: () => Promise.resolve(blobBody ?? new Blob()),
    json: () => Promise.resolve(jsonBody),
  }) as unknown as typeof fetch;
}

const REPORT_BODY = {
  items: [],
  totals: {
    rowCount: 5,
    completedCount: 4,
    cancelledCount: 1,
    totalAmountCompleted: "1200.0000",
    totalAmountCancelled: "50.0000",
  },
  page: 1,
  pageSize: 50,
  total: 5,
};

describe("getPaymentsHistory", () => {
  it("returns the report with totals nested (fix del bug de totals planos, Historia #4)", async () => {
    const fetchFn = mockJsonFetch(200, REPORT_BODY);
    const result = await getPaymentsHistory({}, fetchFn);
    expect(result.totals.rowCount).toBe(5);
    expect(result.totals.completedCount).toBe(4);
    expect(result.totals.cancelledCount).toBe(1);
    expect(result.totals.totalAmountCompleted).toBe("1200.0000");
    expect(result.totals.totalAmountCancelled).toBe("50.0000");
  });

  it("throws ReportTooLargeError on 409", async () => {
    const fetchFn = mockJsonFetch(409, { error: "ReportTooLarge" });
    await expect(getPaymentsHistory({}, fetchFn)).rejects.toThrow(/10,000 registros/);
  });
});

describe("downloadPaymentsHistoryPdf", () => {
  it("returns a blob on success", async () => {
    const blob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    const fetchFn = mockBlobFetch(200, blob);
    const result = await downloadPaymentsHistoryPdf({}, fetchFn);
    expect(result).toBeInstanceOf(Blob);
    const url = (fetchFn as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain("format=pdf");
  });

  it("throws ReportTooLargeError on 409", async () => {
    const fetchFn = mockBlobFetch(409, undefined, { error: "ReportTooLarge" });
    await expect(downloadPaymentsHistoryPdf({}, fetchFn)).rejects.toThrow(/10,000 registros/);
  });
});

describe("downloadPaymentsHistoryXlsx", () => {
  it("requests format=xlsx and returns a blob on success", async () => {
    const blob = new Blob(["xlsx-bytes"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const fetchFn = mockBlobFetch(200, blob);
    await downloadPaymentsHistoryXlsx({}, fetchFn);
    const url = (fetchFn as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain("format=xlsx");
  });

  it("throws ReportTooLargeError on 409", async () => {
    const fetchFn = mockBlobFetch(409, undefined, { error: "ReportTooLarge" });
    await expect(downloadPaymentsHistoryXlsx({}, fetchFn)).rejects.toThrow(/10,000 registros/);
  });
});
