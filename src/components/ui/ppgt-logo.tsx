import Image from "next/image";

/** The PPGT mark, served from /public/ppgt-logo.png. Shared by every header
 *  that shows the "Suara" brand (admin login, admin top bar, participant app). */
export function PpgtLogo({
  size = 40,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/ppgt-logo.png"
      alt="Logo PPGT"
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
