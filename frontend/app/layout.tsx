import './globals.css';
import QueryProvider from '../lib/QueryProvider';

export const metadata = {
  title: 'Three-Way Match Engine',
  description: 'PO / GRN / Invoice three-way match'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
