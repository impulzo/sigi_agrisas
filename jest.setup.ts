import "@testing-library/jest-dom";

// Polyfill HTMLDialogElement.show/showModal/close — jsdom stubs the class but omits these methods
const _dlg = (global as any).HTMLDialogElement;
if (_dlg) {
  if (!_dlg.prototype.show) _dlg.prototype.show = function () { this.open = true; };
  if (!_dlg.prototype.showModal) _dlg.prototype.showModal = function () { this.open = true; };
  if (!_dlg.prototype.close) _dlg.prototype.close = function () { this.open = false; };
}
