import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Youtube, ArrowRight, Headphones, Truck, Users, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Footer() {
  const [email, setEmail] = useState("");

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      toast.success("Thanks for subscribing!");
      setEmail("");
    }
  };

  return (
    <footer>
      {/* ── Trust Bar ── */}
      <div className="border-t border-[#ebebeb] bg-white">
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { Icon: Headphones, title: "Customer service", desc: "We're here to help with any questions" },
              { Icon: Truck, title: "Fast Free Shipping", desc: "Get free shipping on orders of $150 or more" },
              { Icon: Users, title: "Refer a friend", desc: "Refer a friend and get 15% off each other" },
              { Icon: Lock, title: "Secure payment", desc: "Your payment information is processed securely" },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <Icon className="w-5 h-5 shrink-0 mt-0.5 text-[#1a1a1a]" strokeWidth={1.5} />
                <div>
                  <p className="font-semibold text-[13px] text-[#1a1a1a]">{title}</p>
                  <p className="text-[12px] text-[#888] mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Footer (dark) ── */}
      <div className="bg-[#1a1a1a] text-white">
        <div className="container py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="flex items-end gap-[2px]">
                  {[6, 10, 14, 10, 6].map((h, i) => (
                    <div key={i} className="w-[3px] bg-white rounded-full" style={{ height: `${h}px` }} />
                  ))}
                </div>
                <span className="font-bold text-[15px] tracking-tight">Isekai Store</span>
              </div>
              <p className="text-[13px] text-white/55 leading-relaxed mb-5">
                Your destination for premium anime &amp; gaming merchandise. Quality gear for true fans.
              </p>
              <div className="flex items-center gap-2.5 mb-5">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/55 hover:text-white hover:border-white/60 transition-all"
                  >
                    <Icon size={13} />
                  </a>
                ))}
              </div>
              <div className="text-[12px] text-white/40 space-y-1">
                <p>+1 (800) 123-4567</p>
                <p>hello@isekaistore.com</p>
              </div>
            </div>

            {/* Collections */}
            <div>
              <h4 className="font-semibold text-[13px] mb-5 text-white">Collections</h4>
              <ul className="space-y-3">
                {["All Products", "Headphones", "Earphones", "Speakers", "Accessories"].map(item => (
                  <li key={item}>
                    <Link href="/catalog" className="text-[13px] text-white/55 hover:text-white transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Information */}
            <div>
              <h4 className="font-semibold text-[13px] mb-5 text-white">Information</h4>
              <ul className="space-y-3">
                {["Our Story", "Our Journal", "FAQs", "Contact Us", "My Account"].map(item => (
                  <li key={item}>
                    <Link href={item === "My Account" ? "/account" : "/"} className="text-[13px] text-white/55 hover:text-white transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="font-bold text-[20px] leading-snug mb-5">
                Stay in the loop with our weekly newsletter
              </h4>
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-[13px] text-white placeholder:text-white/40 outline-none focus:border-white/50 transition-colors"
                />
                <button
                  type="submit"
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1a1a1a] hover:bg-white/90 transition-colors shrink-0"
                >
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-white/10">
          <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12px] text-white/35">
              © {new Date().getFullYear()} Isekai Store. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5">
              {["VISA", "MC", "AMEX", "PAYPAL", "DISCOVER"].map(card => (
                <div
                  key={card}
                  className="bg-white/10 rounded px-2 py-1 text-[9px] font-bold text-white/50 uppercase tracking-wide"
                >
                  {card}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
