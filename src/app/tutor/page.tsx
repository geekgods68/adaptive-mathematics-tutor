import TutorClient from "@/app/tutor/tutor-client";

export default function TutorPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-2xl">
        <TutorClient />
      </main>
    </div>
  );
}
