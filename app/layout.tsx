import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Image from 'next/image'
import { Tv2 } from 'lucide-react'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { WelcomeWizard, type WizardSlide } from '@/components/welcome-wizard'
import './globals.css'

const geist = Geist({ subsets: ["latin"] });

const nextuptvSlides: WizardSlide[] = [
  {
    visual: (
      <div className="flex h-32 items-center justify-center">
        <Image
          src="/nextuptv-logo-v3.png"
          alt="NextUpTV"
          width={520}
          height={200}
          className="h-20 w-auto"
          priority
        />
      </div>
    ),
    headline: "Welcome to NextUpTV",
    body: (
      <ul className="mt-2.5 space-y-1.5 pl-5 list-disc text-left text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        <li>Upload your watch history or type keywords to get started</li>
        <li>AI-generated recommendations streamed in real time as they are produced</li>
        <li>Filter by tone, genre scores, year, rating, and runtime without another API call</li>
        <li>Click any card for cast, synopsis, and streaming platform links</li>
        <li>My Shows tab shows season count and next-episode status for your watch history</li>
      </ul>
    ),
  },
  {
    visual: (
      <div className="flex h-32 items-center justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Image
            src="/anthropic-1.svg"
            alt="Anthropic"
            width={520}
            height={200}
            className="h-20 w-auto"
            priority
          />
        </div>
      </div>
    ),
    headline: "Recommendations powered by Anthropic Claude",
    body: (
      <ul className="mt-2.5 space-y-1.5 pl-5 list-disc text-left text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        <li><strong>Claude Sonnet 4.6</strong> generates up to 10 personalised recommendations as structured JSON, streamed via SSE</li>
        <li>TVDB enrichment fires in parallel as Claude streams — the first card typically appears within 2–3 seconds</li>
        <li>Claude also infers streaming platform availability when TVDB data is missing</li>
        <li>Six genre-dimension scores (comedy, horror, drama, suspense…) are embedded in Claude&apos;s output to power the filter sliders — no second API call required</li>
      </ul>
    ),
  },
  {
    visual: (
      <div className="flex h-32 items-center justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Tv2 className="h-11 w-11 text-zinc-600 dark:text-zinc-300" />
        </div>
      </div>
    ),
    headline: "Built with senior-engineering patterns",
    body: (
      <ul className="mt-2.5 space-y-1.5 pl-5 list-disc text-left text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        <li><strong>SSE over WebSockets</strong> — unidirectional streaming, native serverless support, no WebSocket infrastructure</li>
        <li><strong>LLM-as-judge eval framework</strong> — automated quality scoring across prompt changes</li>
        <li><strong>146-case Vitest suite</strong> at 99% statement coverage on deterministic glue code</li>
        <li><strong>13 engineering decisions</strong> documented with rationale, alternatives, and outcomes</li>
        <li><strong>Neon Postgres</strong> for production usage logs; local JSONL in dev — no infra change for contributors</li>
      </ul>
    ),
  },
  {
    visual: (
      <div className="flex h-32 items-center justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-11 w-11 text-emerald-600 dark:text-emerald-400"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
    ),
    headline: "You're all set",
    body: (
      <>
        <ul className="mt-2.5 space-y-1.5 list-disc pl-5 text-left text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <li>Upload a CSV or text file of shows you&apos;ve watched, or just type some keywords.</li>
          <li>Hit <strong>Try with sample data</strong> to see recommendations instantly with no file needed and no Claude API token usage to get the idea.</li>
        </ul>
        <div className="mt-4 border-t border-zinc-200 pt-3 text-xs italic leading-relaxed text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
          <p>
            <strong>Note:</strong> This is a portfolio project. Its development was to exercise AI development methods and understanding modern development cycles. Recommendations are generated live using the Anthropic API — each run costs a small amount of tokens.
          </p>
        </div>
      </>
    ),
  },
];

export const metadata: Metadata = {
  title: 'NextUpTV - AI TV Recommendations',
  description: 'Discover your next favorite TV show with AI-powered recommendations',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
          <WelcomeWizard slides={nextuptvSlides} sessionKey="nextuptv_welcome_seen" />
        </ThemeProvider>
        <div style={{ position: 'fixed', bottom: '8px', right: '12px', fontSize: '11px', color: '#444', userSelect: 'none', pointerEvents: 'none' }}>
          {process.env.APP_VERSION ?? 'dev'}
        </div>
      </body>
    </html>
  )
}
