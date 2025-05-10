"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handleStart = () => {
    router.push("/workspace");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Amv-System</h1>
      <p className="mb-8 text-center text-lg">多機能作業スペースアプリへようこそ</p>
      <button
        onClick={handleStart}
        className="rounded bg-white px-6 py-3 text-black hover:bg-gray-200 transition"
      >
        使ってみる
      </button>
    </main>
  );
}
