"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading">
      <h1>Warsztat napotkał problem.</h1>
      <p>Twój lokalny zapis pozostaje na urządzeniu.</p>
      <button className="primary" onClick={reset}>
        Spróbuj ponownie
      </button>
    </main>
  );
}
