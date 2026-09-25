import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'GitHub Smart Repository Multi-Indexer',
  description: 'Deep GitHub repository indexer mapping all branches, folders, and files with README collation, Google Sheets matrix generation, Google Drive/Docs archival, and interactive visual tree mapping.',
  openGraph: {
    title: 'GitHub Smart Repository Multi-Indexer',
    description: 'Deep GitHub repository indexer mapping all branches, folders, and files with README collation, Google Sheets matrix generation, Google Drive/Docs archival, and interactive visual tree mapping.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GitHub Smart Repository Multi-Indexer',
    description: 'Deep GitHub repository indexer mapping all branches, folders, and files with README collation, Google Sheets matrix generation, Google Drive/Docs archival, and interactive visual tree mapping.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
