interface ScanErrorProps {
  message: string;
}

export function ScanError({ message }: ScanErrorProps) {
  return (
    <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800">
      {message}
    </p>
  );
}
