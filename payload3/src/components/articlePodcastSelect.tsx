'use client';
import React, { useEffect, useState } from 'react';
import { SelectInput, useField } from '@payloadcms/ui';
export default function PodcastSelect({ path, field }: any) {
 const { value, setValue } = useField<string>({ path });
 const [state, setState] = useState<{ options: { label: string; value: string }[]; mode: string; loading: boolean; error: boolean }>({ options: [], mode: 'soundon', loading: true, error: false });
 useEffect(() => {
  const abort = new AbortController();
  fetch('/api/podcast-options', { signal: abort.signal, credentials: 'same-origin', cache: 'no-store' })
   .then(async response => { if (!response.ok) throw Error('Podcast unavailable'); return response.json(); })
   .then(data => { if (!Array.isArray(data.options)) throw Error('Invalid podcast options'); setState({ options: data.options, mode: data.mode, loading: false, error: false }); })
   .catch(() => { if (!abort.signal.aborted) setState(previous => ({ ...previous, loading: false, error: true })); });
  return () => abort.abort();
 }, []);
 const options = [...state.options];
 if (value && !options.some(option => option.value === value)) options.unshift({ label: 'Existing episode', value });
 return <div id="podcast-selector"><label>{typeof field?.label === 'string' ? field.label : 'Podcast'}</label><SelectInput path={path} name={path} options={options} value={value} readOnly={state.loading || state.error} onChange={(option: any) => setValue(option?.value || null)} /><p role={state.error ? 'alert' : undefined}>{state.error ? 'Podcast service unavailable. Existing selection is unchanged.' : state.loading ? 'Loading podcast episodes…' : state.mode === 'soundon' ? 'Episodes loaded from SoundOn.' : 'Episodes loaded from SoundOn.'}</p></div>;
}
