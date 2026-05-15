'use client';

import { useTheme } from "next-themes";
import Image from "next/image";


export default function FirstSection() {

  const { resolvedTheme } = useTheme();

  return (
    <div className="flex flex-col flex-1 items-center justify-center w-full">
      {resolvedTheme === "light" ? <Image src="/dashboard/flow-animated-light.svg" alt="Flow Diagram" width={800} height={600} /> : <Image src="/dashboard/flow-animated-dark.svg" alt="Flow Diagram" width={800} height={600} />}
    </div>
  );
}