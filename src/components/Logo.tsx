import Image from "next/image";
import logo from "../../public/logo-icon.png";

export function Logo({ className = "" }: { className?: string }) {
  // Controller-shaped box full of games (Leon's logo) + the wordmark in the display font.
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image src={logo} alt="" className="h-8 w-8" priority />
      <span className="font-display text-xl font-bold tracking-tight">gamebox</span>
    </span>
  );
}
