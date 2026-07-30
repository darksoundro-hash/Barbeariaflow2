export default function LoadingSpinner() {
  return (
    <div className="flex bg-dark min-h-screen items-center justify-center">
      <div className="relative">
        <div className="w-12 h-12 border-2 border-gold/20 rounded-full" />
        <div className="w-12 h-12 border-t-2 border-gold rounded-full animate-spin absolute inset-0" />
      </div>
    </div>
  );
}
