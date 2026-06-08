import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { ArrowRight } from "lucide-react";

export default function Collections() {
  useSEO({
    title: "Universos — Isekai World",
    description: "Explora todas nuestras colecciones de figuras 3D de anime y gaming.",
    url: "https://isekaiworld.co/collections",
  });

  const { data: categories = [] } = trpc.categories.list.useQuery();

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="border-b border-[#f0f0f0] py-12 px-6 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs tracking-widest uppercase text-[#e5007d] mb-2">Isekai World</p>
          <h1 className="text-4xl lg:text-6xl font-black text-[#111]">Universos</h1>
          <p className="text-[#999] mt-2">Explora todos nuestros universos</p>
        </div>
      </div>

      {/* Grid de categorías */}
      <div className="max-w-6xl mx-auto px-6 lg:px-16 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat: any) => (
            <Link key={cat.id} href={`/catalog?category=${cat.slug}`}>
              <div className="group cursor-pointer rounded-2xl overflow-hidden border border-[#f0f0f0] hover:border-[#111] transition-all hover:shadow-lg">

                {/* Imagen */}
                <div className="relative aspect-square overflow-hidden bg-[#f8f8f8]">
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#f0f0f0]">
                      <span className="text-4xl">🎮</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>

                {/* Nombre */}
                <div className="p-4 flex items-center justify-between">
                  <p className="font-bold text-[#111] group-hover:text-[#e5007d] transition-colors">
                    {cat.name}
                  </p>
                  <ArrowRight size={16} className="text-[#ccc] group-hover:text-[#e5007d] transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
