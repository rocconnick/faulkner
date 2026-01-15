/**
 * MarkdownRenderer Component
 * 
 * Renders markdown content with support for:
 * - Headers (h1, h2, h3)
 * - Bullets (-, *)
 * - Bold (**text**)
 * - Italic (*text*)
 * - Code (`code`)
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { marked } from 'marked';
import { useEffect, useState } from 'react';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Configure marked for security and basic features
marked.setOptions({
  breaks: true,
  gfm: true,
});

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        const rendered = await marked.parse(content);
        setHtml(rendered);
      } catch (error) {
        console.error('Error rendering markdown:', error);
        setHtml(content); // Fallback to plain text
      }
    };

    renderMarkdown();
  }, [content]);

  return (
    <div 
      className={`markdown-renderer ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
