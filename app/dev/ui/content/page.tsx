import { notFound } from 'next/navigation';
import ContentGallery from './ContentGallery';

export const metadata = {
  title: 'Content components — /dev/ui/content',
  robots: { index: false, follow: false },
};

/**
 * Dev gallery for content components: Markdown, CodeBlock, AnnotatedCode.
 * Shows examples in multiple languages and configurations.
 */
export default function ContentGalleryPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <ContentGallery />;
}
