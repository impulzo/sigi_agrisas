/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { createRef } from "react";
import { usePosKeyboard } from "../../../../app/(private)/pos/_logic/hooks/usePosKeyboard";

function makeRefs() {
  const searchInputRef = createRef<HTMLInputElement>();
  const catalogContainerRef = createRef<HTMLDivElement>();
  const cartContainerRef = createRef<HTMLDivElement>();
  const input = document.createElement("input");
  const catalog = document.createElement("div");
  const cart = document.createElement("div");
  document.body.append(input, catalog, cart);
  (searchInputRef as React.MutableRefObject<HTMLInputElement>).current = input;
  (catalogContainerRef as React.MutableRefObject<HTMLDivElement>).current = catalog;
  (cartContainerRef as React.MutableRefObject<HTMLDivElement>).current = cart;
  return { searchInputRef, catalogContainerRef, cartContainerRef, input, catalog, cart };
}

function fire(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...opts }));
}

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

describe("usePosKeyboard", () => {
  it("Ctrl+F focuses and selects the search input", () => {
    const { searchInputRef, catalogContainerRef, cartContainerRef, input } = makeRefs();
    const focusSpy = jest.spyOn(input, "focus");
    const selectSpy = jest.spyOn(input, "select");
    renderHook(() =>
      usePosKeyboard({
        searchInputRef, catalogContainerRef, cartContainerRef,
        onSubmit: jest.fn(), onClearCart: jest.fn(), onToggleMode: jest.fn(),
        canToggleMode: true, canSubmit: false, isSubmitting: false, cartHasItems: false,
      })
    );
    fire("f", { ctrlKey: true });
    expect(focusSpy).toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalled();
  });

  it("Ctrl+Enter calls onSubmit when canSubmit=true and not submitting", () => {
    const { searchInputRef, catalogContainerRef, cartContainerRef } = makeRefs();
    const onSubmit = jest.fn();
    renderHook(() =>
      usePosKeyboard({
        searchInputRef, catalogContainerRef, cartContainerRef,
        onSubmit, onClearCart: jest.fn(), onToggleMode: jest.fn(),
        canToggleMode: true, canSubmit: true, isSubmitting: false, cartHasItems: true,
      })
    );
    fire("Enter", { ctrlKey: true });
    expect(onSubmit).toHaveBeenCalled();
  });

  it("Ctrl+Enter does NOT call onSubmit when isSubmitting=true", () => {
    const { searchInputRef, catalogContainerRef, cartContainerRef } = makeRefs();
    const onSubmit = jest.fn();
    renderHook(() =>
      usePosKeyboard({
        searchInputRef, catalogContainerRef, cartContainerRef,
        onSubmit, onClearCart: jest.fn(), onToggleMode: jest.fn(),
        canToggleMode: true, canSubmit: true, isSubmitting: true, cartHasItems: true,
      })
    );
    fire("Enter", { ctrlKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Ctrl+Enter does NOT call onSubmit when canSubmit=false", () => {
    const { searchInputRef, catalogContainerRef, cartContainerRef } = makeRefs();
    const onSubmit = jest.fn();
    renderHook(() =>
      usePosKeyboard({
        searchInputRef, catalogContainerRef, cartContainerRef,
        onSubmit, onClearCart: jest.fn(), onToggleMode: jest.fn(),
        canToggleMode: true, canSubmit: false, isSubmitting: false, cartHasItems: false,
      })
    );
    fire("Enter", { ctrlKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Alt+V calls onToggleMode('sale') when canToggleMode=true", () => {
    const { searchInputRef, catalogContainerRef, cartContainerRef } = makeRefs();
    const onToggleMode = jest.fn();
    renderHook(() =>
      usePosKeyboard({
        searchInputRef, catalogContainerRef, cartContainerRef,
        onSubmit: jest.fn(), onClearCart: jest.fn(), onToggleMode,
        canToggleMode: true, canSubmit: false, isSubmitting: false, cartHasItems: false,
      })
    );
    fire("v", { altKey: true });
    expect(onToggleMode).toHaveBeenCalledWith("sale");
  });

  it("Alt+C calls onToggleMode('quote') when canToggleMode=true", () => {
    const { searchInputRef, catalogContainerRef, cartContainerRef } = makeRefs();
    const onToggleMode = jest.fn();
    renderHook(() =>
      usePosKeyboard({
        searchInputRef, catalogContainerRef, cartContainerRef,
        onSubmit: jest.fn(), onClearCart: jest.fn(), onToggleMode,
        canToggleMode: true, canSubmit: false, isSubmitting: false, cartHasItems: false,
      })
    );
    fire("c", { altKey: true });
    expect(onToggleMode).toHaveBeenCalledWith("quote");
  });

  it("Alt+V does NOT call onToggleMode when canToggleMode=false", () => {
    const { searchInputRef, catalogContainerRef, cartContainerRef } = makeRefs();
    const onToggleMode = jest.fn();
    renderHook(() =>
      usePosKeyboard({
        searchInputRef, catalogContainerRef, cartContainerRef,
        onSubmit: jest.fn(), onClearCart: jest.fn(), onToggleMode,
        canToggleMode: false, canSubmit: false, isSubmitting: false, cartHasItems: false,
      })
    );
    fire("v", { altKey: true });
    expect(onToggleMode).not.toHaveBeenCalled();
  });

  it("Ctrl+Shift+Backspace calls onClearCart after confirm", () => {
    const { searchInputRef, catalogContainerRef, cartContainerRef } = makeRefs();
    const onClearCart = jest.fn();
    jest.spyOn(window, "confirm").mockReturnValue(true);
    renderHook(() =>
      usePosKeyboard({
        searchInputRef, catalogContainerRef, cartContainerRef,
        onSubmit: jest.fn(), onClearCart, onToggleMode: jest.fn(),
        canToggleMode: false, canSubmit: false, isSubmitting: false, cartHasItems: true,
      })
    );
    fire("Backspace", { ctrlKey: true, shiftKey: true });
    expect(onClearCart).toHaveBeenCalled();
  });

  it("Ctrl+Shift+Backspace does NOT call onClearCart when user cancels confirm", () => {
    const { searchInputRef, catalogContainerRef, cartContainerRef } = makeRefs();
    const onClearCart = jest.fn();
    jest.spyOn(window, "confirm").mockReturnValue(false);
    renderHook(() =>
      usePosKeyboard({
        searchInputRef, catalogContainerRef, cartContainerRef,
        onSubmit: jest.fn(), onClearCart, onToggleMode: jest.fn(),
        canToggleMode: false, canSubmit: false, isSubmitting: false, cartHasItems: true,
      })
    );
    fire("Backspace", { ctrlKey: true, shiftKey: true });
    expect(onClearCart).not.toHaveBeenCalled();
  });

  it("Ctrl+Shift+Backspace skipped when cart is empty", () => {
    const { searchInputRef, catalogContainerRef, cartContainerRef } = makeRefs();
    const onClearCart = jest.fn();
    const confirmSpy = jest.spyOn(window, "confirm");
    renderHook(() =>
      usePosKeyboard({
        searchInputRef, catalogContainerRef, cartContainerRef,
        onSubmit: jest.fn(), onClearCart, onToggleMode: jest.fn(),
        canToggleMode: false, canSubmit: false, isSubmitting: false, cartHasItems: false,
      })
    );
    fire("Backspace", { ctrlKey: true, shiftKey: true });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onClearCart).not.toHaveBeenCalled();
  });
});
