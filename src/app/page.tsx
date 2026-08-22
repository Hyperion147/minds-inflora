import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 font-sans">
      <p className="text-sm font-medium tracking-wide text-zinc-500">INFLORA</p>
      <h1 className="mt-1 text-3xl font-semibold text-zinc-900">
        Personalized inflation tracker
      </h1>
      <p className="mt-3 text-zinc-600">
        Hackathon prototype: Account Aggregator consent → normalized
        transactions → personal inflation engine.
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        <li>
          <Link className="text-blue-700 underline" href="/aa-test">
            AA integration test (mock / Setu)
          </Link>
        </li>
        <li>
          <Link className="text-blue-700 underline" href="/api/inflation/demo">
            Inflation demo API (demo_transactions.csv)
          </Link>
        </li>
      </ul>
    </main>
  );
}
