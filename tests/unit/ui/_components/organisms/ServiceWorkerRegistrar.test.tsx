/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import { ServiceWorkerRegistrar } from "../../../../../app/_components/organisms/ServiceWorkerRegistrar/ServiceWorkerRegistrar";

function mockServiceWorker() {
  const register = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "serviceWorker", {
    value: { register },
    configurable: true,
  });
  return register;
}

afterEach(() => {
  // @ts-expect-error - test-only cleanup of a jsdom-injected property
  delete navigator.serviceWorker;
});

describe("ServiceWorkerRegistrar", () => {
  it("no registra el service worker en development", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "development");
    const register = mockServiceWorker();

    render(<ServiceWorkerRegistrar />);

    expect(register).not.toHaveBeenCalled();
  });

  it("no registra el service worker en test", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "test");
    const register = mockServiceWorker();

    render(<ServiceWorkerRegistrar />);

    expect(register).not.toHaveBeenCalled();
  });

  it("registra el service worker en production", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "production");
    const register = mockServiceWorker();

    render(<ServiceWorkerRegistrar />);

    expect(register).toHaveBeenCalledWith("/sw.js");
  });
});
