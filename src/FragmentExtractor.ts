import { logger } from './Log';

const STRUCTURAL_CONTAINERS = ['section', 'article', 'main', 'aside'];

export class FragmentExtractor {
  extract(document: Document, fragment: string) {
    const normalizedFragment = this.normalizeFragment(fragment);
    if (!normalizedFragment) {
      return null;
    }

    if (this.shouldReturnFullDocument(normalizedFragment)) {
      return null;
    }

    const target = this.resolveTarget(document, normalizedFragment);
    if (!target) {
      return null;
    }

    const structuralContainer = this.findStructuralContainer(target);
    if (structuralContainer && this.shouldUseStructuralContainer(target, structuralContainer)) {
      return structuralContainer.outerHTML;
    }

    if (this.isNamedAnchor(target)) {
      const nextElement = target.nextElementSibling;
      if (nextElement && this.isHeading(nextElement)) {
        return this.collectHeadingSection(nextElement);
      }
    }

    if (this.isHeading(target)) {
      return this.collectHeadingSection(target);
    }

    const precedingHeading = this.findPrecedingHeading(target);
    if (precedingHeading) {
      return this.collectHeadingSection(precedingHeading);
    }

    const parent = target.parentElement;
    if (!parent) {
      return target.outerHTML;
    }

    if (!this.parentHasHeading(parent)) {
      return target.outerHTML;
    }

    return this.collectFromAnchor(target);
  }

  private normalizeFragment(fragment: string) {
    const trimmed = fragment.replace(/^#/, '').trim();
    if (!trimmed) {
      return null;
    }

    try {
      return decodeURIComponent(trimmed);
    } catch (error) {
      logger.warn(`Fragment decode failed, using raw value. Error: ${(error as Error).message}`);
      return trimmed;
    }
  }

  private shouldReturnFullDocument(fragment: string) {
    return (
      fragment.startsWith('/') || fragment.startsWith('!/') || fragment.includes(':~:text=') || fragment.includes('=')
    );
  }

  private resolveTarget(document: Document, fragment: string) {
    const candidates = [fragment];
    const encodedFragment = encodeURIComponent(fragment);
    if (encodedFragment !== fragment) {
      candidates.push(encodedFragment);
    }

    for (const candidate of candidates) {
      const targetById = document.getElementById(candidate);
      if (targetById) {
        return targetById;
      }
    }

    const anchors = document.getElementsByTagName('a');
    for (const anchor of anchors) {
      const name = anchor.getAttribute('name');
      if (name && candidates.includes(name)) {
        return anchor;
      }
    }

    return null;
  }

  private findStructuralContainer(element: Element) {
    return element.closest(STRUCTURAL_CONTAINERS.join(','));
  }

  private shouldUseStructuralContainer(target: Element, container: Element) {
    if (!this.isHeading(target)) {
      return true;
    }

    const tag = container.tagName.toLowerCase();
    if (tag === 'aside' || tag === 'section') {
      return true;
    }

    const headingCount = container.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
    return headingCount <= 1;
  }

  private isHeading(element: Element) {
    const tagName = element.tagName.toLowerCase();
    return /^h[1-6]$/.test(tagName);
  }

  private getHeadingLevel(element: Element) {
    const level = Number(element.tagName.slice(1));
    return Number.isNaN(level) ? 7 : level;
  }

  private collectHeadingSection(startHeading: Element) {
    const level = this.getHeadingLevel(startHeading);
    const parts = [startHeading.outerHTML];

    let current = startHeading.nextElementSibling;
    while (current) {
      if (this.isHeading(current) && this.getHeadingLevel(current) <= level) {
        break;
      }
      parts.push(current.outerHTML);
      current = current.nextElementSibling;
    }

    return parts.join('');
  }

  private findPrecedingHeading(element: Element) {
    let current = element.previousElementSibling;
    while (current) {
      if (this.isHeading(current)) {
        return current;
      }
      current = current.previousElementSibling;
    }
    return null;
  }

  private parentHasHeading(parent: Element) {
    return Array.from(parent.children).some((child) => this.isHeading(child));
  }

  private collectFromAnchor(anchor: Element) {
    const parts = [anchor.outerHTML];
    let current = anchor.nextElementSibling;
    while (current) {
      if (this.isHeading(current)) {
        break;
      }
      parts.push(current.outerHTML);
      current = current.nextElementSibling;
    }
    return parts.join('');
  }

  private isNamedAnchor(element: Element) {
    return element.tagName.toLowerCase() === 'a' && element.hasAttribute('name');
  }
}
