export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl items-center px-6 py-16">
      <section aria-labelledby="page-title" className="max-w-2xl border-l-4 border-teal pl-6 sm:pl-10">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-teal">Phase 0 · Bootstrap</p>
        <h1 id="page-title" className="text-3xl font-bold leading-tight sm:text-4xl">Hệ thống hỗ trợ tự học</h1>
        <p className="mt-5 max-w-prose text-base leading-7">
          Môi trường phát triển giao diện đã sẵn sàng.
        </p>
      </section>
    </main>
  );
}
