import { ProductDetailPage } from "../_blocks/ProductDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailRoute({ params }: Props) {
  const { id } = await params;
  return <ProductDetailPage productId={id} />;
}
