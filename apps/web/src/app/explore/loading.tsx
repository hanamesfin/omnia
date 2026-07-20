export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-busy>
      <div className="skeleton h-10 max-w-xs rounded-2xl" />
      <div className="mt-8 flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-44 w-36 shrink-0 rounded-[1.25rem]" />
        ))}
      </div>
    </div>
  );
}
