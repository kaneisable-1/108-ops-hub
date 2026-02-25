import Link from 'next/link'
import { Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
        <Search className="h-8 w-8 text-gray-900" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <Link href="/" className="btn-primary">
        Go to Dashboard
      </Link>
    </div>
  )
}
