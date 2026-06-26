export class ProductNotFoundError extends Error {
  constructor() {
    super("Product not found");
    this.name = "ProductNotFoundError";
  }
}

export class ProductCodeAlreadyInUseError extends Error {
  constructor() {
    super("Product code already in use");
    this.name = "ProductCodeAlreadyInUseError";
  }
}

export class ProductDepartmentInvalidError extends Error {
  constructor() {
    super("Department not found or inactive");
    this.name = "ProductDepartmentInvalidError";
  }
}

export class DuplicatePriceNameError extends Error {
  constructor() {
    super("A price with that name already exists");
    this.name = "DuplicatePriceNameError";
  }
}

export class DuplicateDefaultPriceError extends Error {
  constructor() {
    super("Product already has a default price");
    this.name = "DuplicateDefaultPriceError";
  }
}

export class DuplicateDosificationNameError extends Error {
  constructor() {
    super("A dosification with that name already exists");
    this.name = "DuplicateDosificationNameError";
  }
}

export class ProductImageTooLargeError extends Error {
  readonly maxBytes = 2 * 1024 * 1024;
  constructor() {
    super("Image too large");
    this.name = "ProductImageTooLargeError";
  }
}

export class ProductImageInvalidFormatError extends Error {
  constructor() {
    super("Invalid image format");
    this.name = "ProductImageInvalidFormatError";
  }
}
