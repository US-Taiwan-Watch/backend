'use client';
import React from 'react';
import { useField } from '@payloadcms/ui';
export default function SummaryField({ path, field }: any) {
 const { value, setValue } = useField<string>({ path });
 const label = typeof field?.label === 'string' ? field.label : path;
 return <div><label htmlFor={path}>{label}</label><textarea id={path} value={value || ''} onChange={event => setValue(event.target.value)} style={{width:'100%',minHeight:140}} /><p>AI generation is paused for this release.</p></div>;
}
