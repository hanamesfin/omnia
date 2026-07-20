export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-busy>
      <div className="skeleton h-10 max-w-sm rounded-2xl" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="skeleton min-h-[20rem] rounded-[1.35rem]" />
        <div className="skeleton min-h-[16rem] rounded-[1.35rem]" />
      </div>
    </div>
  );
}
