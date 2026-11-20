import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p>That page does not exist. पेज नहीं मिला।</p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-full bg-teal-800 px-6 py-2 font-semibold text-white hover:bg-teal-900"
      >
        Back to Aeris / वापस जाएँ
      </Link>
    </main>
  );
}
