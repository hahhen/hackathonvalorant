import { notFound } from "next/navigation";
import { CatalogWorkspace } from "@/components/review/catalog-workspace";
import { tipCategories } from "@/data/tactical-catalog";

export function generateStaticParams() {
  return tipCategories.map((category) => ({ tipo: category.id }));
}

export default async function CategoryPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!tipCategories.some((category) => category.id === type)) notFound();
  return <CatalogWorkspace categoryId={type} />;
}
