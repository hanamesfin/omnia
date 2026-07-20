export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-busy>
      <div className="skeleton h-8 w-40 rounded-full" />
      <div className="skeleton mt-4 h-12 max-w-md rounded-2xl" />
      <div className="skeleton mt-8 h-48 rounded-[1.5rem]" />
    </div>
  );
}
