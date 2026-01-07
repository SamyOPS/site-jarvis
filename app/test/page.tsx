export const metadata = {
  title: "Page de test",
  description: "Espace vide pour experimenter des designs.",
};

export default function TestDesignPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="w-full max-w-md">
          <p className="text-[11px] uppercase tracking-[0.4em] text-[#0b1b34]/60">
            LOADING
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[0.08em] text-[#0b1b34]">
            JARVIS CONNECT
          </h1>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-none bg-[#0b1b34]/10">
            <div className="h-full w-1/3 rounded-none bg-[#000080] animate-[loading_1.8s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
}
