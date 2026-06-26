/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductImage } from "../../../../../app/_components/atoms/ProductImage/ProductImage";

describe("ProductImage", () => {
  it("renders img when src is provided", () => {
    render(<ProductImage src="https://example.com/img.jpg" alt="Test" size={40} />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/img.jpg");
  });

  it("renders placeholder when src is null", () => {
    render(<ProductImage src={null} alt="No image" size={40} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByLabelText("No image")).toBeInTheDocument();
  });

  it("falls back to placeholder on img error", () => {
    render(<ProductImage src="https://broken.url/img.jpg" alt="Broken" size={40} />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByLabelText("Broken")).toBeInTheDocument();
  });

  it("applies correct dimensions for size=96", () => {
    render(<ProductImage src={null} alt="Big" size={96} />);
    const el = screen.getByLabelText("Big");
    expect(el).toHaveStyle({ width: "96px", height: "96px" });
  });
});
