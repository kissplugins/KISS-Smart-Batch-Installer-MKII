import type { WpAjaxResponse } from '../types/ajax';
import type { SbiAjax } from '../types/wp-globals';
import { mapExceptionToError, mapResponseToError } from './errors';

/**
 * Generate a UUID-like string with fallbacks for older browsers
 */
function generateRequestId(): string {
  // Modern browsers with crypto.randomUUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback using crypto.getRandomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  // Final fallback for very old browsers
  return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9);
}

export interface AjaxOptions {
  method?: 'GET' | 'POST';
  timeoutMs?: number; // default 30000
  headers?: Record<string, string>;
}

function timeout(signal: AbortSignal | undefined, ms: number): AbortController | undefined {
  // Check for AbortController support (not available in older browsers)
  if (typeof AbortController === 'undefined') {
    // Log warning for debugging but don't fail
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[SBI] AbortController not supported, timeout functionality disabled');
    }
    return undefined;
  }

  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      try {
        ctrl.abort();
      } catch (e) {
        // Ignore abort errors in case controller is already aborted
      }
    }, ms);

    // When caller passes an external signal we could chain, but keep minimal
    void signal; // not used for now
    // Clear will be responsibility of caller lifecycle; for small calls, process ends anyway
    return ctrl;
  } catch (e) {
    // AbortController constructor failed
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[SBI] AbortController creation failed:', e);
    }
    return undefined;
  }
}

function formEncode(body: Record<string, unknown>): string {
  return Object.entries(body)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
    .join('&');
}

export async function wpAjaxFetch<TData = any>(
  windowObj: Window,
  payload: Record<string, unknown>,
  opts: AjaxOptions = {}
): Promise<WpAjaxResponse<TData>> {
  const w = windowObj as any as { sbiAjax?: SbiAjax; sbiDebug?: any };
  if (!w.sbiAjax) throw new Error('sbiAjax not found on window');

  const url = w.sbiAjax.ajaxurl;
  const method = opts.method || 'POST';
  const timeoutMs = opts.timeoutMs ?? 30000;
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    ...(opts.headers || {}),
  };

  const controller = timeout(undefined, timeoutMs);

  try {
    const resp = await fetch(url, {
      method,
      headers,
      body: method === 'POST' ? formEncode(payload) : undefined,
      signal: controller?.signal,
      credentials: 'same-origin',
    });

    if (!resp.ok) {
      const err = mapResponseToError(resp, generateRequestId(), url, method);
      w.sbiDebug?.addEntry('error', 'AJAX Error', JSON.stringify(err));
      return { success: false, data: err as any };
    }

    const data = (await resp.json()) as WpAjaxResponse<TData>;
    return data;
  } catch (e) {
    const err = mapExceptionToError(e, generateRequestId(), url, method);
    w.sbiDebug?.addEntry('error', 'AJAX Exception', JSON.stringify(err));
    return { success: false, data: err as any };
  }
}

