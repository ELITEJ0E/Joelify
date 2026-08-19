import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-black text-white p-4">
      <h2 className="text-2xl font-bold mb-4">Not Found</h2>
      <p className="text-gray-400 mb-6">Could not find requested resource</p>
      <Link 
        href="/"
        className="px-6 py-2 bg-primary text-black font-semibold rounded-full hover:bg-primary/80 transition-colors"
      >
        Return Home
      </Link>
    </div>
  )
}
