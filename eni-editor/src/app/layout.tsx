export const metadata = {
  title: 'ENI-Editor',
  description: 'ENI configuration editor',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
