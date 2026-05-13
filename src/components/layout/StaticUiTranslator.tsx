'use client';

import { useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { AppLanguage } from '@/context/AuthContext';
import { translateStaticUiText } from '@/lib/i18n';

const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt'] as const;
const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT']);

type TranslatableAttribute = (typeof TRANSLATABLE_ATTRIBUTES)[number];

function hasArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

function isPlainDynamicValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;

  // Dashboard counters, dates, quantities, percentages, and codes are rendered
  // by React from live data. They must not be captured as "original" UI labels.
  return /^[\d\u0660-\u0669\u06F0-\u06F9\s.,:;/%+\-–—()#]+$/.test(trimmed);
}

function isTranslatableNow(value: string, language: AppLanguage) {
  if (isPlainDynamicValue(value)) return false;
  return translateStaticUiText(value, language) !== value;
}

function shouldSkipElement(element: Element | null) {
  if (!element) return true;
  if (SKIPPED_TAGS.has(element.tagName)) return true;
  if (element.closest('[data-i18n-skip]')) return true;
  if (element.closest('[contenteditable="true"]')) return true;
  return false;
}

export function StaticUiTranslator({ language }: { language: AppLanguage }) {
  const pathname = usePathname();
  const textOriginals = useRef(new WeakMap<Text, string>());
  const textLastApplied = useRef(new WeakMap<Text, string>());
  const attrOriginals = useRef(new WeakMap<Element, Map<TranslatableAttribute, string>>());
  const attrLastApplied = useRef(new WeakMap<Element, Map<TranslatableAttribute, string>>());

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;

    let queued = false;

    const translateTextNode = (node: Text) => {
      if (shouldSkipElement(node.parentElement)) return;

      const current = node.nodeValue || '';
      const lastApplied = textLastApplied.current.get(node);
      let source = textOriginals.current.get(node);

      if (isPlainDynamicValue(current)) {
        textOriginals.current.delete(node);
        textLastApplied.current.delete(node);
        return;
      }

      const currentLooksTranslatable = hasArabic(current) || isTranslatableNow(current, language);
      if (!currentLooksTranslatable && (!source || current !== lastApplied)) {
        textOriginals.current.delete(node);
        textLastApplied.current.delete(node);
        return;
      }

      if (!source || (current !== lastApplied && currentLooksTranslatable)) {
        source = current;
        textOriginals.current.set(node, source);
      }

      const next = translateStaticUiText(source || current, language);
      if (current !== next) {
        node.nodeValue = next;
      }
      textLastApplied.current.set(node, next);
    };

    const translateAttributes = (element: Element) => {
      if (shouldSkipElement(element)) return;

      for (const attr of TRANSLATABLE_ATTRIBUTES) {
        const current = element.getAttribute(attr);
        if (!current) continue;

        let originals = attrOriginals.current.get(element);
        if (!originals) {
          originals = new Map();
          attrOriginals.current.set(element, originals);
        }

        let applied = attrLastApplied.current.get(element);
        if (!applied) {
          applied = new Map();
          attrLastApplied.current.set(element, applied);
        }

        const lastApplied = applied.get(attr);
        let source = originals.get(attr);

        if (isPlainDynamicValue(current)) {
          originals.delete(attr);
          applied.delete(attr);
          continue;
        }

        const currentLooksTranslatable = hasArabic(current) || isTranslatableNow(current, language);
        if (!currentLooksTranslatable && (!source || current !== lastApplied)) {
          originals.delete(attr);
          applied.delete(attr);
          continue;
        }

        if (!source || (current !== lastApplied && currentLooksTranslatable)) {
          source = current;
          originals.set(attr, source);
        }

        const next = translateStaticUiText(source || current, language);
        if (current !== next) {
          element.setAttribute(attr, next);
        }
        applied.set(attr, next);
      }
    };

    const walk = (root: ParentNode) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let current = walker.nextNode();

      while (current) {
        if (current.nodeType === Node.TEXT_NODE) {
          translateTextNode(current as Text);
        } else if (current.nodeType === Node.ELEMENT_NODE) {
          translateAttributes(current as Element);
        }
        current = walker.nextNode();
      }
    };

    const run = () => {
      queued = false;
      walk(document.body);
    };

    const schedule = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(run);
    };

    run();
    const animationFrame = window.requestAnimationFrame(run);
    const shortTimer = window.setTimeout(run, 60);
    const hydrationTimer = window.setTimeout(run, 260);

    const observer = new MutationObserver((mutations) => {
      let shouldTranslate = false;

      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          shouldTranslate = true;
          break;
        }

        if (mutation.type === 'attributes') {
          shouldTranslate = true;
          break;
        }

        if (mutation.addedNodes.length > 0) {
          shouldTranslate = true;
          break;
        }
      }

      if (shouldTranslate) schedule();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(shortTimer);
      window.clearTimeout(hydrationTimer);
      queued = false;
    };
  }, [language, pathname]);

  return null;
}
