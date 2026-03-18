export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden">
      {children}
    </div>
  );
}