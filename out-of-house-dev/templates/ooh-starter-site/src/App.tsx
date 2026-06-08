// Sections compose per the active style adapter (the builder fills these in).
export function App() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight">Your headline goes here</h1>
        <p className="mt-4 text-lg text-slate-600">A clear value proposition and a single, obvious call to action.</p>
        <a href="#contact" className="mt-8 inline-block rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white">
          Get in touch
        </a>
      </section>

      <section id="contact" className="mx-auto max-w-xl px-6 py-16">
        <h2 className="text-2xl font-bold">Contact</h2>
        <form
          className="mt-6 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget) as unknown as Iterable<[string, string]>);
            void fetch('https://api.out-of-house.dev/api/v1/forms/contact', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(data),
            });
          }}
        >
          <input name="email" type="email" required placeholder="Email" className="rounded-lg border border-slate-300 px-4 py-2" />
          <textarea name="message" required placeholder="Message" className="rounded-lg border border-slate-300 px-4 py-2" />
          <input name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" />
          <button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">Send</button>
        </form>
      </section>
    </main>
  );
}
