import type { Metadata } from "next";
import { PunkLanding } from "@/components/home";

export const metadata: Metadata = {
  title: "7AI·CLUB",
  description: "个人 AI AI实验场",
};

export default function HomePage() {
  return <PunkLanding />;
}
