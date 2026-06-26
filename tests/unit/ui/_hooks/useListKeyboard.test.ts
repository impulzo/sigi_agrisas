/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useListKeyboard } from "../../../../app/_hooks/useListKeyboard";

const items = ["a", "b", "c"];
const noop = () => {};

function fireKey(el: HTMLElement | null, key: string, opts?: Partial<KeyboardEventInit>) {
  if (!el) return;
  const event = new KeyboardEvent("keydown", { key, bubbles: true, ...opts });
  el.dispatchEvent(event);
}

describe("useListKeyboard", () => {
  it("ArrowDown moves focus to next item", () => {
    const { result } = renderHook(() => useListKeyboard(items, noop));
    const divA = document.createElement("div");
    const divB = document.createElement("div");
    document.body.append(divA, divB);
    act(() => { result.current.getItemProps(0).ref(divA); });
    act(() => { result.current.getItemProps(1).ref(divB); });

    act(() => { result.current.getItemProps(0).onKeyDown({ key: "ArrowDown", preventDefault: () => {} } as React.KeyboardEvent); });
    expect(result.current.focusedIndex).toBe(1);

    divA.remove(); divB.remove();
  });

  it("ArrowUp moves focus to previous item", () => {
    const { result } = renderHook(() => useListKeyboard(items, noop));
    act(() => { result.current.setFocusedIndex(2); });
    act(() => { result.current.getItemProps(2).onKeyDown({ key: "ArrowUp", preventDefault: () => {} } as React.KeyboardEvent); });
    expect(result.current.focusedIndex).toBe(1);
  });

  it("ArrowDown does not go past last item", () => {
    const { result } = renderHook(() => useListKeyboard(items, noop));
    act(() => { result.current.setFocusedIndex(2); });
    act(() => { result.current.getItemProps(2).onKeyDown({ key: "ArrowDown", preventDefault: () => {} } as React.KeyboardEvent); });
    expect(result.current.focusedIndex).toBe(2);
  });

  it("ArrowUp does not go before first item", () => {
    const { result } = renderHook(() => useListKeyboard(items, noop));
    act(() => { result.current.getItemProps(0).onKeyDown({ key: "ArrowUp", preventDefault: () => {} } as React.KeyboardEvent); });
    expect(result.current.focusedIndex).toBe(0);
  });

  it("Enter invokes onEnter", () => {
    const onEnter = jest.fn();
    const { result } = renderHook(() => useListKeyboard(items, onEnter));
    act(() => { result.current.getItemProps(1).onKeyDown({ key: "Enter", preventDefault: () => {} } as React.KeyboardEvent); });
    expect(onEnter).toHaveBeenCalledWith("b", 1);
  });

  it("+ key invokes onPlus when provided", () => {
    const onPlus = jest.fn();
    const { result } = renderHook(() => useListKeyboard(items, noop, { onPlus }));
    act(() => { result.current.getItemProps(0).onKeyDown({ key: "+", preventDefault: () => {} } as React.KeyboardEvent); });
    expect(onPlus).toHaveBeenCalledWith("a", 0);
  });

  it("= key also invokes onPlus", () => {
    const onPlus = jest.fn();
    const { result } = renderHook(() => useListKeyboard(items, noop, { onPlus }));
    act(() => { result.current.getItemProps(0).onKeyDown({ key: "=", preventDefault: () => {} } as React.KeyboardEvent); });
    expect(onPlus).toHaveBeenCalledWith("a", 0);
  });

  it("- key invokes onMinus when provided", () => {
    const onMinus = jest.fn();
    const { result } = renderHook(() => useListKeyboard(items, noop, { onMinus }));
    act(() => { result.current.getItemProps(1).onKeyDown({ key: "-", preventDefault: () => {} } as React.KeyboardEvent); });
    expect(onMinus).toHaveBeenCalledWith("b", 1);
  });

  it("Delete key invokes onDelete when provided", () => {
    const onDelete = jest.fn();
    const { result } = renderHook(() => useListKeyboard(items, noop, { onDelete }));
    act(() => { result.current.getItemProps(0).onKeyDown({ key: "Delete", preventDefault: () => {} } as React.KeyboardEvent); });
    expect(onDelete).toHaveBeenCalledWith("a", 0);
  });

  it("Backspace key invokes onDelete when provided", () => {
    const onDelete = jest.fn();
    const { result } = renderHook(() => useListKeyboard(items, noop, { onDelete }));
    act(() => { result.current.getItemProps(0).onKeyDown({ key: "Backspace", preventDefault: () => {} } as React.KeyboardEvent); });
    expect(onDelete).toHaveBeenCalledWith("a", 0);
  });

  it("optional callbacks not provided — no error thrown", () => {
    const { result } = renderHook(() => useListKeyboard(items, noop));
    expect(() => {
      act(() => {
        result.current.getItemProps(0).onKeyDown({ key: "+", preventDefault: () => {} } as React.KeyboardEvent);
        result.current.getItemProps(0).onKeyDown({ key: "-", preventDefault: () => {} } as React.KeyboardEvent);
        result.current.getItemProps(0).onKeyDown({ key: "Delete", preventDefault: () => {} } as React.KeyboardEvent);
      });
    }).not.toThrow();
  });

  it("empty items array — no crash", () => {
    const { result } = renderHook(() => useListKeyboard([], noop));
    expect(() => {
      act(() => {
        result.current.getItemProps(0).onKeyDown({ key: "ArrowDown", preventDefault: () => {} } as React.KeyboardEvent);
      });
    }).not.toThrow();
  });

  it("roving tabIndex: focused item is 0, others are -1", () => {
    const { result } = renderHook(() => useListKeyboard(items, noop));
    expect(result.current.getItemProps(0).tabIndex).toBe(0);
    expect(result.current.getItemProps(1).tabIndex).toBe(-1);
    expect(result.current.getItemProps(2).tabIndex).toBe(-1);
  });
});
