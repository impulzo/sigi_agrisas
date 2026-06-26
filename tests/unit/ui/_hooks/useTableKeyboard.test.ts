/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useTableKeyboard } from "../../../../app/_hooks/useTableKeyboard";

const items = ["x", "y", "z"];
const noop = () => {};

describe("useTableKeyboard", () => {
  it("ArrowDown moves focus to next row", () => {
    const { result } = renderHook(() => useTableKeyboard(items, noop));
    act(() => { result.current.getRowProps(0).onKeyDown({ key: "ArrowDown", preventDefault: () => {} } as React.KeyboardEvent<HTMLTableRowElement>); });
    expect(result.current.focusedIndex).toBe(1);
  });

  it("ArrowUp moves focus to previous row", () => {
    const { result } = renderHook(() => useTableKeyboard(items, noop));
    act(() => { result.current.setFocusedIndex(2); });
    act(() => { result.current.getRowProps(2).onKeyDown({ key: "ArrowUp", preventDefault: () => {} } as React.KeyboardEvent<HTMLTableRowElement>); });
    expect(result.current.focusedIndex).toBe(1);
  });

  it("ArrowDown at last row does not move when no onPageDown", () => {
    const { result } = renderHook(() => useTableKeyboard(items, noop));
    act(() => { result.current.setFocusedIndex(2); });
    act(() => { result.current.getRowProps(2).onKeyDown({ key: "ArrowDown", preventDefault: () => {} } as React.KeyboardEvent<HTMLTableRowElement>); });
    expect(result.current.focusedIndex).toBe(2);
  });

  it("ArrowDown at last row invokes onPageDown when provided", () => {
    const onPageDown = jest.fn();
    const { result } = renderHook(() => useTableKeyboard(items, noop, { onPageDown }));
    act(() => { result.current.setFocusedIndex(2); });
    act(() => { result.current.getRowProps(2).onKeyDown({ key: "ArrowDown", preventDefault: () => {} } as React.KeyboardEvent<HTMLTableRowElement>); });
    expect(onPageDown).toHaveBeenCalled();
    expect(result.current.focusedIndex).toBe(2);
  });

  it("ArrowUp at first row invokes onPageUp when provided", () => {
    const onPageUp = jest.fn();
    const { result } = renderHook(() => useTableKeyboard(items, noop, { onPageUp }));
    act(() => { result.current.getRowProps(0).onKeyDown({ key: "ArrowUp", preventDefault: () => {} } as React.KeyboardEvent<HTMLTableRowElement>); });
    expect(onPageUp).toHaveBeenCalled();
  });

  it("ArrowUp at first row does not move when no onPageUp", () => {
    const { result } = renderHook(() => useTableKeyboard(items, noop));
    act(() => { result.current.getRowProps(0).onKeyDown({ key: "ArrowUp", preventDefault: () => {} } as React.KeyboardEvent<HTMLTableRowElement>); });
    expect(result.current.focusedIndex).toBe(0);
  });

  it("Enter invokes onEnter with correct item", () => {
    const onEnter = jest.fn();
    const { result } = renderHook(() => useTableKeyboard(items, onEnter));
    act(() => { result.current.getRowProps(1).onKeyDown({ key: "Enter", preventDefault: () => {} } as React.KeyboardEvent<HTMLTableRowElement>); });
    expect(onEnter).toHaveBeenCalledWith("y", 1);
  });

  it("retrocompatible — no opts passed, no crash", () => {
    const { result } = renderHook(() => useTableKeyboard(items, noop));
    expect(() => {
      act(() => {
        result.current.getRowProps(0).onKeyDown({ key: "ArrowDown", preventDefault: () => {} } as React.KeyboardEvent<HTMLTableRowElement>);
      });
    }).not.toThrow();
  });

  it("empty items — no crash", () => {
    const { result } = renderHook(() => useTableKeyboard([], noop));
    expect(() => {
      act(() => {
        result.current.getRowProps(0).onKeyDown({ key: "ArrowDown", preventDefault: () => {} } as React.KeyboardEvent<HTMLTableRowElement>);
      });
    }).not.toThrow();
  });
});
