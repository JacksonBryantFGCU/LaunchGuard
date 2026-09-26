export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-xs font-medium text-slate-200">{value}</dd>
    </div>
  );
}

export function FactList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <ul className="mt-1 list-inside list-disc text-xs text-slate-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
