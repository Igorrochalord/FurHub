import { useEffect } from 'react'

function set(selector, attr, value, create) {
  let el = document.head.querySelector(selector)
  if (!el) { if (!create) return; el = document.createElement(create.tag); Object.entries(create.attrs).forEach(([k, v]) => el.setAttribute(k, v)); document.head.appendChild(el) }
  el.setAttribute(attr, value)
}

/** Título, descrição, canonical, Open Graph, robots e JSON-LD por página (SPA: indexação depende do Google renderizar JS). */
export function usePageMeta({ title, description, image, noindex, jsonLd } = {}) {
  useEffect(() => {
    const full = title ? `${title} · FurCon Hub` : 'FurCon Hub — Descubra onde a Furry Fandom se encontra'
    document.title = full
    const url = window.location.origin + window.location.pathname
    const desc = description || 'Explore convenções, encontros e festivais da comunidade furry no mapa.'
    set('meta[name="description"]', 'content', desc, { tag: 'meta', attrs: { name: 'description' } })
    set('link[rel="canonical"]', 'href', url, { tag: 'link', attrs: { rel: 'canonical' } })
    set('meta[property="og:title"]', 'content', full, { tag: 'meta', attrs: { property: 'og:title' } })
    set('meta[property="og:description"]', 'content', desc, { tag: 'meta', attrs: { property: 'og:description' } })
    set('meta[property="og:url"]', 'content', url, { tag: 'meta', attrs: { property: 'og:url' } })
    set('meta[property="og:type"]', 'content', 'website', { tag: 'meta', attrs: { property: 'og:type' } })
    if (image) set('meta[property="og:image"]', 'content', image, { tag: 'meta', attrs: { property: 'og:image' } })
    set('meta[name="robots"]', 'content', noindex ? 'noindex,nofollow' : 'index,follow', { tag: 'meta', attrs: { name: 'robots' } })
    let ld = document.getElementById('ld-json')
    if (jsonLd) {
      if (!ld) { ld = document.createElement('script'); ld.id = 'ld-json'; ld.type = 'application/ld+json'; document.head.appendChild(ld) }
      ld.textContent = JSON.stringify(jsonLd)
    } else ld?.remove()
    return () => document.getElementById('ld-json')?.remove()
  }, [title, description, image, noindex, jsonLd && JSON.stringify(jsonLd)]) // eslint-disable-line react-hooks/exhaustive-deps
}
