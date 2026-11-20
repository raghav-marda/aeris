"use client";

interface Props {
  readonly reset: () => void;
}

/** Last-resort boundary: a render crash shows a calm, keyboard-friendly recovery screen. */
export default function ErrorPage({ reset }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p role="alert">
        Aeris hit an unexpected problem. Your details were not saved or sent anywhere. सब कुछ ठीक करने
        के लिए नीचे का बटन दबाएँ।
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 rounded-full bg-teal-800 px-6 py-2 font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Try again / फिर कोशिश करें
      </button>
    </main>
  );
}
