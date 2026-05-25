import next from 'eslint-config-next'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
    ],
  },
  ...next,
  {
    // Downgrade React 19 / Next.js 16 strict-mode rules that fire heavily on
    // shadcn/ui primitives and other vendored patterns. They remain visible
    // as warnings but don't block CI on what is essentially upstream code.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
]

export default config
