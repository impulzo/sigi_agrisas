## ADDED Requirements

### Requirement: Product image upload field in General tab
The "General" tab of the product detail (`/catalogs/products/[id]`) and the `ProductEditModal` (in both `create` and `edit` modes) SHALL render an `ImageUploadField` molecule that allows the user to upload, replace, or remove the product image. The field is **optional**: products can be saved without an image. It is gated by `products:write` (rendered read-only otherwise).

Behavior:
- A drop zone with label "Arrastra o haz click para subir" accepts image files.
- A preview SHALL be shown immediately after selection (using `URL.createObjectURL`).
- Client-side validation: MIME must be `image/jpeg`, `image/png`, or `image/webp`. Size must be ≤ 2 MB. Violations show inline error in Spanish and prevent dispatch.
- A "Eliminar imagen" button appears when the product already has an `imageUrl`; on click, dispatches `DELETE /api/v1/admin/products/:id/image` (after `ConfirmDialog`).
- On selection of a valid file, dispatches `POST /api/v1/admin/products/:id/image` as multipart; on success, the field reflects the new URL and the parent component re-fetches the product so the new image propagates to thumbnails elsewhere.
- In `create` mode the upload SHALL be deferred until the product exists (the modal first creates the product, then if a file was staged, dispatches the upload).
- When `imageUrl === null`, the placeholder SHALL render `<span className="material-symbols-outlined">image_not_supported</span>` over the `surface-container` background.

#### Scenario: Field renders in General tab
- **WHEN** a user with `products:write` opens the General tab
- **THEN** the `ImageUploadField` is visible with either the current image preview or the placeholder

#### Scenario: Viewer sees read-only field
- **WHEN** a user without `products:write` opens the General tab
- **THEN** the field renders without upload/delete actions (preview only or placeholder)

#### Scenario: Invalid MIME rejected client-side
- **WHEN** the user selects a `.pdf` file
- **THEN** an inline error "Formato no permitido. Usa JPG, PNG o WebP." is shown and no request is dispatched

#### Scenario: File too large rejected client-side
- **WHEN** the user selects a file larger than 2 MB
- **THEN** an inline error "La imagen excede 2 MB." is shown and no request is dispatched

#### Scenario: Successful upload updates preview
- **WHEN** the user selects a valid 800 KB JPG and the backend responds 200
- **THEN** the preview updates to the new public URL and the parent component re-fetches the product

#### Scenario: Delete image with confirmation
- **WHEN** the user clicks "Eliminar imagen" and confirms the dialog
- **THEN** `DELETE /api/v1/admin/products/:id/image` is dispatched, the field reverts to the placeholder, and the product is re-fetched

#### Scenario: Create mode defers upload
- **WHEN** the user opens `ProductEditModal` in `create` mode, stages an image, and submits the form
- **THEN** the modal first creates the product (`POST /products`), then uploads the staged image (`POST /products/:newId/image`), then closes; if the upload fails, the modal shows a warning ("Producto creado pero la imagen no pudo subirse") and stays open

---

### Requirement: Product thumbnail in list and detail header
The product list (`ProductsTable` at `/catalogs/products`) SHALL render a thumbnail column showing each product's image (40x40 px, rounded, `object-cover`) using the `ProductImage` atom. The product detail header (`/catalogs/products/[id]`) SHALL render a larger thumbnail (96x96 px) next to the `code`/`name`. When `imageUrl === null`, the `ProductImage` atom SHALL render the Material Symbol `image_not_supported` centered on a `surface-container` background; it MUST NOT issue HTTP requests or break the layout.

#### Scenario: Thumbnail rendered in list
- **WHEN** the products list renders an item with `imageUrl !== null`
- **THEN** an `<img>` with `loading="lazy"`, `width="40"`, `height="40"`, `className="rounded object-cover"` and the `imageUrl` as `src` is rendered as the first column

#### Scenario: Placeholder rendered in list
- **WHEN** the products list renders an item with `imageUrl === null`
- **THEN** the placeholder Material Symbol `image_not_supported` is shown in a 40x40 `surface-container` square

#### Scenario: Detail header thumbnail
- **WHEN** the detail screen loads with `imageUrl !== null`
- **THEN** a 96x96 thumbnail is rendered next to the `code`/`name` header

#### Scenario: Detail header placeholder
- **WHEN** the detail screen loads with `imageUrl === null`
- **THEN** the 96x96 placeholder Material Symbol is shown

#### Scenario: ProductImage never blocks render
- **WHEN** the `imageUrl` returns 404 or fails to load
- **THEN** the atom catches the error via `onError` and swaps to the placeholder without breaking the page

---

### Requirement: Product image services (client)
The frontend SHALL expose two services in `app/(private)/catalogs/products/_logic/services/`: `uploadProductImage(productId, file, fetchImpl?)` and `deleteProductImage(productId, fetchImpl?)`. They SHALL wrap `authFetch`, normalize HTTP errors to typed module errors (`ProductImageTooLargeError`, `ProductImageInvalidFormatError`, `ProductNotFoundError`), and accept an injectable `fetchImpl` for tests.

#### Scenario: uploadProductImage sends multipart
- **WHEN** the service is invoked with a valid `File`
- **THEN** the request is a `POST` with `Content-Type: multipart/form-data` and a `file` field; on success returns `{ imageUrl: string }`

#### Scenario: 413 maps to ProductImageTooLargeError
- **WHEN** the backend returns 413
- **THEN** the service throws `ProductImageTooLargeError(maxBytes: 2097152)`

#### Scenario: 400 invalid format maps to typed error
- **WHEN** the backend returns 400 with `{"error": "Invalid image format"}`
- **THEN** the service throws `ProductImageInvalidFormatError()`

#### Scenario: deleteProductImage idempotent
- **WHEN** the service is invoked for a product that has no image
- **THEN** the request returns 204 and the service resolves successfully
