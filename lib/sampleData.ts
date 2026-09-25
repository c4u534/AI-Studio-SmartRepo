import { RepoSnapshot, IndexedFile } from './types';

export const DEFAULT_SAMPLE_SNAPSHOT: RepoSnapshot = {
  id: 'snap_demo_unified_v2',
  owner: 'shadcn-ui',
  repo: 'ui',
  fullName: 'shadcn-ui/ui',
  rootUrl: 'https://github.com/shadcn-ui/ui',
  description: 'Beautifully designed components that you can copy and paste into your apps. Accessible. Customizable. Open Source.',
  defaultBranch: 'main',
  versionTag: 'v2.4.0-matrix',
  commitMessage: 'feat(dependencies): multi-branch dependency manifest sync and conflict detector',
  prioritizedBranches: ['main', 'canary', 'v2-preview'],
  indexedBranches: ['main', 'canary', 'v2-preview', 'legacy-v1'],
  totalFiles: 36,
  totalSize: 428900,
  totalBranches: 4,
  categories: {
    'Architecture & Config': 7,
    'Source Code': 14,
    'UI & Styles': 5,
    'Tests': 4,
    'Documentation': 4,
    'Build & DevOps': 2,
  },
  readmeContent: `# shadcn/ui — Multi-Branch Component Ecosystem

Accessible, customizable components built with Radix UI and Tailwind CSS.

## Branches & Environments
- **main**: Stable production release using React 18 & Tailwind CSS 3.4.
- **canary**: Next-generation preview with React 19, Tailwind CSS 4.0, and Vite 6.
- **v2-preview**: Experimental component slot architecture and multi-ecosystem wrappers (Python CLI & Rust WASM helper).

## Quickstart
\`\`\`bash
pnpm install
pnpm dev
\`\`\`
`,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-07T09:00:00.000Z',
  userId: 'demo_user',
  userEmail: 'developer@example.com',
};

export const DEFAULT_SAMPLE_FILES: IndexedFile[] = [
  // MANIFEST 1: package.json on main
  {
    id: 'f_main_pkg_json',
    path: 'package.json',
    branch: 'main',
    size: 2450,
    type: 'blob',
    sha: 'sha_pkg_main_01',
    category: 'Architecture & Config',
    language: 'JSON',
    isReadme: false,
    lineCount: 52,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/package.json',
    content: `{
  "name": "@shadcn/ui",
  "version": "2.4.0",
  "private": false,
  "description": "Accessible and customizable component system",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.460.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-tooltip": "^1.1.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.6.2",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@types/node": "^22.7.5",
    "tailwindcss": "^3.4.14",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20",
    "vite": "^5.4.8",
    "vitest": "^2.1.2",
    "eslint": "^9.12.0",
    "prettier": "^3.3.3"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}`,
    contentSnippet: `"dependencies": {\n  "react": "^18.3.1",\n  "react-dom": "^18.3.1",\n  "clsx": "^2.1.1",\n  "tailwind-merge": "^2.5.4" ...`
  },

  // MANIFEST 2: package.json on canary (shows Version Divergences / Conflicts!)
  {
    id: 'f_canary_pkg_json',
    path: 'package.json',
    branch: 'canary',
    size: 2610,
    type: 'blob',
    sha: 'sha_pkg_canary_02',
    category: 'Architecture & Config',
    language: 'JSON',
    isReadme: false,
    lineCount: 56,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/canary/package.json',
    content: `{
  "name": "@shadcn/ui",
  "version": "3.0.0-canary.12",
  "private": false,
  "description": "Next-gen accessible and customizable component system",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.0",
    "class-variance-authority": "^0.7.1",
    "lucide-react": "^0.475.0",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-tooltip": "^1.1.5",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@types/node": "^22.10.7",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "vite": "^6.1.0",
    "vitest": "^3.0.4",
    "eslint": "^9.18.0",
    "prettier": "^3.4.2"
  },
  "peerDependencies": {
    "react": ">=19.0.0",
    "react-dom": ">=19.0.0"
  }
}`,
    contentSnippet: `"dependencies": {\n  "react": "^19.0.0",\n  "react-dom": "^19.0.0",\n  "tailwindcss": "^4.0.0" ...`
  },

  // MANIFEST 3: requirements.txt on main (Python CLI assistant)
  {
    id: 'f_main_req_txt',
    path: 'requirements.txt',
    branch: 'main',
    size: 620,
    type: 'blob',
    sha: 'sha_req_main_03',
    category: 'Architecture & Config',
    language: 'Plain Text',
    isReadme: false,
    lineCount: 14,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/requirements.txt',
    content: `# CLI generator and schema validator
fastapi==0.115.0
pydantic==2.9.2
uvicorn==0.31.1
httpx==0.27.2
rich==13.9.2
typer==0.12.5
jinja2==3.1.4
pytest==8.3.3
pytest-asyncio==0.24.0
black==24.8.0
flake8==7.1.1`,
    contentSnippet: `fastapi==0.115.0\npydantic==2.9.2\nuvicorn==0.31.1\nhttpx==0.27.2\nrich==13.9.2`
  },

  // MANIFEST 4: pyproject.toml on canary (Modern Python Packaging)
  {
    id: 'f_canary_pyproject',
    path: 'pyproject.toml',
    branch: 'canary',
    size: 780,
    type: 'blob',
    sha: 'sha_pyproj_canary_04',
    category: 'Architecture & Config',
    language: 'TOML',
    isReadme: false,
    lineCount: 22,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/canary/pyproject.toml',
    content: `[project]
name = "shadcn-cli"
version = "3.0.0"
description = "Python CLI helper for multi-ecosystem component generation"
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.116.0",
    "pydantic>=2.10.0",
    "uvicorn>=0.32.0",
    "httpx>=0.28.0",
    "typer>=0.14.0",
    "rich>=13.9.4",
]

[project.optional-dependencies]
dev = [
    "ruff>=0.8.0",
    "pytest>=8.3.4",
    "mypy>=1.13.0",
]`,
    contentSnippet: `dependencies = [\n  "fastapi>=0.116.0",\n  "pydantic>=2.10.0",\n  "uvicorn>=0.32.0"\n]`
  },

  // MANIFEST 5: Cargo.toml on main (Rust WASM Module)
  {
    id: 'f_main_cargo_toml',
    path: 'crates/wasm-parser/Cargo.toml',
    branch: 'main',
    size: 450,
    type: 'blob',
    sha: 'sha_cargo_main_05',
    category: 'Architecture & Config',
    language: 'TOML',
    isReadme: false,
    lineCount: 16,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/crates/wasm-parser/Cargo.toml',
    content: `[package]
name = "wasm-ast-parser"
version = "0.2.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2.95"
serde = { version = "1.0.210", features = ["derive"] }
serde_json = "1.0.128"
console_error_panic_hook = "0.1.7"`,
    contentSnippet: `wasm-bindgen = "0.2.95"\nserde = { version = "1.0.210" }\nserde_json = "1.0.128"`
  },

  // Documentation Files
  {
    id: 'f_main_readme',
    path: 'README.md',
    branch: 'main',
    size: 3420,
    type: 'blob',
    sha: 'sha_readme_main_06',
    category: 'Documentation',
    language: 'Markdown',
    isReadme: true,
    lineCount: 88,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/README.md',
    content: `# shadcn/ui — Beautiful Component Library (Main Branch)

Accessible and customizable components that you can copy and paste into your apps. Free. Open Source.

## Features
- **Radix UI Primitives**: Accessible, unstyled primitives.
- **Tailwind CSS Styling**: Utility-first CSS classes with variable-driven themes.
- **TypeScript First**: Full type definitions and auto-completion.
- **Multi-Branch Support**: Stable on main, experimental on canary.`,
    contentSnippet: `# shadcn/ui — Beautiful Component Library (Main Branch)\n\nAccessible and customizable components...`
  },
  {
    id: 'f_canary_readme',
    path: 'README.md',
    branch: 'canary',
    size: 3890,
    type: 'blob',
    sha: 'sha_readme_canary_07',
    category: 'Documentation',
    language: 'Markdown',
    isReadme: true,
    lineCount: 96,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/canary/README.md',
    content: `# shadcn/ui — Canary Preview (React 19 & Tailwind 4)

Welcome to the cutting-edge preview branch!

## What is new in Canary:
- React 19 Action and Server Component hooks
- Tailwind CSS v4 engine integration
- New interactive dialog and command palette components
- Rust WASM AST acceleration engine`,
    contentSnippet: `# shadcn/ui — Canary Preview (React 19 & Tailwind 4)\n\nWelcome to the cutting-edge preview branch!`
  },
  {
    id: 'f_docs_arch',
    path: 'docs/architecture.md',
    branch: 'main',
    size: 2150,
    type: 'blob',
    sha: 'sha_docs_arch_08',
    category: 'Documentation',
    language: 'Markdown',
    isReadme: false,
    lineCount: 64,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/docs/architecture.md',
    content: `# Architecture & Subsystem Specification\n\nCore layout separates component registry, theme variables, and CLI generators.`,
    contentSnippet: `# Architecture & Subsystem Specification\n\nCore layout separates component registry...`
  },

  // Source Code Files
  {
    id: 'f_src_btn',
    path: 'src/components/ui/button.tsx',
    branch: 'main',
    size: 1980,
    type: 'blob',
    sha: 'sha_btn_09',
    category: 'Source Code',
    language: 'TypeScript (React)',
    isReadme: false,
    lineCount: 58,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/src/components/ui/button.tsx',
    content: `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"`,
    contentSnippet: `import * as React from "react"\nimport { Slot } from "@radix-ui/react-slot"\nimport { cva } from "class-variance-authority"`
  },
  {
    id: 'f_src_dialog',
    path: 'src/components/ui/dialog.tsx',
    branch: 'main',
    size: 3200,
    type: 'blob',
    sha: 'sha_dialog_10',
    category: 'Source Code',
    language: 'TypeScript (React)',
    isReadme: false,
    lineCount: 94,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/src/components/ui/dialog.tsx',
    content: `import * as React from "react"\nimport * as DialogPrimitive from "@radix-ui/react-dialog"\nimport { X } from "lucide-react"`,
    contentSnippet: `import * as DialogPrimitive from "@radix-ui/react-dialog"`
  },
  {
    id: 'f_src_utils',
    path: 'src/lib/utils.ts',
    branch: 'main',
    size: 450,
    type: 'blob',
    sha: 'sha_utils_11',
    category: 'Source Code',
    language: 'TypeScript',
    isReadme: false,
    lineCount: 16,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/src/lib/utils.ts',
    content: `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`,
    contentSnippet: `export function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs))\n}`
  },
  {
    id: 'f_src_registry',
    path: 'src/lib/registry.ts',
    branch: 'main',
    size: 3800,
    type: 'blob',
    sha: 'sha_registry_12',
    category: 'Source Code',
    language: 'TypeScript',
    isReadme: false,
    lineCount: 110,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/src/lib/registry.ts',
    content: `export interface ComponentMeta {\n  name: string;\n  dependencies: string[];\n  devDependencies: string[];\n}`,
    contentSnippet: `export interface ComponentMeta {\n  name: string;\n  dependencies: string[];\n}`
  },

  // Config & Styles
  {
    id: 'f_tailwind_cfg',
    path: 'tailwind.config.ts',
    branch: 'main',
    size: 1850,
    type: 'blob',
    sha: 'sha_tw_13',
    category: 'Architecture & Config',
    language: 'TypeScript',
    isReadme: false,
    lineCount: 48,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/tailwind.config.ts',
    content: `import type { Config } from "tailwindcss"\n\nexport default {\n  darkMode: ["class"],\n  content: ["./src/**/*.{ts,tsx}"],\n} satisfies Config`,
    contentSnippet: `export default {\n  darkMode: ["class"],\n  content: ["./src/**/*.{ts,tsx}"],\n}`
  },
  {
    id: 'f_tsconfig',
    path: 'tsconfig.json',
    branch: 'main',
    size: 920,
    type: 'blob',
    sha: 'sha_ts_14',
    category: 'Architecture & Config',
    language: 'JSON',
    isReadme: false,
    lineCount: 30,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/tsconfig.json',
    content: `{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "ESNext",\n    "moduleResolution": "bundler"\n  }\n}`,
    contentSnippet: `{\n  "compilerOptions": {\n    "target": "ES2022"\n  }\n}`
  },
  {
    id: 'f_styles_global',
    path: 'src/styles/globals.css',
    branch: 'main',
    size: 1600,
    type: 'blob',
    sha: 'sha_css_15',
    category: 'UI & Styles',
    language: 'CSS',
    isReadme: false,
    lineCount: 42,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/src/styles/globals.css',
    content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --background: 0 0% 100%;\n  --foreground: 222.2 84% 4.9%;\n}`,
    contentSnippet: `@tailwind base;\n@tailwind components;\n@tailwind utilities;`
  },

  // Tests
  {
    id: 'f_test_btn',
    path: 'src/components/ui/__tests__/button.test.tsx',
    branch: 'main',
    size: 1450,
    type: 'blob',
    sha: 'sha_test_16',
    category: 'Tests',
    language: 'TypeScript (React)',
    isReadme: false,
    lineCount: 46,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/src/components/ui/__tests__/button.test.tsx',
    content: `import { render, screen } from "@testing-library/react"\nimport { Button } from "../button"\n\ndescribe("Button", () => {\n  it("renders correctly", () => {\n    render(<Button>Click me</Button>)\n  })\n})`,
    contentSnippet: `describe("Button", () => {\n  it("renders correctly", () => {\n    render(<Button>Click me</Button>)\n  })\n})`
  },

  // Build & CI
  {
    id: 'f_ci_workflow',
    path: '.github/workflows/ci.yml',
    branch: 'main',
    size: 1120,
    type: 'blob',
    sha: 'sha_ci_17',
    category: 'Build & DevOps',
    language: 'YAML',
    isReadme: false,
    lineCount: 38,
    snapshotId: 'snap_demo_unified_v2',
    userId: 'demo_user',
    rawUrl: 'https://raw.githubusercontent.com/shadcn-ui/ui/main/.github/workflows/ci.yml',
    content: `name: CI\non: [push, pull_request]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: pnpm/action-setup@v3\n      - run: pnpm install\n      - run: pnpm test`,
    contentSnippet: `name: CI\non: [push, pull_request]\njobs:\n  build:\n    runs-on: ubuntu-latest`
  }
];
