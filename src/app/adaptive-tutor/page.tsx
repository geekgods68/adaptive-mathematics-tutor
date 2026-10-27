import AdaptiveTutorClient from "@/app/adaptive-tutor/adaptive-tutor-client";

export default function AdaptiveTutorPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-2xl">
        <AdaptiveTutorClient />
      </main>
    </div>
  );
}
