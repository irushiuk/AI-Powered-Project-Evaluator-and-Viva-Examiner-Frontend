import Link from 'next/link'

export function DashboardFooter() {
  return (
    <footer className="mt-auto h-10 border-t border-border bg-card">
      <div className="mx-auto flex h-full max-w-full items-center px-4 sm:px-5 lg:px-8">
        <div className="flex w-full items-center justify-between text-sm text-muted-foreground">
          <p>&copy; 2026 VivaSense. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="transition hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="transition hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="transition hover:text-foreground">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
